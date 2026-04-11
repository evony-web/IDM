"use client";

import { useState, useCallback, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAppStore } from "@/lib/store";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "next-themes";
import { toast } from "@/hooks/use-toast";

// UI Components
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";

// Bracket Components
import { BracketViewer, type BracketMatch } from "@/components/bracket-viewer";

// Icons
import {
  Trophy,
  Plus,
  Users,
  Swords,
  Play,
  RotateCcw,
  Trash2,
  Edit,
  ChevronRight,
  ChevronLeft,
  Search,
  Gamepad2,
  Settings,
  X,
  Check,
  Globe,
  Lock,
  Shuffle,
  Target,
  Clock,
  Zap,
  Moon,
  Sun,
  ListOrdered,
  ArrowLeft,
} from "lucide-react";

import { cn } from "@/lib/utils";

// ─── Types (matching actual API response shapes) ─────────────────────────────

interface ApiParticipant {
  id: string;
  name: string;
  seed: number;
  active: boolean;
  tournamentId: string;
}

interface ApiMatchPlayer {
  id: string;
  name: string;
  seed: number;
}

interface ApiMatch {
  id: string;
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
  player1: ApiMatchPlayer | null;
  player2: ApiMatchPlayer | null;
  winner: ApiMatchPlayer | null;
}

interface ApiTournament {
  id: string;
  name: string;
  slug: string;
  description: string;
  format: string;
  status: string;
  gameName: string;
  isPublic: boolean;
  seeded: boolean;
  thirdPlace: boolean;
  randomize: boolean;
  maxParticipants: number;
  swissRounds: number;
  groupIdSize: number;
  holdThirdPlaceMatch: boolean;
  createdAt: string;
  updatedAt: string;
  participants?: ApiParticipant[];
  matches?: ApiMatch[];
  _count?: { participants: number; matches: number };
}

// ─── Format & Status Helpers ────────────────────────────────────────────────

const FORMAT_CONFIG: Record<
  string,
  { label: string; color: string; icon: React.ReactNode }
> = {
  single_elimination: {
    label: "Single Elim",
    color: "bg-red-500/20 text-red-400 border-red-500/30",
    icon: <Swords className="size-3" />,
  },
  double_elimination: {
    label: "Double Elim",
    color: "bg-purple-500/20 text-purple-400 border-purple-500/30",
    icon: <Swords className="size-3" />,
  },
  round_robin: {
    label: "Round Robin",
    color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    icon: <RotateCcw className="size-3" />,
  },
  swiss: {
    label: "Swiss",
    color: "bg-teal-500/20 text-teal-400 border-teal-500/30",
    icon: <Target className="size-3" />,
  },
};

const STATUS_CONFIG: Record<
  string,
  { label: string; color: string; icon: React.ReactNode }
> = {
  pending: {
    label: "Pending",
    color: "bg-yellow-500/20 text-yellow-500 border-yellow-500/30",
    icon: <Clock className="size-3" />,
  },
  in_progress: {
    label: "Live",
    color: "bg-emerald-500/20 text-emerald-500 border-emerald-500/30",
    icon: <Zap className="size-3" />,
  },
  completed: {
    label: "Completed",
    color: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    icon: <Check className="size-3" />,
  },
};

// ─── Round Name Helper ──────────────────────────────────────────────────────

function getRoundName(
  round: number,
  totalRounds: number,
  bracket: string
): string {
  if (bracket === "grand_finals") return "Grand Finals";
  if (bracket === "losers") return `Losers Round ${round}`;

  const remaining = totalRounds - round;
  if (remaining === 0) return "Finals";
  if (remaining === 1) return "Semi-Finals";
  if (remaining === 2) return "Quarter-Finals";
  return `Round ${round}`;
}

// ─── Transform API matches to BracketMatch ──────────────────────────────────

function transformMatches(matches: ApiMatch[]): BracketMatch[] {
  if (!matches || matches.length === 0) return [];

  // Calculate total rounds per bracket
  const maxRounds: Record<string, number> = {};
  for (const m of matches) {
    maxRounds[m.bracket] = Math.max(maxRounds[m.bracket] || 0, m.round);
  }

  return matches.map((m, idx) => ({
    id: m.id,
    matchNumber: idx + 1,
    round: m.round,
    roundName: getRoundName(m.round, maxRounds[m.bracket] || m.round, m.bracket),
    position: m.position,
    player1Id: m.player1Id,
    player1Name: m.player1?.name || null,
    player1Score: m.status === "pending" && !m.player1Id && !m.player2Id ? null : m.score1,
    player1IsWinner: m.winnerId === m.player1Id,
    player2Id: m.player2Id,
    player2Name: m.player2?.name || null,
    player2Score: m.status === "pending" && !m.player1Id && !m.player2Id ? null : m.score2,
    player2IsWinner: m.winnerId === m.player2Id,
    isCompleted: m.status === "completed",
    bracket: m.bracket as "winners" | "losers" | "grand_finals" | "main",
    isBye: m.status === "completed" && (!m.player1Id || !m.player2Id),
  }));
}

// ─── API Helpers ────────────────────────────────────────────────────────────

async function fetchApi<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Request failed" }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

// ─── Main Page Component ────────────────────────────────────────────────────

export default function Home() {
  const { view, selectedTournamentId, setView, selectTournament, goHome } =
    useAppStore();
  const { theme, setTheme } = useTheme();

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <button
            onClick={goHome}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            <Trophy className="size-6 text-emerald-500" />
            <span className="text-xl font-bold tracking-tight">Brackito</span>
          </button>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="size-9"
            >
              {theme === "dark" ? (
                <Sun className="size-4" />
              ) : (
                <Moon className="size-4" />
              )}
            </Button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-6">
        <AnimatePresence mode="wait">
          {view === "home" && (
            <motion.div
              key="home"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              <HomeView />
            </motion.div>
          )}
          {view === "create" && (
            <motion.div
              key="create"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              <CreateTournamentView />
            </motion.div>
          )}
          {view === "tournament" && selectedTournamentId && (
            <motion.div
              key="tournament"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              <TournamentDetailView tournamentId={selectedTournamentId} />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/50 py-4 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 text-center text-sm text-muted-foreground">
          Brackito &copy; 2025 | Powered by AI
        </div>
      </footer>
    </div>
  );
}

// ─── Home View ──────────────────────────────────────────────────────────────

function HomeView() {
  const { setView } = useAppStore();
  const [search, setSearch] = useState("");

  const {
    data: tournaments = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["tournaments"],
    queryFn: async () => {
      const res = await fetchApi<{ tournaments: ApiTournament[]; pagination: unknown }>(
        "/api/tournaments"
      );
      return res.tournaments;
    },
  });

  const filtered = tournaments.filter(
    (t) =>
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      (t.gameName || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Hero section */}
      <div className="text-center py-8 sm:py-12">
        <div className="flex items-center justify-center gap-3 mb-4">
          <Trophy className="size-10 text-emerald-500" />
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
            Brackito
          </h1>
        </div>
        <p className="text-muted-foreground text-lg max-w-md mx-auto">
          Create and manage tournaments with ease. All formats supported.
        </p>
      </div>

      {/* Search + Create */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search tournaments..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Button
          onClick={() => setView("create")}
          className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
        >
          <Plus className="size-4" />
          Create Tournament
        </Button>
      </div>

      {/* Tournament List */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="p-4">
              <Skeleton className="h-6 w-3/4 mb-3" />
              <Skeleton className="h-4 w-1/2 mb-2" />
              <Skeleton className="h-4 w-1/3" />
            </Card>
          ))}
        </div>
      ) : error ? (
        <Card className="p-8 text-center">
          <p className="text-destructive">Failed to load tournaments</p>
          <p className="text-sm text-muted-foreground mt-1">{error.message}</p>
        </Card>
      ) : filtered.length === 0 ? (
        <Card className="p-12 text-center">
          <Trophy className="size-16 text-muted-foreground/20 mx-auto mb-4" />
          <h3 className="text-xl font-semibold mb-2">
            {search ? "No tournaments found" : "No tournaments yet"}
          </h3>
          <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
            {search
              ? "Try a different search term"
              : "Create your first tournament and start competing!"}
          </p>
          {!search && (
            <Button
              onClick={() => setView("create")}
              className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
            >
              <Plus className="size-4" />
              Create Your First Tournament
            </Button>
          )}
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((t) => {
            const formatCfg = FORMAT_CONFIG[t.format] || FORMAT_CONFIG.single_elimination;
            const statusCfg = STATUS_CONFIG[t.status] || STATUS_CONFIG.pending;
            const participantCount = t._count?.participants ?? t.participants?.length ?? 0;

            return (
              <Card
                key={t.id}
                className="match-card-hover cursor-pointer group border-border/50 hover:border-emerald-500/40 transition-all"
                onClick={() => useAppStore.getState().selectTournament(t.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="font-semibold text-base line-clamp-1 group-hover:text-emerald-500 transition-colors">
                      {t.name}
                    </h3>
                  </div>

                  {t.gameName && (
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground mb-3">
                      <Gamepad2 className="size-3.5" />
                      <span>{t.gameName}</span>
                    </div>
                  )}

                  <div className="flex items-center gap-2 flex-wrap mb-3">
                    <Badge
                      variant="outline"
                      className={cn("text-[11px] gap-1", formatCfg.color)}
                    >
                      {formatCfg.icon}
                      {formatCfg.label}
                    </Badge>
                    <Badge
                      variant="outline"
                      className={cn("text-[11px] gap-1", statusCfg.color)}
                    >
                      {statusCfg.icon}
                      {statusCfg.label}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <Users className="size-3.5" />
                      <span>
                        {participantCount}
                        {t.maxParticipants > 0
                          ? ` / ${t.maxParticipants}`
                          : ""}{" "}
                        players
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {t.isPublic ? (
                        <Globe className="size-3.5" />
                      ) : (
                        <Lock className="size-3.5" />
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Create Tournament View ─────────────────────────────────────────────────

function CreateTournamentView() {
  const { setView } = useAppStore();
  const queryClient = useQueryClient();

  // Form state
  const [name, setName] = useState("");
  const [gameName, setGameName] = useState("");
  const [description, setDescription] = useState("");
  const [format, setFormat] = useState<
    "single_elimination" | "double_elimination" | "round_robin" | "swiss"
  >("single_elimination");
  const [maxParticipants, setMaxParticipants] = useState(8);
  const [isPublic, setIsPublic] = useState(true);
  const [seeded, setSeeded] = useState(false);
  const [randomize, setRandomize] = useState(false);
  const [holdThirdPlaceMatch, setHoldThirdPlaceMatch] = useState(false);
  const [swissRounds, setSwissRounds] = useState(3);
  const [participants, setParticipants] = useState<string[]>([]);
  const [newParticipant, setNewParticipant] = useState("");
  const [bulkInput, setBulkInput] = useState("");
  const [showBulk, setShowBulk] = useState(false);
  const [startImmediately, setStartImmediately] = useState(false);

  const createMutation = useMutation({
    mutationFn: async () => {
      // 1. Create the tournament
      const res = await fetchApi<{ tournament: ApiTournament }>("/api/tournaments", {
        method: "POST",
        body: JSON.stringify({
          name,
          gameName,
          description,
          format,
          maxParticipants,
          isPublic,
          seeded,
          randomize,
          holdThirdPlaceMatch,
          swissRounds,
        }),
      });
      const tournament = res.tournament;

      // 2. Add participants if any
      if (participants.length > 0) {
        await fetchApi(`/api/tournaments/${tournament.id}/participants`, {
          method: "POST",
          body: JSON.stringify({
            participants: participants.map((p, idx) => ({ name: p, seed: idx + 1 })),
          }),
        });
      }

      // 3. Start if requested
      if (startImmediately) {
        await fetchApi(`/api/tournaments/${tournament.id}/start`, {
          method: "POST",
        });
      }

      return tournament;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tournaments"] });
      toast({ title: "Tournament created!" });
      setView("home");
    },
    onError: (err: Error) => {
      toast({
        title: "Error creating tournament",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  const addParticipant = () => {
    const trimmed = newParticipant.trim();
    if (trimmed && !participants.includes(trimmed)) {
      setParticipants([...participants, trimmed]);
      setNewParticipant("");
    }
  };

  const addBulkParticipants = () => {
    const names = bulkInput
      .split("\n")
      .map((n) => n.trim())
      .filter((n) => n && !participants.includes(n));
    if (names.length > 0) {
      setParticipants([...participants, ...names]);
      setBulkInput("");
      setShowBulk(false);
    }
  };

  const removeParticipant = (index: number) => {
    setParticipants(participants.filter((_, i) => i !== index));
  };

  const moveParticipant = (from: number, to: number) => {
    const updated = [...participants];
    const [item] = updated.splice(from, 1);
    updated.splice(to, 0, item);
    setParticipants(updated);
  };

  const isElimination =
    format === "single_elimination" || format === "double_elimination";

  const canSubmit = name.trim().length >= 2;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => setView("home")}>
          <ArrowLeft className="size-4" />
        </Button>
        <h2 className="text-2xl font-bold">Create Tournament</h2>
      </div>

      {/* Form */}
      <Card>
        <CardContent className="p-6 space-y-5">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name">
              Tournament Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="name"
              placeholder="e.g., Spring Championship 2025"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          {/* Game Name */}
          <div className="space-y-2">
            <Label htmlFor="game">Game Name</Label>
            <Input
              id="game"
              placeholder="e.g., Super Smash Bros, Chess, Valorant"
              value={gameName}
              onChange={(e) => setGameName(e.target.value)}
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="desc">Description</Label>
            <Textarea
              id="desc"
              placeholder="Tournament details, rules, etc."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          {/* Format */}
          <div className="space-y-2">
            <Label>Format</Label>
            <div className="grid grid-cols-2 gap-2">
              {(
                Object.entries(FORMAT_CONFIG) as [
                  string,
                  { label: string; color: string; icon: React.ReactNode }
                ][]
              ).map(([key, cfg]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setFormat(key as typeof format)}
                  className={cn(
                    "flex items-center gap-2 p-3 rounded-lg border text-sm font-medium transition-all",
                    format === key
                      ? "border-emerald-500 bg-emerald-500/10 text-emerald-500"
                      : "border-border/50 text-muted-foreground hover:border-border hover:text-foreground"
                  )}
                >
                  {cfg.icon}
                  {cfg.label}
                </button>
              ))}
            </div>
          </div>

          {/* Max Participants */}
          <div className="space-y-2">
            <Label htmlFor="maxP">Max Participants (0 = unlimited)</Label>
            <Input
              id="maxP"
              type="number"
              min={0}
              value={maxParticipants}
              onChange={(e) => setMaxParticipants(parseInt(e.target.value) || 0)}
            />
          </div>

          {/* Toggles */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2">
                {isPublic ? (
                  <Globe className="size-4 text-muted-foreground" />
                ) : (
                  <Lock className="size-4 text-muted-foreground" />
                )}
                Public
              </Label>
              <Switch checked={isPublic} onCheckedChange={setIsPublic} />
            </div>
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2">
                <ListOrdered className="size-4 text-muted-foreground" />
                Seeded
              </Label>
              <Switch checked={seeded} onCheckedChange={setSeeded} />
            </div>
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2">
                <Shuffle className="size-4 text-muted-foreground" />
                Randomize Participants
              </Label>
              <Switch checked={randomize} onCheckedChange={setRandomize} />
            </div>
            {isElimination && (
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2">
                  <Trophy className="size-4 text-muted-foreground" />
                  Hold 3rd Place Match
                </Label>
                <Switch
                  checked={holdThirdPlaceMatch}
                  onCheckedChange={setHoldThirdPlaceMatch}
                />
              </div>
            )}
            {format === "swiss" && (
              <div className="flex items-center justify-between">
                <Label htmlFor="swissR" className="flex items-center gap-2">
                  <Target className="size-4 text-muted-foreground" />
                  Swiss Rounds
                </Label>
                <Input
                  id="swissR"
                  type="number"
                  min={1}
                  max={20}
                  value={swissRounds}
                  onChange={(e) =>
                    setSwissRounds(parseInt(e.target.value) || 3)
                  }
                  className="w-20"
                />
              </div>
            )}
          </div>

          <Separator />

          {/* Participants Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold flex items-center gap-2">
                <Users className="size-4" />
                Participants ({participants.length})
              </Label>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowBulk(!showBulk)}
                className="gap-1"
              >
                <Plus className="size-3" />
                Bulk Add
              </Button>
            </div>

            {/* Add single participant */}
            <div className="flex gap-2">
              <Input
                placeholder="Participant name"
                value={newParticipant}
                onChange={(e) => setNewParticipant(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addParticipant()}
              />
              <Button
                onClick={addParticipant}
                variant="outline"
                className="gap-1 shrink-0"
              >
                <Plus className="size-4" />
                Add
              </Button>
            </div>

            {/* Bulk add textarea */}
            {showBulk && (
              <div className="space-y-2">
                <Textarea
                  placeholder="One name per line"
                  value={bulkInput}
                  onChange={(e) => setBulkInput(e.target.value)}
                  rows={4}
                />
                <Button
                  onClick={addBulkParticipants}
                  size="sm"
                  className="gap-1"
                >
                  <Plus className="size-3" />
                  Add All
                </Button>
              </div>
            )}

            {/* Participant list */}
            {participants.length > 0 && (
              <ScrollArea className="max-h-64">
                <div className="space-y-1">
                  {participants.map((p, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2 p-2 rounded-md bg-muted/50 text-sm group"
                    >
                      <span className="text-xs text-muted-foreground font-mono w-6 text-center">
                        #{i + 1}
                      </span>
                      <span className="flex-1 truncate">{p}</span>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {i > 0 && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-6"
                            onClick={() => moveParticipant(i, i - 1)}
                          >
                            <ChevronLeft className="size-3" />
                          </Button>
                        )}
                        {i < participants.length - 1 && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-6"
                            onClick={() => moveParticipant(i, i + 1)}
                          >
                            <ChevronRight className="size-3" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-6 text-destructive"
                          onClick={() => removeParticipant(i)}
                        >
                          <X className="size-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>

          <Separator />

          {/* Submit options */}
          <div className="flex items-center justify-between">
            <Label className="flex items-center gap-2">
              <Play className="size-4 text-muted-foreground" />
              Start Immediately
            </Label>
            <Switch
              checked={startImmediately}
              onCheckedChange={setStartImmediately}
            />
          </div>

          {/* Submit */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => setView("home")}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={() => createMutation.mutate()}
              disabled={!canSubmit || createMutation.isPending}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
            >
              {createMutation.isPending ? (
                "Creating..."
              ) : (
                <>
                  <Trophy className="size-4" />
                  Create Tournament
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Tournament Detail View ─────────────────────────────────────────────────

function TournamentDetailView({ tournamentId }: { tournamentId: string }) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("bracket");
  const [addParticipantName, setAddParticipantName] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [resetConfirm, setResetConfirm] = useState(false);

  // Edit form state
  const [editMode, setEditMode] = useState(false);
  const [editName, setEditName] = useState("");
  const [editGame, setEditGame] = useState("");
  const [editDesc, setEditDesc] = useState("");

  const {
    data: tournament,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["tournament", tournamentId],
    queryFn: async () => {
      const res = await fetchApi<{ tournament: ApiTournament }>(
        `/api/tournaments/${tournamentId}`
      );
      return res.tournament;
    },
    enabled: !!tournamentId,
  });

  // Transform matches for bracket viewer
  const bracketMatches = useMemo(
    () => transformMatches(tournament?.matches || []),
    [tournament?.matches]
  );

  const startMutation = useMutation({
    mutationFn: () =>
      fetchApi(`/api/tournaments/${tournamentId}/start`, {
        method: "POST",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tournament", tournamentId] });
      queryClient.invalidateQueries({ queryKey: ["tournaments"] });
      toast({ title: "Tournament started!" });
    },
    onError: (err: Error) => {
      toast({
        title: "Error starting tournament",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  const resetMutation = useMutation({
    mutationFn: () =>
      fetchApi(`/api/tournaments/${tournamentId}/reset`, {
        method: "POST",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tournament", tournamentId] });
      queryClient.invalidateQueries({ queryKey: ["tournaments"] });
      toast({ title: "Tournament reset" });
      setResetConfirm(false);
    },
    onError: (err: Error) => {
      toast({
        title: "Error resetting tournament",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () =>
      fetchApi(`/api/tournaments/${tournamentId}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tournaments"] });
      toast({ title: "Tournament deleted" });
      useAppStore.getState().goHome();
    },
    onError: (err: Error) => {
      toast({
        title: "Error deleting tournament",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  const addParticipantMutation = useMutation({
    mutationFn: (name: string) =>
      fetchApi(`/api/tournaments/${tournamentId}/participants`, {
        method: "POST",
        body: JSON.stringify({ name }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tournament", tournamentId] });
      setAddParticipantName("");
      toast({ title: "Participant added" });
    },
    onError: (err: Error) => {
      toast({
        title: "Error adding participant",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  const updateScoreMutation = useMutation({
    mutationFn: ({
      matchId,
      score1,
      score2,
    }: {
      matchId: string;
      score1: number;
      score2: number;
    }) =>
      fetchApi(`/api/tournaments/${tournamentId}/matches`, {
        method: "PUT",
        body: JSON.stringify({ matchId, score1, score2 }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tournament", tournamentId] });
      toast({ title: "Score updated" });
    },
    onError: (err: Error) => {
      toast({
        title: "Error updating score",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  const updateTournamentMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      fetchApi(`/api/tournaments/${tournamentId}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tournament", tournamentId] });
      queryClient.invalidateQueries({ queryKey: ["tournaments"] });
      toast({ title: "Tournament updated" });
      setEditMode(false);
    },
    onError: (err: Error) => {
      toast({
        title: "Error updating tournament",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  const removeParticipantMutation = useMutation({
    mutationFn: (participantId: string) =>
      fetchApi(
        `/api/tournaments/${tournamentId}/participants?participantId=${participantId}`,
        { method: "DELETE" }
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tournament", tournamentId] });
      toast({ title: "Participant removed" });
    },
    onError: (err: Error) => {
      toast({
        title: "Error removing participant",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  const handleUpdateScore = useCallback(
    (matchId: string, p1Score: number, p2Score: number) => {
      updateScoreMutation.mutate({ matchId, score1: p1Score, score2: p2Score });
    },
    [updateScoreMutation]
  );

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-1/2" />
        <Skeleton className="h-8 w-1/3" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error || !tournament) {
    return (
      <Card className="p-8 text-center">
        <p className="text-destructive">
          {error?.message || "Tournament not found"}
        </p>
        <Button
          variant="outline"
          onClick={() => useAppStore.getState().goHome()}
          className="mt-4"
        >
          Go Home
        </Button>
      </Card>
    );
  }

  const formatCfg =
    FORMAT_CONFIG[tournament.format] || FORMAT_CONFIG.single_elimination;
  const statusCfg = STATUS_CONFIG[tournament.status] || STATUS_CONFIG.pending;
  const tFormat = tournament.format as
    | "single_elimination"
    | "double_elimination"
    | "round_robin"
    | "swiss";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => useAppStore.getState().goHome()}
          >
            <ArrowLeft className="size-4" />
          </Button>
          <div>
            <h2 className="text-2xl font-bold">{tournament.name}</h2>
            {tournament.gameName && (
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-1">
                <Gamepad2 className="size-3.5" />
                {tournament.gameName}
              </div>
            )}
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <Badge
                variant="outline"
                className={cn("text-[11px] gap-1", formatCfg.color)}
              >
                {formatCfg.icon}
                {formatCfg.label}
              </Badge>
              <Badge
                variant="outline"
                className={cn("text-[11px] gap-1", statusCfg.color)}
              >
                {statusCfg.icon}
                {statusCfg.label}
              </Badge>
              <Badge variant="outline" className="text-[11px] gap-1">
                <Users className="size-3" />
                {tournament.participants?.length ?? 0} players
              </Badge>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {tournament.status === "pending" && (
            <Button
              onClick={() => startMutation.mutate()}
              disabled={startMutation.isPending}
              className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
            >
              <Play className="size-4" />
              Start
            </Button>
          )}
          {tournament.status !== "pending" && (
            <Button
              variant="outline"
              onClick={() => setResetConfirm(true)}
              className="gap-2"
            >
              <RotateCcw className="size-4" />
              Reset
            </Button>
          )}
        </div>
      </div>

      {tournament.description && (
        <p className="text-sm text-muted-foreground max-w-2xl">
          {tournament.description}
        </p>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="bracket" className="gap-1.5">
            <Swords className="size-3.5" />
            Bracket
          </TabsTrigger>
          <TabsTrigger value="participants" className="gap-1.5">
            <Users className="size-3.5" />
            Participants
          </TabsTrigger>
          <TabsTrigger value="settings" className="gap-1.5">
            <Settings className="size-3.5" />
            Settings
          </TabsTrigger>
        </TabsList>

        {/* Bracket Tab */}
        <TabsContent value="bracket" className="mt-4">
          {tournament.status === "pending" ? (
            <Card className="p-8 text-center">
              <Trophy className="size-12 text-muted-foreground/20 mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">
                Tournament not started
              </h3>
              <p className="text-muted-foreground mb-4">
                Add participants and start the tournament to see the bracket.
              </p>
              <Button
                onClick={() => startMutation.mutate()}
                disabled={startMutation.isPending}
                className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
              >
                <Play className="size-4" />
                Start Tournament
              </Button>
            </Card>
          ) : (
            <BracketViewer
              matches={bracketMatches}
              format={tFormat}
              onUpdateScore={handleUpdateScore}
              isUpdating={updateScoreMutation.isPending}
            />
          )}
        </TabsContent>

        {/* Participants Tab */}
        <TabsContent value="participants" className="mt-4">
          <div className="space-y-4">
            {tournament.status === "pending" && (
              <div className="flex gap-2">
                <Input
                  placeholder="Add participant name"
                  value={addParticipantName}
                  onChange={(e) => setAddParticipantName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && addParticipantName.trim()) {
                      addParticipantMutation.mutate(addParticipantName.trim());
                    }
                  }}
                />
                <Button
                  onClick={() =>
                    addParticipantName.trim() &&
                    addParticipantMutation.mutate(addParticipantName.trim())
                  }
                  disabled={
                    !addParticipantName.trim() ||
                    addParticipantMutation.isPending
                  }
                  className="gap-1 shrink-0 bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  <Plus className="size-4" />
                  Add
                </Button>
              </div>
            )}

            {tournament.participants && tournament.participants.length > 0 ? (
              <Card>
                <CardContent className="p-0">
                  <div className="divide-y divide-border/50">
                    {tournament.participants
                      .sort((a, b) => a.seed - b.seed)
                      .map((p, i) => (
                        <div
                          key={p.id}
                          className="flex items-center gap-3 px-4 py-3 group"
                        >
                          <span className="text-xs text-muted-foreground font-mono w-8 text-center">
                            #{i + 1}
                          </span>
                          <span className="flex-1 text-sm font-medium">
                            {p.name}
                          </span>
                          {tournament.status === "pending" && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-7 opacity-0 group-hover:opacity-100 transition-opacity text-destructive"
                              onClick={() =>
                                removeParticipantMutation.mutate(p.id)
                              }
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
                          )}
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="p-8 text-center">
                <Users className="size-12 text-muted-foreground/20 mx-auto mb-4" />
                <p className="text-muted-foreground">No participants yet</p>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="mt-4">
          <Card>
            <CardContent className="p-6 space-y-5">
              {!editMode ? (
                <>
                  <div className="space-y-3">
                    <div>
                      <span className="text-sm text-muted-foreground">
                        Tournament Name
                      </span>
                      <p className="font-medium">{tournament.name}</p>
                    </div>
                    <div>
                      <span className="text-sm text-muted-foreground">
                        Game
                      </span>
                      <p className="font-medium">
                        {tournament.gameName || "Not specified"}
                      </p>
                    </div>
                    <div>
                      <span className="text-sm text-muted-foreground">
                        Description
                      </span>
                      <p className="font-medium">
                        {tournament.description || "No description"}
                      </p>
                    </div>
                    <div>
                      <span className="text-sm text-muted-foreground">
                        Format
                      </span>
                      <p className="font-medium">
                        {FORMAT_CONFIG[tournament.format]?.label}
                      </p>
                    </div>
                    <div>
                      <span className="text-sm text-muted-foreground">
                        Visibility
                      </span>
                      <p className="font-medium">
                        {tournament.isPublic ? "Public" : "Private"}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setEditName(tournament.name);
                        setEditGame(tournament.gameName);
                        setEditDesc(tournament.description);
                        setEditMode(true);
                      }}
                      className="gap-2"
                    >
                      <Edit className="size-4" />
                      Edit
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => setDeleteConfirm(true)}
                      className="gap-2"
                    >
                      <Trash2 className="size-4" />
                      Delete
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label htmlFor="editName">Tournament Name</Label>
                      <Input
                        id="editName"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="editGame">Game Name</Label>
                      <Input
                        id="editGame"
                        value={editGame}
                        onChange={(e) => setEditGame(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="editDesc">Description</Label>
                      <Textarea
                        id="editDesc"
                        value={editDesc}
                        onChange={(e) => setEditDesc(e.target.value)}
                        rows={3}
                      />
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setEditMode(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={() =>
                        updateTournamentMutation.mutate({
                          name: editName,
                          gameName: editGame,
                          description: editDesc,
                        })
                      }
                      disabled={updateTournamentMutation.isPending}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                      {updateTournamentMutation.isPending
                        ? "Saving..."
                        : "Save Changes"}
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteConfirm} onOpenChange={setDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Tournament</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{tournament.name}&quot;? This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMutation.mutate()}
              className="bg-destructive hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reset Confirmation */}
      <AlertDialog open={resetConfirm} onOpenChange={setResetConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset Tournament</AlertDialogTitle>
            <AlertDialogDescription>
              This will reset all match results and bracket progress. Participants
              will be kept. Are you sure?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => resetMutation.mutate()}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              Reset
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
