import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import {
  generateSingleElimination,
  generateDoubleElimination,
  generateRoundRobin,
  generateSwiss,
  buildSingleEliminationLinks,
  buildDoubleEliminationLinks,
} from '@/lib/bracket-generator';

// POST /api/tournaments/[id]/start - Start tournament (generate brackets)
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const tournament = await db.tournament.findUnique({
      where: { id },
      include: { participants: { orderBy: { seed: 'asc' } } },
    });

    if (!tournament) {
      return NextResponse.json(
        { error: 'Tournament not found' },
        { status: 404 }
      );
    }

    if (tournament.status !== 'pending') {
      return NextResponse.json(
        { error: 'Tournament has already been started. Reset it first.' },
        { status: 400 }
      );
    }

    const participants = tournament.participants.filter((p) => p.active);

    if (participants.length < 2) {
      return NextResponse.json(
        { error: 'Need at least 2 active participants to start a tournament' },
        { status: 400 }
      );
    }

    // Check if matches already exist
    const existingMatches = await db.match.count({
      where: { tournamentId: id },
    });

    if (existingMatches > 0) {
      return NextResponse.json(
        { error: 'Matches already exist. Reset the tournament first.' },
        { status: 400 }
      );
    }

    // Generate bracket based on format
    let matches;

    switch (tournament.format) {
      case 'single_elimination':
        matches = generateSingleElimination(
          participants,
          id,
          tournament.holdThirdPlaceMatch
        );
        break;

      case 'double_elimination':
        matches = generateDoubleElimination(participants, id);
        break;

      case 'round_robin':
        matches = generateRoundRobin(participants, id);
        break;

      case 'swiss':
        matches = generateSwiss(participants, id, tournament.swissRounds);
        break;

      default:
        return NextResponse.json(
          { error: `Unsupported tournament format: ${tournament.format}` },
          { status: 400 }
        );
    }

    if (matches.length === 0) {
      return NextResponse.json(
        { error: 'Failed to generate bracket matches' },
        { status: 500 }
      );
    }

    // Create all matches in the database
    const createdMatches = [];
    for (const match of matches) {
      const created = await db.match.create({
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
      createdMatches.push(created);
    }

    // Now link matches (set nextMatchId and nextMatchPosition)
    // For single elimination and double elimination, we need to update nextMatchId
    if (
      tournament.format === 'single_elimination' ||
      tournament.format === 'double_elimination'
    ) {
      await linkMatches(tournament.format, participants.length, createdMatches);
    }

    // Update tournament status
    await db.tournament.update({
      where: { id },
      data: { status: 'in_progress' },
    });

    // Fetch the complete tournament with matches
    const updatedTournament = await db.tournament.findUnique({
      where: { id },
      include: {
        participants: { orderBy: { seed: 'asc' } },
        matches: {
          orderBy: [{ bracket: 'asc' }, { round: 'asc' }, { position: 'asc' }],
          include: {
            player1: { select: { id: true, name: true, seed: true } },
            player2: { select: { id: true, name: true, seed: true } },
            winner: { select: { id: true, name: true, seed: true } },
          },
        },
      },
    });

    return NextResponse.json({
      message: 'Tournament started successfully',
      tournament: updatedTournament,
    });
  } catch (error) {
    console.error('Error starting tournament:', error);
    return NextResponse.json(
      { error: 'Failed to start tournament' },
      { status: 500 }
    );
  }
}

/**
 * Link matches by updating nextMatchId and nextMatchPosition fields
 */
async function linkMatches(
  format: string,
  numParticipants: number,
  createdMatches: {
    id: string;
    round: number;
    position: number;
    bracket: string;
  }[]
) {
  function nextPowerOf2(n: number): number {
    let p = 1;
    while (p < n) p *= 2;
    return p;
  }

  if (format === 'single_elimination') {
    const size = nextPowerOf2(numParticipants);
    const numRounds = Math.log2(size);

    // Calculate matches per round
    const matchesPerRound: number[] = [];
    for (let round = 1; round <= numRounds; round++) {
      const count = size / Math.pow(2, round);
      matchesPerRound.push(count);
    }

    const links = buildSingleEliminationLinks(numRounds, matchesPerRound);

    // Map from (round, position) to match id
    const matchMap = new Map<string, string>();
    for (const m of createdMatches) {
      if (!m.isThirdPlace) {
        matchMap.set(`${m.bracket}-${m.round}-${m.position}`, m.id);
      }
    }

    for (const link of links) {
      const fromMatch = createdMatches[link.matchIdx];
      const toMatch = createdMatches[link.nextMatchIdx];
      if (fromMatch && toMatch) {
        await db.match.update({
          where: { id: fromMatch.id },
          data: {
            nextMatchId: toMatch.id,
            nextMatchPosition: link.position,
          },
        });
      }
    }

    // Handle third place match - link semi-final losers
    const thirdPlaceMatch = createdMatches.find((m) => m.isThirdPlace);
    if (thirdPlaceMatch) {
      // Semi-finals are the matches in the second-to-last round
      const semiRound = numRounds - 1;
      const semiMatches = createdMatches.filter(
        (m) => m.round === semiRound && m.bracket === 'winners' && !m.isThirdPlace
      );
      // Link semi-final matches to the third place match
      // The losers of semis will go to the third place match
      for (let i = 0; i < semiMatches.length; i++) {
        await db.match.update({
          where: { id: semiMatches[i].id },
          data: {
            // We store the third place match reference separately
            // nextMatchId already points to the final, so we handle this in match result logic
          },
        });
      }
    }

    // Propagate bye winners through rounds
    // For matches where status is already 'completed' (byes), advance the winner
    const byeMatches = createdMatches.filter(
      (m) => m.bracket === 'winners' && m.round === 1
    );

    for (const byeMatch of byeMatches) {
      const fullMatch = await db.match.findUnique({
        where: { id: byeMatch.id },
      });
      if (fullMatch && fullMatch.status === 'completed' && fullMatch.winnerId && fullMatch.nextMatchId) {
        const nextMatch = await db.match.findUnique({
          where: { id: fullMatch.nextMatchId },
        });
        if (nextMatch) {
          const updateData: Record<string, unknown> = {};
          if (fullMatch.nextMatchPosition === 'player1') {
            updateData.player1Id = fullMatch.winnerId;
          } else {
            updateData.player2Id = fullMatch.winnerId;
          }
          await db.match.update({
            where: { id: nextMatch.id },
            data: updateData,
          });

          // Check if the next match now has both players and can start
          const updatedNext = await db.match.findUnique({
            where: { id: nextMatch.id },
          });
          if (updatedNext && updatedNext.player1Id && updatedNext.player2Id) {
            // Both players present, but leave as pending - it will start when scheduled
          }

          // If the next match also has a bye (player2 is null), auto-advance again
          if (updatedNext && (!updatedNext.player1Id || !updatedNext.player2Id)) {
            // Check if the other feeder match is also a bye
            const otherFeeders = await db.match.findMany({
              where: {
                nextMatchId: nextMatch.id,
                id: { not: fullMatch.id },
              },
            });
            if (otherFeeders.length > 0 && otherFeeders[0].status === 'completed' && otherFeeders[0].winnerId) {
              // The other match is also a bye - auto-advance
              const updateNext: Record<string, unknown> = {};
              if (otherFeeders[0].nextMatchPosition === 'player1') {
                updateNext.player1Id = otherFeeders[0].winnerId;
              } else {
                updateNext.player2Id = otherFeeders[0].winnerId;
              }
              await db.match.update({
                where: { id: nextMatch.id },
                data: {
                  ...updateNext,
                  status: 'completed',
                  winnerId: fullMatch.winnerId, // Need to determine winner properly
                },
              });
            }
          }
        }
      }
    }
  } else if (format === 'double_elimination') {
    const size = nextPowerOf2(numParticipants);

    const matchIndices = createdMatches.map((m, idx) => ({
      round: m.round,
      bracket: m.bracket,
      position: m.position,
      index: idx,
    }));

    const links = buildDoubleEliminationLinks(size, matchIndices);

    for (const link of links) {
      const fromMatch = createdMatches[link.matchIdx];
      const toMatch = createdMatches[link.nextMatchIdx];
      if (fromMatch && toMatch) {
        await db.match.update({
          where: { id: fromMatch.id },
          data: {
            nextMatchId: toMatch.id,
            nextMatchPosition: link.position,
          },
        });
      }
    }

    // Propagate bye winners for WB
    const wbByeMatches = createdMatches.filter(
      (m) => m.bracket === 'winners' && m.round === 1
    );

    for (const byeMatch of wbByeMatches) {
      const fullMatch = await db.match.findUnique({
        where: { id: byeMatch.id },
      });
      if (fullMatch && fullMatch.status === 'completed' && fullMatch.winnerId && fullMatch.nextMatchId) {
        const nextMatch = await db.match.findUnique({
          where: { id: fullMatch.nextMatchId },
        });
        if (nextMatch) {
          const updateData: Record<string, unknown> = {};
          if (fullMatch.nextMatchPosition === 'player1') {
            updateData.player1Id = fullMatch.winnerId;
          } else {
            updateData.player2Id = fullMatch.winnerId;
          }
          await db.match.update({
            where: { id: nextMatch.id },
            data: updateData,
          });
        }
      }
    }
  }
}
