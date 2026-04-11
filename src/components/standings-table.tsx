"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Trophy, Medal } from "lucide-react";
import { cn } from "@/lib/utils";

export interface StandingEntry {
  rank: number;
  participantId: string;
  name: string;
  wins: number;
  losses: number;
  draws: number;
  points: number;
  matchDifference: number;
}

interface StandingsTableProps {
  standings: StandingEntry[];
}

export function StandingsTable({ standings }: StandingsTableProps) {
  if (standings.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No standings available yet.
      </div>
    );
  }

  return (
    <div className="rounded-lg border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="w-12 text-center">#</TableHead>
            <TableHead>Player</TableHead>
            <TableHead className="text-center w-16">W</TableHead>
            <TableHead className="text-center w-16">L</TableHead>
            <TableHead className="text-center w-16">D</TableHead>
            <TableHead className="text-center w-16">Pts</TableHead>
            <TableHead className="text-center w-16">MD</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {standings.map((entry, index) => (
            <TableRow
              key={entry.participantId}
              className={cn(
                "transition-colors",
                index === 0 && "bg-emerald-500/5",
                index === 1 && "bg-yellow-500/5",
                index === 2 && "bg-orange-500/5"
              )}
            >
              <TableCell className="text-center font-mono">
                {entry.rank <= 3 ? (
                  <div className="flex items-center justify-center">
                    {entry.rank === 1 && (
                      <Trophy className="size-4 text-yellow-500" />
                    )}
                    {entry.rank === 2 && (
                      <Medal className="size-4 text-gray-400" />
                    )}
                    {entry.rank === 3 && (
                      <Medal className="size-4 text-orange-600" />
                    )}
                  </div>
                ) : (
                  <span className="text-muted-foreground">{entry.rank}</span>
                )}
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{entry.name}</span>
                  {entry.rank === 1 && (
                    <Badge className="bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 text-[10px] h-4 px-1 border-0">
                      1st
                    </Badge>
                  )}
                </div>
              </TableCell>
              <TableCell className="text-center">
                <span className="text-emerald-500 font-semibold">
                  {entry.wins}
                </span>
              </TableCell>
              <TableCell className="text-center">
                <span className="text-destructive font-semibold">
                  {entry.losses}
                </span>
              </TableCell>
              <TableCell className="text-center">
                <span className="text-yellow-500 font-semibold">
                  {entry.draws}
                </span>
              </TableCell>
              <TableCell className="text-center font-bold font-mono">
                {entry.points}
              </TableCell>
              <TableCell className="text-center font-mono">
                <span
                  className={cn(
                    entry.matchDifference > 0 && "text-emerald-500",
                    entry.matchDifference < 0 && "text-destructive",
                    entry.matchDifference === 0 && "text-muted-foreground"
                  )}
                >
                  {entry.matchDifference > 0
                    ? `+${entry.matchDifference}`
                    : entry.matchDifference}
                </span>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
