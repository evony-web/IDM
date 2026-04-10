'use client';

// IDM - IDOL META Tournament App
// Production build for Vercel deployment

import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import dynamic from 'next/dynamic';
import { useAppStore } from '@/lib/store';
import { IDM_LOGO_URL } from '@/lib/cdn';
import { Navigation, TopBar, Sidebar } from '@/components/esports/Navigation';
import { GradientBackground, Premium3DEffects } from '@/components/effects/ParticleField';
import { Dashboard } from '@/components/esports/Dashboard';
import { TournamentTab } from '@/components/esports/Tournament';
import { Bracket } from '@/components/esports/Bracket';
import { Leaderboard } from '@/components/esports/Leaderboard';
import { DonasiSawerTab } from '@/components/esports/DonasiSawerTab';
import { AdminLogin } from '@/components/esports/AdminLogin';
import { LandingPage } from '@/components/esports/LandingPage';
import { ToastContainer } from '@/components/esports/Toast';

import { Database } from 'lucide-react';
import { usePusher } from '@/hooks/usePusher';
import { adminFetch } from '@/lib/admin-fetch';

// ═══════════════════════════════════════════════════════════════════════
// LAZY LOAD HEAVY COMPONENTS - Reduces initial bundle by ~40%
// ═══════════════════════════════════════════════════════════════════════

// Modals - only load when opened
const PlayerListModal = dynamic(() => import('@/components/esports/PlayerListModal'), {
  loading: () => null,
  ssr: false,
});

const PrizeBreakdownModal = dynamic(() => import('@/components/esports/PrizeBreakdownModal'), {
  loading: () => null,
  ssr: false,
});

const TeamListModal = dynamic(() => import('@/components/esports/TeamListModal'), {
  loading: () => null,
  ssr: false,
});

// Tab content - load on demand
const GrandFinal = dynamic(() => import('@/components/esports/GrandFinal'), {
  loading: () => <div className="animate-pulse h-64 bg-white/5 rounded-2xl" />,
  ssr: false,
});

const AdminPanel = dynamic(() => import('@/components/esports/AdminPanel'), {
  loading: () => <div className="fixed inset-0 bg-black/50 flex items-center justify-center"><div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin border-amber-400" /></div>,
  ssr: false,
});

const TournamentHistory = dynamic(() => import('@/components/esports/TournamentHistory'), {
  loading: () => <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="animate-pulse h-20 bg-white/5 rounded-xl" />)}</div>,
  ssr: false,
});

// Live Chat - load after main content
const LiveChat = dynamic(() => import('@/components/esports/LiveChat'), {
  loading: () => null,
  ssr: false,
});

// Live Score Banner - real-time score notification
const LiveScoreBanner = dynamic(() => import('@/components/esports/LiveScoreBanner'), {
  loading: () => null,
  ssr: false,
});

// Live Match Ticker - shows ongoing matches
const LiveMatchTicker = dynamic(() => import('@/components/esports/LiveMatchTicker'), {
  loading: () => null,
  ssr: false,
});

// PWA Install - low priority
const PWAInstallPrompt = dynamic(() => import('@/components/pwa/PWAInstallPrompt'), {
  loading: () => null,
  ssr: false,
});

// Player Profile Page - for landing page leaderboard clicks
const PlayerProfilePage = dynamic(() => import('@/components/esports/PlayerProfilePage').then(m => ({ default: m.PlayerProfilePage })), {
  loading: () => (
    <div className="fixed inset-0 z-[200] flex items-center justify-center" style={{ background: '#12141a' }}>
      <div className="relative w-10 h-10">
        <div className="absolute inset-0 rounded-full border-2 border-t-transparent animate-spin" style={{ borderTopColor: '#73FF00', borderRightColor: 'rgba(115,255,0,0.3)' }} />
      </div>
    </div>
  ),
  ssr: false,
});


export default function IDOLMETAApp() {
  // Mobile detection for conditional inline styles (loading screen perf)
  // Start with undefined to avoid hydration mismatch, then set after mount
  const [isMobile, setIsMobile] = useState<boolean | undefined>(undefined);

  useEffect(() => {
    // Set initial value after mount
    const mq = window.matchMedia('(min-width: 768px)');
    setIsMobile(!mq.matches);

    // Listen for changes
    const handler = (e: MediaQueryListEvent) => setIsMobile(!e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // Default to mobile styles during SSR and initial render
  const isMobileStyle = isMobile ?? true;
  const {
    activeTab,
    division,
    isSwitchingDivision,
    isAdminAuthenticated,
    users,
    currentTournament,
    registrations,
    teams,
    matches,
    donations,
    totalDonation,
    totalSawer,
    toasts,
    tournaments,
    setActiveTab,
    setDivision,
    setSwitchingDivision,
    fetchData,
    registerUser,
    approveRegistration,
    updateRegistrationTier,
    rejectRegistration,
    deleteRegistration,
    deleteAllRejected,
    updateTournamentStatus,
    updatePrizePool,
    generateTeams,
    resetTeams,
    generateBracket,
    updateMatchScore,
    setMVP,
    removeMVP,
    finalizeTournament,
    donate,
    removeToast,
    seedDatabase,
    resetSeason,
    createTournament,
    addToast,
    loginAdmin,
    logoutAdmin,
    fetchAdmins,
  } = useAppStore();

  // ── Theme is always DARK for both divisions ──
  const theme = 'dark' as const;

  // Track which sub-tab to show when donation tab opens
  const [donationDefaultTab, setDonationDefaultTab] = useState<'sawer' | 'donasi'>('sawer');

  // Track initial mount
  const isInitialMount = useRef(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  // ── Landing Page state ──
  const [view, setView] = useState<'loading' | 'landing' | 'app'>('loading');
  const [landingData, setLandingData] = useState<any>(null);
  const [landingProfileId, setLandingProfileId] = useState<string | null>(null);
  const [landingProfileGender, setLandingProfileGender] = useState<'male' | 'female'>('male');
  const [appProfileId, setAppProfileId] = useState<string | null>(null);

  // Track initial data loading (separate from division switching)
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [adminOpen, setAdminOpen] = useState(false);
  const [adminLoginOpen, setAdminLoginOpen] = useState(false);
  const [playerListOpen, setPlayerListOpen] = useState(false);
  const [prizeModalOpen, setPrizeModalOpen] = useState(false);
  const [teamListOpen, setTeamListOpen] = useState(false);
  const [leaderboardTab, setLeaderboardTab] = useState<'players' | 'clubs'>('players');

  // Live Score Banner state
  const [liveScoreMatch, setLiveScoreMatch] = useState<{
    matchId: string;
    teamAName?: string;
    teamBName?: string;
    scoreA: number;
    scoreB: number;
    round: number;
    matchNumber: number;
    winnerName?: string;
  } | null>(null);
  const [topClubs, setTopClubs] = useState<Array<{
    id: string;
    name: string;
    slug: string;
    logoUrl: string | null;
    totalPoints: number;
    memberCount: number;
    rank: number;
  }>>([]);

  // ── App Loading Screen — preload landing data, then transition ──
  useEffect(() => {
    const controller = new AbortController();
    let landed = false;
    const startTime = Date.now();

    (async () => {
      try {
        const res = await fetch('/api/landing', { signal: controller.signal });
        if (res.ok) {
          const json = await res.json();
          if (json.success) setLandingData(json.data);
        }
      } catch { /* silent */ }
      // Transition to landing after data ready (min 1.8s for loading feel)
      if (!landed) {
        landed = true;
        const elapsed = Date.now() - startTime;
        const remaining = Math.max(0, 1800 - elapsed);
        setTimeout(() => setView('landing'), remaining);
      }
    })();

    return () => { controller.abort(); landed = true; };
  }, []);

  // Listen for admin auth changes (e.g., 401 response triggers logout)
  useEffect(() => {
    const handleAuthChange = (event: CustomEvent) => {
      if (!event.detail?.authenticated) {
        // Admin was logged out due to 401
        setAdminOpen(false);
        setAdminLoginOpen(true);
        addToast('Session admin habis. Silakan login kembali.', 'warning');
      }
    };
    window.addEventListener('admin-auth-changed', handleAuthChange as EventListener);
    return () => window.removeEventListener('admin-auth-changed', handleAuthChange as EventListener);
  }, [addToast]);

  // Pusher connection for real-time updates
  const { joinTournament, isConnected } = usePusher({
    // On match score update — show live banner
    onMatchScore: useCallback((data: any) => {
      setLiveScoreMatch({
        matchId: data.matchId,
        teamAName: (data as any).teamAName,
        teamBName: (data as any).teamBName,
        scoreA: data.scoreA,
        scoreB: data.scoreB,
        round: (data as any).round || 0,
        matchNumber: (data as any).matchNumber || 0,
      });
      fetchData(false);
    }, [fetchData]),
    // On match result (completed) — show banner with winner
    onMatchResult: useCallback((data: any) => {
      setLiveScoreMatch({
        matchId: (data as any).matchId || '',
        teamAName: (data as any).teamAName,
        teamBName: (data as any).teamBName,
        scoreA: (data as any).scoreA || 0,
        scoreB: (data as any).scoreB || 0,
        round: (data as any).round || 0,
        matchNumber: (data as any).matchNumber || 0,
        winnerName: (data as any).winnerName,
      });
      fetchData(false);
    }, [fetchData]),
    // On announcement
    onAnnouncement: useCallback((data) => {
      addToast(data.message, data.type as 'success' | 'error' | 'warning' | 'info');
    }, [addToast]),
    // On donation
    onNewDonation: useCallback((data) => {
      addToast(`${data.userName} berdonasi Rp${data.amount}!`, 'success');
      fetchData(false);
    }, [addToast, fetchData]),
    // On prize pool update
    onPrizePoolUpdate: useCallback(() => {
      fetchData(false);
    }, [fetchData]),
    // On tournament update (status change, etc.)
    onTournamentUpdate: useCallback(() => {
      fetchData(false);
    }, [fetchData]),
    // On registration update
    onRegistrationUpdate: useCallback(() => {
      fetchData(false);
    }, [fetchData]),
    // On new sawer confirmed
    onNewSawer: useCallback((data) => {
      addToast(`${data.senderName} menyawer Rp${data.amount}! Prize pool bertambah!`, 'success');
      fetchData(false);
    }, [addToast, fetchData]),
    // On achievement awarded — show toast with achievement icons
    onAchievementAwarded: useCallback((data) => {
      const achList = data.achievements.map(a => `${a.icon} ${a.name}`).join(', ');
      addToast(`${data.userName} mendapat pencapaian baru: ${achList}`, 'success');
      fetchData(false);
    }, [addToast, fetchData]),
  });

  // ── Grand Final State ──
  const [grandFinalData, setGrandFinalData] = useState<any>(null);
  const [qualifiedPlayers, setQualifiedPlayers] = useState<Array<{id: string; name: string; points: number; tier: string; avatar: string | null}>>([]);
  const [isGFSettingUp, setIsGFSettingUp] = useState(false);
  const [isGFDeleting, setIsGFDeleting] = useState(false);
  const [isGFUpdatingScore, setIsGFUpdatingScore] = useState(false);
  const [gfPrizePool, setGfPrizePool] = useState<number>(0);

  // Fetch Grand Final data
  const fetchGrandFinal = useCallback(async () => {
    try {
      const res = await fetch(`/api/tournaments/grand-final?division=${division}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setGrandFinalData(data.grandFinal);
          setQualifiedPlayers(data.qualifiedPlayers || []);
        }
      }
    } catch { /* silent */ }
  }, [division]);

  // Setup Grand Final (admin)
  const setupGrandFinal = useCallback(async (prizePoolValue?: number) => {
    setIsGFSettingUp(true);
    try {
      const res = await adminFetch('/api/tournaments/grand-final', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ division, prizePool: prizePoolValue ?? gfPrizePool ?? 0 }),
      });
      const data = await res.json();
      if (data.success) {
        addToast('GRAND FINAL dimulai! 4 tim siap bertanding!', 'success');
        await fetchGrandFinal();
        fetchData(false);
      } else {
        addToast(data.error || 'Gagal membuat Grand Final', 'error');
      }
    } catch {
      addToast('Gagal membuat Grand Final', 'error');
    } finally {
      setIsGFSettingUp(false);
    }
  }, [division, gfPrizePool, addToast, fetchGrandFinal, fetchData]);

  // Delete Grand Final (admin)
  const deleteGrandFinal = useCallback(async () => {
    if (!grandFinalData?.id) return;
    setIsGFDeleting(true);
    try {
      const res = await adminFetch(`/api/tournaments/grand-final?tournamentId=${grandFinalData.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        addToast('Grand Final direset', 'warning');
        await fetchGrandFinal();
        fetchData(false);
      } else {
        addToast(data.error || 'Gagal mereset Grand Final', 'error');
      }
    } catch {
      addToast('Gagal mereset Grand Final', 'error');
    } finally {
      setIsGFDeleting(false);
    }
  }, [grandFinalData, addToast, fetchGrandFinal, fetchData]);

  // Update Grand Final match score (admin)
  const updateGFMatchScore = useCallback(async (matchId: string, scoreA: number, scoreB: number, mvpId?: string) => {
    setIsGFUpdatingScore(true);
    try {
      const res = await adminFetch('/api/matches', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matchId, scoreA, scoreB, mvpId }),
      });
      const data = await res.json();
      if (data.success) {
        const mvpText = mvpId ? ` dengan MVP` : '';
        addToast(`Skor diperbarui: ${scoreA} - ${scoreB}${mvpText}`, 'success');
        await fetchGrandFinal();
        fetchData(false);
      } else {
        addToast(data.error || 'Gagal memperbarui skor', 'error');
      }
    } catch {
      addToast('Gagal memperbarui skor', 'error');
    } finally {
      setIsGFUpdatingScore(false);
    }
  }, [addToast, fetchGrandFinal, fetchData]);

  // Fetch Grand Final on mount and division change
  useEffect(() => {
    fetchGrandFinal();
  }, [division, fetchGrandFinal]);

  // Apply theme class - ALWAYS DARK for both divisions
  useEffect(() => {
    const root = document.documentElement;
    
    // Remove all theme classes first
    root.classList.remove('light', 'dark', 'theme-light-fury', 'dark-fury-pink', 'theme-light-fury-male');
    root.removeAttribute('data-theme');

    // Both divisions use DARK mode
    root.classList.add('dark');
    
    // Set data-theme for accent colors: Male = Green, Female = Blue
    if (division === 'male') {
      root.setAttribute('data-theme', 'dark-male');
    } else {
      root.setAttribute('data-theme', 'dark-female');
    }
  }, [division]);

  // Toggle division function with loading indicator
  const toggleDivision = useCallback(() => {
    const newDivision = division === 'male' ? 'female' : 'male';
    setSwitchingDivision(true);
    setDivision(newDivision);
  }, [division, setDivision, setSwitchingDivision]);

  // ── Go back to landing page ──
  const handleBackToLanding = useCallback(() => {
    setView('landing');
    setIsInitialLoading(true);
  }, []);

  // ── Handle entering a division from landing page ──
  const handleEnterDivision = useCallback((div: 'male' | 'female') => {
    setDivision(div);
    setView('app');
    // Shorter loading when coming from landing page
    const minLoadingTime = new Promise(resolve => setTimeout(resolve, 1500));
 Promise.all([
      fetchData(false, false),
      minLoadingTime
    ]).finally(() => {
      setIsInitialLoading(false);
    });
    // Verify admin session
    fetchAdmins();
  }, [setDivision, fetchData, fetchAdmins]);

  // ── Handle player click from landing page leaderboard ──
  const handleLandingPlayerClick = useCallback((playerId: string, gender: 'male' | 'female') => {
    setLandingProfileId(playerId);
    setLandingProfileGender(gender);
  }, []);

  // ── Handle admin login from landing page ──
  const handleAdminLoginFromLanding = useCallback(() => {
    // Just open the admin login modal directly (no view switch, no data fetch)
    setAdminLoginOpen(true);
  }, []);

  // ── Admin login from landing page — after success, transition to app view ──
  const handleAdminLoginFromLandingSubmit = useCallback(async (username: string, password: string): Promise<boolean> => {
    const success = await loginAdmin(username, password);
    if (success) {
      // Switch to app view and open admin panel (no loading screen)
      setDivision('male');
      setView('app');
      setIsInitialLoading(false);
      fetchData(false, false);
      setAdminOpen(true);
    }
    return success;
  }, [loginAdmin, setDivision, setView, fetchData]);



  // Load data on mount and when division changes
  useEffect(() => {
    if (view === 'landing') return; // Don't load data when on landing page

    if (isInitialMount.current) {
      // Initial mount - fetch data with loading indicator
      isInitialMount.current = false;
      
      // Minimum 3 seconds loading screen for better UX
      const minLoadingTime = new Promise(resolve => setTimeout(resolve, 3000));
      
      Promise.all([
        fetchData(false, false),
        minLoadingTime
      ]).finally(() => {
        setIsInitialLoading(false);
      });
      
      // Verify admin session is still valid
      fetchAdmins();
    } else {
      // Division change - show switching overlay
      fetchData(false, true);
    }
  }, [division, fetchData, view]);

  // Initial fetch & re-fetch on division change
  useEffect(() => {
    const controller = new AbortController();
    const genderParam = division === 'male' ? 'male' : 'female';

    (async () => {
      try {
        const res = await fetch(`/api/clubs?gender=${genderParam}&limit=10`, { signal: controller.signal });
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.clubs) {
            setTopClubs(data.clubs);
          }
        }
      } catch { /* silent */ }
    })();

    return () => controller.abort();
  }, [division]);

  // Auto-refresh clubs when admin edits/creates/deletes (via BroadcastChannel)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const channel = new BroadcastChannel('idm-club-updates');
    const handler = () => {
      const genderParam = division === 'male' ? 'male' : 'female';
      fetch(`/api/clubs?gender=${genderParam}&limit=10`)
        .then((r) => r.ok ? r.json() : null)
        .then((data) => {
          if (data?.success && data.clubs) setTopClubs(data.clubs);
        })
        .catch(() => {});
    };
    channel.addEventListener('message', handler);
    return () => channel.removeEventListener('message', handler);
  }, [division]);

  // Join tournament room when tournament loads
  useEffect(() => {
    if (currentTournament && isConnected) {
      joinTournament(currentTournament.id);
    }
  }, [currentTournament, isConnected, joinTournament]);

  // Scroll to top on tab change
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0, behavior: 'instant' });
  }, [activeTab]);

  // Compute per-user wins/losses from completed matches
  const userStats = useMemo(() => {
    const stats = new Map<string, { wins: number; losses: number }>();

    // Build userId → teamId mapping from teams
    const userTeamMap = new Map<string, string>();
    for (const team of teams) {
      for (const member of team.members) {
        userTeamMap.set(member.user.id, team.id);
      }
    }

    // Build teamId → {wins, losses} from completed matches
    const teamStats = new Map<string, { wins: number; losses: number }>();
    for (const match of matches) {
      if (match.status === 'completed' && match.winnerId && match.teamAId && match.teamBId) {
        const winnerTeamId = match.winnerId;
        const loserTeamId = winnerTeamId === match.teamAId ? match.teamBId : match.teamAId;

        const winnerStats = teamStats.get(winnerTeamId) || { wins: 0, losses: 0 };
        winnerStats.wins++;
        teamStats.set(winnerTeamId, winnerStats);

        const loserStats = teamStats.get(loserTeamId) || { wins: 0, losses: 0 };
        loserStats.losses++;
        teamStats.set(loserTeamId, loserStats);
      }
    }

    // Map team stats to individual users
    for (const [userId, teamId] of userTeamMap) {
      if (teamStats.has(teamId)) {
        stats.set(userId, teamStats.get(teamId)!);
      }
    }

    return stats;
  }, [matches, teams]);

  const topPlayers = useMemo(() =>
    users
      .filter(u => u.role === 'user' || !u.isAdmin)
      .sort((a, b) => b.points - a.points)
      .slice(0, 12)
      .map((user, index) => ({
        ...user,
        rank: index + 1,
        wins: userStats.get(user.id)?.wins ?? 0,
        losses: userStats.get(user.id)?.losses ?? 0,
      })),
    [users, userStats]
  );

  // ── Live matches — matches currently in progress (score being updated) ──
  const liveMatches = useMemo(() => {
    return matches
      .filter(m => m.status === 'live' || (m.status === 'ongoing') || (m.status !== 'pending' && m.status !== 'completed' && (m.scoreA !== null || m.scoreB !== null)))
      .map(m => ({
        id: m.id,
        round: m.round,
        matchNumber: m.matchNumber,
        teamAName: (m.teamA as any)?.name || null,
        teamBName: (m.teamB as any)?.name || null,
        scoreA: m.scoreA,
        scoreB: m.scoreB,
        bracket: m.bracket,
        mvpName: (m.mvp as any)?.name || null,
        tournamentName: (m.tournament as any)?.name || undefined,
      }));
  }, [matches]);

  // ── Champion of the week: winner of the highest-round completed match ──
  const championOfTheWeek = useMemo(() => {
    const completedMatches = matches
      .filter(m => m.status === 'completed' && m.winnerId)
      .sort((a, b) => {
        if (b.round !== a.round) return b.round - a.round; // highest round first
        return b.matchNumber - a.matchNumber;
      });

    if (completedMatches.length === 0) return null;

    const finalMatch = completedMatches[0];
    const winningTeam = teams.find(t => t.id === finalMatch.winnerId);
    if (!winningTeam || winningTeam.members.length === 0) return null;

    // All team members with their info
    const members = winningTeam.members.map(m => ({
      userId: m.user.id,
      userName: m.user.name,
      userAvatar: m.user.avatar,
      userTier: m.user.tier,
      role: m.role,
    }));

    // Captain first, then rest
    members.sort((a, b) => (a.role === 'captain' ? -1 : b.role === 'captain' ? 1 : 0));

    return {
      teamName: winningTeam.name,
      members,
    };
  }, [matches, teams]);

  // ── MVP of the week ──
  const mvpOfTheWeek = useMemo(() => {
    const mvp = users.find(u => u.isMVP);
    if (!mvp) return null;
    return {
      userId: mvp.id,
      userName: mvp.name,
      userAvatar: mvp.avatar,
      userPoints: mvp.points,
      mvpScore: mvp.mvpScore || 0,
    };
  }, [users]);

  // Memoize common prop transformations
  const tournamentInfo = useMemo(() => currentTournament ? {
    name: currentTournament.name,
    status: currentTournament.status,
    week: currentTournament.week,
    prizePool: currentTournament.prizePool,
    participants: registrations.filter(r => r.status === 'approved').length,
    mode: currentTournament.mode || undefined,
    bpm: currentTournament.bpm || undefined,
    lokasi: currentTournament.lokasi || undefined,
    startDate: currentTournament.startDate || null,
  } : null, [currentTournament, registrations]);

  const registrationList = useMemo(() => registrations.map(r => ({
    id: r.id,
    name: r.user.name,
    email: r.user.email,
    avatar: r.user.avatar || '',
    tier: r.tierAssigned || r.user.tier,
    gender: r.user.gender,
    status: r.status,
    phone: '',
  })), [registrations]);

  const playerListData = useMemo(() => registrations.map(r => ({
    id: r.id,
    name: r.user.name,
    phone: (r as Record<string, unknown>).user?.phone as string || '',
    avatar: r.user.avatar || '',
    tier: r.tierAssigned || r.user.tier,
    gender: r.user.gender,
    status: r.status as 'approved' | 'pending' | 'rejected',
  })), [registrations]);

  const registeredAvatars = useMemo(() => registrations.map(r => ({
    name: r.user.name,
    avatar: r.user.avatar || '',
  })), [registrations]);

  const historyTournaments = useMemo(() => tournaments.map(t => ({
    ...t,
    _count: (t as Record<string, unknown>)._count
      ? (t as Record<string, unknown>)._count as { registrations: number; teams: number; matches: number }
      : { registrations: 0, teams: 0, matches: 0 },
  })), [tournaments]);

  // Sawer handler
  const handleSawer = async (data: { senderName: string; amount: number; paymentMethod?: string; [key: string]: unknown }) => {
    try {
      const res = await fetch('/api/sawer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, tournamentId: currentTournament?.id, division }),
      });
      if (res.ok) {
        addToast(`${data.senderName} menyawer Rp${data.amount}! Menunggu konfirmasi pembayaran.`, 'info');
        fetchData(false);
      }
    } catch {}
  };

  // ── Render: Loading Screen OR Landing Page (unified AnimatePresence for smooth crossfade) ──
  if (view === 'loading' || view === 'landing') {
    return (
      <main className="h-dvh overflow-hidden relative">
        <AnimatePresence mode="wait">
          {view === 'loading' && (
            <motion.div
              key="loading-screen"
              initial={{ opacity: 1 }}
              exit={{ opacity: 0, scale: 1.05, filter: 'brightness(1.8) blur(6px)' }}
              transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
              className="absolute inset-0 z-20 flex flex-col items-center justify-center overflow-hidden text-white"
              style={{ background: '#050507' }}
            >
              {/* Diamond pattern */}
              <div
                className="absolute inset-0 opacity-[0.03]"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 0L60 30L30 60L0 30Z' fill='none' stroke='rgba(255,255,255,0.5)' stroke-width='0.5'/%3E%3C/svg%3E")`,
                  backgroundSize: '60px 60px',
                }}
              />
              {/* Green glow */}
              <div
                className="absolute -top-20 left-1/4 w-[400px] h-[400px]"
                style={{ background: 'radial-gradient(circle, rgba(115,255,0,0.04) 0%, transparent 60%)' }}
              />
              {/* Blue glow */}
              <div
                className="absolute bottom-[20%] right-0 w-[400px] h-[400px]"
                style={{ background: 'radial-gradient(circle, rgba(56,189,248,0.035) 0%, transparent 60%)' }}
              />
              {/* Gold glow center */}
              <div
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px]"
                style={{ background: 'radial-gradient(circle, rgba(255,215,0,0.03) 0%, transparent 60%)' }}
              />

              {/* Logo with glow */}
              <motion.div
                className="relative z-10"
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              >
                {/* Animated glow ring */}
                <motion.div
                  className="absolute inset-0 rounded-3xl"
                  style={{
                    background: 'radial-gradient(circle, rgba(255,215,0,0.08) 0%, transparent 70%)',
                    transform: 'scale(2)',
                  }}
                  animate={{ opacity: [0.4, 1, 0.4] }}
                  transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                />
                <img
                  src={IDM_LOGO_URL}
                  alt="IDM Logo"
                  className="relative w-28 h-28 md:w-36 md:h-36"
                  loading="eager"
                />
              </motion.div>

              {/* Brand */}
              <motion.h1
                className="relative z-10 mt-6 text-[28px] md:text-[40px] font-black tracking-tight text-center"
                style={{
                  background: 'linear-gradient(135deg, #73FF00 0%, #FFD700 45%, #38BDF8 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                IDOL META
              </motion.h1>

              <motion.p
                className="relative z-10 text-[13px] md:text-[15px] font-semibold tracking-[0.2em] uppercase mt-1.5"
                style={{ color: 'rgba(255,255,255,0.45)' }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4, delay: 0.4 }}
              >
                TARKAM Fan Made Edition
              </motion.p>

              {/* Loading spinner */}
              <motion.div
                className="relative z-10 mt-8"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3, delay: 0.5 }}
              >
                <div className="relative w-12 h-12">
                  {/* Outer ring */}
                  <motion.div
                    className="absolute inset-0 rounded-full"
                    style={{
                      border: '2px solid transparent',
                      borderTopColor: '#73FF00',
                      borderRightColor: 'rgba(115, 255, 0, 0.3)',
                    }}
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
                  />
                  {/* Inner ring */}
                  <motion.div
                    className="absolute inset-2 rounded-full"
                    style={{
                      border: '1.5px solid transparent',
                      borderBottomColor: '#38BDF8',
                      borderLeftColor: 'rgba(56, 189, 248, 0.2)',
                    }}
                    animate={{ rotate: -360 }}
                    transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                  />
                  {/* Center dot */}
                  <motion.div
                    className="absolute inset-0 flex items-center justify-center"
                    animate={{ scale: [1, 1.3, 1] }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'easeInOut' }}
                  >
                    <div
                      className="w-2.5 h-2.5 rounded-full"
                      style={{
                        background: 'linear-gradient(135deg, #73FF00, #FFD700, #38BDF8)',
                      }}
                    />
                  </motion.div>
                </div>
                <p className="mt-4 text-[11px] tracking-wider text-white/30 text-center">
                  Loading...
                </p>
              </motion.div>

              {/* Footer */}
              <motion.div
                className="absolute bottom-6 left-0 right-0 z-10 flex flex-col items-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4, delay: 0.6 }}
              >
                <motion.p
                  className="text-[11px] md:text-[12px] font-bold tracking-[0.15em] uppercase"
                  style={{
                    background: 'linear-gradient(135deg, #ffd700 0%, #ffec8b 50%, #ffd700 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                  }}
                  animate={{ opacity: [0.6, 1, 0.6] }}
                  transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                >
                  ✦ Borneo Pride ✦
                </motion.p>
                <span className="mt-1 text-[9px] tracking-widest text-white/30">
                  © 2026
                </span>
              </motion.div>
            </motion.div>
          )}

          {view === 'landing' && (
            <motion.div
              key="landing-page"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.7, ease: [0.25, 0.1, 0.25, 1] }}
              className="absolute inset-0"
            >
              <LandingPage
                onEnterDivision={handleEnterDivision}
                onAdminLogin={handleAdminLoginFromLanding}
                onPlayerClick={handleLandingPlayerClick}
                preloadedData={landingData}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Admin Login Modal — available from landing page too */}
        <AdminLogin
          isOpen={adminLoginOpen}
          onOpenChange={setAdminLoginOpen}
          onLogin={handleAdminLoginFromLandingSubmit}
        />

        {/* Player Profile Overlay — from landing page leaderboard click */}
        {landingProfileId && (
          <PlayerProfilePage
            playerId={landingProfileId}
            division={landingProfileGender}
            onBack={() => setLandingProfileId(null)}
          />
        )}



      </main>
    );
  }

  // ── Render: App ──
  return (
    <div
      className={`h-dvh flex flex-col overflow-hidden relative ${division === 'male' ? 'text-white' : 'text-black'}`}
    >
      {/* ═════════════════════════════════════════════════════════════════════
          LIVE SCORE BANNER — Real-time match score notification via Pusher
          ═════════════════════════════════════════════════════════════════════ */}
      <LiveScoreBanner
        match={liveScoreMatch}
        division={division}
        onDismiss={() => setLiveScoreMatch(null)}
      />

      {/* ═════════════════════════════════════════════════════════════════════
          🐉 iOS APPLE PREMIUM LOADING SCREEN (Optimized for Mid-Range Devices)
          Lightweight animations, no heavy blur/glow effects
          ═════════════════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {isInitialLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="absolute inset-0 z-[100] flex flex-col items-center justify-center overflow-hidden"
            style={{ background: division === 'male' ? '#000000' : 'linear-gradient(135deg, #FDF8F5 0%, #FEF3EC 25%, #F9EBE5 50%, #F7E5EE 75%, #F5F0F8 100%)' }}
          >
            {/* Dragon Scale Pattern Background */}
            <div
              className="absolute inset-0 opacity-30"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 0L60 30L30 60L0 30z' fill='none' stroke='${division === 'male' ? 'rgba(115,255,0' : 'rgba(220,180,200'},0.12)' stroke-width='0.5'/%3E%3C/svg%3E")`,
                backgroundSize: '60px 60px',
              }}
            />

            {/* Subtle Accent Glow - Static, no animation */}
            <div
              className="absolute w-[300px] h-[300px] rounded-full opacity-20"
              style={{
                background: division === 'male'
                  ? 'radial-gradient(circle, rgba(115, 255, 0, 0.15) 0%, transparent 70%)'
                  : 'radial-gradient(circle, rgba(255, 182, 172, 0.20) 0%, transparent 70%)',
              }}
            />

            {/* Card Container - Solid background, no blur */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 }}
              className="relative z-10 flex flex-col items-center px-8 py-10 rounded-3xl"
              style={{
                background: division === 'male' ? 'rgba(10, 15, 13, 0.85)' : 'rgba(255, 255, 255, 0.85)',
                border: `1px solid ${division === 'male' ? 'rgba(115, 255, 0, 0.1)' : 'rgba(220, 180, 200, 0.20)'}`,
                boxShadow: division === 'male' ? '0 8px 24px rgba(0, 0, 0, 0.5)' : '0 8px 32px rgba(200, 150, 170, 0.15), 0 2px 8px rgba(200, 150, 170, 0.10)',
              }}
            >
              {/* Logo - WebP with lazy loading from Cloudinary CDN */}
              <motion.img
                src={IDM_LOGO_URL}
                alt="IDM Logo"
                loading="lazy"
                decoding="async"
                className="w-32 md:w-44 h-auto"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, delay: 0.2 }}
              />

              {/* Brand Text */}
              <motion.p
                className="text-[12px] md:text-[14px] tracking-[0.2em] uppercase font-semibold mt-4"
                style={{
                  color: division === 'male' ? '#73FF00' : '#38BDF8',
                }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4, delay: 0.4 }}
              >
                FAN MADE EDITION
              </motion.p>

              {/* Cool Loading Spinner - Framer Motion animated */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3, delay: 0.5 }}
                className="mt-8 flex flex-col items-center"
              >
                {/* Spinner with Framer Motion */}
                <div className="relative w-12 h-12">
                  {/* Outer ring */}
                  <motion.div
                    className="absolute inset-0 rounded-full"
                    style={{
                      border: '2px solid transparent',
                      borderTopColor: division === 'male' ? '#73FF00' : '#38BDF8',
                      borderRightColor: division === 'male' ? 'rgba(115, 255, 0, 0.3)' : 'rgba(56, 189, 248, 0.3)',
                    }}
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
                  />
                  {/* Inner ring - opposite direction */}
                  <motion.div
                    className="absolute inset-2 rounded-full"
                    style={{
                      border: '1.5px solid transparent',
                      borderBottomColor: division === 'male' ? '#73FF00' : '#38BDF8',
                      borderLeftColor: division === 'male' ? 'rgba(115, 255, 0, 0.2)' : 'rgba(56, 189, 248, 0.2)',
                    }}
                    animate={{ rotate: -360 }}
                    transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                  />
                  {/* Center dot */}
                  <motion.div
                    className="absolute inset-0 flex items-center justify-center"
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'easeInOut' }}
                  >
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{ background: division === 'male' ? '#73FF00' : '#38BDF8' }}
                    />
                  </motion.div>
                </div>
                <p
                  className={`mt-5 text-[11px] tracking-wider ${division === 'male' ? 'text-white/50' : 'text-black/50'}`}
                  style={{ fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}
                >
                  Loading...
                </p>
              </motion.div>
            </motion.div>

            {/* Footer */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.6 }}
              className="absolute bottom-6 left-0 right-0 z-10 flex flex-col items-center"
            >
              <p
                className="text-[11px] md:text-[13px] font-bold tracking-[0.15em] uppercase"
                style={{
                  background: 'linear-gradient(135deg, #ffd700 0%, #ffec8b 50%, #ffd700 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                Borneo Pride
              </p>
              <span className={`mt-1 text-[9px] tracking-widest ${division === 'male' ? 'text-white/40' : 'text-black/40'}`}>
                © 2026
              </span>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═════════════════════════════════════════════════════════════════════
          Division Switch Loading - Lightweight for mid-range devices
          ═════════════════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {isSwitchingDivision && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[90] flex items-center gap-3 px-5 py-3 rounded-xl pointer-events-none"
            style={{
              background: 'rgba(0, 0, 0, 0.85)',
              border: `1px solid ${division === 'male' ? 'rgba(115, 255, 0, 0.15)' : 'rgba(56, 189, 248, 0.15)'}`,
            }}
          >
            {/* Cool Dual Ring Spinner */}
            <div className="relative w-5 h-5">
              <motion.div
                className="absolute inset-0 rounded-full"
                style={{
                  border: '2px solid transparent',
                  borderTopColor: division === 'male' ? '#73FF00' : '#38BDF8',
                  borderRightColor: division === 'male' ? 'rgba(115, 255, 0, 0.25)' : 'rgba(56, 189, 248, 0.25)',
                }}
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              />
              <motion.div
                className="absolute inset-1 rounded-full"
                style={{
                  border: '1px solid transparent',
                  borderBottomColor: division === 'male' ? '#73FF00' : '#38BDF8',
                }}
                animate={{ rotate: -360 }}
                transition={{ duration: 0.7, repeat: Infinity, ease: 'linear' }}
              />
            </div>
            <span
              className="text-[12px] font-medium"
              style={{ color: division === 'male' ? '#73FF00' : '#38BDF8' }}
            >
              Memuat
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ========================================
          Main App Content - Only render after loading complete
          ======================================== */}
      {!isInitialLoading && (
        <>
          {/* Background - no animation on division switch to prevent blur */}
          <div className="absolute inset-0">
            <GradientBackground division={division} uiTheme={theme} />
          </div>

          {/* Premium 3D Effects */}
          <Premium3DEffects
            color={division === 'male' ? 'blue' : 'pink'}
            uiTheme={theme}
          />



          {/* Toast Notifications */}
          <ToastContainer toasts={toasts} removeToast={removeToast} />

          {/* Sidebar - Desktop/Tablet only */}
          <Sidebar
            division={division}
            onToggleDivision={toggleDivision}
            isAdminAuthenticated={isAdminAuthenticated}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            adminNotificationCount={isAdminAuthenticated && !adminOpen ? registrations.filter(r => r.status === 'pending').length : 0}
            onAdminClick={() => {
              if (isAdminAuthenticated) {
                setAdminOpen(true);
              } else {
                setAdminLoginOpen(true);
              }
            }}
            onGoHome={handleBackToLanding}
          />

          {/* Top Bar — Mobile only */}
          <TopBar
            division={division}
            onToggleDivision={toggleDivision}
            isAdminAuthenticated={isAdminAuthenticated}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            adminNotificationCount={isAdminAuthenticated && !adminOpen ? registrations.filter(r => r.status === 'pending').length : 0}
            onAdminClick={() => {
              if (isAdminAuthenticated) {
                setAdminOpen(true);
              } else {
                setAdminLoginOpen(true);
              }
            }}
            onGoHome={handleBackToLanding}
          />

          {/* Admin Login — shown when not authenticated */}
          <AdminLogin
            isOpen={adminLoginOpen}
            onOpenChange={setAdminLoginOpen}
            onLogin={loginAdmin}
          />

          {/* Admin Panel — full-screen page mode when open */}
          {isAdminAuthenticated && adminOpen && (
            <AdminPanel
              division={division}
              tournament={currentTournament}
              registrations={registrations}
              teams={teams}
              matches={matches}
              onApprove={approveRegistration}
              onUpdateTier={updateRegistrationTier}
              onReject={rejectRegistration}
              onDelete={deleteRegistration}
              onDeleteAllRejected={deleteAllRejected}
              onSetMVP={setMVP}
              onRemoveMVP={removeMVP}
              onUpdateStatus={updateTournamentStatus}
              onGenerateTeams={generateTeams}
              onResetTeams={resetTeams}
              onGenerateBracket={generateBracket}
              onUpdateMatchScore={updateMatchScore}
              onFinalize={finalizeTournament}
              onResetSeason={resetSeason}
              onUpdatePrizePool={updatePrizePool}
              onCreateTournament={createTournament}
              onLogout={() => { logoutAdmin(); setAdminOpen(false); }}
              onSwitchDivision={(newDiv) => { setDivision(newDiv); fetchData(false, false); }}
              mode="page"
              isOpen={true}
              onOpenChange={(open) => setAdminOpen(open)}
            />
          )}

          {/* Main App Content — hidden when admin panel is open */}
          {!adminOpen && (
            <>
          {users.length === 0 && (
            <motion.button
              onClick={seedDatabase}
              className="fixed bottom-24 right-4 z-40 p-3 rounded-xl bg-purple-500/20 border border-purple-500/30 text-purple-400"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Database className="w-5 h-5" />
            </motion.button>
          )}

          {/* Main Scrollable Content — Premium Full Width with Sidebar */}
          <div ref={scrollRef} className="relative z-10 flex-1 min-h-0 overflow-y-auto md:ml-16 lg:ml-56" style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px))', WebkitOverflowScrolling: 'touch' }}>
            {/* Premium Full Width Container - Fills all available space */}
            <div className="w-full px-3 pt-[78px] pb-24 sm:px-6 sm:pt-6 lg:px-8 lg:pb-8">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
              >
                {activeTab === 'dashboard' && (
                  <Dashboard
                    division={division}
                    tournament={tournamentInfo}
                    topPlayers={topPlayers}
                    onRegister={() => setActiveTab('tournament')}
                    onNavigate={(tab) => setActiveTab(tab)}
                    onViewPlayers={() => setPlayerListOpen(true)}
                    registeredCount={registrations.length}
                    registeredAvatars={registeredAvatars}
                    onViewPrize={() => setPrizeModalOpen(true)}
                    onViewDonation={() => { setDonationDefaultTab('donasi'); setActiveTab('donation'); }}
                    teamsCount={teams.length}
                    onViewTeams={() => setTeamListOpen(true)}
                    champion={championOfTheWeek}
                    mvp={mvpOfTheWeek}
                    leaderboardTab={leaderboardTab}
                    onLeaderboardTabChange={setLeaderboardTab}
                    topClubs={topClubs}
                    theme={division === 'male' ? 'dark' : 'light'}
                  />
                )}

                {activeTab === 'tournament' && (
                  <TournamentTab
                    division={division}
                    tournament={currentTournament}
                    registrations={registrationList}
                    teams={teams}
                    isAdmin={isAdminAuthenticated}
                    onRegister={registerUser}
                    onApprove={approveRegistration}
                    onGenerateTeams={generateTeams}
                    onResetTeams={resetTeams}
                    onGenerateBracket={generateBracket}
                  />
                )}

                {activeTab === 'bracket' && (
                  <>
                    {/* Live Match Ticker — shows ongoing matches with real-time scores */}
                    <LiveMatchTicker matches={liveMatches} division={division} />
                    <Bracket
                      division={division}
                      matches={matches}
                      isAdmin={isAdminAuthenticated}
                      onUpdateScore={updateMatchScore}
                      bracketType={currentTournament?.bracketType}
                      mvpUser={users.find(u => u.isMVP) || null}
                    />
                  </>
                )}

                {activeTab === 'leaderboard' && (
                  <Leaderboard
                    division={division}
                    players={topPlayers}
                    onPlayerClick={(playerId) => setAppProfileId(playerId)}
                  />
                )}

                {activeTab === 'grandfinal' && (
                  <GrandFinal
                    division={division}
                    topPlayers={topPlayers}
                    prizePool={grandFinalData?.prizePool || gfPrizePool || 0}
                    weekNumber={currentTournament?.week || 1}
                    mvpUser={users.find(u => u.isMVP) || null}
                    isAdminAuthenticated={isAdminAuthenticated}
                    grandFinalData={grandFinalData}
                    qualifiedPlayers={qualifiedPlayers}
                    onSetupGrandFinal={setupGrandFinal}
                    onDeleteGrandFinal={deleteGrandFinal}
                    onUpdateScore={updateGFMatchScore}
                    onRefresh={fetchGrandFinal}
                    isSettingUp={isGFSettingUp}
                    isDeleting={isGFDeleting}
                    isUpdatingScore={isGFUpdatingScore}
                    gfPrizePool={gfPrizePool}
                    onGfPrizePoolChange={setGfPrizePool}
                  />
                )}

                {activeTab === 'donation' && (
                  <DonasiSawerTab
                    key={donationDefaultTab}
                    division={division}
                    totalDonation={totalDonation}
                    donations={donations}
                    tournamentId={currentTournament?.id}
                    tournamentPrizePool={currentTournament?.prizePool || 0}
                    totalSawer={totalSawer}
                    isAdminAuthenticated={isAdminAuthenticated}
                    onDonate={(amount, message, anonymous, paymentMethod, proofUrl, donorName) => donate(amount, message, anonymous, paymentMethod, proofUrl, donorName)}
                    onSawer={handleSawer}
                    defaultTab={donationDefaultTab}
                  />
                )}

                {activeTab === 'history' && (
                  <TournamentHistory
                    division={division}
                    tournaments={historyTournaments}
                    onSelect={(id) => {
                      const tournament = historyTournaments.find(t => t.id === id);
                      setActiveTab('bracket');
                      addToast(`Memuat turnamen: ${tournament?.name || 'Turnamen'}`, 'info');
                    }}
                  />
                )}


              </motion.div>
            </AnimatePresence>
            </div>{/* End Premium Full Width Container */}
          </div>

          {/* Player List Modal */}
          <PlayerListModal
            isOpen={playerListOpen}
            onOpenChange={setPlayerListOpen}
            players={playerListData}
            division={division}
          />

          {/* Team List Modal */}
          <TeamListModal
            isOpen={teamListOpen}
            onOpenChange={setTeamListOpen}
            teams={teams}
            division={division}
          />

          {/* Prize Breakdown Modal */}
          <PrizeBreakdownModal
            isOpen={prizeModalOpen}
            onOpenChange={setPrizeModalOpen}
            prizePool={currentTournament?.prizePool || 0}
            prizeChampion={(currentTournament as any)?.prizeChampion}
            prizeRunnerUp={(currentTournament as any)?.prizeRunnerUp}
            prizeThird={(currentTournament as any)?.prizeThird}
            prizeMvp={(currentTournament as any)?.prizeMvp}
            division={division}
          />

          {/* Desktop Footer — branding bar */}
          <footer className="hidden lg:block mt-auto flex-shrink-0 py-3 px-8 text-center">
            <div className="flex items-center justify-center gap-3 opacity-40">
              <span className="text-[10px] tracking-wide font-medium text-white/15">
                &copy; 2026 IDOL META &mdash; Fan Made Edition
              </span>
              <span className="text-[10px] text-white/10">|</span>
              <span className="text-[10px] tracking-wide font-medium text-white/15">
                IDOL META Kotabaru Pride — Fan Made Edition
              </span>
            </div>
          </footer>

          {/* Bottom Navigation — static flex item at bottom */}
          <Navigation
            activeTab={activeTab}
            onTabChange={setActiveTab}
            division={division}
            onToggleDivision={toggleDivision}
            isAdminAuthenticated={isAdminAuthenticated}
            onAdminClick={() => {
              if (isAdminAuthenticated) {
                setAdminOpen(true);
              } else {
                setAdminLoginOpen(true);
              }
            }}
            theme={theme}
          />

          {/* Live Match Chat — mobile-only floating button + slide-up panel */}
          <LiveChat tournamentId={currentTournament?.id} division={division} />

          {/* PWA Install Prompt — Add to Home Screen */}
          <PWAInstallPrompt />
            </>
          )}
        </>
      )}

      {/* Player Profile Overlay — from app view leaderboard click */}
        {appProfileId && (
          <PlayerProfilePage
            playerId={appProfileId}
            division={division}
            onBack={() => setAppProfileId(null)}
          />
        )}


      </div>
  );
}
