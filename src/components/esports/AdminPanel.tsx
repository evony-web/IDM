'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Shield,
  Users,
  GitBranch,
  Play,
  Flag,
  CheckCircle,
  XCircle,
  X,
  Check,
  RotateCcw,
  AlertTriangle,
  CreditCard,
  Building2,
  Wallet,
  QrCode,
  Save,
  Loader2,
  Clock,
  Eye,
  Image as ImageIcon,
  LogOut,
  Info,
  UserCog,
  Settings,
  Star,
  UserPlus,
  Trash2,
  ShieldCheck,
  Crown,
  KeyRound,
  Plus,
  Trophy,
  Calendar,
  MapPin,
  Music,
  Gamepad2,
  ChevronDown,
  ChevronRight,
  Pencil,
  Database,
  ImageIcon as ImageIconLucide,
  Bot,
  ListChecks,
  GripVertical,
} from 'lucide-react';
import { ImageUpload } from '@/components/ui/ImageUpload';
import { BotManagementTab } from './BotManagementTab';
import { PlayerManagementScreen } from './PlayerManagementScreen';
import { PesertaManagementTab } from './PesertaManagementTab';
import { CloudinaryRestorePanel } from './CloudinaryRestorePanel';
import { useAppStore } from '@/lib/store';
import { adminFetch } from '@/lib/admin-fetch';
import { useAppSettings } from '@/hooks/useAppSettings';

interface Registration {
  id: string;
  userId: string;
  tournamentId: string;
  status: string;
  tierAssigned: string;
  user: {
    id: string;
    name: string;
    email: string;
    gender: string;
    tier: string;
    avatar: string | null;
    points: number;
  };
}

interface Tournament {
  id: string;
  name: string;
  status: string;
  division: string;
  week: number;
  prizePool: number;
  type?: string;
  bracketType?: string;
  mode?: string;
  bpm?: string;
  lokasi?: string;
  startDate?: string | null;
}

interface Team {
  id: string;
  name: string;
  seed: number;
  members: {
    user: {
      id: string;
      name: string;
      tier: string;
      avatar: string | null;
      points?: number;
    };
    role?: string;
  }[];
}

interface Match {
  id: string;
  round: number;
  matchNumber: number;
  teamAId: string | null;
  teamBId: string | null;
  teamA: Team | null;
  teamB: Team | null;
  scoreA: number | null;
  scoreB: number | null;
  winnerId: string | null;
  status: string;
  bracket?: string;
  mvp?: { id: string; name: string; avatar: string | null } | null;
}

interface AdminPanelProps {
  division: 'male' | 'female';
  tournament: Tournament | null;
  registrations: Registration[];
  teams: Team[];
  matches: Match[];
  onApprove: (registrationId: string, tier: string) => void;
  onUpdateTier: (registrationId: string, tier: string) => void;
  onReject: (registrationId: string) => void;
  onDelete: (registrationId: string) => void;
  onDeleteAllRejected: () => void;
  onSetMVP: (userId: string, mvpScore: number) => void;
  onRemoveMVP: (userId: string) => void;
  onUpdateStatus: (status: string) => void;
  onGenerateTeams: () => void;
  onResetTeams: () => void;
  onGenerateBracket: (type: string, strategy?: string) => void;
  onUpdateMatchScore: (matchId: string, scoreA: number, scoreB: number) => void;
  onFinalize: () => void;
  onResetSeason: () => void;
  onUpdatePrizePool: (prizePool: number) => void;
  onCreateTournament: (opts: { name: string; division: string; type: string; bracketType: string; week: number; startDate?: string | null; mode?: string; bpm?: string; lokasi?: string }) => void;
  onLogout?: () => void;
  onSwitchDivision?: (division: 'male' | 'female') => void;
  showTrigger?: boolean;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  mode?: 'sheet' | 'page';
}

const STEPS = [
  { key: 'setup', label: 'Persiapan', icon: '⚙️' },
  { key: 'registration', label: 'Pendaftaran', icon: '📝' },
  { key: 'team_generation', label: 'Tim', icon: '👥' },
  { key: 'bracket_ready', label: 'Bracket', icon: '🏆' },
  { key: 'ongoing', label: 'Live', icon: '🔴' },
  { key: 'completed', label: 'Selesai', icon: '✅' },
];

/* ═══════════════════════════════════════════════════
   Payment Settings Type
   ═══════════════════════════════════════════════════ */

interface PaymentSettingsForm {
  bankName: string;
  bankCode: string;
  bankNumber: string;
  bankHolder: string;
  gopayNumber: string;
  gopayHolder: string;
  ovoNumber: string;
  ovoHolder: string;
  danaNumber: string;
  danaHolder: string;
  qrisLabel: string;
  qrisImage: string;
  activeMethods: string[];
}

const DEFAULT_PAYMENT_SETTINGS: PaymentSettingsForm = {
  bankName: '',
  bankCode: '',
  bankNumber: '',
  bankHolder: '',
  gopayNumber: '',
  gopayHolder: '',
  ovoNumber: '',
  ovoHolder: '',
  danaNumber: '',
  danaHolder: '',
  qrisLabel: '',
  qrisImage: '',
  activeMethods: ['qris', 'bank_transfer', 'ewallet'],
};

export function AdminPanel({
  division,
  tournament,
  registrations,
  teams,
  matches,
  onApprove,
  onUpdateTier,
  onReject,
  onDelete,
  onDeleteAllRejected,
  onSetMVP,
  onRemoveMVP,
  onUpdateStatus,
  onGenerateTeams,
  onResetTeams,
  onGenerateBracket,
  onUpdateMatchScore,
  onFinalize,
  onResetSeason,
  onUpdatePrizePool,
  onCreateTournament,
  onLogout,
  onSwitchDivision,
  showTrigger = false,
  isOpen,
  onOpenChange,
  mode = 'sheet',
}: AdminPanelProps) {
  const { adminUser, addToast, fetchData: storeFetchData, verifyAdminSession } = useAppStore();
  const { settings } = useAppSettings();
  const isPageMode = mode === 'page';
  const [internalOpen, setInternalOpen] = useState(false);
  const [selectedTier, setSelectedTier] = useState<Record<string, string>>({});
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // ── Bracket strategy selection state ──
  const [bracketStrategy, setBracketStrategy] = useState<'random' | 'seeded' | 'balanced'>('random');

  // ── Prize Pool input state ──
  const [prizeInput, setPrizeInput] = useState({
    champion: '',
    runnerUp: '',
    third: '',
    mvp: '',
  });
  const [prizeSaving, setPrizeSaving] = useState(false);

  // ── Payment settings state ──
  const [adminTab, setAdminTab] = useState<'tournament' | 'payment' | 'rbac' | 'clubs' | 'peserta' | 'banner' | 'content'>('tournament');
  const [adminSubTab, setAdminSubTab] = useState<'rbac' | 'bot' | 'restore'>('rbac');
  const [contentSubTab, setContentSubTab] = useState<'rules' | 'info' | 'video' | 'tournament_info'>('rules');

  // ── Banner management state ──
  const [bannerMaleUrl, setBannerMaleUrl] = useState<string | null>(null);
  const [bannerFemaleUrl, setBannerFemaleUrl] = useState<string | null>(null);
  const [bannerLoaded, setBannerLoaded] = useState(false);
  const [bannerSaving, setBannerSaving] = useState(false);
  const [bannerSaved, setBannerSaved] = useState(false);
  const [paySettings, setPaySettings] = useState<PaymentSettingsForm>(DEFAULT_PAYMENT_SETTINGS);
  const [paySettingsLoaded, setPaySettingsLoaded] = useState(false);
  const [paySettingsSaving, setPaySettingsSaving] = useState(false);
  const [paySettingsSaved, setPaySettingsSaved] = useState(false);

  // ── Player Management full-screen state ──
  const [showPlayerManagement, setShowPlayerManagement] = useState(false);

  // ── Pending payments verification state ──
  const [pendingPayments, setPendingPayments] = useState<Array<{
    id: string;
    type: 'donation' | 'sawer';
    amount: number;
    message: string | null;
    paymentMethod: string;
    proofImageUrl: string | null;
    from: string;
    fromAvatar: string | null;
    targetPlayerName?: string | null;
    createdAt: string;
  }>>([]);
  const [paymentsLoading, setPaymentsLoading] = useState(false);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [showProofModal, setShowProofModal] = useState<string | null>(null);
  const [proofModalUrl, setProofModalUrl] = useState<string | null>(null);

  // ── RBAC state ──
  const [adminList, setAdminList] = useState<Array<{id: string; name: string; email: string; role: string; permissions: Record<string, boolean>; avatar: string | null; createdAt: string}>>([]);
  const [showAddAdmin, setShowAddAdmin] = useState(false);
  const [newAdminName, setNewAdminName] = useState('');
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newAdminPass, setNewAdminPass] = useState('');
  const [newAdminPerms, setNewAdminPerms] = useState<Record<string, boolean>>({
    tournament: true, players: true, bracket: true, scores: true,
    prize: true, donations: true, full_reset: false, manage_admins: false,
  });
  const [editingPermId, setEditingPermId] = useState<string | null>(null);
  const [rbacLoading, setRbacLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [showFullResetConfirm, setShowFullResetConfirm] = useState(false);
  const [fullResetConfirmText, setFullResetConfirmText] = useState('');
  const [fullResetLoading, setFullResetLoading] = useState(false);

  // ── QuickInfo CRUD state ──
  const [quickInfoItems, setQuickInfoItems] = useState<Array<{ icon: string; title: string; description: string; color: string }>>([]);
  const [quickInfoLoaded, setQuickInfoLoaded] = useState(false);
  const [quickInfoSaving, setQuickInfoSaving] = useState(false);
  const [quickInfoSaved, setQuickInfoSaved] = useState(false);

  // ── Landing Content CRUD state (Rules + Tournament Info) ──
  const [landingRules, setLandingRules] = useState<{ title: string; items: string[] }>({ title: 'Rules', items: [] });
  const [landingTournamentInfo, setLandingTournamentInfo] = useState<{ title: string; description: string; features: Array<{ icon: string; label: string; value: string }> }>({ title: 'Tentang Turnamen', description: '', features: [] });
  const [landingContentLoaded, setLandingContentLoaded] = useState(false);
  const [landingContentSaving, setLandingContentSaving] = useState(false);
  const [landingContentSaved, setLandingContentSaved] = useState(false);

  // ── Video Highlights state ──
  const [videoHighlights, setVideoHighlights] = useState<Array<{ id: string; title: string; youtubeUrl: string; division: string; sortOrder: number; isActive: boolean }>>([]);
  const [videoHighlightsLoaded, setVideoHighlightsLoaded] = useState(false);
  const [videoHighlightsLoading, setVideoHighlightsLoading] = useState(false);
  const [newVideoTitle, setNewVideoTitle] = useState('');
  const [newVideoUrl, setNewVideoUrl] = useState('');
  const [newVideoDivision, setNewVideoDivision] = useState('all');
  const [addingVideo, setAddingVideo] = useState(false);

  // ── Refresh trigger for syncing data between components ──
  const [dataRefreshTrigger, setDataRefreshTrigger] = useState(0);
  const triggerDataRefresh = useCallback(() => {
    setDataRefreshTrigger(prev => prev + 1);
    storeFetchData(false);
  }, [storeFetchData]);

  // ── Create Tournament form state ──
  const [newTournamentName, setNewTournamentName] = useState('');
  const [newTournamentType, setNewTournamentType] = useState<'weekly' | 'grand_final'>('weekly');
  const [newTournamentBracket, setNewTournamentBracket] = useState<'single' | 'double' | 'group' | 'round_robin' | 'swiss'>('single');
  const [newTournamentWeek, setNewTournamentWeek] = useState(1);
  const [newTournamentDate, setNewTournamentDate] = useState('');
  const [newTournamentTime, setNewTournamentTime] = useState('');
  const [newTournamentMode, setNewTournamentMode] = useState('GR Arena 3vs3');
  const [newTournamentBpm, setNewTournamentBpm] = useState('130');
  const [newTournamentLokasi, setNewTournamentLokasi] = useState('PUB 1');
  const [creatingTournament, setCreatingTournament] = useState(false);
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);
  const [showPrizeDropdown, setShowPrizeDropdown] = useState(false);

  // ── Edit & Delete Tournament state ──
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteTournamentConfirm, setShowDeleteTournamentConfirm] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [deleteTournamentLoading, setDeleteTournamentLoading] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    type: 'weekly' as 'weekly' | 'grand_final',
    bracketType: 'single' as 'single' | 'double' | 'group' | 'round_robin' | 'swiss',
    week: 1,
    startDate: '',
    startTime: '',
    mode: 'GR Arena 3vs3',
    bpm: '130',
    lokasi: 'PUB 1',
  });

  // ── Club management state ──
  const [clubs, setClubs] = useState<Array<{id: string; name: string; slug: string; logoUrl: string | null; totalPoints: number; memberCount: number}>>([]);
  const [clubsLoading, setClubsLoading] = useState(false);
  const [editingClub, setEditingClub] = useState<{id: string; name: string; slug: string; logoUrl: string | null} | null>(null);
  const [editClubName, setEditClubName] = useState('');
  const [editClubLogo, setEditClubLogo] = useState('');
  const [editClubSaving, setEditClubSaving] = useState(false);
  const [showCreateClub, setShowCreateClub] = useState(false);
  const [newClubName, setNewClubName] = useState('');
  const [creatingClub, setCreatingClub] = useState(false);
  const [newClubLogo, setNewClubLogo] = useState<string | null>(null);
  const [newClubLogoUploading, setNewClubLogoUploading] = useState(false);
  const [showDeleteClubConfirm, setShowDeleteClubConfirm] = useState<string | null>(null);
  const [deletingClub, setDeletingClub] = useState(false);

  const isMale = division === 'male';
  // 🐉 Dragon Theme Colors - Night Fury (Green) / Light Fury (Blue)
  const accentClass = isMale ? 'text-[#73FF00]' : 'text-[#38BDF8]';
  const accentBgSubtle = isMale ? 'bg-[#73FF00]/12' : 'bg-[#38BDF8]/12';
  const accentColor = isMale ? '#73FF00' : '#38BDF8';
  const glowRGB = isMale ? '115,255,0' : '56,189,248';

  // Reset form when division changes to prevent data mixing
  useEffect(() => {
    setNewTournamentName('');
    setNewTournamentType('weekly');
    setNewTournamentBracket('single');
    setNewTournamentWeek(1);
    setNewTournamentDate('');
    setNewTournamentTime('');
    setNewTournamentMode('GR Arena 3vs3');
    setNewTournamentBpm('130');
    setNewTournamentLokasi('PUB 1');
    setShowAdvancedSettings(false);
    setEditForm({
      name: '',
      type: 'weekly',
      bracketType: 'single',
      week: 1,
      startDate: '',
      startTime: '',
      mode: 'GR Arena 3vs3',
      bpm: '130',
      lokasi: 'PUB 1',
    });
  }, [division]);

  // Pre-populate prize input when tournament data changes
  useEffect(() => {
    if (tournament) {
      setPrizeInput({
        champion: (tournament as Tournament & { prizeChampion?: number }).prizeChampion?.toString() || '',
        runnerUp: (tournament as Tournament & { prizeRunnerUp?: number }).prizeRunnerUp?.toString() || '',
        third: (tournament as Tournament & { prizeThird?: number }).prizeThird?.toString() || '',
        mvp: (tournament as Tournament & { prizeMvp?: number }).prizeMvp?.toString() || '',
      });
    }
  }, [tournament]);

  const btnClass = isMale ? 'bg-[#73FF00]/12 text-[#73FF00] border border-[#73FF00]/15' : 'bg-[#38BDF8]/12 text-[#38BDF8] border border-[#38BDF8]/15';
  const avatarRingClass = isMale ? 'ring-[#73FF00]/30' : 'ring-[#38BDF8]/30';

  const showPanel = isOpen !== undefined ? isOpen : internalOpen;
  const setShowPanel = onOpenChange
    ? (open: boolean) => onOpenChange(open)
    : setInternalOpen;

  const pendingRegistrations = useMemo(
    () => registrations.filter((r) => r.status === 'pending'),
    [registrations],
  );
  const approvedRegistrations = useMemo(
    () => registrations.filter((r) => r.status === 'approved'),
    [registrations],
  );
  // Tier counts from approved registrations
  const tierCounts = useMemo(() => {
    const s = approvedRegistrations.filter((r) => (r.tierAssigned || r.user.tier) === 'S').length;
    const a = approvedRegistrations.filter((r) => (r.tierAssigned || r.user.tier) === 'A').length;
    const b = approvedRegistrations.filter((r) => (r.tierAssigned || r.user.tier) === 'B').length;
    return { s, a, b };
  }, [approvedRegistrations]);

  // Derived values
  const teamsCount = teams.length;
  const matchesCount = matches.length;
  const completedMatches = matches.filter((m) => m.status === 'completed').length;
  const pendingMatches = matches.filter((m) => m.status === 'pending' || m.status === 'ready');

  // ── Inline preview states ──
  const [showTeamsPreview, setShowTeamsPreview] = useState(true);
  const [showBracketPreview, setShowBracketPreview] = useState(true);
  const [editingMatchId, setEditingMatchId] = useState<string | null>(null);
  const [editScoreA, setEditScoreA] = useState<string>('');
  const [editScoreB, setEditScoreB] = useState<string>('');

  const statusFlow = STEPS.map((s) => s.key);
  const currentStepIndex = tournament
    ? statusFlow.indexOf(tournament.status)
    : -1;

  const handleApprove = (regId: string) => {
    const tier = selectedTier[regId] || 'B';
    onApprove(regId, tier);
  };

  // ── Payment Settings CRUD ──
  const fetchPaymentSettings = useCallback(() => {
    fetch('/api/payment-settings')
      .then((r) => r.json())
      .then((data) => {
        if (data?.settings) {
          setPaySettings({
            bankName: data.settings.bankName || DEFAULT_PAYMENT_SETTINGS.bankName,
            bankCode: data.settings.bankCode || DEFAULT_PAYMENT_SETTINGS.bankCode,
            bankNumber: data.settings.bankNumber || DEFAULT_PAYMENT_SETTINGS.bankNumber,
            bankHolder: data.settings.bankHolder || DEFAULT_PAYMENT_SETTINGS.bankHolder,
            gopayNumber: data.settings.gopayNumber || DEFAULT_PAYMENT_SETTINGS.gopayNumber,
            gopayHolder: data.settings.gopayHolder || DEFAULT_PAYMENT_SETTINGS.gopayHolder,
            ovoNumber: data.settings.ovoNumber || DEFAULT_PAYMENT_SETTINGS.ovoNumber,
            ovoHolder: data.settings.ovoHolder || DEFAULT_PAYMENT_SETTINGS.ovoHolder,
            danaNumber: data.settings.danaNumber || DEFAULT_PAYMENT_SETTINGS.danaNumber,
            danaHolder: data.settings.danaHolder || DEFAULT_PAYMENT_SETTINGS.danaHolder,
            qrisLabel: data.settings.qrisLabel || DEFAULT_PAYMENT_SETTINGS.qrisLabel,
            qrisImage: data.settings.qrisImage || '',
            activeMethods: data.settings.activeMethods || DEFAULT_PAYMENT_SETTINGS.activeMethods,
          });
        }
        setPaySettingsLoaded(true);
      })
      .catch(() => setPaySettingsLoaded(true));
  }, []);

  useEffect(() => {
    if (showPanel) {
      // Verify admin session is still valid
      verifyAdminSession();
      fetchPaymentSettings();
      setPaySettingsSaved(false);
      // Fetch admins for RBAC tab
      fetch('/api/admin/auth').then(r => r.json()).then(data => {
        if (data.success) setAdminList(data.admins.map((a: any) => ({ ...a, permissions: JSON.parse(a.permissions || '{}') })));
      }).catch(() => {});
    }
  }, [showPanel, fetchPaymentSettings, verifyAdminSession]);

  const handleSavePaymentSettings = async () => {
    setPaySettingsSaving(true);
    try {
      const res = await adminFetch('/api/payment-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: paySettings }),
      });
      if (res.ok) {
        setPaySettingsSaved(true);
        setTimeout(() => setPaySettingsSaved(false), 3000);
        // Broadcast payment settings update so other components can refresh
        try {
          if (typeof window !== 'undefined') {
            const channel = new BroadcastChannel('idm-payment-settings');
            channel.postMessage({ action: 'refresh', activeMethods: paySettings.activeMethods });
            channel.close();
          }
        } catch {
          // BroadcastChannel not supported — ignore
        }
      }
    } catch {
      // silent
    } finally {
      setPaySettingsSaving(false);
    }
  };

  const toggleActiveMethod = (method: string) => {
    setPaySettings((prev) => ({
      ...prev,
      activeMethods: prev.activeMethods.includes(method)
        ? prev.activeMethods.filter((m) => m !== method)
        : [...prev.activeMethods, method],
    }));
  };

  const updatePayField = (field: keyof PaymentSettingsForm, value: string) => {
    setPaySettings((prev) => ({ ...prev, [field]: value }));
  };

  // ── Pending payments verification ──
  const fetchPendingPayments = useCallback(() => {
    setPaymentsLoading(true);
    fetch('/api/payments/pending')
      .then((r) => r.json())
      .then((data) => {
        if (data?.success) {
          setPendingPayments(data.payments || []);
        }
      })
      .catch(() => {})
      .finally(() => setPaymentsLoading(false));
  }, []);

  useEffect(() => {
    if (showPanel && adminTab === 'payment') {
      fetchPendingPayments();
    }
  }, [showPanel, adminTab, fetchPendingPayments]);

  // ── Fetch clubs for admin management ──
  const fetchClubs = useCallback(() => {
    setClubsLoading(true);
    fetch('/api/clubs?admin=true&limit=50')
      .then((r) => r.json())
      .then((data) => {
        if (data?.success) {
          setClubs(data.clubs || []);
        }
      })
      .catch(() => {})
      .finally(() => setClubsLoading(false));
  }, []);

  // Notify homescreen to refresh club data (via BroadcastChannel)
  const broadcastClubUpdate = useCallback(() => {
    try {
      if (typeof window !== 'undefined') {
        const channel = new BroadcastChannel('idm-club-updates');
        channel.postMessage({ action: 'refresh' });
        channel.close();
      }
    } catch {
      // BroadcastChannel not supported — ignore
    }
  }, []);

  useEffect(() => {
    if (showPanel && adminTab === 'clubs') {
      fetchClubs();
    }
  }, [showPanel, adminTab, fetchClubs]);

  // ── Fetch banner settings ──
  const fetchBanners = useCallback(() => {
    adminFetch('/api/admin/banner')
      .then((r) => r.json())
      .then((data) => {
        if (data?.success) {
          setBannerMaleUrl(data.data?.bannerMaleUrl || null);
          setBannerFemaleUrl(data.data?.bannerFemaleUrl || null);
          setBannerLoaded(true);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (showPanel && adminTab === 'banner') {
      fetchBanners();
    }
  }, [showPanel, adminTab, fetchBanners]);

  // ── Save banner settings ──
  const saveBanners = useCallback(async () => {
    setBannerSaving(true);
    setBannerSaved(false);
    try {
      const res = await adminFetch('/api/admin/banner', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bannerMaleUrl,
          bannerFemaleUrl,
        }),
      });
      if (res.ok) {
        setBannerSaved(true);
        addToast('Banner berhasil disimpan!', 'success');
        setTimeout(() => setBannerSaved(false), 3000);
      }
    } catch {
      addToast('Gagal menyimpan banner', 'error');
    } finally {
      setBannerSaving(false);
    }
  }, [bannerMaleUrl, bannerFemaleUrl, addToast]);

  // ── Fetch QuickInfo items ──
  const fetchQuickInfo = useCallback(() => {
    adminFetch('/api/admin/quick-info')
      .then((r) => r.json())
      .then((data) => {
        if (data?.success && Array.isArray(data.items)) {
          setQuickInfoItems(data.items);
          setQuickInfoLoaded(true);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (showPanel && adminTab === 'content' && contentSubTab === 'info') {
      fetchQuickInfo();
    }
  }, [showPanel, adminTab, contentSubTab, fetchQuickInfo]);

  // ── Fetch Video Highlights ──
  const fetchVideoHighlights = useCallback(() => {
    setVideoHighlightsLoading(true);
    adminFetch('/api/admin/video-highlights')
      .then((r) => r.json())
      .then((data) => {
        if (data?.success && Array.isArray(data.data)) {
          setVideoHighlights(data.data);
        }
      })
      .catch(() => {})
      .finally(() => {
        setVideoHighlightsLoaded(true);
        setVideoHighlightsLoading(false);
      });
  }, []);

  useEffect(() => {
    if (showPanel && adminTab === 'content' && contentSubTab === 'video') {
      fetchVideoHighlights();
    }
  }, [showPanel, adminTab, contentSubTab, fetchVideoHighlights]);

  // ── Save QuickInfo items ──
  const saveQuickInfo = useCallback(async () => {
    setQuickInfoSaving(true);
    setQuickInfoSaved(false);
    try {
      const res = await adminFetch('/api/admin/quick-info', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: quickInfoItems }),
      });
      if (res.ok) {
        setQuickInfoSaved(true);
        addToast('Informasi berhasil disimpan!', 'success');
        setTimeout(() => setQuickInfoSaved(false), 3000);
      }
    } catch {
      addToast('Gagal menyimpan informasi', 'error');
    } finally {
      setQuickInfoSaving(false);
    }
  }, [quickInfoItems, addToast]);

  // ── Fetch Landing Content (Rules + Tournament Info) ──
  const fetchLandingContent = useCallback(() => {
    adminFetch('/api/admin/landing-content')
      .then((r) => r.json())
      .then((data) => {
        if (data?.success) {
          if (data.rules) setLandingRules(data.rules);
          if (data.tournamentInfo) setLandingTournamentInfo(data.tournamentInfo);
          setLandingContentLoaded(true);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (showPanel && adminTab === 'content' && (contentSubTab === 'rules' || contentSubTab === 'tournament_info')) {
      fetchLandingContent();
    }
  }, [showPanel, adminTab, contentSubTab, fetchLandingContent]);

  // ── Save Landing Content ──
  const saveLandingContent = useCallback(async () => {
    setLandingContentSaving(true);
    setLandingContentSaved(false);
    try {
      const res = await adminFetch('/api/admin/landing-content', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rules: landingRules, tournamentInfo: landingTournamentInfo }),
      });
      if (res.ok) {
        setLandingContentSaved(true);
        addToast('Konten landing berhasil disimpan!', 'success');
        setTimeout(() => setLandingContentSaved(false), 3000);
        // Notify other tabs
        try { const bc = new BroadcastChannel('idm-landing-content'); bc.postMessage('updated'); bc.close(); } catch {}
      }
    } catch {
      addToast('Gagal menyimpan konten landing', 'error');
    } finally {
      setLandingContentSaving(false);
    }
  }, [landingRules, landingTournamentInfo, addToast]);

  const handleVerifyPayment = async (id: string, type: 'donation' | 'sawer', status: 'confirmed' | 'rejected') => {
    setVerifyingId(id);
    try {
      const res = await adminFetch('/api/payments/confirm', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, id, status }),
      });
      if (res.ok) {
        // Remove from list
        setPendingPayments((prev) => prev.filter((p) => p.id !== id));
        // Show toast for sawer confirmation
        if (type === 'sawer' && status === 'confirmed') {
          addToast('Sawer dikonfirmasi! Prize pool diperbarui.', 'success');
        }
        // Refresh data to update prize pool
        storeFetchData(false);
      }
    } catch {
      // silent
    } finally {
      setVerifyingId(null);
    }
  };

  const handleViewProof = (url: string) => {
    setProofModalUrl(url);
    setShowProofModal('view');
  };

  return (
    <>
      {showTrigger && !isPageMode && (
        <motion.button
          onClick={() => setShowPanel(true)}
          className="fixed top-20 right-4 z-40 bg-white/[0.04] border border-white/[0.06] rounded-2xl p-3"
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.92 }}
        >
          <Shield className={`w-5 h-5 ${accentClass}`} />
        </motion.button>
      )}

      <AnimatePresence>
        {showPanel && (
          <motion.div
            className={`fixed inset-0 z-50 ${isPageMode ? 'flex flex-col' : 'flex items-end sm:items-center justify-center'}`}
            initial={isPageMode ? { opacity: 0 } : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={isPageMode ? undefined : () => setShowPanel(false)}
          >
            {!isPageMode && (
              <motion.div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              />
            )}

            <motion.div
              className={`relative w-full overflow-hidden flex flex-col ${
                isPageMode
                  ? 'flex-1 w-full'
                  : 'max-w-md lg:max-w-4xl max-h-[90vh]'
              }`}
              style={isPageMode ? {
                background: 'linear-gradient(180deg, #0B0B0F 0%, #0d0f12 100%)',
              } : {
                borderRadius: '1.5rem 1.5rem 0 0',
                background: `linear-gradient(180deg, rgba(22,22,24,0.98) 0%, rgba(16,17,19,0.96) 100%)`,
                backdropFilter: 'blur(40px) saturate(150%)',
                boxShadow: `0 -1px 0 rgba(255,255,255,0.04), 0 -4px 16px rgba(0,0,0,0.3)`,
              }}
              initial={isPageMode ? { opacity: 0, y: 8 } : { y: '100%' }}
              animate={isPageMode ? { opacity: 1, y: 0 } : { y: 0 }}
              exit={isPageMode ? { opacity: 0, y: 8 } : { y: '100%' }}
              transition={isPageMode ? { duration: 0.2 } : { type: 'spring', damping: 30, stiffness: 320 }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Subtle accent glow */}
              <div
                className="absolute top-0 right-0 w-48 h-48 rounded-full blur-[80px] pointer-events-none opacity-30"
                style={{ background: `radial-gradient(circle, rgba(${glowRGB},0.04) 0%, transparent 60%)`, transform: 'translate(30%, -30%)' }}
              />

              {!isPageMode && (
                <div className="flex justify-center pt-2.5 pb-0.5">
                  <div className="w-9 h-[5px] rounded-full bg-white/20" />
                </div>
              )}

              {/* iOS Clean Header */}
              <div className={`relative px-5 pb-3 md:px-6 ${isPageMode ? 'pt-4' : 'pt-0.5'} ${isPageMode ? 'w-full' : ''}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {isPageMode && (
                      <motion.button
                        onClick={() => setShowPanel(false)}
                        className="w-8 h-8 rounded-xl flex items-center justify-center bg-white/[0.04] text-white/40 hover:text-white/60 hover:bg-white/[0.06] transition-colors"
                        whileTap={{ scale: 0.92 }}
                        aria-label="Kembali"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M19 12H5M12 19l-7-7 7-7" />
                        </svg>
                      </motion.button>
                    )}
                    {/* Shield Icon — Clean iOS style */}
                    <div
                      className={`rounded-xl flex items-center justify-center ${isPageMode ? 'w-9 h-9' : 'w-8 h-8'}`}
                      style={{
                        background: `rgba(${glowRGB},0.12)`,
                      }}
                    >
                      <Shield className={`w-5 h-5 ${accentClass}`} />
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-white/85 tracking-tight">
                        KONTROL TURNAMEN
                      </h2>
                      <p className="text-xs text-white/30 mt-0.5 leading-tight">
                        {tournament?.name || 'Belum ada turnamen'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {onSwitchDivision && (
                      <div className="flex items-center bg-white/[0.06] rounded-full p-0.5">
                        <button
                          onClick={() => onSwitchDivision('male')}
                          className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1 transition-all ${
                            division === 'male'
                              ? 'text-[#73FF00]'
                              : 'text-white/30 hover:text-white/50'
                          }`}
                          style={division === 'male' ? {
                            background: 'rgba(115,255,0,0.12)',
                            boxShadow: '0 1px 4px rgba(0,0,0,0.15), inset 0 0.5px 0 rgba(255,255,255,0.05)',
                          } : undefined}
                        >
                          <span>⚡</span>
                          <span>Male</span>
                        </button>
                        <button
                          onClick={() => onSwitchDivision('female')}
                          className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1 transition-all ${
                            division === 'female'
                              ? 'text-[#38BDF8]'
                              : 'text-white/30 hover:text-white/50'
                          }`}
                          style={division === 'female' ? {
                            background: 'rgba(56,189,248,0.12)',
                            boxShadow: '0 1px 4px rgba(0,0,0,0.15), inset 0 0.5px 0 rgba(255,255,255,0.05)',
                          } : undefined}
                        >
                          <span>💫</span>
                          <span>Female</span>
                        </button>
                      </div>
                    )}
                    {onLogout && (
                      <motion.button
                        onClick={onLogout}
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-white/30 active:bg-red-500/15 active:text-red-400 transition-colors"
                        whileTap={{ scale: 0.92 }}
                        aria-label="Logout"
                      >
                        <LogOut className="w-4 h-4" />
                      </motion.button>
                    )}
                    {!isPageMode && (
                      <button
                        onClick={() => setShowPanel(false)}
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-white/30 active:bg-white/10 transition-colors"
                      >
                        <X className="w-4 h-4" strokeWidth={2.5} />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className={`flex-1 overflow-y-auto px-4 ${isPageMode ? 'pb-8 pt-2' : 'pb-28 pt-0'} md:px-5 lg:pb-8 space-y-4 lg:space-y-5 ${isPageMode ? 'w-full' : ''}`}>
                {/* iOS Segmented Control Tab Switcher — Compact Pill Style */}
                <div className="flex bg-white/[0.05] rounded-xl p-1 gap-1">
                  {([
                    { id: 'tournament' as const, label: 'Turnamen', icon: Shield },
                    { id: 'peserta' as const, label: 'Peserta', icon: Users },
                    { id: 'payment' as const, label: 'Bayar', icon: CreditCard },
                    { id: 'clubs' as const, label: 'Club', icon: Building2 },
                    { id: 'content' as const, label: 'Konten', icon: ListChecks },
                    { id: 'banner' as const, label: 'Banner', icon: ImageIconLucide },
                    { id: 'rbac' as const, label: 'Admin', icon: UserCog },
                  ]).map((tab) => (
                    <motion.button
                      key={tab.id}
                      onClick={() => setAdminTab(tab.id)}
                      className="relative flex-1 min-w-0 py-2.5 rounded-[9px] text-xs font-semibold flex items-center justify-center gap-1 z-10"
                      whileTap={{ scale: 0.97 }}
                    >
                      {adminTab === tab.id && (
                        <motion.div
                          className="absolute inset-0 rounded-[9px] pointer-events-none"
                          style={{ background: 'rgba(255,255,255,0.08)', boxShadow: '0 0.5px 2px rgba(0,0,0,0.15)' }}
                          layoutId="adminPanelTab"
                          transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                        />
                      )}
                      <tab.icon className={`w-4 h-4 relative z-10 ${adminTab === tab.id ? accentClass : 'text-white/25'}`} />
                      <span className={`relative z-10 whitespace-nowrap hidden sm:inline ${adminTab === tab.id ? 'text-white/90' : 'text-white/25'}`}>
                        {tab.label}
                      </span>
                    </motion.button>
                  ))}
                </div>

                {/* ═══ PESERTA TAB ═══ */}
                {adminTab === 'peserta' && (
                  <PesertaManagementTab
                    division={division}
                    accentClass={accentClass}
                    accentBgSubtle={accentBgSubtle}
                    addToast={addToast}
                    onRefresh={triggerDataRefresh}
                    refreshTrigger={dataRefreshTrigger}
                    tournamentId={tournament?.id}
                  />
                )}

                {/* ═══ TOURNAMENT TAB ═══ */}
                {adminTab === 'tournament' && (
                  !tournament ? (
                    /* No Tournament State — Create New Tournament Form */
                    <div className="space-y-5">
                      <div className="flex items-center gap-2 mb-1">
                        <div className={`w-9 h-9 rounded-xl ${accentBgSubtle} flex items-center justify-center`}>
                          <Plus className={`w-5 h-5 ${accentClass}`} />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-white/90">Buat Turnamen Baru</p>
                          <p className="text-xs text-white/30">Divisi {isMale ? 'Laki-laki' : 'Perempuan'}</p>
                        </div>
                      </div>

                      <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4 lg:p-6 space-y-4">
                        {/* Tournament Name */}
                        <div>
                          <label className="text-xs tracking-[0.15em] uppercase text-white/40 font-semibold mb-1.5 block">
                            Nama Turnamen
                          </label>
                          <input
                            type="text"
                            value={newTournamentName}
                            onChange={(e) => setNewTournamentName(e.target.value)}
                            placeholder={isMale ? `Contoh: ${settings.app_name} Weekly Male` : `Contoh: ${settings.app_name} Weekly Female`}
                            className="w-full bg-white/[0.05] border border-white/[0.08] rounded-xl px-4 py-2.5 text-white/90 text-sm lg:text-base placeholder-white/20 focus:outline-none focus:border-white/[0.15] focus:bg-white/[0.06] transition-colors"
                          />
                        </div>

                        {/* Type Selector */}
                        <div>
                          <label className="text-xs tracking-[0.15em] uppercase text-white/40 font-semibold mb-1.5 block">
                            Jenis Turnamen
                          </label>
                          <div className="grid grid-cols-2 gap-2">
                            {([
                              { key: 'weekly' as const, label: 'Weekly', desc: 'Mingguan' },
                              { key: 'grand_final' as const, label: 'Grand Final', desc: 'Final musim' },
                            ]).map((t) => (
                              <button
                                key={t.key}
                                onClick={() => setNewTournamentType(t.key)}
                                className={`p-3 rounded-xl text-left transition-all ${
                                  newTournamentType === t.key
                                    ? 'bg-white/10 border border-white/20'
                                    : 'bg-white/[0.03] border border-white/5 hover:bg-white/[0.06]'
                                }`}
                              >
                                <Trophy className={`w-4 h-4 mb-1 ${newTournamentType === t.key ? accentClass : 'text-white/30'}`} />
                                <p className={`text-sm font-semibold ${newTournamentType === t.key ? 'text-white/90' : 'text-white/40'}`}>
                                  {t.label}
                                </p>
                                <p className="text-xs text-white/25">{t.desc}</p>
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Week Number */}
                        <div>
                          <label className="text-xs tracking-[0.15em] uppercase text-white/40 font-semibold mb-1.5 block">
                            Minggu Ke-
                          </label>
                          <input
                            type="number"
                            inputMode="numeric"
                            min={1}
                            max={99}
                            value={newTournamentWeek}
                            onChange={(e) => setNewTournamentWeek(parseInt(e.target.value) || 1)}
                            className="w-full bg-white/[0.05] border border-white/[0.08] rounded-xl px-4 py-2.5 text-white/90 text-sm lg:text-base placeholder-white/20 focus:outline-none focus:border-white/[0.15] focus:bg-white/[0.06] transition-colors"
                          />
                        </div>

                        {/* Tanggal & Jam */}
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-xs tracking-[0.15em] uppercase text-white/40 font-semibold mb-1.5 flex items-center gap-1">
                              <Calendar className="w-3 h-3" /> Tanggal
                            </label>
                            <input
                              type="date"
                              value={newTournamentDate}
                              onChange={(e) => setNewTournamentDate(e.target.value)}
                              className="w-full bg-white/[0.05] border border-white/[0.08] rounded-xl px-3 py-2.5 text-white/90 text-sm placeholder-white/20 focus:outline-none focus:border-white/[0.15] focus:bg-white/[0.06] transition-colors [color-scheme:dark]"
                            />
                          </div>
                          <div>
                            <label className="text-xs tracking-[0.15em] uppercase text-white/40 font-semibold mb-1.5 flex items-center gap-1">
                              <Clock className="w-3 h-3" /> Jam
                            </label>
                            <input
                              type="time"
                              value={newTournamentTime}
                              onChange={(e) => setNewTournamentTime(e.target.value)}
                              className="w-full bg-white/[0.05] border border-white/[0.08] rounded-xl px-3 py-2.5 text-white/90 text-sm placeholder-white/20 focus:outline-none focus:border-white/[0.15] focus:bg-white/[0.06] transition-colors [color-scheme:dark]"
                            />
                          </div>
                        </div>

                        {/* Advanced Settings — Collapsed by default */}
                        <div>
                          <button
                            type="button"
                            onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
                            className="flex items-center gap-2 text-xs text-white/35 hover:text-white/55 font-medium transition-colors py-1"
                          >
                            <motion.div
                              animate={{ rotate: showAdvancedSettings ? 90 : 0 }}
                              transition={{ duration: 0.2 }}
                            >
                              <ChevronDown className="w-3 h-3" />
                            </motion.div>
                            Pengaturan lanjutan
                            <span className="text-[10px] text-white/20">(Bracket, Mode, BPM, Lokasi)</span>
                          </button>

                          <AnimatePresence>
                            {showAdvancedSettings && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.25 }}
                                className="overflow-hidden space-y-4 pt-3"
                              >
                                {/* Bracket Type */}
                                <div>
                                  <label className="text-xs tracking-[0.15em] uppercase text-white/40 font-semibold mb-1.5 block">
                                    Tipe Bracket
                                  </label>
                                  <div className="grid grid-cols-3 gap-2">
                                    {([
                                      { key: 'single' as const, label: 'Single', desc: 'Eliminasi' },
                                      { key: 'double' as const, label: 'Double', desc: 'Double Elim' },
                                      { key: 'group' as const, label: 'Group', desc: 'Fase Grup' },
                                      { key: 'round_robin' as const, label: 'RR', desc: 'Round Robin' },
                                      { key: 'swiss' as const, label: 'Swiss', desc: 'Swiss System' },
                                    ]).map((b) => (
                                      <button
                                        key={b.key}
                                        onClick={() => setNewTournamentBracket(b.key)}
                                        className={`p-2.5 rounded-xl text-center transition-all ${
                                          newTournamentBracket === b.key
                                            ? 'bg-white/10 border border-white/20'
                                            : 'bg-white/[0.03] border border-white/5 hover:bg-white/[0.06]'
                                        }`}
                                      >
                                        <p className={`text-xs font-semibold ${newTournamentBracket === b.key ? 'text-white/90' : 'text-white/40'}`}>
                                          {b.label}
                                        </p>
                                        <p className="text-[10px] text-white/25">{b.desc}</p>
                                      </button>
                                    ))}
                                  </div>
                                </div>

                                {/* Mode, BPM & Lokasi */}
                                <div className="grid grid-cols-3 gap-2">
                                  <div>
                                    <label className="text-xs tracking-[0.15em] uppercase text-white/40 font-semibold mb-1.5 flex items-center gap-1">
                                      <Gamepad2 className="w-3 h-3" /> Mode
                                    </label>
                                    <input
                                      type="text"
                                      value={newTournamentMode}
                                      onChange={(e) => setNewTournamentMode(e.target.value)}
                                      placeholder="GR Arena 3vs3"
                                      className="w-full bg-white/[0.05] border border-white/[0.08] rounded-xl px-3 py-2.5 text-white/90 text-sm placeholder-white/20 focus:outline-none focus:border-white/[0.15] focus:bg-white/[0.06] transition-colors"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-xs tracking-[0.15em] uppercase text-white/40 font-semibold mb-1.5 flex items-center gap-1">
                                      <Music className="w-3 h-3" /> BPM
                                    </label>
                                    <input
                                      type="text"
                                      value={newTournamentBpm}
                                      onChange={(e) => setNewTournamentBpm(e.target.value)}
                                      placeholder="Random 120-140"
                                      className="w-full bg-white/[0.05] border border-white/[0.08] rounded-xl px-3 py-2.5 text-white/90 text-sm placeholder-white/20 focus:outline-none focus:border-white/[0.15] focus:bg-white/[0.06] transition-colors"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-xs tracking-[0.15em] uppercase text-white/40 font-semibold mb-1.5 flex items-center gap-1">
                                      <MapPin className="w-3 h-3" /> Lokasi
                                    </label>
                                    <input
                                      type="text"
                                      value={newTournamentLokasi}
                                      onChange={(e) => setNewTournamentLokasi(e.target.value)}
                                      placeholder="PUB 1"
                                      className="w-full bg-white/[0.05] border border-white/[0.08] rounded-xl px-3 py-2.5 text-white/90 text-sm placeholder-white/20 focus:outline-none focus:border-white/[0.15] focus:bg-white/[0.06] transition-colors"
                                    />
                                  </div>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>

                        {/* Create Button */}
                        <motion.button
                          onClick={() => {
                            const name = newTournamentName.trim() || `${isMale ? 'Male' : 'Female'} Division - Week ${newTournamentWeek}`;

                            // Build startDate from date + time
                            let startDate: string | null = null;
                            if (newTournamentDate) {
                              const dateStr = newTournamentDate;
                              const timeStr = newTournamentTime || '19:00';
                              startDate = new Date(`${dateStr}T${timeStr}:00`).toISOString();
                            }

                            // Random BPM if not explicitly set
                            const bpm = newTournamentBpm || '130';

                            setCreatingTournament(true);
                            onCreateTournament({
                              name,
                              division,
                              type: newTournamentType,
                              bracketType: newTournamentBracket,
                              week: newTournamentWeek,
                              startDate,
                              mode: newTournamentMode,
                              bpm,
                              lokasi: newTournamentLokasi,
                            });
                            setTimeout(() => setCreatingTournament(false), 2000);
                          }}
                          disabled={creatingTournament}
                          className={`w-full py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all ${
                            creatingTournament
                              ? 'opacity-50 pointer-events-none'
                              : isMale
                                ? 'bg-[#73FF00]/15 text-[#73FF00] border border-[#73FF00]/20 hover:bg-[#73FF00]/20'
                                : 'bg-[#38BDF8]/15 text-[#38BDF8] border border-[#38BDF8]/20 hover:bg-[#38BDF8]/20'
                          }`}
                          whileHover={{ scale: creatingTournament ? 1 : 1.01 }}
                          whileTap={{ scale: creatingTournament ? 1 : 0.97 }}
                        >
                          {creatingTournament ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Plus className="w-4 h-4" />
                          )}
                          Buat Turnamen
                        </motion.button>
                      </div>
                    </div>
                  ) : (
                    <>

                    {/* ═════════════════════════════════════════
                        iOS-style Compact Stepper — Tournament Status
                        ═══════════════════════════════════════════ */}
                <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4">
                    {/* Header */}
                    <div className="flex items-center gap-2 mb-3">
                      <p className="text-xs tracking-[0.08em] uppercase text-white/35 font-semibold">
                        Status
                      </p>
                      <div className="ml-auto flex items-center gap-1.5">
                        <div className={`w-1.5 h-1.5 rounded-full ${isMale ? 'bg-[#73FF00]' : 'bg-[#38BDF8]'} animate-pulse`} />
                        <span className={`text-xs font-semibold ${isMale ? 'text-[#73FF00]' : 'text-[#38BDF8]'}`}>
                          {STEPS[currentStepIndex]?.label}
                        </span>
                      </div>
                    </div>

                    {/* Compact Steps Row — iOS Pills */}
                    <div className="flex items-center gap-1">
                      {STEPS.map((step, index) => {
                        const isCompleted = index < currentStepIndex;
                        const isActive = index === currentStepIndex;

                        return (
                          <div key={step.key} className="flex items-center flex-1">
                            <motion.button
                              onClick={() => onUpdateStatus(step.key)}
                              className="flex items-center gap-1.5 cursor-pointer"
                              whileTap={{ scale: 0.95 }}
                            >
                              {/* Step Dot */}
                              <div
                                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                                  isCompleted
                                    ? isMale
                                      ? 'bg-[#73FF00]/20 text-[#73FF00]'
                                      : 'bg-[#38BDF8]/20 text-[#38BDF8]'
                                    : isActive
                                      ? `${isMale ? 'bg-[#73FF00]/15 text-[#73FF00] ring-1 ring-[#73FF00]/30' : 'bg-[#38BDF8]/15 text-[#38BDF8] ring-1 ring-[#38BDF8]/30'}`
                                      : 'bg-white/[0.06] text-white/20'
                                }`}
                              >
                                {isCompleted ? (
                                  <Check className="w-3 h-3" />
                                ) : (
                                  <span className="text-[10px]">{step.icon}</span>
                                )}
                              </div>
                            </motion.button>
                            {/* Connector line */}
                            {index < STEPS.length - 1 && (
                              <div
                                className={`flex-1 h-[1px] mx-1 transition-all duration-500 ${
                                  index < currentStepIndex
                                    ? isMale ? 'bg-[#73FF00]/30' : 'bg-[#38BDF8]/30'
                                    : 'bg-white/[0.06]'
                                }`}
                              />
                            )}
                          </div>
                        );
                      })}
                    </div>
                </div>

                {/* ═══════════════════════════════════════════════════════
                    KELOLA PESERTA — Available in steps 0 through 3
                    ═══════════════════════════════════════════════════════ */}
                {currentStepIndex <= 3 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs tracking-[0.2em] uppercase text-white/30 font-semibold">
                      Peserta ({registrations.length})
                    </p>
                    {pendingRegistrations.length > 0 && (
                      <span className="flex items-center gap-1 text-xs text-[--ios-red]">
                        <div className="w-1.5 h-1.5 rounded-full bg-[--ios-red] animate-pulse" />
                        {pendingRegistrations.length} menunggu
                      </span>
                    )}
                  </div>
                  <motion.button
                    onClick={() => setShowPlayerManagement(true)}
                    className="w-full bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4 text-left"
                    whileHover={{ scale: 1.005 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-11 h-11 rounded-2xl ${accentBgSubtle} flex items-center justify-center flex-shrink-0`}>
                        <UserCog className={`w-5 h-5 ${accentClass}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-white/90">Kelola Peserta</p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span className="text-xs text-green-400/70">{approvedRegistrations.length} disetujui</span>
                          <span className="text-white/10">·</span>
                          <span className="text-xs text-amber-400/70">S:{tierCounts.s}</span>
                          <span className="text-xs text-purple-400/70">A:{tierCounts.a}</span>
                          <span className="text-xs text-cyan-400/70">B:{tierCounts.b}</span>
                          <span className="text-white/10">·</span>
                          <span className="text-xs text-yellow-400/70">{pendingRegistrations.length} menunggu</span>
                        </div>
                      </div>
                    </div>
                  </motion.button>
                </div>
                )}

                {/* ═══════════════════════════════════════════════════════
                    STEP-CONDITIONAL CONTENT — shows relevant actions per step
                    ═══════════════════════════════════════════════════════ */}

                {/* ═══════════════════════════════════════════════════════
                    STEP 0–1: PERSIAPAN — Prize pool & settings
                    ═══════════════════════════════════════════════════════ */}
                {currentStepIndex <= 1 && (
                <div className="space-y-4" id="admin-persiapan">
                  <motion.button
                    onClick={() => {
                      if (!tournament) return;
                      // Pre-fill edit form with current tournament data
                      const sd = tournament.startDate ? new Date(tournament.startDate) : null;
                      setEditForm({
                        name: tournament.name || '',
                        type: (tournament.type || 'weekly') as 'weekly' | 'grand_final',
                        bracketType: (tournament.bracketType || 'single') as 'single' | 'double' | 'group' | 'round_robin' | 'swiss',
                        week: tournament.week || 1,
                        startDate: sd ? sd.toISOString().split('T')[0] : '',
                        startTime: sd ? `${String(sd.getHours()).padStart(2,'0')}:${String(sd.getMinutes()).padStart(2,'0')}` : '',
                        mode: tournament.mode || 'GR Arena 3vs3',
                        bpm: tournament.bpm || '130',
                        lokasi: tournament.lokasi || 'PUB 1',
                      });
                      setShowEditModal(true);
                    }}
                    className="flex items-center gap-2.5 mb-1 p-2 -mx-2 rounded-xl cursor-pointer transition-colors hover:bg-white/[0.04] w-full"
                    whileTap={{ scale: 0.97 }}
                  >
                    <div className={`w-9 h-9 rounded-xl ${accentBgSubtle} flex items-center justify-center transition-colors`}>
                      <Settings className={`w-5 h-5 ${accentClass}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-white/90">Buat/Edit Turnamen</p>
                      <p className="text-xs text-white/30">Atur detail & hadiah turnamen</p>
                    </div>
                    <ChevronDown className="w-4 h-4 text-white/20 flex-shrink-0" />
                  </motion.button>

                {/* Prize Pool Input — Collapsible */}
                <div className="space-y-2" id="prize-pool-section">
                  <button
                    onClick={() => setShowPrizeDropdown(!showPrizeDropdown)}
                    className="w-full flex items-center justify-between bg-white/[0.04] border border-white/[0.06] rounded-2xl px-4 py-3 transition-colors hover:bg-white/[0.06]"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="text-sm">🏆</span>
                      <span className="text-sm font-semibold text-white/70">
                        Hadiah Minggu Ini
                      </span>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <span className="text-xs font-medium text-white/30">
                        Rp {(tournament?.prizePool || 0).toLocaleString('id-ID')}
                      </span>
                      <motion.div
                        animate={{ rotate: showPrizeDropdown ? 180 : 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <ChevronDown className="w-4 h-4 text-white/30" />
                      </motion.div>
                    </div>
                  </button>
                  <AnimatePresence>
                    {showPrizeDropdown && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
                        className="overflow-hidden"
                      >
                        <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-5 space-y-4">
                          {([
                            { key: 'champion' as const, label: 'Juara 1', icon: '🥇', color: 'text-amber-400', placeholder: 'Contoh: 500000' },
                            { key: 'runnerUp' as const, label: 'Juara 2', icon: '🥈', color: 'text-gray-300', placeholder: 'Contoh: 250000' },
                            { key: 'third' as const, label: 'Juara 3', icon: '🥉', color: 'text-orange-400', placeholder: 'Contoh: 150000' },
                            { key: 'mvp' as const, label: 'MVP', icon: '⭐', color: 'text-purple-400', placeholder: 'Contoh: 100000' },
                          ]).map((field) => (
                            <div key={field.key} className="flex items-center gap-3">
                              <span className="text-base w-6 text-center">{field.icon}</span>
                              <span className={`text-sm font-semibold w-14 shrink-0 ${field.color}`}>
                                {field.label}
                              </span>
                              <div className="relative flex-1">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-white/30 pointer-events-none">
                                  Rp
                                </span>
                                <input
                                  type="text"
                                  inputMode="numeric"
                                  value={prizeInput[field.key]}
                                  onChange={(e) => {
                                    const val = e.target.value.replace(/[^0-9]/g, '');
                                    setPrizeInput((prev) => ({ ...prev, [field.key]: val }));
                                  }}
                                  placeholder={field.placeholder}
                                  className="w-full bg-white/[0.05] border border-white/[0.08] rounded-xl pl-9 pr-3 py-2.5 text-white/90 text-sm lg:text-base placeholder-white/20 focus:outline-none focus:border-white/[0.15] focus:bg-white/[0.06] transition-colors"
                                />
                              </div>
                            </div>
                          ))}
                          <motion.button
                            onClick={() => {
                              const c = parseInt(prizeInput.champion) || 0;
                              const r = parseInt(prizeInput.runnerUp) || 0;
                              const t = parseInt(prizeInput.third) || 0;
                              const m = parseInt(prizeInput.mvp) || 0;
                              const total = c + r + t + m;
                              if (total === 0) return;
                              setPrizeSaving(true);
                              onUpdatePrizePool({ champion: c, runnerUp: r, third: t, mvp: m });
                              setPrizeSaving(false);
                            }}
                            className={`w-full py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all ${
                              prizeSaving
                                ? 'opacity-50 pointer-events-none'
                                : isMale
                                  ? 'bg-amber-400/12 text-amber-400 border border-amber-400/15 hover:bg-amber-400/20'
                                  : 'bg-violet-400/12 text-violet-400 border border-violet-400/15 hover:bg-violet-400/20'
                            }`}
                            whileTap={{ scale: 0.97 }}
                          >
                            {prizeSaving ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Save className="w-4 h-4" />
                            )}
                            Simpan Hadiah
                          </motion.button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                  {/* ─── LANJUT KE PEMBUATAN TIM ─── */}
                  {/* Show when there are enough approved registrations and no teams yet */}
                  {approvedRegistrations.length >= 6 && teamsCount === 0 && (
                    <motion.button
                      onClick={() => onUpdateStatus('team_generation')}
                      className={`w-full bg-white/[0.03] border ${isMale ? 'border-[#73FF00]/20' : 'border-[#38BDF8]/20'} rounded-2xl p-4 text-left`}
                      whileTap={{ scale: 0.98 }}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl ${accentBgSubtle} flex items-center justify-center flex-shrink-0`}>
                          <ChevronRight className={`w-5 h-5 ${accentClass}`} />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-white/90">Lanjut ke Pembuatan Tim</p>
                          <p className="text-xs text-white/35 mt-0.5">
                            {approvedRegistrations.length} peserta siap
                          </p>
                        </div>
                        <div className={`w-9 h-9 rounded-xl ${accentBgSubtle} flex items-center justify-center`}>
                          <Users className={`w-5 h-5 ${accentClass}`} />
                        </div>
                      </div>
                    </motion.button>
                  )}
                </div>
                )}

                {/* ═══════════════════════════════════════════════════════
                    STEP 2: PEMBUATAN TIM — Team generation + Inline Preview
                    ═══════════════════════════════════════════════════════ */}
                {currentStepIndex === 2 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-1">
                    <div className={`w-9 h-9 rounded-xl ${accentBgSubtle} flex items-center justify-center`}>
                      <Users className={`w-5 h-5 ${accentClass}`} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white/90">Pembuatan Tim</p>
                      <p className="text-xs text-white/30">Buat & atur tim untuk turnamen</p>
                    </div>
                  </div>

                <div className="grid grid-cols-2 gap-2.5">
                    {teamsCount > 0 ? (
                      /* Reset Tim — muncul jika tim sudah ada */
                      <motion.button
                        onClick={onResetTeams}
                        className="bg-white/[0.03] border border-orange-500/15 rounded-2xl p-4 lg:p-6 text-left"
                        whileTap={{ scale: 0.97 }}
                      >
                        <div className="w-9 h-9 rounded-xl bg-orange-500/10 flex items-center justify-center mb-2.5">
                          <RotateCcw className="w-4.5 h-4.5 text-orange-400" />
                        </div>
                        <p className="text-sm font-semibold text-orange-400">Reset Tim</p>
                        <p className="text-xs text-white/25 mt-0.5">
                          {teamsCount} tim &middot; buat ulang
                        </p>
                      </motion.button>
                    ) : (
                      /* Buat Tim — muncul jika belum ada tim */
                      <motion.button
                        onClick={onGenerateTeams}
                        className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4 lg:p-6 text-left"
                        whileTap={{ scale: 0.97 }}
                      >
                        <div className={`w-9 h-9 rounded-xl ${accentBgSubtle} flex items-center justify-center mb-2.5`}>
                          <Users className={`w-4.5 h-4.5 ${accentClass}`} />
                        </div>
                        <p className="text-sm font-semibold text-white/90">Buat Tim</p>
                        <p className="text-xs text-white/25 mt-0.5">
                          {approvedRegistrations.length} pemain
                        </p>
                      </motion.button>
                    )}
                  </div>

                  {/* ─── INLINE TEAM PREVIEW ─── */}
                  {teamsCount > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="space-y-3"
                    >
                      {/* ─── GENERATE BRACKET / MULAI TURNAMEN ─── */}
                      {/* Show this FIRST, before team list */}
                      {matchesCount === 0 ? (
                        /* Bracket Type Selection */
                        <div className="space-y-3">
                          {/* ─── Strategy Selector ─── */}
                          <div>
                            <p className="text-xs tracking-[0.15em] uppercase text-white/40 font-semibold mb-2">
                              Strategi Pairing
                            </p>
                            <div className="grid grid-cols-3 gap-1.5">
                              {([
                                { key: 'random' as const, label: 'Acak', desc: 'Random', icon: '🎲' },
                                { key: 'seeded' as const, label: 'Seeded', desc: 'Tier-Based', icon: '🏆' },
                                { key: 'balanced' as const, label: 'Seimbang', desc: 'Tier Match', icon: '⚖️' },
                              ]).map((s) => (
                                <button
                                  key={s.key}
                                  onClick={() => setBracketStrategy(s.key)}
                                  className={`p-2.5 rounded-xl text-center transition-all ${
                                    bracketStrategy === s.key
                                      ? 'bg-white/10 border border-white/20'
                                      : 'bg-white/[0.03] border border-white/5 hover:bg-white/[0.06]'
                                  }`}
                                >
                                  <span className="text-sm block">{s.icon}</span>
                                  <p className={`text-xs font-semibold mt-0.5 ${bracketStrategy === s.key ? 'text-white/90' : 'text-white/40'}`}>
                                    {s.label}
                                  </p>
                                  <p className={`text-[9px] ${bracketStrategy === s.key ? 'text-white/50' : 'text-white/20'}`}>
                                    {s.desc}
                                  </p>
                                </button>
                              ))}
                            </div>
                            {bracketStrategy === 'seeded' && (
                              <p className="text-[10px] text-amber-400/70 mt-1.5 flex items-center gap-1">
                                <Info className="w-3 h-3" />
                                Tim diurutkan berdasarkan tier & poin. Seed 1 vs Seed terakhir.
                              </p>
                            )}
                            {bracketStrategy === 'balanced' && (
                              <p className="text-[10px] text-amber-400/70 mt-1.5 flex items-center gap-1">
                                <Info className="w-3 h-3" />
                                Tim se-tier saling bertanding (S vs S, A vs A, B vs B).
                              </p>
                            )}
                          </div>

                          <p className="text-xs tracking-[0.15em] uppercase text-white/40 font-semibold">
                            Pilih Tipe Bracket
                          </p>
                          <div className="grid grid-cols-2 gap-2">
                            {([
                              { key: 'single', label: 'Single Elim', desc: 'Langsung', icon: '🏆' },
                              { key: 'double', label: 'Double Elim', desc: 'Winner & Loser', icon: '🔄' },
                              { key: 'group', label: 'Group + Playoff', desc: 'Fase Grup', icon: '📊' },
                              { key: 'round_robin', label: 'Round Robin', desc: 'Semua vs Semua', icon: '🔁' },
                              { key: 'swiss', label: 'Swiss System', desc: 'Pairing Bertahap', icon: '🇨🇭' },
                            ]).map((b) => (
                              <motion.button
                                key={b.key}
                                onClick={() => onGenerateBracket(b.key, bracketStrategy)}
                                className="p-3 rounded-xl text-left bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] hover:border-white/[0.10] transition-all"
                                whileTap={{ scale: 0.97 }}
                              >
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-base">{b.icon}</span>
                                  <p className="text-xs font-semibold text-white/80">{b.label}</p>
                                </div>
                                <p className="text-[10px] text-white/25 ml-6">{b.desc}</p>
                              </motion.button>
                            ))}
                          </div>
                          <p className="text-xs text-white/30 text-center">
                            {teamsCount} tim akan bertanding &middot; Strategi: {bracketStrategy === 'random' ? 'Acak' : bracketStrategy === 'seeded' ? 'Seeded (Tier)' : 'Seimbang'}
                          </p>
                        </div>
                      ) : (
                        /* Mulai Turnamen — muncul jika bracket sudah ada */
                        <motion.button
                          onClick={() => onUpdateStatus('ongoing')}
                          className={`w-full bg-white/[0.03] border ${isMale ? 'border-[#73FF00]/20' : 'border-[#38BDF8]/20'} rounded-2xl p-4 text-left`}
                          whileTap={{ scale: 0.98 }}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-xl ${accentBgSubtle} flex items-center justify-center flex-shrink-0`}>
                              <Play className={`w-5 h-5 ${accentClass}`} />
                            </div>
                            <div className="flex-1">
                              <p className="text-sm font-semibold text-white/90">Mulai Turnamen</p>
                              <p className="text-xs text-white/35 mt-0.5">
                                {matchesCount} pertandingan siap
                              </p>
                            </div>
                            <div className={`w-9 h-9 rounded-xl ${accentBgSubtle} flex items-center justify-center`}>
                              <Play className={`w-5 h-5 ${accentClass}`} />
                            </div>
                          </div>
                        </motion.button>
                      )}

                      {/* Team list - collapsible */}
                      <button
                        onClick={() => setShowTeamsPreview(!showTeamsPreview)}
                        className="flex items-center gap-2 w-full text-left"
                      >
                        <ChevronDown className={`w-4 h-4 text-white/40 transition-transform ${showTeamsPreview ? 'rotate-0' : '-rotate-90'}`} />
                        <p className="text-xs tracking-[0.15em] uppercase text-white/40 font-semibold">
                          Lihat Tim ({teamsCount})
                        </p>
                      </button>
                      
                      <AnimatePresence>
                        {showTeamsPreview && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-2.5 max-h-80 overflow-y-auto pr-1 custom-scrollbar">
                              {teams.map((team, idx) => (
                                <motion.div
                                  key={team.id}
                                  initial={{ opacity: 0, scale: 0.95 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  transition={{ delay: idx * 0.03 }}
                                  className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-3"
                                >
                                  <div className="flex items-center gap-2 mb-2">
                                    <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold ${accentBgSubtle}`}>
                                      {team.seed}
                                    </div>
                                    <p className="text-sm font-bold text-white/90 truncate flex-1">{team.name}</p>
                                  </div>
                                  <div className="flex flex-wrap gap-1">
                                    {team.members?.slice(0, 4).map((member, mIdx) => (
                                      <div
                                        key={member.user?.id || mIdx}
                                        className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white/[0.03]"
                                      >
                                        <div className="w-5 h-5 rounded-full bg-white/[0.06] flex items-center justify-center overflow-hidden">
                                          {member.user?.avatar ? (
                                            <img src={member.user.avatar} alt="" loading="lazy" className="w-full h-full object-cover object-top" />
                                          ) : (
                                            <span className="text-[9px] font-bold text-white/60">{member.user?.name?.[0]}</span>
                                          )}
                                        </div>
                                        <span className="text-xs text-white/60 truncate max-w-[60px]">{member.user?.name}</span>
                                        {member.role === 'captain' && (
                                          <Crown className="w-3 h-3 text-amber-400" />
                                        )}
                                      </div>
                                    ))}
                                    {team.members?.length > 4 && (
                                      <span className="text-[10px] text-white/30 px-2 py-1">+{team.members.length - 4}</span>
                                    )}
                                  </div>
                                </motion.div>
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  )}
                </div>
                )}

                {/* ═══════════════════════════════════════════════════════
                    STEP 3: BRACKET READY — (Skip, already handled in Step 2)
                    ═══════════════════════════════════════════════════════ */}
                {currentStepIndex === 3 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-1">
                    <div className={`w-9 h-9 rounded-xl ${accentBgSubtle} flex items-center justify-center`}>
                      <GitBranch className={`w-5 h-5 ${accentClass}`} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white/90">Bracket Siap</p>
                      <p className="text-xs text-white/30">Turnamen siap dimulai</p>
                    </div>
                  </div>

                  <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4 text-center">
                    <div className={`w-10 h-10 rounded-xl ${accentBgSubtle} flex items-center justify-center mx-auto mb-2`}>
                      <CheckCircle className={`w-5 h-5 ${accentClass}`} />
                    </div>
                    <p className={`text-sm font-semibold ${accentClass}`}>Bracket Sudah Dibuat</p>
                    <p className="text-xs text-white/30 mt-1">{matchesCount} pertandingan siap</p>
                    <motion.button
                      onClick={() => onUpdateStatus('ongoing')}
                      className={`mt-3 px-5 py-2.5 rounded-xl text-sm font-semibold ${isMale ? 'bg-[#73FF00]/12 text-[#73FF00] border border-[#73FF00]/15 hover:bg-[#73FF00]/18' : 'bg-[#38BDF8]/12 text-[#38BDF8] border border-[#38BDF8]/15 hover:bg-[#38BDF8]/18'} transition-all`}
                      whileTap={{ scale: 0.95 }}
                    >
                      Mulai Turnamen →
                    </motion.button>
                  </div>
                </div>
                )}

                {/* ═══════════════════════════════════════════════════════
                    STEP 4: ONGOING — Tournament is live + Inline Score Input
                    ═══════════════════════════════════════════════════════ */}
                {currentStepIndex === 4 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <div className={`w-9 h-9 rounded-xl ${accentBgSubtle} flex items-center justify-center`}>
                        <Play className={`w-5 h-5 ${accentClass}`} />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white/90">Turnamen Berlangsung</p>
                        <p className="text-xs text-white/30">{completedMatches}/{matchesCount} pertandingan selesai</p>
                      </div>
                    </div>
                    {completedMatches === matchesCount && matchesCount > 0 && (
                      <motion.button
                        onClick={() => onUpdateStatus('completed')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold ${isMale ? 'bg-[#73FF00]/15 text-[#73FF00] border border-[#73FF00]/20' : 'bg-[#38BDF8]/15 text-[#38BDF8] border border-[#38BDF8]/20'}`}
                        whileTap={{ scale: 0.95 }}
                      >
                        Selesai ✓
                      </motion.button>
                    )}
                  </div>

                  {/* ─── INLINE BRACKET SCORE INPUT ─── */}
                  {matchesCount > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="space-y-3"
                    >
                      <button
                        onClick={() => setShowBracketPreview(!showBracketPreview)}
                        className="flex items-center gap-2 w-full text-left"
                      >
                        <ChevronDown className={`w-4 h-4 text-white/40 transition-transform ${showBracketPreview ? 'rotate-0' : '-rotate-90'}`} />
                        <p className="text-xs tracking-[0.15em] uppercase text-white/40 font-semibold">
                          Pertandingan ({pendingMatches.length} tersisa)
                        </p>
                      </button>
                      
                      <AnimatePresence>
                        {showBracketPreview && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1 custom-scrollbar">
                              {matches.map((match, idx) => {
                                const isCompleted = match.status === 'completed';
                                const isEditing = editingMatchId === match.id;
                                const teamAWinner = match.winnerId === match.teamAId;
                                const teamBWinner = match.winnerId === match.teamBId;
                                
                                return (
                                  <motion.div
                                    key={match.id}
                                    initial={{ opacity: 0, y: 8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: idx * 0.02 }}
                                    className={`bg-white/[0.03] border border-white/[0.06] rounded-xl p-3 ${isCompleted ? 'opacity-60' : ''}`}
                                  >
                                    <div className="flex items-center justify-between mb-2">
                                      <span className="text-[10px] font-semibold text-white/30 uppercase tracking-wider">
                                        Round {match.round} · Match {match.matchNumber}
                                      </span>
                                      {isCompleted && (
                                        <span className="text-[10px] font-semibold text-green-400">SELESAI</span>
                                      )}
                                    </div>
                                    
                                    <div className="flex items-center gap-3">
                                      {/* Team A */}
                                      <div className={`flex-1 rounded-xl p-2.5 transition-all ${
                                        teamAWinner && isCompleted
                                          ? 'bg-green-500/10 ring-1 ring-green-500/20'
                                          : 'bg-white/[0.03]'
                                      }`}>
                                        <p className={`text-xs font-semibold truncate ${teamAWinner && isCompleted ? 'text-green-400' : 'text-white/80'}`}>
                                          {match.teamA?.name || 'TBD'}
                                        </p>
                                      </div>
                                      
                                      {/* Score Input / Display */}
                                      <div className="flex items-center gap-1.5 flex-shrink-0">
                                        {isEditing ? (
                                          <>
                                            <input
                                              type="number"
                                              inputMode="numeric"
                                              value={editScoreA}
                                              onChange={(e) => setEditScoreA(e.target.value)}
                                              placeholder="0"
                                              className="w-10 h-9 rounded-lg bg-white/[0.05] border border-white/[0.08] text-center text-white/90 text-sm font-bold focus:outline-none focus:border-white/[0.15]"
                                            />
                                            <span className="text-white/30 text-xs">-</span>
                                            <input
                                              type="number"
                                              inputMode="numeric"
                                              value={editScoreB}
                                              onChange={(e) => setEditScoreB(e.target.value)}
                                              placeholder="0"
                                              className="w-10 h-9 rounded-lg bg-white/[0.05] border border-white/[0.08] text-center text-white/90 text-sm font-bold focus:outline-none focus:border-white/[0.15]"
                                            />
                                            <motion.button
                                              onClick={() => {
                                                const sA = parseInt(editScoreA) || 0;
                                                const sB = parseInt(editScoreB) || 0;
                                                onUpdateMatchScore(match.id, sA, sB);
                                                setEditingMatchId(null);
                                                setEditScoreA('');
                                                setEditScoreB('');
                                              }}
                                              className="ml-1 w-9 h-9 rounded-lg bg-green-500/15 text-green-400 flex items-center justify-center"
                                              whileTap={{ scale: 0.9 }}
                                            >
                                              <Check className="w-4 h-4" />
                                            </motion.button>
                                            <button
                                              onClick={() => { setEditingMatchId(null); setEditScoreA(''); setEditScoreB(''); }}
                                              className="w-8 h-9 rounded-lg bg-red-500/10 text-red-400 flex items-center justify-center"
                                            >
                                              <X className="w-4 h-4" />
                                            </button>
                                          </>
                                        ) : (
                                          <>
                                            <span className={`w-8 h-9 rounded-lg flex items-center justify-center text-sm font-bold ${
                                              teamAWinner && isCompleted ? 'bg-green-500/15 text-green-400' : 'bg-white/[0.05] text-white/70'
                                            }`}>
                                              {match.scoreA ?? '-'}
                                            </span>
                                            <span className="text-white/20 text-xs">vs</span>
                                            <span className={`w-8 h-9 rounded-lg flex items-center justify-center text-sm font-bold ${
                                              teamBWinner && isCompleted ? 'bg-green-500/15 text-green-400' : 'bg-white/[0.05] text-white/70'
                                            }`}>
                                              {match.scoreB ?? '-'}
                                            </span>
                                          </>
                                        )}
                                      </div>
                                      
                                      {/* Team B */}
                                      <div className={`flex-1 rounded-xl p-2.5 transition-all ${
                                        teamBWinner && isCompleted
                                          ? 'bg-green-500/10 ring-1 ring-green-500/20'
                                          : 'bg-white/[0.03]'
                                      }`}>
                                        <p className={`text-xs font-semibold truncate text-right ${teamBWinner && isCompleted ? 'text-green-400' : 'text-white/80'}`}>
                                          {match.teamB?.name || 'TBD'}
                                        </p>
                                      </div>
                                    </div>
                                    
                                    {/* Edit Button for non-completed matches */}
                                    {!isCompleted && match.teamA && match.teamB && !isEditing && (
                                      <motion.button
                                        onClick={() => {
                                          setEditingMatchId(match.id);
                                          setEditScoreA(String(match.scoreA || ''));
                                          setEditScoreB(String(match.scoreB || ''));
                                        }}
                                        className="mt-2.5 w-full py-2 rounded-lg text-xs font-semibold bg-white/[0.03] text-white/40 hover:bg-white/[0.06] hover:text-white/60 transition-all"
                                        whileTap={{ scale: 0.98 }}
                                      >
                                        Input Skor
                                      </motion.button>
                                    )}
                                  </motion.div>
                                );
                              })}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  )}
                </div>
                )}

                {/* ═══════════════════════════════════════════════════════
                    STEP 5: COMPLETED — Finalize & Reset
                    ═══════════════════════════════════════════════════════ */}
                {currentStepIndex === 5 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-1">
                    <div className={`w-9 h-9 rounded-xl ${accentBgSubtle} flex items-center justify-center`}>
                      <Flag className={`w-5 h-5 ${accentClass}`} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white/90">Finalisasi</p>
                      <p className="text-xs text-white/30">Turnamen selesai, finalisasi hasil</p>
                    </div>
                  </div>

                {/* Finalize Button */}
                <div className="space-y-3">
                  <motion.button
                    onClick={onFinalize}
                    className="w-full bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4 lg:p-6 text-left"
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.97 }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                        <Flag className="w-4.5 h-4.5 text-amber-400" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-white/90">Finalisasi Turnamen</p>
                        <p className="text-xs text-white/25 mt-0.5">
                          Tetapkan juara & distribusi hadiah
                        </p>
                      </div>
                    </div>
                  </motion.button>
                </div>

                {/* MVP Selection */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Star className="w-4 h-4 text-purple-400" />
                    <p className="text-xs tracking-[0.2em] uppercase text-white/30 font-semibold">MVP Minggu Ini</p>
                  </div>
                  <motion.button
                    onClick={() => setShowPlayerManagement(true)}
                    className="w-full bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4 text-left"
                    whileHover={{ scale: 1.005 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-2xl bg-purple-500/10 flex items-center justify-center flex-shrink-0">
                        <Star className="w-5 h-5 text-purple-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-white/90">Kelola MVP</p>
                        <p className="text-xs text-white/30">Tetapkan & ubah MVP minggu ini dari daftar peserta</p>
                      </div>
                    </div>
                  </motion.button>
                </div>
                </div>
                )}

                {/* ═══════════════════════════════════════════════════════
                    RESET DATA — Always visible (emergency reset)
                    ═══════════════════════════════════════════════════════ */}
                <div className="space-y-3">
                  <motion.button
                    onClick={() => setShowResetConfirm(true)}
                    className="w-full bg-white/[0.03] border border-amber-500/10 rounded-2xl p-4 text-left"
                    whileHover={{ scale: 1.005 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                        <RotateCcw className="w-4.5 h-4.5 text-amber-400" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-amber-400">Reset Data</p>
                        <p className="text-xs text-white/25 mt-0.5">
                          Reset pertandingan & lanjut ke minggu berikutnya
                        </p>
                      </div>
                    </div>
                  </motion.button>
                </div>
                  </>
                ))}
                {/* end tournament conditional */}
                {adminTab === 'payment' && (
                  <div className="space-y-5">
                    {/* Active Methods Toggle */}
                    <div className="space-y-3">
                      <p className="text-xs tracking-[0.2em] uppercase text-white/30 font-semibold">
                        Metode Aktif
                      </p>
                      <div className="flex gap-2">
                        {[
                          { id: 'qris', label: 'QRIS', icon: QrCode },
                          { id: 'bank_transfer', label: 'Bank Transfer', icon: Building2 },
                          { id: 'ewallet', label: 'E-Wallet', icon: Wallet },
                        ].map((method) => {
                          const isActive = paySettings.activeMethods.includes(method.id);
                          return (
                            <motion.button
                              key={method.id}
                              onClick={() => toggleActiveMethod(method.id)}
                              className={`flex-1 bg-white/[0.03] border border-white/[0.06] rounded-2xl p-3.5 text-center transition-all ${
                                isActive ? 'ring-1 ' + (isMale ? 'ring-[#73FF00]/25' : 'ring-[#38BDF8]/25') : 'opacity-40'
                              }`}
                              whileTap={{ scale: 0.95 }}
                            >
                              <div className={`w-9 h-9 rounded-xl mx-auto mb-2 flex items-center justify-center ${
                                isActive
                                  ? (isMale ? 'bg-[#73FF00]/15' : 'bg-[#0EA5E9]/15')
                                  : 'bg-white/[0.05]'
                              }`}>
                                <method.icon className={`w-4.5 h-4.5 ${isActive ? accentClass : 'text-white/25'}`} />
                              </div>
                              <p className={`text-xs font-semibold ${isActive ? 'text-white/90' : 'text-white/30'}`}>
                                {method.label}
                              </p>
                              {isActive && (
                                <div className={`w-1.5 h-1.5 rounded-full mx-auto mt-1.5 ${isMale ? 'bg-[#73FF00]' : 'bg-[#38BDF8]'}`} />
                              )}
                            </motion.button>
                          );
                        })}
                      </div>
                    </div>

                    {/* QRIS Settings */}
                    {paySettings.activeMethods.includes('qris') && (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <QrCode className={`w-5 h-5 ${accentClass}`} />
                          <p className="text-xs tracking-[0.2em] uppercase text-white/30 font-semibold">
                            QRIS
                          </p>
                        </div>
                        <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4 space-y-4">
                          {/* QRIS Image Upload */}
                          <div>
                            <label className="text-xs text-white/35 mb-2 block uppercase tracking-wider font-semibold">
                              Gambar QRIS
                            </label>
                            <p className="text-xs text-white/25 mb-3">
                              Screenshot QRIS dari e-wallet (GoPay, OVO, DANA, dll) lalu upload di sini
                            </p>
                            <ImageUpload
                              value={paySettings.qrisImage}
                              onChange={(url) => updatePayField('qrisImage', url || '')}
                              maxSize={5}
                              className="w-32 h-32 lg:w-36 lg:h-36"
                            />
                          </div>

                          {/* QRIS Label (fallback) */}
                          <div>
                            <label className="text-xs text-white/35 mb-2 block uppercase tracking-wider font-semibold">
                              Label QRIS (opsional)
                            </label>
                            <input
                              type="text"
                              value={paySettings.qrisLabel}
                              onChange={(e) => updatePayField('qrisLabel', e.target.value)}
                              placeholder={`${settings.app_name} - QRIS`}
                              className="w-full bg-white/[0.05] border border-white/[0.08] rounded-xl px-4 py-3 text-white/90 text-sm placeholder-white/25 focus:outline-none focus:border-white/[0.15] focus:bg-white/[0.06] transition-colors"
                            />
                            <p className="text-xs text-white/20 mt-1.5">
                              Jika tidak ada gambar, akan auto-generate QR dari label ini
                            </p>
                          </div>

                          {/* Preview */}
                          {paySettings.qrisImage && (
                            <div className="p-2 rounded-xl bg-white/[0.03] border border-white/[0.06] inline-block">
                              <p className="text-[10px] text-white/30 mb-1.5 uppercase tracking-wider font-semibold">Preview</p>
                              <div className="bg-white rounded-lg p-1.5">
                                <img
                                  src={paySettings.qrisImage}
                                  alt="QRIS Preview"
                                  className="w-24 h-24 object-contain"
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Bank Transfer Settings */}
                    {paySettings.activeMethods.includes('bank_transfer') && (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-[#73FF00]" />
                          <p className="text-xs tracking-[0.2em] uppercase text-white/30 font-semibold">
                            Bank Transfer
                          </p>
                        </div>
                        <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-5 space-y-4">
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="text-xs text-white/35 mb-2 block uppercase tracking-wider font-semibold">
                                Nama Bank
                              </label>
                              <input
                                type="text"
                                value={paySettings.bankName}
                                onChange={(e) => updatePayField('bankName', e.target.value)}
                                placeholder={settings.bank_name || 'Nama Bank'}
                                className="w-full bg-white/[0.05] border border-white/[0.08] rounded-xl px-4 py-3 text-white/90 text-sm placeholder-white/25 focus:outline-none focus:border-white/[0.15] focus:bg-white/[0.06] transition-colors"
                              />
                            </div>
                            <div>
                              <label className="text-xs text-white/35 mb-2 block uppercase tracking-wider font-semibold">
                                Kode Bank
                              </label>
                              <input
                                type="text"
                                value={paySettings.bankCode}
                                onChange={(e) => updatePayField('bankCode', e.target.value)}
                                placeholder={settings.bank_code || 'Kode Bank'}
                                className="w-full bg-white/[0.05] border border-white/[0.08] rounded-xl px-4 py-3 text-white/90 text-sm placeholder-white/25 focus:outline-none focus:border-white/[0.15] focus:bg-white/[0.06] transition-colors"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="text-xs text-white/35 mb-2 block uppercase tracking-wider font-semibold">
                              Nomor Rekening
                            </label>
                            <input
                              type="text"
                              value={paySettings.bankNumber}
                              onChange={(e) => updatePayField('bankNumber', e.target.value)}
                              placeholder={settings.bank_number || 'Nomor Rekening'}
                              className="w-full bg-white/[0.05] border border-white/[0.08] rounded-xl px-4 py-3 text-white/90 text-sm placeholder-white/25 focus:outline-none focus:border-white/[0.15] focus:bg-white/[0.06] transition-colors"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-white/35 mb-2 block uppercase tracking-wider font-semibold">
                              Atas Nama
                            </label>
                            <input
                              type="text"
                              value={paySettings.bankHolder}
                              onChange={(e) => updatePayField('bankHolder', e.target.value)}
                              placeholder={settings.bank_holder || 'Atas Nama'}
                              className="w-full bg-white/[0.05] border border-white/[0.08] rounded-xl px-4 py-3 text-white/90 text-sm placeholder-white/25 focus:outline-none focus:border-white/[0.15] focus:bg-white/[0.06] transition-colors"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* E-Wallet Settings */}
                    {paySettings.activeMethods.includes('ewallet') && (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <Wallet className="w-4 h-4 text-emerald-400" />
                          <p className="text-xs tracking-[0.2em] uppercase text-white/30 font-semibold">
                            E-Wallet
                          </p>
                        </div>

                        {/* GoPay */}
                        <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4">
                          <div className="flex items-center gap-2 mb-3">
                            <div className="w-7 h-7 rounded-lg bg-emerald-400/15 flex items-center justify-center">
                              <Wallet className="w-4 h-4 text-white/90" />
                            </div>
                            <p className="text-sm font-semibold text-white/90">GoPay</p>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="text-xs text-white/35 mb-2 block uppercase tracking-wider font-semibold">Nomor</label>
                              <input
                                type="text"
                                value={paySettings.gopayNumber}
                                onChange={(e) => updatePayField('gopayNumber', e.target.value)}
                                placeholder={settings.gopay_number || '08xxxxxxxxxx'}
                                className="w-full bg-white/[0.05] border border-white/[0.08] rounded-xl px-4 py-3 text-white/90 text-sm placeholder-white/25 focus:outline-none focus:border-white/[0.15] focus:bg-white/[0.06] transition-colors"
                              />
                            </div>
                            <div>
                              <label className="text-xs text-white/35 mb-2 block uppercase tracking-wider font-semibold">Atas Nama</label>
                              <input
                                type="text"
                                value={paySettings.gopayHolder}
                                onChange={(e) => updatePayField('gopayHolder', e.target.value)}
                                placeholder={settings.gopay_holder || 'Atas Nama'}
                                className="w-full bg-white/[0.05] border border-white/[0.08] rounded-xl px-4 py-3 text-white/90 text-sm placeholder-white/25 focus:outline-none focus:border-white/[0.15] focus:bg-white/[0.06] transition-colors"
                              />
                            </div>
                          </div>
                        </div>

                        {/* OVO */}
                        <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4">
                          <div className="flex items-center gap-2 mb-3">
                            <div className="w-7 h-7 rounded-lg bg-purple-400/15 flex items-center justify-center">
                              <Wallet className="w-4 h-4 text-white/90" />
                            </div>
                            <p className="text-sm font-semibold text-white/90">OVO</p>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="text-xs text-white/35 mb-2 block uppercase tracking-wider font-semibold">Nomor</label>
                              <input
                                type="text"
                                value={paySettings.ovoNumber}
                                onChange={(e) => updatePayField('ovoNumber', e.target.value)}
                                placeholder={settings.ovo_number || '08xxxxxxxxxx'}
                                className="w-full bg-white/[0.05] border border-white/[0.08] rounded-xl px-4 py-3 text-white/90 text-sm placeholder-white/25 focus:outline-none focus:border-white/[0.15] focus:bg-white/[0.06] transition-colors"
                              />
                            </div>
                            <div>
                              <label className="text-xs text-white/35 mb-2 block uppercase tracking-wider font-semibold">Atas Nama</label>
                              <input
                                type="text"
                                value={paySettings.ovoHolder}
                                onChange={(e) => updatePayField('ovoHolder', e.target.value)}
                                placeholder={settings.ovo_holder || 'Atas Nama'}
                                className="w-full bg-white/[0.05] border border-white/[0.08] rounded-xl px-4 py-3 text-white/90 text-sm placeholder-white/25 focus:outline-none focus:border-white/[0.15] focus:bg-white/[0.06] transition-colors"
                              />
                            </div>
                          </div>
                        </div>

                        {/* DANA */}
                        <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4">
                          <div className="flex items-center gap-2 mb-3">
                            <div className="w-7 h-7 rounded-lg bg-[#73FF00]/15 flex items-center justify-center">
                              <Wallet className="w-4 h-4 text-white/90" />
                            </div>
                            <p className="text-sm font-semibold text-white/90">DANA</p>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="text-xs text-white/35 mb-2 block uppercase tracking-wider font-semibold">Nomor</label>
                              <input
                                type="text"
                                value={paySettings.danaNumber}
                                onChange={(e) => updatePayField('danaNumber', e.target.value)}
                                placeholder={settings.dana_number || '08xxxxxxxxxx'}
                                className="w-full bg-white/[0.05] border border-white/[0.08] rounded-xl px-4 py-3 text-white/90 text-sm placeholder-white/25 focus:outline-none focus:border-white/[0.15] focus:bg-white/[0.06] transition-colors"
                              />
                            </div>
                            <div>
                              <label className="text-xs text-white/35 mb-2 block uppercase tracking-wider font-semibold">Atas Nama</label>
                              <input
                                type="text"
                                value={paySettings.danaHolder}
                                onChange={(e) => updatePayField('danaHolder', e.target.value)}
                                placeholder={settings.dana_holder || 'Atas Nama'}
                                className="w-full bg-white/[0.05] border border-white/[0.08] rounded-xl px-4 py-3 text-white/90 text-sm placeholder-white/25 focus:outline-none focus:border-white/[0.15] focus:bg-white/[0.06] transition-colors"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Save Button */}
                    <motion.button
                      onClick={handleSavePaymentSettings}
                      disabled={paySettingsSaving}
                      className={`${isMale ? 'bg-[#73FF00]/12 text-[#73FF00] border border-[#73FF00]/15' : 'bg-[#38BDF8]/12 text-[#38BDF8] border border-[#38BDF8]/15'} w-full py-3 rounded-2xl text-[14px] font-semibold flex items-center justify-center gap-2 disabled:opacity-50`}
                      whileHover={{ scale: 1.005 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      {paySettingsSaving ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Menyimpan...
                        </>
                      ) : paySettingsSaved ? (
                        <>
                          <CheckCircle className="w-4 h-4" />
                          Tersimpan!
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4" />
                          Simpan Pengaturan Pembayaran
                        </>
                      )}
                    </motion.button>

                    {/* ── Pending Payment Verification Section ── */}
                    <div className="space-y-3 pt-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Clock className={`w-5 h-5 ${accentClass}`} />
                          <p className="text-xs tracking-[0.2em] uppercase text-white/30 font-semibold">
                            Verifikasi Pembayaran
                          </p>
                        </div>
                        {pendingPayments.length > 0 && (
                          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/12 text-amber-400">
                            <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                            <span className="text-xs font-bold">{pendingPayments.length} menunggu verifikasi</span>
                          </span>
                        )}
                      </div>

                      {paymentsLoading ? (
                        <div className="flex justify-center py-6">
                          <Loader2 className={`w-5 h-5 animate-spin ${accentClass}`} />
                        </div>
                      ) : pendingPayments.length === 0 ? (
                        <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-6 text-center">
                          <CheckCircle className="w-7 h-7 text-[--ios-green]/40 mx-auto mb-2" />
                          <p className="text-sm text-white/30 font-medium">Semua pembayaran telah diverifikasi</p>
                          <p className="text-xs text-white/15 mt-0.5">Tidak ada pembayaran tertunda</p>
                        </div>
                      ) : (
                        <div className="space-y-2.5 max-h-[300px] overflow-y-auto" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.08) transparent' }}>
                          {pendingPayments.map((payment) => {
                            const pmLabel = payment.paymentMethod === 'qris' ? 'QRIS' : payment.paymentMethod === 'bank_transfer' ? 'Bank' : 'E-Wallet';
                            const pmIcon = payment.paymentMethod === 'qris' ? '🟦' : payment.paymentMethod === 'bank_transfer' ? '🏦' : '💳';
                            const timeAgoStr = (() => {
                              const diff = Date.now() - new Date(payment.createdAt).getTime();
                              const mins = Math.floor(diff / 60000);
                              if (mins < 1) return 'baru saja';
                              if (mins < 60) return `${mins}m lalu`;
                              const hrs = Math.floor(mins / 60);
                              if (hrs < 24) return `${hrs}j lalu`;
                              return `${Math.floor(hrs / 24)}h lalu`;
                            })();

                            return (
                              <motion.div
                                key={payment.id}
                                className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-3.5"
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                              >
                                {/* Top row: type badge + amount + time */}
                                <div className="flex items-center gap-2 mb-2.5">
                                  <span className={`shrink-0 px-2 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                                    payment.type === 'donation'
                                      ? 'bg-[#73FF00]/15 text-[#73FF00]'
                                      : 'bg-emerald-500/15 text-emerald-400'
                                  }`}>
                                    {payment.type === 'donation' ? 'Donasi' : 'Sawer'}
                                  </span>
                                  <span className={`text-[14px] font-bold ${accentClass}`}>Rp {payment.amount}</span>
                                  <span className="text-xs text-white/25 ml-auto">{timeAgoStr}</span>
                                </div>

                                {/* Info row: from + method */}
                                <div className="flex items-center gap-2 mb-2.5">
                                  <div className="flex items-center gap-2 flex-1 min-w-0">
                                    {payment.fromAvatar ? (
                                      <div className="w-7 h-7 rounded-full overflow-hidden bg-white/[0.05] shrink-0">
                                        <img src={payment.fromAvatar} alt={payment.from} loading="lazy" className="w-full h-full object-cover object-top" />
                                      </div>
                                    ) : (
                                      <div className="w-7 h-7 rounded-full bg-white/[0.06] flex items-center justify-center shrink-0">
                                        <span className="text-xs font-bold text-white/50">{payment.from[0]}</span>
                                      </div>
                                    )}
                                    <div className="min-w-0">
                                      <p className="text-sm font-semibold text-white/90 truncate">{payment.from}</p>
                                      {payment.targetPlayerName && (
                                        <p className="text-xs text-white/30 truncate">→ {payment.targetPlayerName}</p>
                                      )}
                                    </div>
                                  </div>
                                  <span className="text-xs text-white/30 shrink-0">{pmIcon} {pmLabel}</span>
                                </div>

                                {/* Proof thumbnail */}
                                {payment.proofImageUrl ? (
                                  <div
                                    className="flex items-center gap-2 mb-2.5 p-2 rounded-xl bg-white/[0.05] cursor-pointer hover:bg-white/[0.08] transition-colors"
                                    onClick={() => handleViewProof(payment.proofImageUrl!)}
                                  >
                                    <div className="w-12 h-12 rounded-lg overflow-hidden bg-white/[0.05] shrink-0">
                                      <img src={payment.proofImageUrl} alt="Bukti" loading="lazy" className="w-full h-full object-cover" />
                                    </div>
                                    <div className="flex items-center gap-1 flex-1 min-w-0">
                                      <ImageIcon className="w-4 h-4 text-white/30 shrink-0" />
                                      <span className="text-xs text-white/40 truncate">Bukti transfer</span>
                                    </div>
                                    <Eye className="w-4 h-4 text-white/20 shrink-0" />
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-1.5 mb-2.5 px-1">
                                    <ImageIcon className="w-3 h-3 text-white/15" />
                                    <span className="text-xs text-white/20 italic">Tidak ada bukti</span>
                                  </div>
                                )}

                                {/* Action buttons */}
                                <div className="flex gap-2">
                                  <motion.button
                                    onClick={() => handleVerifyPayment(payment.id, payment.type, 'confirmed')}
                                    disabled={verifyingId === payment.id}
                                    className="flex-1 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 bg-emerald-500/12 text-emerald-400 border border-emerald-500/15 disabled:opacity-40"
                                    whileHover={{ scale: 1.01 }}
                                    whileTap={{ scale: 0.97 }}
                                  >
                                    {verifyingId === payment.id ? (
                                      <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                      <Check className="w-4 h-4" />
                                    )}
                                    Setujui
                                  </motion.button>
                                  <motion.button
                                    onClick={() => handleVerifyPayment(payment.id, payment.type, 'rejected')}
                                    disabled={verifyingId === payment.id}
                                    className="flex-1 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 bg-red-500/10 text-red-400 border border-red-500/15 disabled:opacity-40"
                                    whileHover={{ scale: 1.01 }}
                                    whileTap={{ scale: 0.97 }}
                                  >
                                    {verifyingId === payment.id ? (
                                      <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                      <XCircle className="w-4 h-4" />
                                    )}
                                    Tolak
                                  </motion.button>
                                </div>
                              </motion.div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                )}
                {/* end payment tab */}

                {/* ═══ CLUBS TAB ═══ */}
                {adminTab === 'clubs' && (
                  <div className="space-y-5">
                    {/* Section Header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`w-9 h-9 rounded-xl ${accentBgSubtle} flex items-center justify-center`}>
                          <Building2 className={`w-5 h-5 ${accentClass}`} />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-white/90">Kelola Club</p>
                          <p className="text-xs text-white/30">{clubs.length} club terdaftar</p>
                        </div>
                      </div>
                      {!showCreateClub && (
                        <motion.button
                          onClick={() => setShowCreateClub(true)}
                          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold ${isMale ? 'bg-[#73FF00]/15 text-[#73FF00] border border-[#73FF00]/20' : 'bg-[#38BDF8]/15 text-[#38BDF8] border border-[#38BDF8]/20'}`}
                          whileHover={{ scale: 1.01 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          <Plus className="w-4 h-4" />
                          Tambah Club
                        </motion.button>
                      )}
                    </div>

                    {/* Create Club Form */}
                    <AnimatePresence>
                      {showCreateClub && (
                        <motion.div
                          className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-5 space-y-4"
                          initial={{ opacity: 0, y: -8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -8 }}
                          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        >
                          <p className="text-xs tracking-[0.2em] uppercase text-white/30 font-semibold">
                            Club Baru
                          </p>
                          {/* Logo Upload */}
                          <div className="flex justify-center">
                            <ImageUpload
                              value={newClubLogo}
                              onChange={(url) => setNewClubLogo(url)}
                              accentColor={isMale ? 'gold' : 'pink'}
                            />
                          </div>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={newClubName}
                              onChange={(e) => setNewClubName(e.target.value)}
                              placeholder="Nama club..."
                              className="flex-1 bg-white/[0.05] border border-white/[0.08] rounded-xl px-4 py-2.5 text-white/90 text-sm placeholder-white/20 focus:outline-none focus:border-white/[0.15] focus:bg-white/[0.06] transition-colors"
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && newClubName.trim().length >= 2) {
                                  setCreatingClub(true);
                                  fetch('/api/clubs', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ name: newClubName.trim(), logoUrl: newClubLogo }),
                                  })
                                    .then((r) => r.json())
                                    .then((data) => {
                                      if (data.success) {
                                        setNewClubName('');
                                        setNewClubLogo(null);
                                        setShowCreateClub(false);
                                        fetchClubs();
                                        broadcastClubUpdate();
                                        addToast('Club berhasil dibuat!', 'success');
                                      } else {
                                        addToast(data.error || 'Gagal membuat club', 'error');
                                      }
                                    })
                                    .catch(() => addToast('Terjadi kesalahan', 'error'))
                                    .finally(() => setCreatingClub(false));
                                }
                              }}
                            />
                            <motion.button
                              onClick={() => {
                                if (newClubName.trim().length < 2) return;
                                setCreatingClub(true);
                                fetch('/api/clubs', {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ name: newClubName.trim(), logoUrl: newClubLogo }),
                                })
                                  .then((r) => r.json())
                                  .then((data) => {
                                    if (data.success) {
                                      setNewClubName('');
                                      setNewClubLogo(null);
                                      setShowCreateClub(false);
                                      fetchClubs();
                                      addToast('Club berhasil dibuat!', 'success');
                                    } else {
                                      addToast(data.error || 'Gagal membuat club', 'error');
                                    }
                                  })
                                  .catch(() => addToast('Terjadi kesalahan', 'error'))
                                  .finally(() => setCreatingClub(false));
                              }}
                              disabled={creatingClub || newClubName.trim().length < 2}
                              className={`px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-1.5 transition-all ${creatingClub || newClubName.trim().length < 2 ? 'opacity-40 pointer-events-none' : isMale ? 'bg-[#73FF00]/12 text-[#73FF00] border border-[#73FF00]/15' : 'bg-[#38BDF8]/12 text-[#38BDF8] border border-[#38BDF8]/15'}`}
                              whileTap={{ scale: 0.97 }}
                            >
                              {creatingClub ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                              <span className="hidden sm:inline">Buat</span>
                            </motion.button>
                            <motion.button
                              onClick={() => { setShowCreateClub(false); setNewClubName(''); setNewClubLogo(null); }}
                              className="px-3 py-2.5 rounded-xl text-sm bg-white/[0.03] border border-white/[0.06] text-white/50"
                              whileTap={{ scale: 0.97 }}
                            >
                              <XCircle className="w-4 h-4" />
                            </motion.button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Club List */}
                    {clubsLoading ? (
                      <div className="flex justify-center py-8">
                        <Loader2 className={`w-5 h-5 animate-spin ${accentClass}`} />
                      </div>
                    ) : clubs.length === 0 ? (
                      <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-6 text-center">
                        <Building2 className="w-7 h-7 text-white/20 mx-auto mb-2" />
                        <p className="text-sm text-white/30 font-medium">Belum ada club</p>
                        <p className="text-xs text-white/20 mt-1">Buat club pertama untuk memulai</p>
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-[400px] overflow-y-auto" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.08) transparent' }}>
                        {clubs.map((club, index) => (
                          <motion.div
                            key={club.id}
                            className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4 transition-all"
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.03 }}
                          >
                            {showDeleteClubConfirm === club.id ? (
                              /* Delete Confirmation */
                              <div className="space-y-3">
                                <div className="flex items-center gap-2">
                                  <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
                                  <p className="text-sm text-red-400 font-semibold">Hapus club "{club.name}"?</p>
                                </div>
                                <p className="text-xs text-white/40 leading-relaxed">
                                  Semua anggota akan kehilangan afiliasi club. Tindakan ini tidak dapat dibatalkan.
                                </p>
                                <div className="flex gap-2">
                                  <motion.button
                                    onClick={() => setShowDeleteClubConfirm(null)}
                                    className="flex-1 py-2 rounded-xl text-xs font-semibold bg-white/[0.03] border border-white/[0.06] text-white/60"
                                    whileTap={{ scale: 0.97 }}
                                  >
                                    Batal
                                  </motion.button>
                                  <motion.button
                                    onClick={() => {
                                      setDeletingClub(true);
                                      fetch(`/api/clubs?id=${club.id}`, { method: 'DELETE' })
                                        .then((r) => r.json())
                                        .then((data) => {
                                          if (data.success) {
                                            setShowDeleteClubConfirm(null);
                                            fetchClubs();
                                            broadcastClubUpdate();
                                            addToast('Club berhasil dihapus', 'success');
                                          } else {
                                            addToast(data.error || 'Gagal menghapus', 'error');
                                          }
                                        })
                                        .catch(() => addToast('Terjadi kesalahan', 'error'))
                                        .finally(() => setDeletingClub(false));
                                    }}
                                    disabled={deletingClub}
                                    className="flex-1 py-2 rounded-xl text-xs font-semibold bg-red-500/20 text-red-400 border border-red-500/20 disabled:opacity-40"
                                    whileTap={{ scale: 0.97 }}
                                  >
                                    {deletingClub ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Ya, Hapus'}
                                  </motion.button>
                                </div>
                              </div>
                            ) : (
                              /* Club Info Row */
                              <div className="flex items-center gap-3">
                                {/* Club Avatar */}
                                <div className="w-12 h-12 rounded-xl flex-shrink-0 overflow-hidden flex items-center justify-center">
                                  {club.logoUrl ? (
                                    <img
                                      src={club.logoUrl}
                                      alt={club.name}
                                      className="w-[85%] h-[85%] object-contain"
                                      onError={(e) => {
                                        (e.target as HTMLImageElement).style.display = 'none';
                                        (e.target as HTMLImageElement).parentElement!.innerHTML = `<div class="w-full h-full flex items-center justify-center text-sm font-bold text-white/80 ${isMale ? 'bg-[#73FF00]/15' : 'bg-[#0EA5E9]/15'}">${club.name.slice(0, 2).toUpperCase()}</div>`;
                                      }}
                                    />
                                  ) : (
                                    <div className={`w-full h-full flex items-center justify-center text-sm font-bold text-white/80 ${isMale ? 'bg-[#73FF00]/15' : 'bg-[#0EA5E9]/15'}`}>
                                      {club.name.slice(0, 2).toUpperCase()}
                                    </div>
                                  )}
                                </div>

                                {/* Club Info */}
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-bold text-white/90 truncate">{club.name}</p>
                                  <div className="flex items-center gap-2 mt-0.5">
                                    <span className="text-xs text-white/30">
                                      {club.memberCount} anggota
                                    </span>
                                    {club.memberCount > 0 && (
                                      <>
                                        <span className="text-white/10">·</span>
                                        <span className="text-xs text-white/30">
                                          {club.totalPoints.toLocaleString('id-ID')} pts
                                        </span>
                                      </>
                                    )}
                                  </div>
                                </div>

                                {/* Action Buttons */}
                                <div className="flex items-center gap-1.5 flex-shrink-0">
                                  <motion.button
                                    onClick={() => {
                                      setEditingClub({ id: club.id, name: club.name, slug: club.slug, logoUrl: club.logoUrl });
                                      setEditClubName(club.name);
                                      setEditClubLogo(club.logoUrl || '');
                                    }}
                                    className={`w-9 h-9 rounded-xl ${accentBgSubtle} flex items-center justify-center ${accentClass} hover:bg-white/[0.08] transition-colors`}
                                    whileTap={{ scale: 0.9 }}
                                  >
                                    <Pencil className="w-4 h-4" />
                                  </motion.button>
                                  <motion.button
                                    onClick={() => setShowDeleteClubConfirm(club.id)}
                                    className="w-8 h-8 rounded-xl bg-red-500/[0.06] flex items-center justify-center text-red-400/50 hover:bg-red-500/15 hover:text-red-400 transition-colors"
                                    whileTap={{ scale: 0.9 }}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </motion.button>
                                </div>
                              </div>
                            )}
                          </motion.div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* ═══ BANNER TAB ═══ */}
                {adminTab === 'banner' && (
                  <div className="space-y-5">
                    {/* Section Header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-amber-500/12 flex items-center justify-center">
                          <ImageIconLucide className="w-4 h-4 text-amber-400" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-white/90">Kelola Banner Champion</p>
                          <p className="text-xs text-white/30">Upload gambar juara Male & Female division</p>
                        </div>
                      </div>
                      <motion.button
                        onClick={saveBanners}
                        disabled={bannerSaving}
                        className={`flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                          bannerSaved
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/20'
                            : isMale
                              ? 'bg-[#73FF00]/15 text-[#73FF00] border border-[#73FF00]/20 hover:bg-[#73FF00]/20'
                              : 'bg-[#38BDF8]/15 text-[#38BDF8] border border-[#38BDF8]/20 hover:bg-[#38BDF8]/20'
                        }`}
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        {bannerSaving ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : bannerSaved ? (
                          <Check className="w-4 h-4" />
                        ) : (
                          <Save className="w-4 h-4" />
                        )}
                        {bannerSaved ? 'Tersimpan!' : 'Simpan'}
                      </motion.button>
                    </div>

                    {/* Banner Preview & Upload Info */}
                    <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4 lg:p-6 space-y-5">
                      <div className="flex items-start gap-3 px-3 py-2.5 rounded-xl bg-amber-500/5 border border-amber-500/10">
                        <Info className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
                        <div className="text-xs text-white/50 leading-relaxed">
                          <p className="text-amber-400/80 font-semibold mb-1">Panduan Upload Banner Champion</p>
                          <p>Upload gambar untuk banner juara di halaman utama. Banner akan ditampilkan sebagai carousel bergantian antara juara Male & Female division. Ukuran yang disarankan: <span className="text-white/70">1600x800px</span> (rasio 2:1). Maksimal <span className="text-white/70">5MB</span>. Format: JPG, PNG, WebP.</p>
                        </div>
                      </div>

                      {/* Dual Banner Upload Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Male Champion Banner Upload */}
                        <div className="space-y-2.5">
                          <div className="flex items-center gap-2">
                            <div className="w-5 h-5 rounded-md bg-[#73FF00]/12 flex items-center justify-center">
                              <span className="text-[10px] font-bold text-[#73FF00]">M</span>
                            </div>
                            <label className="text-xs tracking-[0.1em] uppercase text-white/50 font-semibold">
                              Banner Juara Male
                            </label>
                          </div>
                          <div className="relative aspect-[2/1] rounded-xl overflow-hidden border border-white/[0.06]">
                            <ImageUpload
                              value={bannerMaleUrl}
                              onChange={(url) => { setBannerMaleUrl(url); setBannerSaved(false); }}
                              className="w-full h-full"
                              maxWidth={1600}
                              quality={0.75}
                              maxBase64Size={400 * 1024}
                            />
                          </div>
                          {bannerMaleUrl && (
                            <div className="flex items-center justify-between px-1">
                              <p className="text-xs text-white/30">Gambar telah diupload</p>
                              <button
                                onClick={() => { setBannerMaleUrl(null); setBannerSaved(false); }}
                                className="text-xs text-red-400/60 hover:text-red-400 transition-colors"
                              >
                                Hapus
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Female Champion Banner Upload */}
                        <div className="space-y-2.5">
                          <div className="flex items-center gap-2">
                            <div className="w-5 h-5 rounded-md bg-[#38BDF8]/10 flex items-center justify-center">
                              <span className="text-[10px] font-bold text-[#38BDF8]">F</span>
                            </div>
                            <label className="text-xs tracking-[0.1em] uppercase text-white/50 font-semibold">
                              Banner Juara Female
                            </label>
                          </div>
                          <div className="relative aspect-[2/1] rounded-xl overflow-hidden border border-white/[0.06]">
                            <ImageUpload
                              value={bannerFemaleUrl}
                              onChange={(url) => { setBannerFemaleUrl(url); setBannerSaved(false); }}
                              className="w-full h-full"
                              maxWidth={1600}
                              quality={0.75}
                              maxBase64Size={400 * 1024}
                            />
                          </div>
                          {bannerFemaleUrl && (
                            <div className="flex items-center justify-between px-1">
                              <p className="text-xs text-white/30">Gambar telah diupload</p>
                              <button
                                onClick={() => { setBannerFemaleUrl(null); setBannerSaved(false); }}
                                className="text-xs text-red-400/60 hover:text-red-400 transition-colors"
                              >
                                Hapus
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Live Preview - Full-width Carousel Style */}
                      <div className="space-y-2.5">
                        <div className="flex items-center gap-2">
                          <Eye className="w-4 h-4 text-white/30" />
                          <label className="text-xs tracking-[0.1em] uppercase text-white/50 font-semibold">
                            Preview Banner (Carousel Bergantian)
                          </label>
                        </div>
                        <div
                          className="relative w-full overflow-hidden rounded-xl border border-white/[0.06]"
                          style={{
                            boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
                          }}
                        >
                          {/* Male Champion Preview */}
                          <div className="relative w-full aspect-[16/7]">
                            <div className="w-full h-full">
                              {/* Male side */}
                              <div className="relative w-full h-full overflow-hidden bg-white/[0.03]">
                                {bannerMaleUrl ? (
                                  <img
                                    src={bannerMaleUrl}
                                    alt="Male Champion Preview"
                                    className="w-full h-full object-cover object-top"
                                  />
                                ) : (
                                  <div className="w-full h-full flex flex-col items-center justify-center gap-2">
                                    <div className="w-10 h-10 rounded-xl bg-[#73FF00]/5 flex items-center justify-center">
                                      <ImageIcon className="w-5 h-5 text-[#73FF00]/30" />
                                    </div>
                                    <p className="text-xs text-white/20">Male Champion</p>
                                  </div>
                                )}
                                {/* Gradient overlay */}
                                {bannerMaleUrl && (
                                  <div className="absolute inset-0 pointer-events-none" style={{ background: 'linear-gradient(to top, rgba(5,5,7,0.85) 0%, rgba(5,5,7,0.20) 50%)' }} />
                                )}
                                <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded-md" style={{ background: 'rgba(115,255,0,0.12)', border: '1px solid rgba(115,255,0,0.2)', backdropFilter: 'blur(8px)' }}>
                                  <span className="text-[10px] font-bold text-[#73FF00] tracking-wider">MALE CHAMPION</span>
                                </div>
                              </div>
                            </div>
                            {/* Center divider line */}
                            {bannerMaleUrl && bannerFemaleUrl && (
                              <div className="absolute top-[10%] bottom-[10%] left-1/2 -translate-x-1/2 w-px pointer-events-none" style={{ background: 'linear-gradient(to bottom, transparent, rgba(255,215,0,0.3) 30%, rgba(255,215,0,0.4) 50%, rgba(255,215,0,0.3) 70%, transparent)' }} />
                            )}
                          </div>
                          {/* Divider between male and female preview */}
                          <div className="h-px w-full" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,215,0,0.15) 50%, transparent)' }} />
                          {/* Female Champion Preview */}
                          <div className="relative w-full aspect-[16/7]">
                            <div className="w-full h-full">
                              <div className="relative w-full h-full overflow-hidden bg-white/[0.03]">
                                {bannerFemaleUrl ? (
                                  <img
                                    src={bannerFemaleUrl}
                                    alt="Female Champion Preview"
                                    className="w-full h-full object-cover object-top"
                                  />
                                ) : (
                                  <div className="w-full h-full flex flex-col items-center justify-center gap-2">
                                    <div className="w-10 h-10 rounded-xl bg-[#38BDF8]/5 flex items-center justify-center">
                                      <ImageIcon className="w-5 h-5 text-[#38BDF8]/30" />
                                    </div>
                                    <p className="text-xs text-white/20">Female Champion</p>
                                  </div>
                                )}
                                {bannerFemaleUrl && (
                                  <div className="absolute inset-0 pointer-events-none" style={{ background: 'linear-gradient(to top, rgba(5,5,7,0.85) 0%, rgba(5,5,7,0.20) 50%)' }} />
                                )}
                                <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded-md" style={{ background: 'rgba(56,189,248,0.12)', border: '1px solid rgba(56,189,248,0.2)', backdropFilter: 'blur(8px)' }}>
                                  <span className="text-[10px] font-bold text-[#38BDF8] tracking-wider">FEMALE CHAMPION</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                        <p className="text-xs text-white/25 text-center">Di halaman utama, kedua banner akan bergantian ditampilkan sebagai carousel setiap 5 detik</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* ═══ CLOUDINARY RESTORE TAB (moved to Admin sub-tab) ═══ */}

                {/* ═══ QUICK INFO CRUD TAB (moved to Admin sub-tab) ═══ */}

                {/* ═══ COMBINED ADMIN TAB (RBAC + Bot + Restore + Info) ═══ */}
                {adminTab === 'rbac' && (
                  <div className="space-y-5">
                    {/* Section Header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-amber-500/12 flex items-center justify-center">
                          <ShieldCheck className="w-4 h-4 text-amber-400" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-white/90">Admin Panel</p>
                          <p className="text-xs text-white/30">Kelola admin, bot, & pengaturan</p>
                        </div>
                      </div>
                    </div>

                    {/* ── Sub-tab navigation ── */}
                    <div className="flex bg-white/[0.04] rounded-xl p-1 gap-1">
                      {([
                        { id: 'rbac' as const, label: 'Admin & RBAC', icon: ShieldCheck },
                        { id: 'bot' as const, label: 'Bot', icon: Bot, superAdminOnly: true },
                        { id: 'restore' as const, label: 'Restore', icon: Database },
                      ]).filter(sub => !sub.superAdminOnly || adminUser?.role === 'super_admin').map((sub) => (
                        <motion.button
                          key={sub.id}
                          onClick={() => setAdminSubTab(sub.id)}
                          className="relative flex-1 min-w-0 py-2.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 z-10 truncate"
                          whileTap={{ scale: 0.97 }}
                        >
                          {adminSubTab === sub.id && (
                            <motion.div
                              className="absolute inset-0 rounded-lg pointer-events-none"
                              style={{ background: 'rgba(255,255,255,0.08)', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }}
                              layoutId="adminSubTab"
                              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                            />
                          )}
                          <sub.icon className={`w-4 h-4 relative z-10 ${adminSubTab === sub.id ? accentClass : 'text-white/30'}`} />
                          <span className={`relative z-10 truncate ${adminSubTab === sub.id ? 'text-white/90' : 'text-white/30'}`}>
                            {sub.label}
                          </span>
                        </motion.button>
                      ))}
                    </div>

                    {/* ═══ Sub-tab: Admin & RBAC ═══ */}
                    {adminSubTab === 'rbac' && (
                      <div className="space-y-5">
                        {/* RBAC Header with Add Admin button */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-amber-500/12 flex items-center justify-center">
                              <ShieldCheck className="w-4 h-4 text-amber-400" />
                            </div>
                            <p className="text-xs text-white/40 uppercase tracking-wider font-semibold">Daftar Admin</p>
                          </div>
                          {adminUser?.role === 'super_admin' && (
                            <motion.button
                              onClick={() => setShowAddAdmin(true)}
                              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold ${isMale ? 'bg-[#73FF00]/15 text-[#73FF00] border border-[#73FF00]/20' : 'bg-[#38BDF8]/15 text-[#38BDF8] border border-[#38BDF8]/20'}`}
                              whileHover={{ scale: 1.01 }}
                              whileTap={{ scale: 0.95 }}
                            >
                              <UserPlus className="w-4 h-4" />
                              Tambah Admin
                            </motion.button>
                          )}
                        </div>

                        {/* Admin List */}
                        {rbacLoading ? (
                          <div className="flex justify-center py-8">
                            <Loader2 className={`w-5 h-5 animate-spin ${accentClass}`} />
                          </div>
                        ) : adminList.length === 0 ? (
                          <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-6 text-center">
                            <Users className="w-7 h-7 text-white/20 mx-auto mb-2" />
                            <p className="text-sm text-white/30 font-medium">Belum ada admin</p>
                          </div>
                        ) : (
                          <div className="space-y-3 max-h-[400px] overflow-y-auto" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.08) transparent' }}>
                            {adminList.map((admin) => {
                              const isSuperAdmin = admin.role === 'super_admin';
                              const isSelf = admin.id === adminUser?.id;
                              return (
                            <motion.div
                              key={admin.id}
                              className={`bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4 transition-all ${isSuperAdmin ? 'ring-1 ring-amber-400/20' : ''}`}
                              initial={{ opacity: 0, y: 6 }}
                              animate={{ opacity: 1, y: 0 }}
                            >
                              {/* Admin Info Row */}
                              <div className="flex items-center gap-3 mb-3">
                                {/* Avatar */}
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center overflow-hidden ${isSuperAdmin ? 'ring-2 ring-amber-400/30' : ''}`}>
                                  {admin.avatar ? (
                                    <img src={admin.avatar} alt={admin.name} loading="lazy" className="w-full h-full object-cover object-top" />
                                  ) : (
                                    <div className={`w-full h-full flex items-center justify-center ${isSuperAdmin ? 'bg-amber-500/15' : 'bg-white/[0.05]'}`}>
                                      {isSuperAdmin ? <Crown className="w-5 h-5 text-amber-400" /> : <span className="text-sm font-bold text-white/50">{admin.name[0]}</span>}
                                    </div>
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <p className="text-sm font-semibold text-white/90 truncate">{admin.name}</p>
                                    {isSelf && (
                                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/10 text-white/40 font-medium">Anda</span>
                                    )}
                                    {isSuperAdmin && (
                                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-400/15 text-amber-400 font-bold flex items-center gap-1">
                                        <Crown className="w-2.5 h-2.5" />
                                        Super
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2 mt-0.5">
                                    <p className="text-xs text-white/35 truncate">{admin.email || 'No email'}</p>
                                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                                      isSuperAdmin ? 'bg-amber-400/15 text-amber-400' : 'bg-white/[0.06] text-white/50'
                                    }`}>
                                      {isSuperAdmin ? 'Super Admin' : 'Admin'}
                                    </span>
                                  </div>
                                </div>
                                {/* Delete button — only for non-super_admin */}
                                {!isSuperAdmin && adminUser?.role === 'super_admin' && (
                                  <motion.button
                                    onClick={() => setShowDeleteConfirm(admin.id)}
                                    className="w-8 h-8 rounded-xl bg-red-500/[0.06] flex items-center justify-center text-red-400/50 hover:bg-red-500/15 hover:text-red-400 transition-colors"
                                    whileTap={{ scale: 0.9 }}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </motion.button>
                                )}
                              </div>

                              {/* Permissions */}
                              {isSuperAdmin ? (
                                <div className="rounded-xl bg-amber-500/5 border border-amber-500/8 p-3">
                                  <div className="flex items-center gap-1.5 mb-2">
                                    <Crown className="w-3 h-3 text-amber-400/60" />
                                    <span className="text-xs font-semibold text-amber-400/60 uppercase tracking-wider">Semua Akses</span>
                                  </div>
                                  <div className="flex flex-wrap gap-1.5">
                                    {['Tournament', 'Players', 'Bracket', 'Scores', 'Prize Pool', 'Donations', 'Full Reset', 'Manage Admins'].map((p) => (
                                      <span key={p} className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-amber-400/8 text-amber-400/50 font-medium">
                                        <Check className="w-2.5 h-2.5" />
                                        {p}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              ) : (
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between">
                                    <p className="text-xs uppercase tracking-wider text-white/30 font-semibold">Permissions</p>
                                    {adminUser?.role === 'super_admin' && (
                                      <button
                                        onClick={() => setEditingPermId(editingPermId === admin.id ? null : admin.id)}
                                        className="text-xs text-white/40 hover:text-white/60 transition-colors font-medium"
                                      >
                                        {editingPermId === admin.id ? 'Selesai' : 'Edit'}
                                      </button>
                                    )}
                                  </div>
                                  <div className="grid grid-cols-2 gap-1.5">
                                    {([
                                      { key: 'tournament', label: 'Tournament' },
                                      { key: 'players', label: 'Players' },
                                      { key: 'bracket', label: 'Bracket' },
                                      { key: 'scores', label: 'Scores' },
                                      { key: 'prize', label: 'Prize Pool' },
                                      { key: 'donations', label: 'Donations' },
                                      { key: 'full_reset', label: 'Full Reset' },
                                      { key: 'manage_admins', label: 'Manage Admins' },
                                    ]).map((perm) => {
                                      const hasPerm = admin.permissions[perm.key] ?? false;
                                      const isEditing = editingPermId === admin.id && adminUser?.role === 'super_admin';
                                      return (
                                        <div
                                          key={perm.key}
                                          className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg ${hasPerm ? 'bg-emerald-500/8' : 'bg-white/[0.03]'} transition-colors`}
                                        >
                                          <span className={`text-xs font-medium ${hasPerm ? 'text-emerald-400/80' : 'text-white/25'}`}>
                                            {perm.label}
                                          </span>
                                          <div
                                            className={`w-7 h-4 rounded-full flex items-center transition-colors cursor-pointer ${hasPerm ? 'bg-emerald-500/40 justify-end' : 'bg-white/10 justify-start'}`}
                                            onClick={isEditing ? () => {
                                              const updated = { ...admin.permissions, [perm.key]: !hasPerm };
                                              setAdminList((prev) => prev.map((a) => a.id === admin.id ? { ...a, permissions: updated } : a));
                                            } : undefined}
                                          >
                                            <div className={`w-3 h-3 rounded-full bg-white/[0.06]0 shadow-sm transition-transform ${hasPerm ? 'translate-x-0' : '-translate-x-1'}`} />
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                  {editingPermId === admin.id && (
                                    <motion.button
                                      onClick={async () => {
                                        setRbacLoading(true);
                                        try {
                                          await adminFetch('/api/admin/manage', {
                                            method: 'PUT',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({ adminId: admin.id, permissions: admin.permissions }),
                                          });
                                          setEditingPermId(null);
                                        } catch {}
                                        setRbacLoading(false);
                                      }}
                                      disabled={rbacLoading}
                                      className={`w-full py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 ${isMale ? 'bg-[#73FF00]/12 text-[#73FF00] border border-[#73FF00]/15' : 'bg-[#38BDF8]/12 text-[#38BDF8] border border-[#38BDF8]/15'} disabled:opacity-50`}
                                      whileHover={{ scale: 1.005 }}
                                      whileTap={{ scale: 0.97 }}
                                    >
                                      {rbacLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                      Simpan Permissions
                                    </motion.button>
                                  )}
                                </div>
                              )}

                              {/* Created date */}
                              <p className="text-[10px] text-white/15 mt-2">
                                Dibuat: {admin.createdAt ? new Date(admin.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}
                              </p>
                            </motion.div>
                          );
                        })}
                      </div>
                    )}

                    {/* ═══ DANGER ZONE: Full Reset & Seed (in RBAC sub-tab) ═══ */}
                    {adminUser?.role === 'super_admin' && (
                      <div className="space-y-3 pt-4 border-t border-white/[0.04]">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 text-red-400" />
                          <p className="text-xs tracking-[0.2em] uppercase text-white/30 font-semibold">
                            Danger Zone
                          </p>
                        </div>
                        
                        {/* Seed Database Button */}
                        <motion.button
                          onClick={async () => {
                            if (!confirm('Ini akan mengisi database dengan data contoh (clubs, players, tournaments). Lanjutkan?')) return;
                            try {
                              addToast('Menyemai database...', 'info');
                              const res = await fetch('/api/seed', { method: 'POST' });
                              const data = await res.json();
                              if (data.success) {
                                addToast(`Database berhasil disemai! ${data.stats?.totalPlayers || 0} players, ${data.stats?.clubs || 0} clubs`, 'success');
                                storeFetchData(false);
                              } else {
                                addToast(data.error || 'Gagal menyemai database', 'error');
                              }
                            } catch (err) {
                              addToast('Terjadi kesalahan saat menyemai database', 'error');
                            }
                          }}
                          className="w-full bg-white/[0.03] border border-emerald-500/15 rounded-2xl p-4 text-left"
                          whileHover={{ scale: 1.005 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                              <Database className="w-4.5 h-4.5 text-emerald-400" />
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-emerald-400">Seed Database</p>
                              <p className="text-xs text-white/25 mt-0.5">
                                Isi database dengan data contoh (clubs & players)
                              </p>
                            </div>
                          </div>
                        </motion.button>
                        
                        <motion.button
                          onClick={() => setShowFullResetConfirm(true)}
                          className="w-full bg-white/[0.03] border border-red-500/15 rounded-2xl p-4 text-left"
                          whileHover={{ scale: 1.005 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-red-500/10 flex items-center justify-center flex-shrink-0">
                              <Trash2 className="w-4.5 h-4.5 text-red-400" />
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-red-400">Full Database Reset</p>
                              <p className="text-xs text-white/25 mt-0.5">
                                Hapus SEMUA data & mulai dari nol
                              </p>
                            </div>
                          </div>
                        </motion.button>
                      </div>
                    )}
                      </div>
                    )}

                    {/* ═══ BOT MANAGEMENT ═══ */}
                    {adminSubTab === 'bot' && adminUser?.role === 'super_admin' && (
                      <div>
                        <BotManagementTab
                          accentClass={accentClass}
                          accentBgSubtle={accentBgSubtle}
                          btnClass={btnClass}
                          isMale={isMale}
                          isAdminSuperAdmin={true}
                        />
                      </div>
                    )}

                    {/* ═══ RESTORE SUB-TAB ═══ */}
                    {adminSubTab === 'restore' && (
                      <CloudinaryRestorePanel
                        accentClass={accentClass}
                        accentBgSubtle={accentBgSubtle}
                        accentColor={accentColor}
                        addToast={addToast}
                      />
                    )}

                    {/* ═══ CONTENT SUB-TAB moved to dedicated Konten main tab ═══ */}

                    {/* ═══ INFO SUB-TAB moved to dedicated Konten main tab ═══ */}

                    {/* ═══ VIDEO HIGHLIGHTS SUB-TAB moved to dedicated Konten main tab ═══ */}

                  </div>
                )}

                {/* ═══ KONTEN TAB (Rules + Info + Video) ═══ */}
                {adminTab === 'content' && (
                  <div className="space-y-5">
                    {/* Section Header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`w-9 h-9 rounded-xl ${accentBgSubtle} flex items-center justify-center`}>
                          <ListChecks className={`w-5 h-5 ${accentClass}`} />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-white/90">Konten Landing Page</p>
                          <p className="text-xs text-white/30">Edit Rules, Info, & Video di landing page</p>
                        </div>
                      </div>
                    </div>

                    {/* ── Sub-tab navigation ── */}
                    <div className="flex bg-white/[0.04] rounded-xl p-1 gap-1">
                      {([
                        { id: 'rules' as const, label: 'Rules', icon: ListChecks },
                        { id: 'tournament_info' as const, label: 'Turnamen', icon: Trophy },
                        { id: 'info' as const, label: 'Info', icon: Info },
                        { id: 'video' as const, label: 'Video', icon: Play },
                      ]).map((sub) => (
                        <motion.button
                          key={sub.id}
                          onClick={() => setContentSubTab(sub.id)}
                          className="relative flex-1 min-w-0 py-2.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 z-10 truncate"
                          whileTap={{ scale: 0.97 }}
                        >
                          {contentSubTab === sub.id && (
                            <motion.div
                              className="absolute inset-0 rounded-lg pointer-events-none"
                              style={{ background: 'rgba(255,255,255,0.08)', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }}
                              layoutId="contentSubTab"
                              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                            />
                          )}
                          <sub.icon className={`w-4 h-4 relative z-10 ${contentSubTab === sub.id ? accentClass : 'text-white/30'}`} />
                          <span className={`relative z-10 truncate ${contentSubTab === sub.id ? 'text-white/90' : 'text-white/30'}`}>
                            {sub.label}
                          </span>
                        </motion.button>
                      ))}
                    </div>

                    {/* ═══ Sub-tab: Rules ═══ */}
                    {contentSubTab === 'rules' && (
                      <div className="space-y-5">
                        {/* Save Button */}
                        <div className="flex items-center justify-end">
                          <motion.button
                            onClick={saveLandingContent}
                            disabled={landingContentSaving}
                            className={`flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                              landingContentSaved
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/20'
                                : isMale
                                  ? 'bg-[#73FF00]/15 text-[#73FF00] border border-[#73FF00]/20 hover:bg-[#73FF00]/20'
                                  : 'bg-[#38BDF8]/15 text-[#38BDF8] border border-[#38BDF8]/20 hover:bg-[#38BDF8]/20'
                            }`}
                            whileHover={{ scale: 1.01 }}
                            whileTap={{ scale: 0.95 }}
                          >
                            {landingContentSaving ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : landingContentSaved ? (
                              <Check className="w-4 h-4" />
                            ) : (
                              <Save className="w-4 h-4" />
                            )}
                            {landingContentSaved ? 'Tersimpan!' : 'Simpan'}
                          </motion.button>
                        </div>

                        {/* ── Rules Card ── */}
                        <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-5 space-y-4" style={{ borderLeft: '3px solid #FF6B35' }}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <ListChecks className="w-5 h-5 text-orange-400" />
                              <span className="text-base font-bold text-white/70">Rules</span>
                            </div>
                          </div>

                          {/* Title */}
                          <div>
                            <label className="text-xs text-white/40 uppercase tracking-wider font-semibold mb-1 block">Judul</label>
                            <input
                              type="text"
                              value={landingRules.title}
                              onChange={(e) => {
                                setLandingRules(prev => ({ ...prev, title: e.target.value }));
                                setLandingContentSaved(false);
                              }}
                              className="w-full bg-white/[0.06] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white/80 outline-none focus:border-white/[0.15] focus:bg-white/[0.07] transition-colors"
                              placeholder="Judul rules..."
                            />
                          </div>

                          {/* Rules Items */}
                          <div className="space-y-2">
                            <label className="text-xs text-white/40 uppercase tracking-wider font-semibold block">Daftar Rules</label>
                            {landingRules.items.map((rule, idx) => (
                              <div key={idx} className="flex items-center gap-2">
                                <span className="w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold flex-shrink-0" style={{ background: 'rgba(255,107,53,0.10)', color: 'rgba(255,107,53,0.7)' }}>{idx + 1}</span>
                                <input
                                  type="text"
                                  value={rule}
                                  onChange={(e) => {
                                    const updated = [...landingRules.items];
                                    updated[idx] = e.target.value;
                                    setLandingRules(prev => ({ ...prev, items: updated }));
                                    setLandingContentSaved(false);
                                  }}
                                  className="flex-1 bg-white/[0.06] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white/80 outline-none focus:border-white/[0.15] transition-colors"
                                  placeholder={`Rule ${idx + 1}...`}
                                />
                                {landingRules.items.length > 1 && (
                                  <motion.button
                                    onClick={() => {
                                      const updated = [...landingRules.items];
                                      updated.splice(idx, 1);
                                      setLandingRules(prev => ({ ...prev, items: updated }));
                                      setLandingContentSaved(false);
                                    }}
                                    className="p-1.5 rounded-lg text-red-400/50 hover:text-red-400 hover:bg-red-400/10 transition-colors flex-shrink-0"
                                    whileTap={{ scale: 0.9 }}
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </motion.button>
                                )}
                              </div>
                            ))}
                            <motion.button
                              onClick={() => {
                                setLandingRules(prev => ({ ...prev, items: [...prev.items, ''] }));
                                setLandingContentSaved(false);
                              }}
                              className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold cursor-pointer transition-colors"
                              style={{ background: 'rgba(255,107,53,0.06)', border: '1px solid rgba(255,107,53,0.12)', color: '#FF6B35' }}
                              whileHover={{ background: 'rgba(255,107,53,0.10)' }}
                              whileTap={{ scale: 0.98 }}
                            >
                              <Plus className="w-3 h-3" /> Tambah Rule
                            </motion.button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* ═══ Sub-tab: Tournament Info ═══ */}
                    {contentSubTab === 'tournament_info' && (
                      <div className="space-y-5">
                        {/* Save Button */}
                        <div className="flex items-center justify-end">
                          <motion.button
                            onClick={saveLandingContent}
                            disabled={landingContentSaving}
                            className={`flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                              landingContentSaved
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/20'
                                : isMale
                                  ? 'bg-[#73FF00]/15 text-[#73FF00] border border-[#73FF00]/20 hover:bg-[#73FF00]/20'
                                  : 'bg-[#38BDF8]/15 text-[#38BDF8] border border-[#38BDF8]/20 hover:bg-[#38BDF8]/20'
                            }`}
                            whileHover={{ scale: 1.01 }}
                            whileTap={{ scale: 0.95 }}
                          >
                            {landingContentSaving ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : landingContentSaved ? (
                              <Check className="w-4 h-4" />
                            ) : (
                              <Save className="w-4 h-4" />
                            )}
                            {landingContentSaved ? 'Tersimpan!' : 'Simpan'}
                          </motion.button>
                        </div>

                        {/* ── Tournament Info Card ── */}
                        <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-5 space-y-4" style={{ borderLeft: '3px solid #38BDF8' }}>
                          <div className="flex items-center gap-2">
                            <Trophy className="w-5 h-5 text-cyan-400" />
                            <span className="text-base font-bold text-white/70">Tentang Turnamen</span>
                          </div>

                          {/* Title */}
                          <div>
                            <label className="text-xs text-white/40 uppercase tracking-wider font-semibold mb-1 block">Judul</label>
                            <input
                              type="text"
                              value={landingTournamentInfo.title}
                              onChange={(e) => {
                                setLandingTournamentInfo(prev => ({ ...prev, title: e.target.value }));
                                setLandingContentSaved(false);
                              }}
                              className="w-full bg-white/[0.06] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white/80 outline-none focus:border-white/[0.15] transition-colors"
                              placeholder="Judul tentang turnamen..."
                            />
                          </div>

                          {/* Description */}
                          <div>
                            <label className="text-xs text-white/40 uppercase tracking-wider font-semibold mb-1 block">Deskripsi</label>
                            <textarea
                              value={landingTournamentInfo.description}
                              onChange={(e) => {
                                setLandingTournamentInfo(prev => ({ ...prev, description: e.target.value }));
                                setLandingContentSaved(false);
                              }}
                              rows={3}
                              className="w-full bg-white/[0.06] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white/80 outline-none focus:border-white/[0.15] transition-colors resize-none"
                              placeholder="Deskripsi tentang turnamen..."
                            />
                          </div>

                          {/* Features */}
                          <div className="space-y-2">
                            <label className="text-xs text-white/40 uppercase tracking-wider font-semibold block">Fitur Unggulan</label>
                            {landingTournamentInfo.features.map((feat, idx) => (
                              <div key={idx} className="bg-white/[0.03] border border-white/[0.05] rounded-xl p-3 space-y-2">
                                <div className="flex items-center justify-between">
                                  <span className="text-xs text-white/30 font-semibold">Fitur {idx + 1}</span>
                                  {landingTournamentInfo.features.length > 1 && (
                                    <motion.button
                                      onClick={() => {
                                        const updated = [...landingTournamentInfo.features];
                                        updated.splice(idx, 1);
                                        setLandingTournamentInfo(prev => ({ ...prev, features: updated }));
                                        setLandingContentSaved(false);
                                      }}
                                      className="p-1 rounded-lg text-red-400/50 hover:text-red-400 hover:bg-red-400/10 transition-colors"
                                      whileTap={{ scale: 0.9 }}
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </motion.button>
                                  )}
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                  <div>
                                    <label className="text-[10px] text-white/30 mb-0.5 block">Ikon</label>
                                    <select
                                      value={feat.icon}
                                      onChange={(e) => {
                                        const updated = [...landingTournamentInfo.features];
                                        updated[idx] = { ...updated[idx], icon: e.target.value };
                                        setLandingTournamentInfo(prev => ({ ...prev, features: updated }));
                                        setLandingContentSaved(false);
                                      }}
                                      className="w-full bg-white/[0.06] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white/80 outline-none"
                                    >
                                      <option value="Trophy">🏆 Trophy</option>
                                      <option value="Users">👥 Users</option>
                                      <option value="Zap">⚡ Zap</option>
                                      <option value="Shield">🛡️ Shield</option>
                                      <option value="Star">⭐ Star</option>
                                      <option value="Swords">⚔️ Swords</option>
                                      <option value="Coins">💰 Coins</option>
                                      <option value="Heart">❤️ Heart</option>
                                      <option value="Gamepad2">🎮 Gamepad</option>
                                      <option value="Info">ℹ️ Info</option>
                                    </select>
                                  </div>
                                  <div>
                                    <label className="text-[10px] text-white/30 mb-0.5 block">Label</label>
                                    <input
                                      type="text"
                                      value={feat.label}
                                      onChange={(e) => {
                                        const updated = [...landingTournamentInfo.features];
                                        updated[idx] = { ...updated[idx], label: e.target.value };
                                        setLandingTournamentInfo(prev => ({ ...prev, features: updated }));
                                        setLandingContentSaved(false);
                                      }}
                                      className="w-full bg-white/[0.06] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white/80 outline-none"
                                      placeholder="Label..."
                                    />
                                  </div>
                                </div>
                                <div>
                                  <label className="text-[10px] text-white/30 mb-0.5 block">Nilai / Deskripsi</label>
                                  <input
                                    type="text"
                                    value={feat.value}
                                    onChange={(e) => {
                                      const updated = [...landingTournamentInfo.features];
                                      updated[idx] = { ...updated[idx], value: e.target.value };
                                      setLandingTournamentInfo(prev => ({ ...prev, features: updated }));
                                      setLandingContentSaved(false);
                                    }}
                                    className="w-full bg-white/[0.06] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white/80 outline-none"
                                    placeholder="Deskripsi fitur..."
                                  />
                                </div>
                              </div>
                            ))}
                            <motion.button
                              onClick={() => {
                                setLandingTournamentInfo(prev => ({ ...prev, features: [...prev.features, { icon: 'Trophy', label: '', value: '' }] }));
                                setLandingContentSaved(false);
                              }}
                              className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold cursor-pointer transition-colors"
                              style={{ background: 'rgba(56,189,248,0.06)', border: '1px solid rgba(56,189,248,0.12)', color: '#38BDF8' }}
                              whileHover={{ background: 'rgba(56,189,248,0.10)' }}
                              whileTap={{ scale: 0.98 }}
                            >
                              <Plus className="w-3 h-3" /> Tambah Fitur
                            </motion.button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* ═══ Sub-tab: Info ═══ */}
                    {contentSubTab === 'info' && (
                      <div className="space-y-5">
                        {/* Section Header */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-xl bg-amber-500/12 flex items-center justify-center">
                              <Info className="w-4 h-4 text-amber-400" />
                            </div>
                            <div>
                              <p className="text-sm font-bold text-white/90">Kartu Informasi</p>
                              <p className="text-xs text-white/30">Edit kartu informasi di bagian bawah halaman utama</p>
                            </div>
                          </div>
                          <motion.button
                            onClick={saveQuickInfo}
                            disabled={quickInfoSaving}
                            className={`flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                              quickInfoSaved
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/20'
                                : isMale
                                  ? 'bg-[#73FF00]/15 text-[#73FF00] border border-[#73FF00]/20 hover:bg-[#73FF00]/20'
                                  : 'bg-[#38BDF8]/15 text-[#38BDF8] border border-[#38BDF8]/20 hover:bg-[#38BDF8]/20'
                            }`}
                            whileHover={{ scale: 1.01 }}
                            whileTap={{ scale: 0.95 }}
                          >
                            {quickInfoSaving ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : quickInfoSaved ? (
                              <Check className="w-4 h-4" />
                            ) : (
                              <Save className="w-4 h-4" />
                            )}
                            {quickInfoSaved ? 'Tersimpan!' : 'Simpan'}
                          </motion.button>
                        </div>

                        {/* Items list */}
                        <div className="space-y-3">
                          {quickInfoItems.map((item, idx) => (
                            <div
                              key={idx}
                              className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-5 space-y-4"
                              style={{ borderLeft: `3px solid rgb(${item.color || '115,255,0'})` }}
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-xs text-white/40 font-semibold">Kartu {idx + 1}</span>
                                <div className="flex items-center gap-2">
                                  {quickInfoItems.length > 1 && (
                                    <motion.button
                                      onClick={() => {
                                        const updated = [...quickInfoItems];
                                        updated.splice(idx, 1);
                                        setQuickInfoItems(updated);
                                        setQuickInfoSaved(false);
                                      }}
                                      className="p-1.5 rounded-lg text-red-400/50 hover:text-red-400 hover:bg-red-400/10 transition-colors"
                                      whileTap={{ scale: 0.9 }}
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </motion.button>
                                  )}
                                </div>
                              </div>

                              <div className="grid grid-cols-2 gap-3">
                                {/* Icon selector */}
                                <div>
                                  <label className="text-xs text-white/40 uppercase tracking-wider font-semibold mb-1 block">Ikon</label>
                                  <select
                                    value={item.icon}
                                    onChange={(e) => {
                                      const updated = [...quickInfoItems];
                                      updated[idx] = { ...updated[idx], icon: e.target.value };
                                      setQuickInfoItems(updated);
                                      setQuickInfoSaved(false);
                                    }}
                                    className="w-full bg-white/[0.06] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white/80 outline-none focus:border-white/[0.15] focus:bg-white/[0.07] transition-colors"
                                  >
                                    <option value="Info">ℹ️ Info</option>
                                    <option value="Calendar">📅 Calendar</option>
                                    <option value="Heart">❤️ Heart</option>
                                    <option value="Trophy">🏆 Trophy</option>
                                    <option value="Users">👥 Users</option>
                                    <option value="Coins">💰 Coins</option>
                                    <option value="Swords">⚔️ Swords</option>
                                    <option value="Shield">🛡️ Shield</option>
                                    <option value="Star">⭐ Star</option>
                                    <option value="Zap">⚡ Zap</option>
                                    <option value="Bell">🔔 Bell</option>
                                    <option value="Gamepad2">🎮 Gamepad</option>
                                    <option value="ScrollText">📜 Scroll</option>
                                    <option value="TrendingUp">📈 Trending</option>
                                  </select>
                                </div>
                                {/* Color selector */}
                                <div>
                                  <label className="text-xs text-white/40 uppercase tracking-wider font-semibold mb-1 block">Warna</label>
                                  <div className="flex items-center gap-2">
                                    {[
                                      { label: 'Hijau', value: '115,255,0' },
                                      { label: 'Biru', value: '56,189,248' },
                                      { label: 'Pink', value: '244,114,182' },
                                      { label: 'Emas', value: '255,215,0' },
                                      { label: 'Ungu', value: '168,85,247' },
                                      { label: 'Merah', value: '239,68,68' },
                                    ].map((c) => (
                                      <button
                                        key={c.value}
                                        onClick={() => {
                                          const updated = [...quickInfoItems];
                                          updated[idx] = { ...updated[idx], color: c.value };
                                          setQuickInfoItems(updated);
                                          setQuickInfoSaved(false);
                                        }}
                                        className={`w-6 h-6 rounded-full border-2 transition-all ${item.color === c.value ? 'border-white/60 scale-110' : 'border-transparent hover:border-white/20'}`}
                                        style={{ background: `rgb(${c.value})` }}
                                        title={c.label}
                                      />
                                    ))}
                                  </div>
                                </div>
                              </div>

                              {/* Title */}
                              <div>
                                <label className="text-xs text-white/40 uppercase tracking-wider font-semibold mb-1 block">Judul</label>
                                <input
                                  type="text"
                                  value={item.title}
                                  onChange={(e) => {
                                    const updated = [...quickInfoItems];
                                    updated[idx] = { ...updated[idx], title: e.target.value };
                                    setQuickInfoItems(updated);
                                    setQuickInfoSaved(false);
                                  }}
                                  className="w-full bg-white/[0.06] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white/80 outline-none focus:border-white/[0.15] focus:bg-white/[0.07] transition-colors"
                                  placeholder="Judul kartu..."
                                />
                              </div>

                              {/* Description */}
                              <div>
                                <label className="text-xs text-white/40 uppercase tracking-wider font-semibold mb-1 block">Deskripsi</label>
                                <textarea
                                  value={item.description}
                                  onChange={(e) => {
                                    const updated = [...quickInfoItems];
                                    updated[idx] = { ...updated[idx], description: e.target.value };
                                    setQuickInfoItems(updated);
                                    setQuickInfoSaved(false);
                                  }}
                                  rows={3}
                                  className="w-full bg-white/[0.06] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white/80 outline-none focus:border-white/[0.15] focus:bg-white/[0.07] transition-colors resize-none"
                                  placeholder="Deskripsi kartu..."
                                />
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Add new item button */}
                        <motion.button
                          onClick={() => {
                            setQuickInfoItems([...quickInfoItems, { icon: 'Info', title: '', description: '', color: '115,255,0' }]);
                            setQuickInfoSaved(false);
                          }}
                          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold tracking-wide cursor-pointer transition-colors"
                          style={{
                            background: 'rgba(255,215,0,0.06)',
                            border: '1px solid rgba(255,215,0,0.12)',
                            color: '#FFD700',
                          }}
                          whileHover={{ background: 'rgba(255,215,0,0.10)', borderColor: 'rgba(255,215,0,0.20)' }}
                          whileTap={{ scale: 0.98 }}
                        >
                          <Plus className="w-4 h-4" />
                          Tambah Kartu Informasi
                        </motion.button>

                        {/* Preview */}
                        <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-5 space-y-4">
                          <div className="flex items-center gap-2 mb-2">
                            <Eye className="w-4 h-4 text-white/40" />
                            <span className="text-xs text-white/40 uppercase tracking-wider font-semibold">Preview</span>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                            {quickInfoItems.map((item, idx) => (
                              <div
                                key={idx}
                                className="rounded-xl p-3"
                                style={{
                                  background: `linear-gradient(135deg, rgba(${item.color || '115,255,0'},0.05) 0%, rgba(${item.color || '115,255,0'},0.01) 100%)`,
                                  border: `1px solid rgba(${item.color || '115,255,0'},0.08)`,
                                }}
                              >
                                <h4 className="text-xs font-bold text-white/70 mb-1">{item.title || 'Judul...'}</h4>
                                <p className="text-[10px] text-white/30 leading-relaxed line-clamp-2">{item.description || 'Deskripsi...'}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* ═══ Sub-tab: Video Highlights ═══ */}
                    {contentSubTab === 'video' && (
                      <div className="space-y-5">
                        {/* Section Header */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'rgba(255,107,53,0.12)' }}>
                              <Play className="w-4 h-4" style={{ color: '#FF6B35' }} />
                            </div>
                            <div>
                              <p className="text-sm font-bold text-white/90">Video Highlight</p>
                              <p className="text-xs text-white/30">Kelola video highlight pertandingan di landing page</p>
                            </div>
                          </div>
                        </div>

                        {/* Add New Video Form */}
                        <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-5 space-y-4" style={{ borderLeft: '3px solid #FF6B35' }}>
                          <div className="flex items-center gap-2">
                            <Plus className="w-4 h-4" style={{ color: '#FF6B35' }} />
                            <span className="text-xs text-white/50 font-semibold uppercase tracking-wider">Tambah Video Baru</span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            {/* Title input */}
                            <div className="sm:col-span-1">
                              <label className="text-xs text-white/40 uppercase tracking-wider font-semibold mb-1 block">Judul</label>
                              <input
                                type="text"
                                value={newVideoTitle}
                                onChange={(e) => setNewVideoTitle(e.target.value)}
                                className="w-full bg-white/[0.06] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white/80 outline-none focus:border-white/[0.15] focus:bg-white/[0.07] transition-colors"
                                placeholder="Contoh: Final Male Week 5"
                              />
                            </div>
                            {/* YouTube URL input */}
                            <div className="sm:col-span-1">
                              <label className="text-xs text-white/40 uppercase tracking-wider font-semibold mb-1 block">URL YouTube</label>
                              <input
                                type="url"
                                value={newVideoUrl}
                                onChange={(e) => setNewVideoUrl(e.target.value)}
                                className="w-full bg-white/[0.06] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white/80 outline-none focus:border-white/[0.15] focus:bg-white/[0.07] transition-colors"
                                placeholder="https://youtube.com/watch?v=..."
                              />
                            </div>
                            {/* Division selector */}
                            <div className="sm:col-span-1">
                              <label className="text-xs text-white/40 uppercase tracking-wider font-semibold mb-1 block">Divisi</label>
                              <select
                                value={newVideoDivision}
                                onChange={(e) => setNewVideoDivision(e.target.value)}
                                className="w-full bg-white/[0.06] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white/80 outline-none focus:border-white/[0.15] focus:bg-white/[0.07] transition-colors"
                              >
                                <option value="all">Semua Divisi</option>
                                <option value="male">Male Division</option>
                                <option value="female">Female Division</option>
                              </select>
                            </div>
                          </div>

                          <motion.button
                            onClick={async () => {
                              if (!newVideoTitle.trim() || !newVideoUrl.trim()) {
                                addToast('Judul dan URL YouTube wajib diisi', 'error');
                                return;
                              }
                              setAddingVideo(true);
                              try {
                                const res = await adminFetch('/api/admin/video-highlights', {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({
                                    title: newVideoTitle.trim(),
                                    youtubeUrl: newVideoUrl.trim(),
                                    division: newVideoDivision,
                                    sortOrder: videoHighlights.length,
                                  }),
                                });
                                if (res.ok) {
                                  addToast('Video highlight berhasil ditambahkan!', 'success');
                                  setNewVideoTitle('');
                                  setNewVideoUrl('');
                                  setNewVideoDivision('all');
                                  fetchVideoHighlights();
                                } else {
                                  const data = await res.json();
                                  addToast(data.error || 'Gagal menambahkan video', 'error');
                                }
                              } catch {
                                addToast('Gagal menambahkan video', 'error');
                              } finally {
                                setAddingVideo(false);
                              }
                            }}
                            disabled={addingVideo}
                            className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all"
                            style={{
                              background: addingVideo ? 'rgba(255,107,53,0.08)' : 'rgba(255,107,53,0.15)',
                              border: '1px solid rgba(255,107,53,0.20)',
                              color: '#FF6B35',
                            }}
                            whileHover={{ scale: addingVideo ? 1 : 1.01 }}
                            whileTap={{ scale: addingVideo ? 1 : 0.95 }}
                          >
                            {addingVideo ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Plus className="w-4 h-4" />
                            )}
                            {addingVideo ? 'Menambahkan...' : 'Tambah Video'}
                          </motion.button>
                        </div>

                        {/* Existing video highlights list */}
                        {videoHighlightsLoading ? (
                          <div className="flex justify-center py-8">
                            <Loader2 className={`w-5 h-5 animate-spin ${accentClass}`} />
                          </div>
                        ) : videoHighlights.length === 0 ? (
                          <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-6 text-center">
                            <Play className="w-7 h-7 text-white/20 mx-auto mb-2" />
                            <p className="text-sm text-white/30 font-medium">Belum ada video highlight</p>
                            <p className="text-xs text-white/20 mt-1">Tambahkan video YouTube di atas</p>
                          </div>
                        ) : (
                          <div className="space-y-3 max-h-[400px] overflow-y-auto" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.08) transparent' }}>
                            {videoHighlights.map((vh, idx) => {
                              const ytId = vh.youtubeUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/)?.[1];
                              return (
                                <motion.div
                                  key={vh.id}
                                  className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4"
                                  style={{ borderLeft: `3px solid ${vh.isActive ? '#FF6B35' : 'rgba(255,255,255,0.08)'}` }}
                                  initial={{ opacity: 0, y: 6 }}
                                  animate={{ opacity: 1, y: 0 }}
                                >
                                  <div className="flex items-start gap-3">
                                    {/* Thumbnail preview */}
                                    {ytId && (
                                      <div className="w-20 h-[45px] rounded-lg overflow-hidden flex-shrink-0 relative">
                                        <img
                                          src={`https://img.youtube.com/vi/${ytId}/mqdefault.jpg`}
                                          alt={vh.title}
                                          className="w-full h-full object-cover"
                                          loading="lazy"
                                        />
                                        <div className="absolute inset-0 flex items-center justify-center">
                                          <Play className="w-3 h-3 text-white" fill="white" strokeWidth={0} />
                                        </div>
                                      </div>
                                    )}
                                    {/* Info */}
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2">
                                        <p className="text-sm font-semibold text-white/80 truncate">{vh.title}</p>
                                        {!vh.isActive && (
                                          <span className="text-[7px] px-1.5 py-0.5 rounded-full bg-white/[0.06] text-white/30 font-bold">OFF</span>
                                        )}
                                      </div>
                                      <p className="text-xs text-white/25 truncate mt-0.5">{vh.youtubeUrl}</p>
                                      <div className="flex items-center gap-1.5 mt-1">
                                        <span
                                          className="text-[7px] font-bold px-1.5 py-0.5 rounded-full"
                                          style={{
                                            background: vh.division === 'male' ? 'rgba(115,255,0,0.08)' : vh.division === 'female' ? 'rgba(56,189,248,0.08)' : 'rgba(255,107,53,0.08)',
                                            color: vh.division === 'male' ? '#73FF00' : vh.division === 'female' ? '#38BDF8' : '#FF6B35',
                                            border: `1px solid ${vh.division === 'male' ? 'rgba(115,255,0,0.15)' : vh.division === 'female' ? 'rgba(56,189,248,0.15)' : 'rgba(255,107,53,0.15)'}`,
                                          }}
                                        >
                                          {vh.division === 'male' ? 'MALE' : vh.division === 'female' ? 'FEMALE' : 'ALL'}
                                        </span>
                                        <span className="text-[9px] text-white/20">#{idx + 1}</span>
                                      </div>
                                    </div>
                                    {/* Actions */}
                                    <div className="flex items-center gap-1.5 flex-shrink-0">
                                      {/* Toggle active */}
                                      <motion.button
                                        onClick={async () => {
                                          try {
                                            const res = await adminFetch('/api/admin/video-highlights', {
                                              method: 'PUT',
                                              headers: { 'Content-Type': 'application/json' },
                                              body: JSON.stringify({ id: vh.id, isActive: !vh.isActive }),
                                            });
                                            if (res.ok) {
                                              addToast(vh.isActive ? 'Video dinonaktifkan' : 'Video diaktifkan', 'success');
                                              fetchVideoHighlights();
                                            }
                                          } catch {
                                            addToast('Gagal mengubah status', 'error');
                                          }
                                        }}
                                        className={`p-1.5 rounded-lg transition-colors ${vh.isActive ? 'text-emerald-400/60 hover:text-emerald-400 hover:bg-emerald-400/10' : 'text-white/20 hover:text-white/40 hover:bg-white/[0.04]'}`}
                                        whileTap={{ scale: 0.9 }}
                                        title={vh.isActive ? 'Nonaktifkan' : 'Aktifkan'}
                                      >
                                        {vh.isActive ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                                      </motion.button>
                                      {/* Delete */}
                                      <motion.button
                                        onClick={async () => {
                                          try {
                                            const res = await adminFetch(`/api/admin/video-highlights?id=${vh.id}`, { method: 'DELETE' });
                                            if (res.ok) {
                                              addToast('Video highlight dihapus', 'success');
                                              fetchVideoHighlights();
                                            }
                                          } catch {
                                            addToast('Gagal menghapus video', 'error');
                                          }
                                        }}
                                        className="p-1.5 rounded-lg text-red-400/50 hover:text-red-400 hover:bg-red-400/10 transition-colors"
                                        whileTap={{ scale: 0.9 }}
                                        title="Hapus"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </motion.button>
                                    </div>
                                  </div>
                                </motion.div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}

                  </div>
                )}
              </div>

              {/* Reset Confirmation Dialog */}
              <AnimatePresence>
                {showResetConfirm && (
                  <motion.div
                    className="absolute inset-0 z-[60] flex items-center justify-center p-6"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
                    <motion.div
                      className="relative w-full bg-[#1c1c1e] border border-white/[0.08] rounded-2xl p-6"
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.9, opacity: 0 }}
                      transition={{ type: 'spring', damping: 25, stiffness: 350 }}
                    >
                      <div className="flex flex-col items-center text-center">
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 ${(tournament?.week || 1) >= 8 ? 'bg-purple-500/15' : 'bg-amber-500/15'}`}>
                          <RotateCcw className={`w-7 h-7 ${(tournament?.week || 1) >= 8 ? 'text-purple-400' : 'text-amber-400'}`} />
                        </div>
                        <h3 className="text-lg font-bold text-white/90">
                          {(tournament?.week || 1) >= 8 ? 'Mulai Musim Baru?' : 'Reset Data?'}
                        </h3>
                        <p className="text-sm text-white/50 mt-2 leading-relaxed">
                          {(tournament?.week || 1) >= 8
                            ? 'Grand Final selesai! Data akan direset untuk memulai musim baru:'
                            : 'Data pertandingan minggu ini akan dihapus:'}
                        </p>
                        <div className="mt-3 space-y-1.5 text-left w-full">
                          {(tournament?.week || 1) >= 8
                            ? ['Semua pertandingan & skor', 'Semua tim & bracket', 'Semua data sawer', 'Nomor minggu → kembali ke 1', 'Nama turnamen → Musim Baru'].map((item) => (
                              <div key={item} className="flex items-center gap-2 text-xs text-white/40">
                                <XCircle className="w-3 h-3 text-purple-400/60 flex-shrink-0" />
                                <span>{item}</span>
                              </div>
                            ))
                            : ['Semua pertandingan & skor', 'Semua tim & bracket', 'Semua data sawer'].map((item) => (
                              <div key={item} className="flex items-center gap-2 text-xs text-white/40">
                                <XCircle className="w-3 h-3 text-red-400/60 flex-shrink-0" />
                                <span>{item}</span>
                              </div>
                            ))}
                        </div>
                        <p className="text-xs text-amber-400/80 mt-2 font-medium">
                          ✓ Point, kemenangan, MVP & data pemain tetap tersimpan
                        </p>
                        <p className="text-xs text-white/30 mt-1">
                          {(tournament?.week || 1) >= 8
                            ? 'Siklus 8 minggu menuju Grand Final dimulai lagi.'
                            : `Turnamen lanjut ke Minggu ${(tournament?.week || 1) + 1}.`}
                        </p>
                        <div className="flex gap-3 mt-5 w-full">
                          <motion.button
                            onClick={() => setShowResetConfirm(false)}
                            className="flex-1 py-3 rounded-xl text-sm font-semibold bg-white/[0.03] border border-white/[0.06] text-white/70"
                            whileTap={{ scale: 0.97 }}
                          >
                            Batal
                          </motion.button>
                          <motion.button
                            onClick={() => {
                              setShowResetConfirm(false);
                              setShowPanel(false);
                              onResetSeason();
                            }}
                            className="flex-1 py-3 rounded-xl text-sm font-semibold bg-amber-500/20 text-amber-400 border border-amber-500/20"
                            whileHover={{ scale: 1.01 }}
                            whileTap={{ scale: 0.97 }}
                          >
                            Ya, Reset
                          </motion.button>
                        </div>
                      </div>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Proof Image Preview Modal */}
              <AnimatePresence>
                {showProofModal === 'view' && proofModalUrl && (
                  <motion.div
                    className="absolute inset-0 z-[60] flex items-center justify-center p-6"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => {
                      setShowProofModal(null);
                      setProofModalUrl(null);
                    }}
                  >
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
                    <motion.div
                      className="relative w-full max-w-sm"
                      initial={{ scale: 0.85, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.85, opacity: 0 }}
                      transition={{ type: 'spring', damping: 25, stiffness: 350 }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="bg-[#1c1c1e] border border-white/[0.08] rounded-2xl overflow-hidden">
                        <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
                          <div className="flex items-center gap-2">
                            <ImageIcon className={`w-5 h-5 ${accentClass}`} />
                            <span className="text-sm font-semibold text-white/90">Bukti Pembayaran</span>
                          </div>
                          <button
                            onClick={() => {
                              setShowProofModal(null);
                              setProofModalUrl(null);
                            }}
                            className="w-7 h-7 rounded-lg bg-white/[0.06] flex items-center justify-center text-white/40 hover:bg-white/[0.10] transition-colors"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="p-4">
                          <div className="rounded-xl overflow-hidden bg-white/[0.05]">
                            <img
                              src={proofModalUrl}
                              alt="Bukti pembayaran"
                              className="w-full h-auto max-h-[60vh] object-contain"
                            />
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Add Admin Modal */}
              <AnimatePresence>
                {showAddAdmin && (
                  <motion.div
                    className="absolute inset-0 z-[60] flex items-end sm:items-center justify-center p-4"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setShowAddAdmin(false)}
                  >
                    <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
                    <motion.div
                      className="relative w-full max-w-sm bg-[#1c1c1e] border border-white/[0.08] rounded-2xl p-6"
                      initial={{ scale: 0.9, opacity: 0, y: 20 }}
                      animate={{ scale: 1, opacity: 1, y: 0 }}
                      exit={{ scale: 0.9, opacity: 0, y: 20 }}
                      transition={{ type: 'spring', damping: 25, stiffness: 350 }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center gap-3 mb-5">
                        <div className={`w-10 h-10 rounded-xl ${isMale ? 'bg-[#73FF00]/15' : 'bg-[#0EA5E9]/15'} flex items-center justify-center`}>
                          <UserPlus className={`w-5 h-5 ${isMale ? 'text-[#73FF00]' : 'text-[#38BDF8]'}`} />
                        </div>
                        <div>
                          <h3 className="text-base font-bold text-white/90">Tambah Admin Baru</h3>
                          <p className="text-xs text-white/35">Buat akun admin dengan permissions tertentu</p>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <label className="text-xs text-white/35 mb-1.5 block uppercase tracking-wider font-semibold">Nama *</label>
                          <input
                            type="text"
                            value={newAdminName}
                            onChange={(e) => setNewAdminName(e.target.value)}
                            placeholder="Nama admin"
                            className="w-full bg-white/[0.05] border border-white/[0.08] rounded-xl px-4 py-3 text-white/90 text-sm placeholder-white/25 focus:outline-none focus:border-white/[0.15] focus:bg-white/[0.06] transition-colors"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-white/35 mb-1.5 block uppercase tracking-wider font-semibold">Email *</label>
                          <input
                            type="email"
                            value={newAdminEmail}
                            onChange={(e) => setNewAdminEmail(e.target.value)}
                            placeholder="email@example.com"
                            className="w-full bg-white/[0.05] border border-white/[0.08] rounded-xl px-4 py-3 text-white/90 text-sm placeholder-white/25 focus:outline-none focus:border-white/[0.15] focus:bg-white/[0.06] transition-colors"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-white/35 mb-1.5 block uppercase tracking-wider font-semibold">Password *</label>
                          <input
                            type="password"
                            value={newAdminPass}
                            onChange={(e) => setNewAdminPass(e.target.value)}
                            placeholder="Password admin"
                            className="w-full bg-white/[0.05] border border-white/[0.08] rounded-xl px-4 py-3 text-white/90 text-sm placeholder-white/25 focus:outline-none focus:border-white/[0.15] focus:bg-white/[0.06] transition-colors"
                          />
                        </div>

                        {/* Permission Toggles */}
                        <div>
                          <div className="flex items-center gap-1.5 mb-2.5">
                            <KeyRound className="w-4 h-4 text-white/30" />
                            <p className="text-xs uppercase tracking-wider text-white/30 font-semibold">Permissions</p>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            {([
                              { key: 'tournament', label: 'Tournament' },
                              { key: 'players', label: 'Players' },
                              { key: 'bracket', label: 'Bracket' },
                              { key: 'scores', label: 'Scores' },
                              { key: 'prize', label: 'Prize Pool' },
                              { key: 'donations', label: 'Donations' },
                              { key: 'full_reset', label: 'Full Reset' },
                              { key: 'manage_admins', label: 'Manage Admins' },
                            ]).map((perm) => {
                              const hasPerm = newAdminPerms[perm.key] ?? false;
                              return (
                                <div
                                  key={perm.key}
                                  className={`flex items-center justify-between px-3 py-2 rounded-xl ${hasPerm ? 'bg-emerald-500/8' : 'bg-white/[0.03]'} transition-colors`}
                                  onClick={() => setNewAdminPerms((prev) => ({ ...prev, [perm.key]: !hasPerm }))}
                                >
                                  <span className={`text-xs font-medium ${hasPerm ? 'text-emerald-400/80' : 'text-white/25'}`}>
                                    {perm.label}
                                  </span>
                                  <div className={`w-8 h-[18px] rounded-full flex items-center transition-colors ${hasPerm ? 'bg-emerald-500/40 justify-end' : 'bg-white/10 justify-start'}`}>
                                    <div className={`w-[14px] h-[14px] rounded-full bg-white/[0.06]0 shadow-sm transition-transform ${hasPerm ? 'translate-x-0' : '-translate-x-1'}`} />
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-3 mt-5">
                        <motion.button
                          onClick={() => {
                            setShowAddAdmin(false);
                            setNewAdminName('');
                            setNewAdminEmail('');
                            setNewAdminPass('');
                            setNewAdminPerms({ tournament: true, players: true, bracket: true, scores: true, prize: true, donations: true, full_reset: false, manage_admins: false });
                          }}
                          className="flex-1 py-3 rounded-xl text-sm font-semibold bg-white/[0.03] border border-white/[0.06] text-white/70"
                          whileTap={{ scale: 0.97 }}
                        >
                          Batal
                        </motion.button>
                        <motion.button
                          onClick={async () => {
                            if (!newAdminName.trim() || !newAdminEmail.trim() || !newAdminPass.trim()) {
                              addToast('Nama, email, dan password wajib diisi', 'error');
                              return;
                            }
                            setRbacLoading(true);
                            try {
                              const res = await adminFetch('/api/admin/manage', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ name: newAdminName.trim(), email: newAdminEmail.trim(), password: newAdminPass, permissions: newAdminPerms }),
                              });
                              const data = await res.json().catch(() => null);
                              if (res.ok && data?.success) {
                                setAdminList((prev) => [...prev, { id: data.admin.id, name: data.admin.name, email: data.admin.email || '', role: data.admin.role, permissions: newAdminPerms, avatar: data.admin.avatar || null, createdAt: data.admin.createdAt }]);
                                setShowAddAdmin(false);
                                setNewAdminName('');
                                setNewAdminEmail('');
                                setNewAdminPass('');
                                setNewAdminPerms({ tournament: true, players: true, bracket: true, scores: true, prize: true, donations: true, full_reset: false, manage_admins: false });
                                addToast(`Admin "${data.admin.name}" berhasil dibuat`, 'success');
                              } else {
                                addToast(data?.error || 'Gagal menambah admin', 'error');
                              }
                            } catch (err) {
                              console.error('Create admin error:', err);
                              addToast('Terjadi kesalahan jaringan', 'error');
                            }
                            setRbacLoading(false);
                          }}
                          disabled={rbacLoading || !newAdminName.trim() || !newAdminEmail.trim() || !newAdminPass.trim()}
                          className={`flex-1 py-3 rounded-xl text-sm font-semibold ${isMale ? 'bg-[#73FF00]/12 text-[#73FF00] border border-[#73FF00]/15' : 'bg-[#38BDF8]/12 text-[#38BDF8] border border-[#38BDF8]/15'} disabled:opacity-40`}
                          whileHover={{ scale: 1.01 }}
                          whileTap={{ scale: 0.97 }}
                        >
                          {rbacLoading ? (
                            <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                          ) : (
                            'Buat Admin'
                          )}
                        </motion.button>
                      </div>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Delete Admin Confirmation Modal */}
              <AnimatePresence>
                {showDeleteConfirm && (
                  <motion.div
                    className="absolute inset-0 z-[60] flex items-center justify-center p-6"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setShowDeleteConfirm(null)}
                  >
                    <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
                    <motion.div
                      className="relative w-full bg-[#1c1c1e] border border-white/[0.08] rounded-2xl p-6"
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.9, opacity: 0 }}
                      transition={{ type: 'spring', damping: 25, stiffness: 350 }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex flex-col items-center text-center">
                        <div className="w-14 h-14 rounded-2xl bg-red-500/15 flex items-center justify-center mb-4">
                          <Trash2 className="w-7 h-7 text-red-400" />
                        </div>
                        <h3 className="text-lg font-bold text-white/90">Hapus Admin?</h3>
                        <p className="text-sm text-white/50 mt-2 leading-relaxed">
                          Admin ini akan dihapus secara permanen dan tidak bisa login lagi.
                        </p>
                        <div className="flex gap-3 mt-5 w-full">
                          <motion.button
                            onClick={() => setShowDeleteConfirm(null)}
                            className="flex-1 py-3 rounded-xl text-sm font-semibold bg-white/[0.03] border border-white/[0.06] text-white/70"
                            whileTap={{ scale: 0.97 }}
                          >
                            Batal
                          </motion.button>
                          <motion.button
                            onClick={async () => {
                              setRbacLoading(true);
                              try {
                                await adminFetch(`/api/admin/manage?adminId=${showDeleteConfirm}`, { method: 'DELETE' });
                                setAdminList((prev) => prev.filter((a) => a.id !== showDeleteConfirm));
                                setShowDeleteConfirm(null);
                              } catch {}
                              setRbacLoading(false);
                            }}
                            disabled={rbacLoading}
                            className="flex-1 py-3 rounded-xl text-sm font-semibold bg-red-500/20 text-red-400 border border-red-500/20 disabled:opacity-50"
                            whileHover={{ scale: 1.01 }}
                            whileTap={{ scale: 0.97 }}
                          >
                            {rbacLoading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Ya, Hapus'}
                          </motion.button>
                        </div>
                      </div>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Full Database Reset Confirmation Modal */}
              <AnimatePresence>
                {showFullResetConfirm && (
                  <motion.div
                    className="absolute inset-0 z-[60] flex items-center justify-center p-6"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => { setShowFullResetConfirm(false); setFullResetConfirmText(''); }}
                  >
                    <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
                    <motion.div
                      className="relative w-full bg-[#1c1c1e] border border-white/[0.08] rounded-2xl p-6"
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.9, opacity: 0 }}
                      transition={{ type: 'spring', damping: 25, stiffness: 350 }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex flex-col items-center text-center">
                        <div className="w-14 h-14 rounded-2xl bg-red-500/15 flex items-center justify-center mb-4">
                          <AlertTriangle className="w-7 h-7 text-red-400" />
                        </div>
                        <h3 className="text-lg font-bold text-red-400">Full Database Reset</h3>
                        <p className="text-sm text-white/50 mt-2 leading-relaxed">
                          SEMUA data akan dihapus secara permanen. Tindakan ini tidak bisa dibatalkan.
                        </p>
                        <div className="mt-3 space-y-1.5 text-left w-full">
                          {['Semua turnamen & bracket', 'Semua pemain & pendaftaran', 'Semua skor & MVP', 'Semua pembayaran & donasi', 'Semua pengaturan'].map((item) => (
                            <div key={item} className="flex items-center gap-2 text-xs text-white/40">
                              <XCircle className="w-3 h-3 text-red-400/60 flex-shrink-0" />
                              <span>{item}</span>
                            </div>
                          ))}
                        </div>
                        <div className="mt-4 w-full">
                          <label className="text-xs text-white/35 mb-1.5 block uppercase tracking-wider font-semibold text-left">
                            Ketik <span className="text-red-400 font-bold">RESET SEMUA DATA</span> untuk konfirmasi
                          </label>
                          <input
                            type="text"
                            value={fullResetConfirmText}
                            onChange={(e) => setFullResetConfirmText(e.target.value)}
                            placeholder="RESET SEMUA DATA"
                            className="w-full bg-white/[0.05] border border-red-500/15 rounded-xl px-4 py-3 text-white/90 text-sm placeholder-white/20 focus:outline-none focus:border-red-500/30 focus:bg-white/[0.06] transition-colors"
                          />
                        </div>
                        <div className="flex gap-3 mt-5 w-full">
                          <motion.button
                            onClick={() => { setShowFullResetConfirm(false); setFullResetConfirmText(''); }}
                            className="flex-1 py-3 rounded-xl text-sm font-semibold bg-white/[0.03] border border-white/[0.06] text-white/70"
                            whileTap={{ scale: 0.97 }}
                          >
                            Batal
                          </motion.button>
                          <motion.button
                            onClick={async () => {
                              if (fullResetConfirmText !== 'RESET SEMUA DATA') return;
                              setFullResetLoading(true);
                              try {
                                const res = await adminFetch('/api/admin/full-reset', {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ requesterId: adminUser?.id, confirmPhrase: 'RESET SEMUA DATA' }),
                                });
                                const data = await res.json();
                                if (res.ok && data.success) {
                                  setShowFullResetConfirm(false);
                                  setFullResetConfirmText('');
                                  setShowPanel(false);
                                  addToast('Database berhasil direset!', 'success');
                                  storeFetchData(false);
                                } else {
                                  addToast(data.error || 'Gagal mereset database', 'error');
                                }
                              } catch {}
                              setFullResetLoading(false);
                            }}
                            disabled={fullResetLoading || fullResetConfirmText !== 'RESET SEMUA DATA'}
                            className="flex-1 py-3 rounded-xl text-sm font-semibold bg-red-500/20 text-red-400 border border-red-500/20 disabled:opacity-40"
                            whileHover={{ scale: 1.01 }}
                            whileTap={{ scale: 0.97 }}
                          >
                            {fullResetLoading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Ya, Reset Semua'}
                          </motion.button>
                        </div>
                      </div>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ Edit Club Modal ═══ */}
      <AnimatePresence>
        {editingClub && (
          <motion.div
            className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-0 sm:p-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setEditingClub(null)}
          >
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
            <motion.div
              className="relative w-full sm:max-w-md bg-[#1c1c1e] border border-white/[0.08] rounded-t-[28px] sm:rounded-2xl p-5"
              initial={{ y: '100%', scale: 0.95 }}
              animate={{ y: 0, scale: 1 }}
              exit={{ y: '100%', scale: 0.95 }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-center pt-2 pb-3 sm:hidden">
                <div className="w-10 h-1 rounded-full bg-white/20" />
              </div>

              {/* Modal Header */}
              <div className="flex items-center gap-3 mb-5">
                <div className={`w-10 h-10 rounded-xl ${accentBgSubtle} flex items-center justify-center`}>
                  <Pencil className={`w-5 h-5 ${accentClass}`} />
                </div>
                <div>
                  <p className="text-[14px] font-bold text-white/90">Edit Club</p>
                  <p className="text-xs text-white/30">{editingClub.name}</p>
                </div>
              </div>

              <div className="space-y-4">
                {/* Name Input */}
                <div>
                  <label className="text-xs tracking-[0.15em] uppercase text-white/40 font-semibold mb-1.5 block">
                    Nama Club
                  </label>
                  <input
                    type="text"
                    value={editClubName}
                    onChange={(e) => setEditClubName(e.target.value)}
                    placeholder="Nama club..."
                    className="w-full bg-white/[0.05] border border-white/[0.08] rounded-xl px-4 py-2.5 text-white/90 text-sm placeholder-white/20 focus:outline-none focus:border-white/[0.15] focus:bg-white/[0.06] transition-colors"
                  />
                </div>

                {/* Logo Upload */}
                <div className="flex justify-center">
                  <ImageUpload
                    value={editClubLogo || null}
                    onChange={(url) => setEditClubLogo(url || '')}
                    accentColor={isMale ? 'gold' : 'pink'}
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 pt-1">
                  <motion.button
                    onClick={() => setEditingClub(null)}
                    className="flex-1 py-3 rounded-xl text-sm font-semibold bg-white/[0.03] border border-white/[0.06] text-white/60"
                    whileTap={{ scale: 0.97 }}
                  >
                    Batal
                  </motion.button>
                  <motion.button
                    onClick={() => {
                      setEditClubSaving(true);
                      fetch('/api/clubs', {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          clubId: editingClub.id,
                          name: editClubName.trim(),
                          logoUrl: editClubLogo.trim() || null,
                        }),
                      })
                        .then((r) => r.json())
                        .then((data) => {
                          if (data.success) {
                            setEditingClub(null);
                            fetchClubs();
                            broadcastClubUpdate();
                          } else {
                            addToast(data.error || 'Gagal mengubah club', 'error');
                          }
                        })
                        .catch(() => addToast('Terjadi kesalahan', 'error'))
                        .finally(() => setEditClubSaving(false));
                    }}
                    disabled={editClubSaving || editClubName.trim().length < 2}
                    className={`flex-1 py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all ${editClubSaving || editClubName.trim().length < 2 ? 'opacity-40 pointer-events-none' : isMale ? 'bg-[#73FF00]/12 text-[#73FF00] border border-[#73FF00]/15' : 'bg-[#38BDF8]/12 text-[#38BDF8] border border-[#38BDF8]/15'}`}
                    whileTap={{ scale: 0.97 }}
                  >
                    {editClubSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    {editClubSaving ? 'Menyimpan...' : 'Simpan'}
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ Edit Tournament Modal ═══ */}
      <AnimatePresence>
        {showEditModal && tournament && (
          <motion.div
            className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-0 sm:p-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowEditModal(false)}
          >
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
            <motion.div
              className="relative w-full sm:max-w-lg bg-[#1c1c1e] border border-white/[0.08] rounded-t-[28px] sm:rounded-2xl max-h-[90vh] overflow-hidden"
              initial={{ y: '100%', scale: 0.95 }}
              animate={{ y: 0, scale: 1 }}
              exit={{ y: '100%', scale: 0.95 }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 pt-5 pb-3">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl ${accentBgSubtle} flex items-center justify-center`}>
                    <Settings className={`w-5 h-5 ${accentClass}`} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white/90">Edit Turnamen</h3>
                    <p className="text-xs text-white/30">Ubah detail turnamen</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="w-8 h-8 rounded-xl bg-white/[0.06] flex items-center justify-center text-white/40 hover:bg-white/[0.10] transition-colors"
                >
                  <XCircle className="w-4 h-4" />
                </button>
              </div>

              {/* Body */}
              <div className="px-5 pb-6 space-y-4 overflow-y-auto max-h-[65vh]">
                {/* Tournament Name */}
                <div>
                  <label className="text-xs tracking-[0.15em] uppercase text-white/40 font-semibold mb-1.5 block">
                    Nama Turnamen
                  </label>
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={(e) => setEditForm(p => ({ ...p, name: e.target.value }))}
                    className="w-full bg-white/[0.05] border border-white/[0.08] rounded-xl px-4 py-2.5 text-white/90 text-sm placeholder-white/20 focus:outline-none focus:border-white/[0.15] focus:bg-white/[0.06] transition-colors"
                  />
                </div>

                {/* Type & Bracket */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs tracking-[0.15em] uppercase text-white/40 font-semibold mb-1.5 block">Jenis</label>
                    <select
                      value={editForm.type}
                      onChange={(e) => setEditForm(p => ({ ...p, type: e.target.value as 'weekly' | 'grand_final' }))}
                      className="w-full bg-white/[0.05] border border-white/[0.08] rounded-xl px-3 py-2.5 text-white/90 text-sm focus:outline-none focus:border-white/[0.15] focus:bg-white/[0.06] transition-colors appearance-none"
                    >
                      <option value="weekly" className="bg-neutral-900">Weekly</option>
                      <option value="grand_final" className="bg-neutral-900">Grand Final</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs tracking-[0.15em] uppercase text-white/40 font-semibold mb-1.5 block">Bracket</label>
                    <select
                      value={editForm.bracketType}
                      onChange={(e) => setEditForm(p => ({ ...p, bracketType: e.target.value as 'single' | 'double' | 'group' | 'round_robin' | 'swiss' }))}
                      className="w-full bg-white/[0.05] border border-white/[0.08] rounded-xl px-3 py-2.5 text-white/90 text-sm focus:outline-none focus:border-white/[0.15] focus:bg-white/[0.06] transition-colors appearance-none"
                    >
                      <option value="single" className="bg-neutral-900">Single Elim</option>
                      <option value="double" className="bg-neutral-900">Double Elim</option>
                      <option value="group" className="bg-neutral-900">Fase Grup</option>
                      <option value="round_robin" className="bg-neutral-900">Round Robin</option>
                      <option value="swiss" className="bg-neutral-900">Swiss System</option>
                    </select>
                  </div>
                </div>

                {/* Week Number */}
                <div className="w-1/2">
                  <label className="text-xs tracking-[0.15em] uppercase text-white/40 font-semibold mb-1.5 block">Minggu Ke-</label>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={99}
                    value={editForm.week}
                    onChange={(e) => setEditForm(p => ({ ...p, week: parseInt(e.target.value) || 1 }))}
                    className="w-full bg-white/[0.05] border border-white/[0.08] rounded-xl px-4 py-2.5 text-white/90 text-sm placeholder-white/20 focus:outline-none focus:border-white/[0.15] focus:bg-white/[0.06] transition-colors"
                  />
                </div>

                {/* Date & Time */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs tracking-[0.15em] uppercase text-white/40 font-semibold mb-1.5 flex items-center gap-1">
                      <Calendar className="w-3 h-3" /> Tanggal
                    </label>
                    <input
                      type="date"
                      value={editForm.startDate}
                      onChange={(e) => setEditForm(p => ({ ...p, startDate: e.target.value }))}
                      className="w-full bg-white/[0.05] border border-white/[0.08] rounded-xl px-3 py-2.5 text-white/90 text-sm focus:outline-none focus:border-white/[0.15] focus:bg-white/[0.06] transition-colors [color-scheme:dark]"
                    />
                  </div>
                  <div>
                    <label className="text-xs tracking-[0.15em] uppercase text-white/40 font-semibold mb-1.5 flex items-center gap-1">
                      <Clock className="w-3 h-3" /> Jam
                    </label>
                    <input
                      type="time"
                      value={editForm.startTime}
                      onChange={(e) => setEditForm(p => ({ ...p, startTime: e.target.value }))}
                      className="w-full bg-white/[0.05] border border-white/[0.08] rounded-xl px-3 py-2.5 text-white/90 text-sm focus:outline-none focus:border-white/[0.15] focus:bg-white/[0.06] transition-colors [color-scheme:dark]"
                    />
                  </div>
                </div>

                {/* Mode, BPM & Lokasi */}
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-xs tracking-[0.15em] uppercase text-white/40 font-semibold mb-1.5 flex items-center gap-1">
                      <Gamepad2 className="w-3 h-3" /> Mode
                    </label>
                    <input
                      type="text"
                      value={editForm.mode}
                      onChange={(e) => setEditForm(p => ({ ...p, mode: e.target.value }))}
                      className="w-full bg-white/[0.05] border border-white/[0.08] rounded-xl px-3 py-2.5 text-white/90 text-sm focus:outline-none focus:border-white/[0.15] focus:bg-white/[0.06] transition-colors"
                    />
                  </div>
                  <div>
                    <label className="text-xs tracking-[0.15em] uppercase text-white/40 font-semibold mb-1.5 flex items-center gap-1">
                      <Music className="w-3 h-3" /> BPM
                    </label>
                    <input
                      type="text"
                      value={editForm.bpm}
                      onChange={(e) => setEditForm(p => ({ ...p, bpm: e.target.value }))}
                      className="w-full bg-white/[0.05] border border-white/[0.08] rounded-xl px-3 py-2.5 text-white/90 text-sm focus:outline-none focus:border-white/[0.15] focus:bg-white/[0.06] transition-colors"
                    />
                  </div>
                  <div>
                    <label className="text-xs tracking-[0.15em] uppercase text-white/40 font-semibold mb-1.5 flex items-center gap-1">
                      <MapPin className="w-3 h-3" /> Lokasi
                    </label>
                    <input
                      type="text"
                      value={editForm.lokasi}
                      onChange={(e) => setEditForm(p => ({ ...p, lokasi: e.target.value }))}
                      className="w-full bg-white/[0.05] border border-white/[0.08] rounded-xl px-3 py-2.5 text-white/90 text-sm focus:outline-none focus:border-white/[0.15] focus:bg-white/[0.06] transition-colors"
                    />
                  </div>
                </div>

                {/* Divider */}
                <div className="border-t border-white/5" />

                {/* Delete Section */}
                <div>
                  <p className="text-xs tracking-[0.15em] uppercase text-red-400/50 font-semibold mb-2">Zona Bahaya</p>
                  <motion.button
                    onClick={() => setShowDeleteTournamentConfirm(true)}
                    className="w-full p-3 rounded-xl border border-red-500/15 bg-red-500/5 flex items-center gap-3 transition-colors hover:bg-red-500/10"
                    whileTap={{ scale: 0.97 }}
                  >
                    <div className="w-9 h-9 rounded-xl bg-red-500/10 flex items-center justify-center flex-shrink-0">
                      <Trash2 className="w-4 h-4 text-red-400" />
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-semibold text-red-400">Hapus Turnamen</p>
                      <p className="text-xs text-white/25">Semua data pendaftaran, tim & pertandingan akan dihapus</p>
                    </div>
                  </motion.button>
                </div>

                {/* Save Button */}
                <motion.button
                  onClick={async () => {
                    if (!tournament) return;
                    setEditSaving(true);
                    try {
                      let startDate: string | null = null;
                      if (editForm.startDate) {
                        const timeStr = editForm.startTime || '19:00';
                        startDate = new Date(`${editForm.startDate}T${timeStr}:00`).toISOString();
                      }
                      const res = await adminFetch('/api/tournaments', {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          tournamentId: tournament.id,
                          name: editForm.name,
                          type: editForm.type,
                          bracketType: editForm.bracketType,
                          week: editForm.week,
                          startDate,
                          mode: editForm.mode,
                          bpm: editForm.bpm,
                          lokasi: editForm.lokasi,
                        }),
                      });
                      const data = await res.json();
                      if (data.success) {
                        setShowEditModal(false);
                        addToast('Turnamen berhasil diperbarui!', 'success');
                        storeFetchData(false);
                      } else {
                        addToast(data.error || 'Gagal mengubah turnamen', 'error');
                      }
                    } catch {
                      addToast('Terjadi kesalahan saat menyimpan', 'error');
                    } finally {
                      setEditSaving(false);
                    }
                  }}
                  disabled={editSaving}
                  className={`w-full py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all ${
                    editSaving ? 'opacity-50 pointer-events-none' : `${isMale ? 'bg-[#73FF00]/12 text-[#73FF00] border border-[#73FF00]/15' : 'bg-[#38BDF8]/12 text-[#38BDF8] border border-[#38BDF8]/15'}`
                  }`}
                  whileHover={{ scale: editSaving ? 1 : 1.01 }}
                  whileTap={{ scale: editSaving ? 1 : 0.97 }}
                >
                  {editSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {editSaving ? 'Menyimpan...' : 'Simpan Perubahan'}
                </motion.button>
              </div>
            </motion.div>

            {/* Nested: Delete Confirmation */}
            <AnimatePresence>
              {showDeleteTournamentConfirm && (
                <motion.div
                  className="absolute inset-0 z-[80] flex items-center justify-center p-6"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setShowDeleteTournamentConfirm(false)}
                >
                  <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
                  <motion.div
                    className="relative w-full bg-[#1c1c1e] border border-white/[0.08] rounded-2xl p-6"
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 350 }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex flex-col items-center text-center">
                      <div className="w-14 h-14 rounded-2xl bg-red-500/15 flex items-center justify-center mb-4">
                        <Trash2 className="w-7 h-7 text-red-400" />
                      </div>
                      <h3 className="text-lg font-bold text-white/90">Hapus Turnamen?</h3>
                      <p className="text-sm text-white/50 mt-2 leading-relaxed">
                        Turnamen <span className="text-white/80 font-semibold">"{tournament.name}"</span> beserta semua pendaftaran, tim, dan pertandingan akan dihapus secara permanen.
                      </p>
                      <p className="text-xs text-red-400/60 mt-2">
                        ⚠️ Tindakan ini tidak dapat dibatalkan
                      </p>
                      <div className="flex gap-3 mt-5 w-full">
                        <motion.button
                          onClick={() => setShowDeleteTournamentConfirm(false)}
                          className="flex-1 py-3 rounded-xl text-sm font-semibold bg-white/[0.03] border border-white/[0.06] text-white/70"
                          whileTap={{ scale: 0.97 }}
                        >
                          Batal
                        </motion.button>
                        <motion.button
                          onClick={async () => {
                            if (!tournament) return;

                            // Pre-check: verify admin auth is available
                            const { getAdminAuthHeaders } = await import('@/lib/admin-fetch');
                            const authHeaders = getAdminAuthHeaders();
                            if (!authHeaders['x-admin-id'] || !authHeaders['x-admin-hash']) {
                              addToast('Sesi admin tidak valid. Silakan refresh halaman dan login kembali.', 'error');
                              return;
                            }

                            setDeleteTournamentLoading(true);
                            try {
                              const res = await adminFetch(`/api/tournaments?id=${tournament.id}`, {
                                method: 'DELETE',
                              });
                              const data = await res.json();
                              if (data.success) {
                                setShowDeleteTournamentConfirm(false);
                                setShowEditModal(false);
                                setShowPanel(false);
                                addToast('Turnamen berhasil dihapus', 'success');
                                storeFetchData(false);
                              } else if (res.status === 401) {
                                addToast('Sesi kadaluarsa. Silakan refresh halaman dan login ulang.', 'error');
                              } else {
                                addToast(data.error || 'Gagal menghapus turnamen', 'error');
                              }
                            } catch {
                              addToast('Terjadi kesalahan saat menghapus', 'error');
                            } finally {
                              setDeleteTournamentLoading(false);
                            }
                          }}
                          disabled={deleteTournamentLoading}
                          className="flex-1 py-3 rounded-xl text-sm font-semibold bg-red-500/20 text-red-400 border border-red-500/20 disabled:opacity-40"
                          whileHover={{ scale: deleteTournamentLoading ? 1 : 1.02 }}
                          whileTap={{ scale: deleteTournamentLoading ? 1 : 0.97 }}
                        >
                          {deleteTournamentLoading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Ya, Hapus'}
                        </motion.button>
                      </div>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Full-Screen Player Management */}
      <PlayerManagementScreen
        isOpen={showPlayerManagement}
        onClose={() => {
          setShowPlayerManagement(false);
          triggerDataRefresh(); // Refresh data when closing
        }}
        registrations={registrations}
        division={division}
        onApprove={(regId, tier) => {
          onApprove(regId, tier);
          triggerDataRefresh();
        }}
        onUpdateTier={(regId, tier) => {
          onUpdateTier(regId, tier);
          triggerDataRefresh();
        }}
        onReject={(regId) => {
          onReject(regId);
          triggerDataRefresh();
        }}
        onDelete={(regId) => {
          onDelete(regId);
          triggerDataRefresh();
        }}
        onDeleteAllRejected={() => {
          onDeleteAllRejected();
          triggerDataRefresh();
        }}
        onSetMVP={(userId, score) => {
          onSetMVP(userId, score);
          triggerDataRefresh();
        }}
        onRemoveMVP={(userId) => {
          onRemoveMVP(userId);
          triggerDataRefresh();
        }}
      />
    </>
  );
}

export default AdminPanel;
