import type { Participant } from '@prisma/client';

export interface MatchInput {
  tournamentId: string;
  round: number;
  position: number;
  bracket: string;
  player1Id: string | null;
  player2Id: string | null;
  score1: number;
  score2: number;
  winnerId: string | null;
  status: string;
  nextMatchId: string | null;
  nextMatchPosition: string | null;
  isThirdPlace: boolean;
  order: number;
}

/**
 * Standard bracket seeding order for power-of-2 participants.
 * Returns seed pairings so that seed 1 plays the lowest possible seed in each round.
 * E.g., for 16: [1,16], [8,9], [5,12], [4,13], [6,11], [3,14], [7,10], [2,15]
 */
function getStandardSeeding(numParticipants: number): [number, number][] {
  const n = nextPowerOf2(numParticipants);
  const seeds = Array.from({ length: n }, (_, i) => i + 1);
  const pairs: [number, number][] = [];

  // Use recursive seeding algorithm
  function seedRound(remaining: number[]): [number, number][] {
    if (remaining.length === 2) {
      return [[remaining[0], remaining[1]]];
    }
    const result: [number, number][] = [];
    const half = remaining.length / 2;
    for (let i = 0; i < half; i++) {
      // Sum of seeds should equal n+1 for fair seeding
      result.push([remaining[i], remaining[remaining.length - 1 - i]]);
    }
    // Reorder for bracket balance
    const firstHalf = remaining.slice(0, half);
    const secondHalf = remaining.slice(half);
    const upper = seedRound(firstHalf);
    const lower = seedRound(secondHalf);
    return [...upper, ...lower];
  }

  // Simple direct pairing approach for standard seeding
  // First round: top seed vs bottom seed, 2nd vs 2nd from bottom, etc.
  // But split into halves so 1 and 2 meet in finals
  const ordered = reorderSeeds(n);
  for (let i = 0; i < ordered.length; i += 2) {
    pairs.push([ordered[i], ordered[i + 1]]);
  }

  return pairs;
}

/**
 * Reorder seeds so that bracket is balanced:
 * 1 and 2 are on opposite sides, meeting only in the final.
 * For n=16: [1,16,8,9,5,12,4,13,6,11,3,14,7,10,2,15]
 */
function reorderSeeds(n: number): number[] {
  if (n === 1) return [1];
  if (n === 2) return [1, 2];

  const result: number[] = [1, 2];
  let round = 2;

  while (round < n) {
    const newResult: number[] = [];
    for (const seed of result) {
      const opponent = round * 2 + 1 - seed;
      newResult.push(seed, opponent);
    }
    result.length = 0;
    result.push(...newResult);
    round *= 2;
  }

  return result;
}

function nextPowerOf2(n: number): number {
  let p = 1;
  while (p < n) p *= 2;
  return p;
}

/**
 * Generate single elimination bracket
 */
export function generateSingleElimination(
  participants: Participant[],
  tournamentId: string,
  holdThirdPlace: boolean
): MatchInput[] {
  const n = participants.length;
  if (n < 2) return [];

  // Sort participants by seed (ascending). Seed 0 means unseeded, put at end.
  const sorted = [...participants].sort((a, b) => {
    if (a.seed === 0 && b.seed === 0) return a.name.localeCompare(b.name);
    if (a.seed === 0) return 1;
    if (b.seed === 0) return -1;
    return a.seed - b.seed;
  });

  const size = nextPowerOf2(n);
  const numRounds = Math.log2(size);
  const numByes = size - n;

  // Get standard seeding order
  const seedOrder = reorderSeeds(size);

  // Map seed positions to participants
  // seedOrder tells us the order of seeds in the bracket
  // Position 0 plays Position 1, Position 2 plays Position 3, etc.
  const seedToParticipant: Map<number, Participant | null> = new Map();
  for (let i = 1; i <= size; i++) {
    if (i <= n) {
      seedToParticipant.set(i, sorted[i - 1]);
    } else {
      seedToParticipant.set(i, null); // bye
    }
  }

  const matches: MatchInput[] = [];
  let order = 0;

  // Generate all matches for each round
  // We'll use placeholder IDs and link them after
  const matchIds: string[][] = []; // matchIds[round][position]

  // Round 1
  const r1MatchCount = size / 2;
  matchIds[1] = [];
  const r1Pairings = getStandardSeeding(n);

  // Actually let's use the seedOrder to create first round
  for (let i = 0; i < size / 2; i++) {
    const seed1 = seedOrder[i * 2];
    const seed2 = seedOrder[i * 2 + 1];
    const p1 = seedToParticipant.get(seed1) ?? null;
    const p2 = seedToParticipant.get(seed2) ?? null;

    const isBye = p1 === null || p2 === null;

    const matchId = `r1m${i}`;
    matchIds[1].push(matchId);

    let winnerId: string | null = null;
    let status = 'pending';

    if (isBye) {
      // Bye: the participant with an opponent advances automatically
      const advancingPlayer = p1 ?? p2;
      winnerId = advancingPlayer?.id ?? null;
      status = 'completed';
    }

    matches.push({
      tournamentId,
      round: 1,
      position: i,
      bracket: 'winners',
      player1Id: p1?.id ?? null,
      player2Id: p2?.id ?? null,
      score1: 0,
      score2: 0,
      winnerId,
      status,
      nextMatchId: null,
      nextMatchPosition: null,
      isThirdPlace: false,
      order: order++,
    });
  }

  // Rounds 2 through final
  for (let round = 2; round <= numRounds; round++) {
    matchIds[round] = [];
    const matchCount = size / Math.pow(2, round);
    for (let pos = 0; pos < matchCount; pos++) {
      const matchId = `r${round}m${pos}`;
      matchIds[round].push(matchId);

      matches.push({
        tournamentId,
        round,
        position: pos,
        bracket: 'winners',
        player1Id: null,
        player2Id: null,
        score1: 0,
        score2: 0,
        winnerId: null,
        status: 'pending',
        nextMatchId: null,
        nextMatchPosition: null,
        isThirdPlace: false,
        order: order++,
      });
    }
  }

  // Link matches: each match's nextMatchId points to the match in the next round
  for (let round = 1; round < numRounds; round++) {
    const currentMatches = matchIds[round];
    const nextMatches = matchIds[round + 1];

    for (let i = 0; i < currentMatches.length; i++) {
      const nextMatchIdx = Math.floor(i / 2);
      const slot: 'player1' | 'player2' = i % 2 === 0 ? 'player1' : 'player2';

      const match = matches.find(
        (m) => m.round === round && m.position === i
      );
      if (match) {
        match.nextMatchId = nextMatches[nextMatchIdx];
        match.nextMatchPosition = slot;
      }
    }
  }

  // Handle byes: auto-advance players with byes to round 2
  // We need to propagate bye winners into round 2 player slots
  for (let i = 0; i < r1MatchCount; i++) {
    const match = matches.find((m) => m.round === 1 && m.position === i);
    if (match && match.status === 'completed' && match.winnerId && match.nextMatchId) {
      const nextMatch = matches.find(
        (m) =>
          m.round === 2 &&
          matchIds[2].indexOf(match.nextMatchId!) === m.position
      );
      if (nextMatch) {
        if (match.nextMatchPosition === 'player1') {
          nextMatch.player1Id = match.winnerId;
        } else {
          nextMatch.player2Id = match.winnerId;
        }
      }
    }
  }

  // Third place match
  if (holdThirdPlace) {
    matches.push({
      tournamentId,
      round: numRounds,
      position: 1,
      bracket: 'winners',
      player1Id: null, // Loser of semi 1
      player2Id: null, // Loser of semi 2
      score1: 0,
      score2: 0,
      winnerId: null,
      status: 'pending',
      nextMatchId: null,
      nextMatchPosition: null,
      isThirdPlace: true,
      order: order++,
    });
  }

  // Now we need to replace placeholder matchIds with actual IDs
  // Since we're creating these matches, we'll generate cuid-like IDs
  // But actually, the nextMatchId references need to be set after creation
  // So we'll return the matches and handle the linking after DB insert

  // Let's restructure: return matches without nextMatchId links,
  // and a mapping of round/position to match index
  // Then after DB insert, we update nextMatchId references

  return matches;
}

/**
 * Build the nextMatch mapping for single elimination.
 * Returns an array of { matchIndex, nextMatchIndex, position } objects.
 */
export function buildSingleEliminationLinks(
  numRounds: number,
  matchesPerRound: number[]
): { matchIdx: number; nextMatchIdx: number; position: 'player1' | 'player2' }[] {
  const links: { matchIdx: number; nextMatchIdx: number; position: 'player1' | 'player2' }[] = [];
  let offset = 0;

  for (let round = 1; round < numRounds; round++) {
    const currentCount = matchesPerRound[round - 1];
    const nextOffset = offset + currentCount;

    for (let i = 0; i < currentCount; i++) {
      const nextPos = Math.floor(i / 2);
      const slot: 'player1' | 'player2' = i % 2 === 0 ? 'player1' : 'player2';
      links.push({
        matchIdx: offset + i,
        nextMatchIdx: nextOffset + nextPos,
        position: slot,
      });
    }

    offset += currentCount;
  }

  return links;
}

/**
 * Generate double elimination bracket
 */
export function generateDoubleElimination(
  participants: Participant[],
  tournamentId: string
): MatchInput[] {
  const n = participants.length;
  if (n < 2) return [];

  const sorted = [...participants].sort((a, b) => {
    if (a.seed === 0 && b.seed === 0) return a.name.localeCompare(b.name);
    if (a.seed === 0) return 1;
    if (b.seed === 0) return -1;
    return a.seed - b.seed;
  });

  const size = nextPowerOf2(n);
  const numWBRounds = Math.log2(size);
  const numByes = size - n;

  const seedOrder = reorderSeeds(size);

  const seedToParticipant: Map<number, Participant | null> = new Map();
  for (let i = 1; i <= size; i++) {
    if (i <= n) {
      seedToParticipant.set(i, sorted[i - 1]);
    } else {
      seedToParticipant.set(i, null);
    }
  }

  const matches: MatchInput[] = [];
  let order = 0;

  // ===== WINNERS BRACKET =====
  // Same as single elimination first rounds
  const wbMatchesPerRound: number[] = [];

  // WB Round 1
  const wbR1Count = size / 2;
  wbMatchesPerRound.push(wbR1Count);
  for (let i = 0; i < wbR1Count; i++) {
    const seed1 = seedOrder[i * 2];
    const seed2 = seedOrder[i * 2 + 1];
    const p1 = seedToParticipant.get(seed1) ?? null;
    const p2 = seedToParticipant.get(seed2) ?? null;

    const isBye = p1 === null || p2 === null;
    let winnerId: string | null = null;
    let status = 'pending';

    if (isBye) {
      const advancingPlayer = p1 ?? p2;
      winnerId = advancingPlayer?.id ?? null;
      status = 'completed';
    }

    matches.push({
      tournamentId,
      round: 1,
      position: i,
      bracket: 'winners',
      player1Id: p1?.id ?? null,
      player2Id: p2?.id ?? null,
      score1: 0,
      score2: 0,
      winnerId,
      status,
      nextMatchId: null,
      nextMatchPosition: null,
      isThirdPlace: false,
      order: order++,
    });
  }

  // WB Rounds 2 to final
  for (let round = 2; round <= numWBRounds; round++) {
    const matchCount = size / Math.pow(2, round);
    wbMatchesPerRound.push(matchCount);
    for (let pos = 0; pos < matchCount; pos++) {
      matches.push({
        tournamentId,
        round,
        position: pos,
        bracket: 'winners',
        player1Id: null,
        player2Id: null,
        score1: 0,
        score2: 0,
        winnerId: null,
        status: 'pending',
        nextMatchId: null,
        nextMatchPosition: null,
        isThirdPlace: false,
        order: order++,
      });
    }
  }

  // ===== LOSERS BRACKET =====
  // The losers bracket has (2 * numWBRounds - 1) rounds for standard double elimination
  const numLBRounds = 2 * numWBRounds - 2;

  const lbMatchesPerRound: number[] = [];
  for (let lbRound = 1; lbRound <= numLBRounds; lbRound++) {
    let matchCount: number;
    if (lbRound <= numWBRounds - 1) {
      // First half: matches increase or stay same
      matchCount = size / Math.pow(2, numWBRounds - Math.floor((lbRound - 1) / 2));
      // Simplified: odd rounds get drops from WB, even rounds are LB-only
      if (lbRound % 2 === 1) {
        matchCount = size / Math.pow(2, Math.ceil(lbRound / 2) + 1);
      } else {
        matchCount = size / Math.pow(2, Math.ceil(lbRound / 2) + 1);
      }
    } else {
      matchCount = 1;
    }
    matchCount = Math.max(1, matchCount);
    lbMatchesPerRound.push(matchCount);
  }

  // Actually, let me use a cleaner approach for losers bracket
  // For n participants (power of 2), the losers bracket structure:
  //
  // LB Round 1: losers from WB Round 1 play each other (n/4 matches)
  // LB Round 2: winners of LB R1 vs losers from WB R2 (n/4 matches)
  // LB Round 3: winners of LB R2 play each other (n/8 matches)
  // LB Round 4: winners of LB R3 vs losers from WB R3 (n/8 matches)
  // ... and so on
  //
  // Pattern: odd LB rounds are "play-in" within losers bracket
  //          even LB rounds bring in WB losers

  // Clear previous LB matches and rebuild
  // Remove previously added LB matches
  const wbMatchCount = matches.length;

  // Rebuild LB matches properly
  const lbMatches: MatchInput[] = [];
  let lbOrder = order;

  for (let lbRound = 1; lbRound <= numLBRounds; lbRound++) {
    let matchCount: number;
    const wbRoundDropping = Math.ceil(lbRound / 2) + 1; // WB round whose losers drop in

    if (lbRound % 2 === 1) {
      // Odd LB rounds: losers from a WB round enter
      // Number of matches = half the matches in the WB round they come from
      if (lbRound === 1) {
        // LB R1: losers from WB R1 play each other
        matchCount = Math.floor(wbR1Count / 2);
      } else {
        // LB R3, R5, etc: winners of previous even LB round play each other
        const prevEvenRoundMatches = lbMatchesPerRound[lbRound - 2];
        matchCount = Math.floor(prevEvenRoundMatches / 2);
      }
    } else {
      // Even LB rounds: winners of previous odd LB round vs losers from WB round
      matchCount = lbMatchesPerRound[lbRound - 2]; // same as previous odd round
    }

    matchCount = Math.max(1, matchCount);
    lbMatchesPerRound[lbRound - 1] = matchCount;

    for (let pos = 0; pos < matchCount; pos++) {
      lbMatches.push({
        tournamentId,
        round: lbRound,
        position: pos,
        bracket: 'losers',
        player1Id: null,
        player2Id: null,
        score1: 0,
        score2: 0,
        winnerId: null,
        status: 'pending',
        nextMatchId: null,
        nextMatchPosition: null,
        isThirdPlace: false,
        order: lbOrder++,
      });
    }
  }

  matches.push(...lbMatches);
  order = lbOrder;

  // ===== GRAND FINALS =====
  // Match between WB champion and LB champion
  // Two matches if LB champion wins first (reset match)
  matches.push({
    tournamentId,
    round: numLBRounds + 1,
    position: 0,
    bracket: 'grand_finals',
    player1Id: null, // WB winner
    player2Id: null, // LB winner
    score1: 0,
    score2: 0,
    winnerId: null,
    status: 'pending',
    nextMatchId: null,
    nextMatchPosition: null,
    isThirdPlace: false,
    order: order++,
  });

  // Grand finals reset match (only played if LB winner wins first match)
  matches.push({
    tournamentId,
    round: numLBRounds + 2,
    position: 0,
    bracket: 'grand_finals',
    player1Id: null,
    player2Id: null,
    score1: 0,
    score2: 0,
    winnerId: null,
    status: 'pending',
    nextMatchId: null,
    nextMatchPosition: null,
    isThirdPlace: false,
    order: order++,
  });

  // Handle byes in WB round 1 - auto-advance
  // Players with byes should advance to WB round 2
  for (let i = 0; i < wbR1Count; i++) {
    const match = matches[i];
    if (match.status === 'completed' && match.winnerId) {
      // Find the next match in WB for this winner
      const nextPos = Math.floor(i / 2);
      const nextMatchIdx = wbR1Count + nextPos; // WB R2 starts after WB R1
      const slot: 'player1' | 'player2' = i % 2 === 0 ? 'player1' : 'player2';
      if (matches[nextMatchIdx]) {
        if (slot === 'player1') {
          matches[nextMatchIdx].player1Id = match.winnerId;
        } else {
          matches[nextMatchIdx].player2Id = match.winnerId;
        }
      }
    }
  }

  return matches;
}

/**
 * Build nextMatch links for double elimination.
 * Returns an array of link objects that map match indices to next match indices.
 */
export function buildDoubleEliminationLinks(
  size: number,
  matchIndices: { round: number; bracket: string; position: number; index: number }[]
): { matchIdx: number; nextMatchIdx: number; position: 'player1' | 'player2' }[] {
  const links: { matchIdx: number; nextMatchIdx: number; position: 'player1' | 'player2' }[] = [];
  const numWBRounds = Math.log2(size);
  const numLBRounds = 2 * numWBRounds - 2;

  const getMatchIdx = (round: number, bracket: string, position: number): number | null => {
    const found = matchIndices.find(
      (m) => m.round === round && m.bracket === bracket && m.position === position
    );
    return found ? found.index : null;
  };

  // WB links (same as single elimination)
  for (let round = 1; round < numWBRounds; round++) {
    const matchCount = size / Math.pow(2, round);
    for (let pos = 0; pos < matchCount; pos++) {
      const nextPos = Math.floor(pos / 2);
      const slot: 'player1' | 'player2' = pos % 2 === 0 ? 'player1' : 'player2';
      const from = getMatchIdx(round, 'winners', pos);
      const to = getMatchIdx(round + 1, 'winners', nextPos);
      if (from !== null && to !== null) {
        links.push({ matchIdx: from, nextMatchIdx: to, position: slot });
      }
    }
  }

  // LB links
  for (let lbRound = 1; lbRound <= numLBRounds; lbRound++) {
    const lbMatchCount = matchIndices.filter(
      (m) => m.bracket === 'losers' && m.round === lbRound
    ).length;

    if (lbRound % 2 === 1) {
      // Odd LB round: winners go to next even LB round
      for (let pos = 0; pos < lbMatchCount; pos++) {
        const from = getMatchIdx(lbRound, 'losers', pos);
        const to = getMatchIdx(lbRound + 1, 'losers', pos);
        if (from !== null && to !== null) {
          links.push({ matchIdx: from, nextMatchIdx: to, position: 'player1' });
        }
      }
    } else {
      // Even LB round: winners go to next odd LB round
      const nextLBRound = lbRound + 1;
      if (nextLBRound <= numLBRounds) {
        const nextMatchCount = matchIndices.filter(
          (m) => m.bracket === 'losers' && m.round === nextLBRound
        ).length;
        for (let pos = 0; pos < lbMatchCount; pos++) {
          const nextPos = Math.floor(pos / 2);
          const from = getMatchIdx(lbRound, 'losers', pos);
          const to = getMatchIdx(nextLBRound, 'losers', nextPos);
          const slot: 'player1' | 'player2' = pos % 2 === 0 ? 'player1' : 'player2';
          if (from !== null && to !== null) {
            links.push({ matchIdx: from, nextMatchIdx: to, position: slot });
          }
        }
      }
    }
  }

  // WB losers drop to LB
  for (let wbRound = 1; wbRound <= numWBRounds; wbRound++) {
    const wbMatchCount = size / Math.pow(2, wbRound);
    // Losers from WB round R drop to LB round (2R - 1) for R=1, or (2R-2) for R>1
    // Actually: WB R1 losers -> LB R1, WB R2 losers -> LB R2, WB R3 losers -> LB R4, etc.
    const lbRound = wbRound <= 1 ? 1 : wbRound * 2 - 2;
    if (lbRound > numLBRounds) continue;

    for (let pos = 0; pos < wbMatchCount; pos++) {
      const from = getMatchIdx(wbRound, 'winners', pos);
      const lbPos = wbRound === 1 ? Math.floor(pos / 2) : pos;
      const to = getMatchIdx(lbRound, 'losers', lbPos);
      if (from !== null && to !== null) {
        // WB loser goes to player2 slot in LB match
        links.push({ matchIdx: from, nextMatchIdx: to, position: 'player2' });
      }
    }
  }

  // LB final winner -> Grand Finals player2
  const lbFinalIdx = getMatchIdx(numLBRounds, 'losers', 0);
  const gfIdx = getMatchIdx(1, 'grand_finals', 0);
  if (lbFinalIdx !== null && gfIdx !== null) {
    links.push({ matchIdx: lbFinalIdx, nextMatchIdx: gfIdx, position: 'player2' });
  }

  // WB final winner -> Grand Finals player1
  const wbFinalIdx = getMatchIdx(numWBRounds, 'winners', 0);
  if (wbFinalIdx !== null && gfIdx !== null) {
    links.push({ matchIdx: wbFinalIdx, nextMatchIdx: gfIdx, position: 'player1' });
  }

  // GF1 -> GF Reset (if LB winner wins)
  const gfResetIdx = getMatchIdx(2, 'grand_finals', 0);
  if (gfIdx !== null && gfResetIdx !== null) {
    links.push({ matchIdx: gfIdx, nextMatchIdx: gfResetIdx, position: 'player1' });
  }

  return links;
}

/**
 * Generate round robin bracket
 * Uses the circle method for scheduling
 */
export function generateRoundRobin(
  participants: Participant[],
  tournamentId: string
): MatchInput[] {
  const n = participants.length;
  if (n < 2) return [];

  const matches: MatchInput[] = [];
  let order = 0;

  // Circle method: fix one participant, rotate the rest
  const players = [...participants];
  let hasBye = false;

  // If odd number, add a bye
  if (n % 2 !== 0) {
    players.push({
      id: 'bye',
      name: 'BYE',
      seed: 999,
      active: false,
      tournamentId,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as Participant);
    hasBye = true;
  }

  const totalPlayers = players.length;
  const numRounds = totalPlayers - 1;
  const matchesPerRound = totalPlayers / 2;

  // Create a list of indices to rotate
  const indices = Array.from({ length: totalPlayers }, (_, i) => i);

  for (let round = 0; round < numRounds; round++) {
    for (let match = 0; match < matchesPerRound; match++) {
      const p1Idx = indices[match];
      const p2Idx = indices[totalPlayers - 1 - match];

      const p1 = players[p1Idx];
      const p2 = players[p2Idx];

      // Skip bye matches
      if (p1.id === 'bye' || p2.id === 'bye') {
        continue;
      }

      matches.push({
        tournamentId,
        round: round + 1,
        position: match,
        bracket: 'winners',
        player1Id: p1.id,
        player2Id: p2.id,
        score1: 0,
        score2: 0,
        winnerId: null,
        status: 'pending',
        nextMatchId: null,
        nextMatchPosition: null,
        isThirdPlace: false,
        order: order++,
      });
    }

    // Rotate: keep index 0 fixed, rotate the rest
    const last = indices[totalPlayers - 1];
    for (let i = totalPlayers - 1; i > 1; i--) {
      indices[i] = indices[i - 1];
    }
    indices[1] = last;
  }

  return matches;
}

/**
 * Generate Swiss system bracket - first round only
 * Subsequent rounds are generated after all matches in current round complete
 */
export function generateSwiss(
  participants: Participant[],
  tournamentId: string,
  rounds: number
): MatchInput[] {
  const n = participants.length;
  if (n < 2) return [];

  const matches: MatchInput[] = [];
  let order = 0;

  // First round: random pairing (or seed-based)
  const shuffled = [...participants].sort(() => Math.random() - 0.5);

  // If odd, one player gets a bye
  const hasBye = n % 2 !== 0;
  const pairedPlayers = hasBye ? shuffled.slice(0, n - 1) : shuffled;
  // The last player in odd count gets a bye (no match needed for round 1)

  const matchCount = Math.floor(pairedPlayers.length / 2);

  for (let i = 0; i < matchCount; i++) {
    const p1 = pairedPlayers[i * 2];
    const p2 = pairedPlayers[i * 2 + 1];

    matches.push({
      tournamentId,
      round: 1,
      position: i,
      bracket: 'winners',
      player1Id: p1.id,
      player2Id: p2.id,
      score1: 0,
      score2: 0,
      winnerId: null,
      status: 'pending',
      nextMatchId: null,
      nextMatchPosition: null,
      isThirdPlace: false,
      order: order++,
    });
  }

  return matches;
}

/**
 * Generate next Swiss round based on current standings
 */
export function generateSwissRound(
  participants: Participant[],
  tournamentId: string,
  currentRound: number,
  completedMatches: {
    player1Id: string | null;
    player2Id: string | null;
    winnerId: string | null;
    score1: number;
    score2: number;
  }[]
): MatchInput[] {
  const n = participants.length;
  if (n < 2) return [];

  // Calculate standings (wins)
  const wins: Map<string, number> = new Map();
  const played: Map<string, Set<string>> = new Map(); // track who played whom

  participants.forEach((p) => {
    wins.set(p.id, 0);
    played.set(p.id, new Set());
  });

  completedMatches.forEach((m) => {
    if (m.player1Id && m.player2Id) {
      played.get(m.player1Id)?.add(m.player2Id);
      played.get(m.player2Id)?.add(m.player1Id);

      if (m.winnerId) {
        wins.set(m.winnerId, (wins.get(m.winnerId) || 0) + 1);
      }
    }
  });

  // Sort by wins (descending), then by name for tiebreak
  const sorted = [...participants].sort((a, b) => {
    const aWins = wins.get(a.id) || 0;
    const bWins = wins.get(b.id) || 0;
    if (bWins !== aWins) return bWins - aWins;
    return a.name.localeCompare(b.name);
  });

  const matches: MatchInput[] = [];
  let order = 0;
  const paired = new Set<string>();

  for (let i = 0; i < sorted.length; i++) {
    const p1 = sorted[i];
    if (paired.has(p1.id)) continue;

    // Find the next unpaired player with similar record that p1 hasn't played
    for (let j = i + 1; j < sorted.length; j++) {
      const p2 = sorted[j];
      if (paired.has(p2.id)) continue;
      if (played.get(p1.id)?.has(p2.id)) continue;

      // Pair them
      paired.add(p1.id);
      paired.add(p2.id);

      matches.push({
        tournamentId,
        round: currentRound,
        position: matches.length,
        bracket: 'winners',
        player1Id: p1.id,
        player2Id: p2.id,
        score1: 0,
        score2: 0,
        winnerId: null,
        status: 'pending',
        nextMatchId: null,
        nextMatchPosition: null,
        isThirdPlace: false,
        order: order++,
      });
      break;
    }
  }

  return matches;
}
