"use client";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

export interface MatchCardPlayer {
  id: string;
  name: string;
  score: number | null;
  isWinner: boolean;
  isBye: boolean;
}

interface MatchCardProps {
  matchNumber: number;
  player1: MatchCardPlayer | null;
  player2: MatchCardPlayer | null;
  round: string;
  isCompleted: boolean;
  isPending: boolean;
  onClick?: () => void;
}

export function MatchCard({
  matchNumber,
  player1,
  player2,
  round,
  isCompleted,
  isPending,
  onClick,
}: MatchCardProps) {
  const isByeMatch = (player1?.isBye || player2?.isBye) ?? false;

  return (
    <Card
      className={cn(
        "match-card-hover cursor-pointer min-w-[220px] w-full overflow-hidden border",
        isByeMatch && "bye-match opacity-60 cursor-default",
        !isByeMatch && onClick && "hover:border-emerald-500/50",
        isCompleted && "border-border/50"
      )}
      onClick={!isByeMatch ? onClick : undefined}
    >
      {/* Match header */}
      <div className="flex items-center justify-between px-3 py-1 bg-muted/50 border-b border-border/50">
        <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
          {round}
        </span>
        <Badge
          variant="outline"
          className="text-[10px] h-4 px-1.5 font-mono"
        >
          M{matchNumber}
        </Badge>
      </div>

      {/* Player 1 */}
      <div
        className={cn(
          "flex items-center justify-between px-3 py-2 border-b border-border/30 transition-colors",
          player1?.isWinner && "bg-emerald-500/10"
        )}
      >
        <div className="flex items-center gap-2 min-w-0">
          {player1?.isWinner && isCompleted && (
            <Check className="size-3.5 text-emerald-500 shrink-0" />
          )}
          <span
            className={cn(
              "text-sm truncate",
              player1?.isBye
                ? "text-muted-foreground italic"
                : player1?.isWinner && isCompleted
                ? "text-emerald-400 font-semibold"
                : "text-foreground",
              !player1 && "text-muted-foreground italic"
            )}
          >
            {player1?.isBye
              ? "BYE"
              : player1?.name || (isPending ? "?" : "TBD")}
          </span>
        </div>
        <span
          className={cn(
            "text-sm font-mono font-semibold shrink-0 ml-2",
            player1?.isWinner && isCompleted
              ? "text-emerald-400"
              : "text-muted-foreground",
            player1?.score === null && "text-muted-foreground/50"
          )}
        >
          {player1?.score !== null && player1?.score !== undefined
            ? player1.score
            : "-"}
        </span>
      </div>

      {/* Player 2 */}
      <div
        className={cn(
          "flex items-center justify-between px-3 py-2 transition-colors",
          player2?.isWinner && "bg-emerald-500/10"
        )}
      >
        <div className="flex items-center gap-2 min-w-0">
          {player2?.isWinner && isCompleted && (
            <Check className="size-3.5 text-emerald-500 shrink-0" />
          )}
          <span
            className={cn(
              "text-sm truncate",
              player2?.isBye
                ? "text-muted-foreground italic"
                : player2?.isWinner && isCompleted
                ? "text-emerald-400 font-semibold"
                : "text-foreground",
              !player2 && "text-muted-foreground italic"
            )}
          >
            {player2?.isBye
              ? "BYE"
              : player2?.name || (isPending ? "?" : "TBD")}
          </span>
        </div>
        <span
          className={cn(
            "text-sm font-mono font-semibold shrink-0 ml-2",
            player2?.isWinner && isCompleted
              ? "text-emerald-400"
              : "text-muted-foreground",
            player2?.score === null && "text-muted-foreground/50"
          )}
        >
          {player2?.score !== null && player2?.score !== undefined
            ? player2.score
            : "-"}
        </span>
      </div>
    </Card>
  );
}
