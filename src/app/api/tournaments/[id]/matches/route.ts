import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/tournaments/[id]/matches - Get all matches for a tournament
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const tournament = await db.tournament.findUnique({
      where: { id },
      select: { id: true, format: true, status: true },
    });

    if (!tournament) {
      return NextResponse.json(
        { error: 'Tournament not found' },
        { status: 404 }
      );
    }

    const matches = await db.match.findMany({
      where: { tournamentId: id },
      orderBy: [{ bracket: 'asc' }, { round: 'asc' }, { position: 'asc' }],
      include: {
        player1: { select: { id: true, name: true, seed: true } },
        player2: { select: { id: true, name: true, seed: true } },
        winner: { select: { id: true, name: true, seed: true } },
      },
    });

    // Group matches by round and bracket
    const grouped: Record<string, Record<number, typeof matches>> = {};

    for (const match of matches) {
      const bracket = match.bracket;
      if (!grouped[bracket]) {
        grouped[bracket] = {};
      }
      if (!grouped[bracket][match.round]) {
        grouped[bracket][match.round] = [];
      }
      grouped[bracket][match.round].push(match);
    }

    return NextResponse.json({
      matches,
      grouped,
      format: tournament.format,
    });
  } catch (error) {
    console.error('Error getting matches:', error);
    return NextResponse.json(
      { error: 'Failed to get matches' },
      { status: 500 }
    );
  }
}

// PUT /api/tournaments/[id]/matches - Update match result
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const tournament = await db.tournament.findUnique({
      where: { id },
    });

    if (!tournament) {
      return NextResponse.json(
        { error: 'Tournament not found' },
        { status: 404 }
      );
    }

    if (tournament.status !== 'in_progress') {
      return NextResponse.json(
        { error: 'Tournament is not in progress' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { matchId, score1, score2, winnerId } = body;

    if (!matchId) {
      return NextResponse.json(
        { error: 'matchId is required' },
        { status: 400 }
      );
    }

    const match = await db.match.findFirst({
      where: { id: matchId, tournamentId: id },
    });

    if (!match) {
      return NextResponse.json(
        { error: 'Match not found in this tournament' },
        { status: 404 }
      );
    }

    if (match.status === 'completed') {
      return NextResponse.json(
        { error: 'Match is already completed. Reset the tournament to change results.' },
        { status: 400 }
      );
    }

    if (!match.player1Id || !match.player2Id) {
      return NextResponse.json(
        { error: 'Match does not have both players assigned yet' },
        { status: 400 }
      );
    }

    // Validate scores
    const s1 = score1 !== undefined ? parseInt(String(score1)) : match.score1;
    const s2 = score2 !== undefined ? parseInt(String(score2)) : match.score2;

    if (isNaN(s1) || isNaN(s2) || s1 < 0 || s2 < 0) {
      return NextResponse.json(
        { error: 'Scores must be non-negative integers' },
        { status: 400 }
      );
    }

    // Determine winner
    let resolvedWinnerId = winnerId || null;

    if (s1 > s2) {
      resolvedWinnerId = match.player1Id;
    } else if (s2 > s1) {
      resolvedWinnerId = match.player2Id;
    } else if (s1 === s2 && resolvedWinnerId) {
      // Tie but a winner is explicitly set (e.g., for tiebreaker)
    } else {
      return NextResponse.json(
        { error: 'Match result must have a winner. Scores are tied and no winnerId is provided.' },
        { status: 400 }
      );
    }

    // Validate winner is one of the players
    if (
      resolvedWinnerId !== match.player1Id &&
      resolvedWinnerId !== match.player2Id
    ) {
      return NextResponse.json(
        { error: 'Winner must be one of the match participants' },
        { status: 400 }
      );
    }

    // Update the match
    const updatedMatch = await db.match.update({
      where: { id: matchId },
      data: {
        score1: s1,
        score2: s2,
        winnerId: resolvedWinnerId,
        status: 'completed',
      },
      include: {
        player1: { select: { id: true, name: true, seed: true } },
        player2: { select: { id: true, name: true, seed: true } },
        winner: { select: { id: true, name: true, seed: true } },
      },
    });

    // Advance winner to next match
    await advanceWinner(match, resolvedWinnerId, tournament.format);

    // For double elimination, handle loser dropping to losers bracket
    if (tournament.format === 'double_elimination' && match.bracket === 'winners') {
      const loserId =
        resolvedWinnerId === match.player1Id
          ? match.player2Id
          : match.player1Id;
      await dropLoserToLosersBracket(match, loserId);
    }

    // For third place match: advance semi-final losers
    if (tournament.format === 'single_elimination' && tournament.holdThirdPlaceMatch) {
      await handleThirdPlaceMatch(match, resolvedWinnerId, id);
    }

    // Check if tournament is completed
    const isComplete = await checkTournamentCompletion(id, tournament.format);

    if (isComplete) {
      await db.tournament.update({
        where: { id },
        data: { status: 'completed' },
      });
    }

    // For Swiss format, check if current round is complete and generate next round
    if (tournament.format === 'swiss' && !isComplete) {
      await checkAndGenerateSwissRound(id, tournament.swissRounds);
    }

    return NextResponse.json({
      match: updatedMatch,
      tournamentCompleted: isComplete,
    });
  } catch (error) {
    console.error('Error updating match:', error);
    return NextResponse.json(
      { error: 'Failed to update match' },
      { status: 500 }
    );
  }
}

/**
 * Advance winner to the next match in the bracket
 */
async function advanceWinner(
  match: {
    id: string;
    round: number;
    position: number;
    bracket: string;
    nextMatchId: string | null;
    nextMatchPosition: string | null;
    isThirdPlace: boolean;
  },
  winnerId: string,
  format: string
) {
  if (!match.nextMatchId) return;

  const nextMatch = await db.match.findUnique({
    where: { id: match.nextMatchId },
  });

  if (!nextMatch) return;

  const updateData: Record<string, unknown> = {};

  if (match.nextMatchPosition === 'player1') {
    updateData.player1Id = winnerId;
  } else if (match.nextMatchPosition === 'player2') {
    updateData.player2Id = winnerId;
  } else {
    // Default: fill the first available slot
    if (!nextMatch.player1Id) {
      updateData.player1Id = winnerId;
    } else {
      updateData.player2Id = winnerId;
    }
  }

  // If both players are now assigned, set status to pending (ready to play)
  const updated = await db.match.update({
    where: { id: nextMatch.id },
    data: updateData,
  });

  // Check if the match now has both players
  if (updated.player1Id && updated.player2Id && updated.status === 'pending') {
    // Match is ready - status stays pending until it's actually played
  }

  // For double elimination grand finals: handle reset
  if (format === 'double_elimination' && match.bracket === 'grand_finals') {
    await handleGrandFinalsAdvancement(match, winnerId, nextMatch);
  }
}

/**
 * Handle double elimination grand finals logic:
 * - If winners bracket winner wins, tournament is over
 * - If losers bracket winner wins, there must be a reset match
 */
async function handleGrandFinalsAdvancement(
  match: { bracket: string; round: number },
  _winnerId: string,
  _nextMatch: { id: string; bracket: string; round: number }
) {
  // The grand finals reset match handling is done in checkTournamentCompletion
  // This function can be extended for more complex scenarios
}

/**
 * Drop loser from winners bracket to the appropriate losers bracket match
 */
async function dropLoserToLosersBracket(
  match: {
    id: string;
    round: number;
    position: number;
    bracket: string;
  },
  loserId: string
) {
  // Find the corresponding losers bracket match where this loser should go
  // The mapping is: WB round R loser goes to LB round (2R-2) for R>1, LB round 1 for R=1
  const wbRound = match.round;
  const wbPos = match.position;

  let lbRound: number;
  let lbPos: number;

  if (wbRound === 1) {
    lbRound = 1;
    lbPos = Math.floor(wbPos / 2);
  } else {
    lbRound = wbRound * 2 - 2;
    lbPos = wbPos;
  }

  // Find the losers bracket match
  const lbMatch = await db.match.findFirst({
    where: {
      tournamentId: match.id ? (await db.match.findUnique({ where: { id: match.id } }))?.tournamentId : '',
      bracket: 'losers',
      round: lbRound,
      position: lbPos,
    },
  });

  if (!lbMatch) return;

  // Find matches that link to this LB match (to determine which slot to fill)
  const feederMatches = await db.match.findMany({
    where: { nextMatchId: lbMatch.id },
  });

  // Check if there's a specific WB->LB link
  const wbLink = feederMatches.find((m) => m.bracket === 'winners');

  if (wbLink) {
    // The WB match links to this LB match via nextMatchPosition
    // But actually, the link is from the WB match's nextMatchId
    // We need to check which position the loser should go to
    // In our bracket generation, WB losers go to player2 slot of the LB match
    const updateData: Record<string, unknown> = {};
    if (!lbMatch.player1Id) {
      updateData.player1Id = loserId;
    } else if (!lbMatch.player2Id) {
      updateData.player2Id = loserId;
    }

    await db.match.update({
      where: { id: lbMatch.id },
      data: updateData,
    });
  } else {
    // No explicit link found - just fill the next available slot
    const updateData: Record<string, unknown> = {};
    if (!lbMatch.player1Id) {
      updateData.player1Id = loserId;
    } else if (!lbMatch.player2Id) {
      updateData.player2Id = loserId;
    }

    await db.match.update({
      where: { id: lbMatch.id },
      data: updateData,
    });
  }
}

/**
 * Handle third place match: when a semi-final completes,
 * the loser should be placed in the third place match
 */
async function handleThirdPlaceMatch(
  match: {
    id: string;
    round: number;
    position: number;
    bracket: string;
  },
  winnerId: string,
  tournamentId: string
) {
  // Find the total number of rounds
  const allMatches = await db.match.findMany({
    where: { tournamentId, isThirdPlace: false, bracket: 'winners' },
    orderBy: { round: 'desc' },
  });

  if (allMatches.length === 0) return;

  const maxRound = allMatches[0].round;
  const semiRound = maxRound - 1;

  // Only process if this is a semi-final match
  if (match.round !== semiRound) return;

  const loserId = winnerId === (await db.match.findUnique({ where: { id: match.id } }))?.player1Id
    ? (await db.match.findUnique({ where: { id: match.id } }))?.player2Id
    : (await db.match.findUnique({ where: { id: match.id } }))?.player1Id;

  if (!loserId) return;

  // Find the third place match
  const thirdPlaceMatch = await db.match.findFirst({
    where: { tournamentId, isThirdPlace: true },
  });

  if (!thirdPlaceMatch) return;

  // Place the loser in the appropriate slot
  const updateData: Record<string, unknown> = {};
  if (!thirdPlaceMatch.player1Id) {
    updateData.player1Id = loserId;
  } else if (!thirdPlaceMatch.player2Id) {
    updateData.player2Id = loserId;
  }

  await db.match.update({
    where: { id: thirdPlaceMatch.id },
    data: updateData,
  });
}

/**
 * Check if the tournament is completed
 */
async function checkTournamentCompletion(
  tournamentId: string,
  format: string
): Promise<boolean> {
  const matches = await db.match.findMany({
    where: { tournamentId },
  });

  if (matches.length === 0) return false;

  if (format === 'single_elimination' || format === 'double_elimination') {
    // Tournament is complete when the final match (or grand finals) is completed
    // For double elimination, need to check if grand finals reset is needed

    if (format === 'double_elimination') {
      const grandFinals = matches.filter((m) => m.bracket === 'grand_finals');
      const gf1 = grandFinals.find((m) => m.round === 1);
      const gf2 = grandFinals.find((m) => m.round === 2);

      if (gf1 && gf1.status === 'completed') {
        // Check if the losers bracket winner won (needs reset)
        const lbFinal = matches.find(
          (m) => m.bracket === 'losers' && m.nextMatchId === gf1.id && m.nextMatchPosition === 'player2'
        );

        if (lbFinal && gf1.winnerId === lbFinal.winnerId) {
          // Losers bracket winner won GF1 - need reset match
          if (gf2 && gf2.status === 'completed') {
            return true;
          }
          // Set up the reset match
          if (gf2 && !gf2.player1Id) {
            await db.match.update({
              where: { id: gf2.id },
              data: {
                player1Id: gf1.player1Id,
                player2Id: gf1.player2Id,
              },
            });
          }
          return false;
        }
        // Winners bracket winner won GF1 - tournament is complete
        return true;
      }
      return false;
    }

    // Single elimination: check if final match is completed
    const finalMatch = matches.find(
      (m) =>
        m.bracket === 'winners' &&
        !m.isThirdPlace &&
        !matches.some((om) => om.nextMatchId === m.id && !om.isThirdPlace)
    );

    if (!finalMatch) {
      // Fallback: check if all non-third-place matches are completed
      const nonThirdPlace = matches.filter((m) => !m.isThirdPlace);
      return nonThirdPlace.every((m) => m.status === 'completed');
    }

    // Check that the final match and third place match (if any) are completed
    const thirdPlaceMatch = matches.find((m) => m.isThirdPlace);
    const finalComplete = finalMatch.status === 'completed';
    const thirdPlaceComplete = !thirdPlaceMatch || thirdPlaceMatch.status === 'completed';

    return finalComplete && thirdPlaceComplete;
  }

  if (format === 'round_robin') {
    // All matches must be completed
    return matches.every((m) => m.status === 'completed');
  }

  if (format === 'swiss') {
    // All matches must be completed
    // (Swiss rounds are generated one at a time, so check current rounds)
    return matches.every((m) => m.status === 'completed');
  }

  return false;
}

/**
 * Check if current Swiss round is complete and generate next round
 */
async function checkAndGenerateSwissRound(
  tournamentId: string,
  maxRounds: number
) {
  const matches = await db.match.findMany({
    where: { tournamentId },
    orderBy: { round: 'desc' },
  });

  if (matches.length === 0) return;

  const currentRound = matches[0].round;
  const currentRoundMatches = matches.filter((m) => m.round === currentRound);

  // Check if all matches in the current round are completed
  const allCompleted = currentRoundMatches.every((m) => m.status === 'completed');
  if (!allCompleted) return;

  // Check if we've reached the maximum rounds
  if (currentRound >= maxRounds) return;

  // Get participants
  const participants = await db.participant.findMany({
    where: { tournamentId, active: true },
  });

  // Get all completed matches for pairing logic
  const completedMatches = matches
    .filter((m) => m.status === 'completed')
    .map((m) => ({
      player1Id: m.player1Id,
      player2Id: m.player2Id,
      winnerId: m.winnerId,
      score1: m.score1,
      score2: m.score2,
    }));

  // Generate next round using Swiss pairing
  const { generateSwissRound } = await import('@/lib/bracket-generator');
  const nextRoundMatches = generateSwissRound(
    participants,
    tournamentId,
    currentRound + 1,
    completedMatches
  );

  for (const match of nextRoundMatches) {
    await db.match.create({
      data: {
        tournamentId: match.tournamentId,
        round: match.round,
        position: match.position,
        bracket: match.bracket,
        player1Id: match.player1Id,
        player2Id: match.player2Id,
        score1: match.score1,
        score2: match.score2,
        winnerId: match.winnerId,
        status: match.status,
        isThirdPlace: match.isThirdPlace,
        order: match.order,
      },
    });
  }
}
