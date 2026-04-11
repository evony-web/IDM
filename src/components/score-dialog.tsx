"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { Swords } from "lucide-react";

interface ScoreDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  player1Name: string;
  player2Name: string;
  player1Score: number | null;
  player2Score: number | null;
  player1Id: string;
  player2Id: string;
  matchId: string;
  allowDraw?: boolean;
  onSave: (matchId: string, p1Score: number, p2Score: number) => void;
  isSaving?: boolean;
}

export function ScoreDialog({
  open,
  onOpenChange,
  player1Name,
  player2Name,
  player1Score,
  player2Score,
  player1Id,
  player2Id,
  matchId,
  allowDraw = false,
  onSave,
  isSaving = false,
}: ScoreDialogProps) {
  const [prevOpen, setPrevOpen] = useState(false);
  const [score1, setScore1] = useState<string>(player1Score !== null ? String(player1Score) : "");
  const [score2, setScore2] = useState<string>(player2Score !== null ? String(player2Score) : "");

  // Reset scores when dialog opens
  if (open && !prevOpen) {
    setScore1(player1Score !== null ? String(player1Score) : "");
    setScore2(player2Score !== null ? String(player2Score) : "");
  }
  if (open !== prevOpen) {
    setPrevOpen(open);
  }

  const s1 = score1 === "" ? null : parseInt(score1, 10);
  const s2 = score2 === "" ? null : parseInt(score2, 10);

  const isDraw = allowDraw && s1 !== null && s2 !== null && s1 === s2;
  const winner =
    !isDraw && s1 !== null && s2 !== null
      ? s1 > s2
        ? player1Name
        : s2 > s1
        ? player2Name
        : null
      : null;

  const canSave =
    s1 !== null &&
    s2 !== null &&
    !isNaN(s1) &&
    !isNaN(s2) &&
    s1 >= 0 &&
    s2 >= 0 &&
    (allowDraw || s1 !== s2);

  const handleSave = () => {
    if (canSave && s1 !== null && s2 !== null) {
      onSave(matchId, s1, s2);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Swords className="size-5 text-emerald-500" />
            Enter Match Score
          </DialogTitle>
          <DialogDescription>
            Enter scores for each player. The player with the higher score wins.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Player 1 score */}
          <div className="flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <Label
                htmlFor="score1"
                className="text-sm font-medium truncate block"
              >
                {player1Name}
              </Label>
            </div>
            <Input
              id="score1"
              type="number"
              min="0"
              className="w-20 text-center font-mono"
              value={score1}
              onChange={(e) => setScore1(e.target.value)}
              placeholder="0"
            />
          </div>

          {/* VS indicator */}
          <div className="flex items-center justify-center">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
              VS
            </span>
          </div>

          {/* Player 2 score */}
          <div className="flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <Label
                htmlFor="score2"
                className="text-sm font-medium truncate block"
              >
                {player2Name}
              </Label>
            </div>
            <Input
              id="score2"
              type="number"
              min="0"
              className="w-20 text-center font-mono"
              value={score2}
              onChange={(e) => setScore2(e.target.value)}
              placeholder="0"
            />
          </div>

          {/* Winner / Draw indicator */}
          {s1 !== null &&
            s2 !== null &&
            !isNaN(s1) &&
            !isNaN(s2) &&
            s1 >= 0 &&
            s2 >= 0 && (
              <div className="text-center pt-2 border-t border-border/50">
                {isDraw ? (
                  <p className="text-sm font-medium text-yellow-500">Draw</p>
                ) : winner ? (
                  <p className="text-sm">
                    Winner:{" "}
                    <span className="font-semibold text-emerald-500">
                      {winner}
                    </span>
                  </p>
                ) : null}
              </div>
            )}

          {!allowDraw && s1 !== null && s2 !== null && s1 === s2 && (
            <p className="text-xs text-destructive text-center">
              Draw is not allowed in elimination format. Scores must differ.
            </p>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={!canSave || isSaving}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {isSaving ? "Saving..." : "Save Score"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
