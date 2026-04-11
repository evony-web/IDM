"use client";

import { useState, useMemo, useCallback } from "react";
import { MatchCard, type MatchCardPlayer } from "@/components/match-card";
import { ScoreDialog } from "@/components/score-dialog";
import { StandingsTable, type StandingEntry } from "@/components/standings-table";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Trophy, Swords, Crown, ChevronLeft, ChevronRight } from "lucide-react";

export interface BracketMatch {
  id: string;
  matchNumber: number;
  round: number;
  roundName: string;
  position: number;
  player1Id: string | null;
  player1Name: string | null;
  player1Score: number | null;
  player1IsWinner: boolean;
  player2Id: string | null;
  player2Name: string | null;
  player2Score: number | null;
  player2IsWinner: boolean;
  isCompleted: boolean;
  bracket: "winners" | "losers" | "grand_finals" | "main";
  isBye: boolean;
}

interface BracketViewerProps {
  matches: BracketMatch[];
  format: "single_elimination" | "double_elimination" | "round_robin" | "swiss";
  onUpdateScore: (matchId: string, p1Score: number, p2Score: number) => void;
  isUpdating?: boolean;
}

// Compute standings from round-robin/swiss matches
function computeStandings(
  matches: BracketMatch[]
): StandingEntry[] {
  const stats: Record<
    string,
    {
      name: string;
      wins: number;
      losses: number;
      draws: number;
      points: number;
    }
  > = {};

  for (const match of matches) {
    if (!match.isCompleted) continue;
    if (!match.player1Id || !match.player2Id) continue;

    if (!stats[match.player1Id]) {
      stats[match.player1Id] = {
        name: match.player1Name || "Unknown",
        wins: 0,
        losses: 0,
        draws: 0,
        points: 0,
      };
    }
    if (!stats[match.player2Id]) {
      stats[match.player2Id] = {
        name: match.player2Name || "Unknown",
        wins: 0,
        losses: 0,
        draws: 0,
        points: 0,
      };
    }

    const s1 = match.player1Score ?? 0;
    const s2 = match.player2Score ?? 0;

    if (s1 > s2) {
      stats[match.player1Id].wins++;
      stats[match.player1Id].points += 3;
      stats[match.player2Id].losses++;
    } else if (s2 > s1) {
      stats[match.player2Id].wins++;
      stats[match.player2Id].points += 3;
      stats[match.player1Id].losses++;
    } else {
      stats[match.player1Id].draws++;
      stats[match.player1Id].points += 1;
      stats[match.player2Id].draws++;
      stats[match.player2Id].points += 1;
    }
  }

  const entries: StandingEntry[] = Object.entries(stats).map(
    ([id, s]) => ({
      rank: 0,
      participantId: id,
      name: s.name,
      wins: s.wins,
      losses: s.losses,
      draws: s.draws,
      points: s.points,
      matchDifference: s.wins - s.losses,
    })
  );

  entries.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    return b.matchDifference - a.matchDifference;
  });

  entries.forEach((e, i) => (e.rank = i + 1));
  return entries;
}

export function BracketViewer({
  matches,
  format,
  onUpdateScore,
  isUpdating = false,
}: BracketViewerProps) {
  const [selectedMatch, setSelectedMatch] = useState<BracketMatch | null>(null);
  const [rrRound, setRrRound] = useState(1);

  const roundNames = useMemo(() => {
    const names: Record<number, string> = {};
    for (const match of matches) {
      if (!names[match.round]) {
        names[match.round] = match.roundName;
      }
    }
    return names;
  }, [matches]);

  // Group matches by round and bracket
  const groupedMatches = useMemo(() => {
    if (format === "single_elimination" || format === "double_elimination") {
      const groups: Record<string, BracketMatch[]> = {};

      for (const match of matches) {
        const key =
          format === "double_elimination"
            ? `${match.bracket}_r${match.round}`
            : `r${match.round}`;
        if (!groups[key]) groups[key] = [];
        groups[key].push(match);
      }

      // Sort matches within each group by position
      for (const key of Object.keys(groups)) {
        groups[key].sort((a, b) => a.position - b.position);
      }

      return groups;
    }
    return {};
  }, [matches, format]);

  // Get round numbers sorted
  const roundKeys = useMemo(() => {
    return Object.keys(groupedMatches).sort((a, b) => {
      const aBracket = a.startsWith("losers") ? 1 : a.startsWith("grand") ? 2 : 0;
      const bBracket = b.startsWith("losers") ? 1 : b.startsWith("grand") ? 2 : 0;
      if (aBracket !== bBracket) return aBracket - bBracket;

      const aRound = parseInt(a.split("r")[1] || "0");
      const bRound = parseInt(b.split("r")[1] || "0");
      return aRound - bRound;
    });
  }, [groupedMatches]);

  // Round-robin: group matches by round
  const rrMatches = useMemo(() => {
    if (format !== "round_robin" && format !== "swiss") return {};
    const groups: Record<number, BracketMatch[]> = {};
    for (const match of matches) {
      if (!groups[match.round]) groups[match.round] = [];
      groups[match.round].push(match);
    }
    return groups;
  }, [matches, format]);

  const rrRounds = useMemo(
    () =>
      Object.keys(rrMatches)
        .map(Number)
        .sort((a, b) => a - b),
    [rrMatches]
  );

  const standings = useMemo(() => {
    if (format !== "round_robin" && format !== "swiss") return [];
    return computeStandings(matches);
  }, [matches, format]);

  const handleMatchClick = useCallback((match: BracketMatch) => {
    if (match.isBye) return;
    if (!match.player1Id || !match.player2Id) return;
    setSelectedMatch(match);
  }, []);

  const handleSaveScore = useCallback(
    (matchId: string, p1Score: number, p2Score: number) => {
      onUpdateScore(matchId, p1Score, p2Score);
      setSelectedMatch(null);
    },
    [onUpdateScore]
  );

  // --- Elimination bracket rendering ---
  const renderEliminationBracket = () => {
    // Split into bracket sections for double elimination
    const winnersKeys = roundKeys.filter(
      (k) => !k.startsWith("losers") && !k.startsWith("grand")
    );
    const losersKeys = roundKeys.filter((k) => k.startsWith("losers"));
    const grandFinalsKeys = roundKeys.filter((k) => k.startsWith("grand"));

    return (
      <div className="space-y-8">
        {/* Winners Bracket */}
        {winnersKeys.length > 0 && (
          <div>
            {format === "double_elimination" && (
              <div className="flex items-center gap-2 mb-4">
                <Trophy className="size-5 text-emerald-500" />
                <h3 className="text-lg font-semibold">Winners Bracket</h3>
              </div>
            )}
            <ScrollArea className="w-full">
              <div className="flex gap-8 pb-4 min-w-max">
                {winnersKeys.map((key) => {
                  const roundMatches = groupedMatches[key];
                  const roundNum = parseInt(key.split("r")[1] || "0");
                  const roundName =
                    roundNames[roundNum] || `Round ${roundNum}`;

                  return (
                    <div key={key} className="flex flex-col gap-6 min-w-[220px]">
                      <div className="text-center">
                        <Badge
                          variant="outline"
                          className="text-xs font-medium"
                        >
                          {roundName}
                        </Badge>
                      </div>
                      <div className="flex flex-col justify-around flex-1 gap-6">
                        {roundMatches.map((match) => {
                          const p1: MatchCardPlayer = {
                            id: match.player1Id || "",
                            name: match.player1Name || "",
                            score: match.player1Score,
                            isWinner: match.player1IsWinner,
                            isBye: !match.player1Id && match.isBye,
                          };
                          const p2: MatchCardPlayer = {
                            id: match.player2Id || "",
                            name: match.player2Name || "",
                            score: match.player2Score,
                            isWinner: match.player2IsWinner,
                            isBye: !match.player2Id && match.isBye,
                          };

                          return (
                            <MatchCard
                              key={match.id}
                              matchNumber={match.matchNumber}
                              player1={match.player1Id ? p1 : null}
                              player2={match.player2Id ? p2 : null}
                              round={roundName}
                              isCompleted={match.isCompleted}
                              isPending={
                                !match.isCompleted &&
                                (!match.player1Id || !match.player2Id)
                              }
                              onClick={() => handleMatchClick(match)}
                            />
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          </div>
        )}

        {/* Losers Bracket */}
        {losersKeys.length > 0 && (
          <div>
            <Separator className="my-6" />
            <div className="flex items-center gap-2 mb-4">
              <Swords className="size-5 text-orange-500" />
              <h3 className="text-lg font-semibold">Losers Bracket</h3>
            </div>
            <ScrollArea className="w-full">
              <div className="flex gap-8 pb-4 min-w-max">
                {losersKeys.map((key) => {
                  const roundMatches = groupedMatches[key];
                  const roundNum = parseInt(key.split("r")[1] || "0");
                  const roundName =
                    roundNames[roundNum] || `Losers Round ${roundNum}`;

                  return (
                    <div key={key} className="flex flex-col gap-6 min-w-[220px]">
                      <div className="text-center">
                        <Badge
                          variant="outline"
                          className="text-xs font-medium border-orange-500/50 text-orange-500"
                        >
                          {roundName}
                        </Badge>
                      </div>
                      <div className="flex flex-col justify-around flex-1 gap-6">
                        {roundMatches.map((match) => {
                          const p1: MatchCardPlayer = {
                            id: match.player1Id || "",
                            name: match.player1Name || "",
                            score: match.player1Score,
                            isWinner: match.player1IsWinner,
                            isBye: !match.player1Id && match.isBye,
                          };
                          const p2: MatchCardPlayer = {
                            id: match.player2Id || "",
                            name: match.player2Name || "",
                            score: match.player2Score,
                            isWinner: match.player2IsWinner,
                            isBye: !match.player2Id && match.isBye,
                          };

                          return (
                            <MatchCard
                              key={match.id}
                              matchNumber={match.matchNumber}
                              player1={match.player1Id ? p1 : null}
                              player2={match.player2Id ? p2 : null}
                              round={roundName}
                              isCompleted={match.isCompleted}
                              isPending={
                                !match.isCompleted &&
                                (!match.player1Id || !match.player2Id)
                              }
                              onClick={() => handleMatchClick(match)}
                            />
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          </div>
        )}

        {/* Grand Finals */}
        {grandFinalsKeys.length > 0 && (
          <div>
            <Separator className="my-6" />
            <div className="flex items-center gap-2 mb-4">
              <Crown className="size-5 text-yellow-500" />
              <h3 className="text-lg font-semibold">Grand Finals</h3>
            </div>
            <div className="flex justify-center">
              <div className="flex gap-8">
                {grandFinalsKeys.map((key) => {
                  const roundMatches = groupedMatches[key];
                  const roundNum = parseInt(key.split("r")[1] || "0");
                  const roundName = roundNames[roundNum] || "Grand Finals";

                  return (
                    <div key={key} className="flex flex-col gap-4 min-w-[240px]">
                      <div className="text-center">
                        <Badge className="bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 border-yellow-500/50 text-xs font-medium">
                          {roundName}
                        </Badge>
                      </div>
                      {roundMatches.map((match) => {
                        const p1: MatchCardPlayer = {
                          id: match.player1Id || "",
                          name: match.player1Name || "",
                          score: match.player1Score,
                          isWinner: match.player1IsWinner,
                          isBye: false,
                        };
                        const p2: MatchCardPlayer = {
                          id: match.player2Id || "",
                          name: match.player2Name || "",
                          score: match.player2Score,
                          isWinner: match.player2IsWinner,
                          isBye: false,
                        };

                        return (
                          <Card
                            key={match.id}
                            className="border-yellow-500/30 bg-yellow-500/5"
                          >
                            <MatchCard
                              matchNumber={match.matchNumber}
                              player1={p1}
                              player2={p2}
                              round={roundName}
                              isCompleted={match.isCompleted}
                              isPending={false}
                              onClick={() => handleMatchClick(match)}
                            />
                          </Card>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // --- Round Robin / Swiss rendering ---
  const renderRoundRobin = () => {
    const currentRoundMatches = rrMatches[rrRound] || [];

    return (
      <div className="space-y-6">
        {/* Round navigation */}
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">
            {format === "swiss" ? "Swiss" : "Round Robin"} - Round {rrRound}
          </h3>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setRrRound((r) => Math.max(1, r - 1))}
              disabled={rrRound <= 1}
            >
              <ChevronLeft className="size-4" />
            </Button>
            <span className="text-sm text-muted-foreground min-w-[80px] text-center">
              Round {rrRound} / {rrRounds.length || 1}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setRrRound((r) => Math.min(rrRounds.length, r + 1))
              }
              disabled={rrRound >= rrRounds.length}
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>

        {/* Matches for current round */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {currentRoundMatches.map((match) => {
            const p1: MatchCardPlayer = {
              id: match.player1Id || "",
              name: match.player1Name || "",
              score: match.player1Score,
              isWinner: match.player1IsWinner,
              isBye: false,
            };
            const p2: MatchCardPlayer = {
              id: match.player2Id || "",
              name: match.player2Name || "",
              score: match.player2Score,
              isWinner: match.player2IsWinner,
              isBye: false,
            };

            return (
              <MatchCard
                key={match.id}
                matchNumber={match.matchNumber}
                player1={p1}
                player2={p2}
                round={`Round ${rrRound}`}
                isCompleted={match.isCompleted}
                isPending={false}
                onClick={() => handleMatchClick(match)}
              />
            );
          })}
        </div>

        {currentRoundMatches.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            No matches scheduled for this round.
          </div>
        )}

        {/* Standings */}
        <div className="mt-8">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Trophy className="size-5 text-yellow-500" />
            Standings
          </h3>
          <StandingsTable standings={standings} />
        </div>
      </div>
    );
  };

  // Empty state
  if (matches.length === 0) {
    return (
      <div className="text-center py-12">
        <Trophy className="size-12 text-muted-foreground/30 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-muted-foreground">
          No matches generated yet
        </h3>
        <p className="text-sm text-muted-foreground/70 mt-1">
          Start the tournament to generate brackets
        </p>
      </div>
    );
  }

  return (
    <>
      {(format === "single_elimination" || format === "double_elimination")
        ? renderEliminationBracket()
        : renderRoundRobin()}

      {/* Score Dialog */}
      {selectedMatch && selectedMatch.player1Id && selectedMatch.player2Id && (
        <ScoreDialog
          open={!!selectedMatch}
          onOpenChange={(open) => !open && setSelectedMatch(null)}
          player1Name={selectedMatch.player1Name || "Player 1"}
          player2Name={selectedMatch.player2Name || "Player 2"}
          player1Score={selectedMatch.player1Score}
          player2Score={selectedMatch.player2Score}
          player1Id={selectedMatch.player1Id}
          player2Id={selectedMatch.player2Id}
          matchId={selectedMatch.id}
          allowDraw={
            format === "round_robin" || format === "swiss"
          }
          onSave={handleSaveScore}
          isSaving={isUpdating}
        />
      )}
    </>
  );
}
