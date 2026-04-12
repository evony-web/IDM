import { create } from 'zustand';

interface SeasonPoint {
  season: number;
  points: number;
}

interface User {
  id: string;
  name: string;
  email: string;
  gender: string;
  tier: string;
  points: number;
  avatar: string | null;
  isMVP?: boolean;
  mvpScore?: number;
  clubId?: string | null;
  city?: string | null;
  seasonPoints?: SeasonPoint[];
  role?: string;
  isAdmin?: boolean;
}

interface Tournament {
  id: string;
  name: string;
  division: string;
  type: string;
  status: string;
  week: number;
  bracketType: string;
  prizePool: number;
  prizeChampion?: number;
  prizeRunnerUp?: number;
  prizeThird?: number;
  prizeMvp?: number;
  mode: string;
  bpm: string;
  lokasi: string;
  startDate: string | null;
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
      avatar: string;
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
  bracket: string;
}

interface Registration {
  id: string;
  userId: string;
  tournamentId: string;
  status: string;
  tierAssigned: string;
  user: User;
}

interface Donation {
  id: string;
  amount: number;
  message: string;
  anonymous: boolean;
  paymentMethod: string;
  paymentStatus: string;
  proofImageUrl: string | null;
  paidAt: string | null;
  createdAt: string;
  user: {
    id: string;
    name: string;
    avatar: string;
  } | null;
}

interface ToastData {
  id: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
}

interface PlayerAuthUser {
  id: string;
  name: string;
  phone: string;
  gender: string;
  tier: string;
  points: number;
  avatar: string | null;
  eloRating: number;
  eloTier: string;
  clubId: string | null;
}

interface AppState {
  // UI State
  activeTab: string;
  division: 'male' | 'female';
  isLoading: boolean;
  isSwitchingDivision: boolean;
  toasts: ToastData[];
  isAdminAuthenticated: boolean;
  adminUser: { id: string; name: string; email: string; role: string; permissions: Record<string, boolean>; avatar: string | null; tier: string } | null;

  // Player Auth
  currentPlayer: PlayerAuthUser | null;
  loginPlayer: (user: PlayerAuthUser) => void;
  logoutPlayer: () => void;

  // Data
  currentUser: User | null;
  users: User[];
  tournaments: Tournament[];
  currentTournament: Tournament | null;
  registrations: Registration[];
  teams: Team[];
  matches: Match[];
  donations: Donation[];
  totalDonation: number;
  totalSawer: number;
  
  // Toast Actions
  addToast: (message: string, type: 'success' | 'error' | 'warning' | 'info') => void;
  removeToast: (id: string) => void;
  
  // UI Actions
  setActiveTab: (tab: string) => void;
  setDivision: (division: 'male' | 'female') => void;
  setSwitchingDivision: (switching: boolean) => void;
  setLoading: (loading: boolean) => void;
  loginAdmin: (username: string, password: string) => Promise<boolean>;
  logoutAdmin: () => void;
  fetchAdmins: () => Promise<void>;
  verifyAdminSession: () => Promise<boolean>;

  // API Actions
  fetchData: (showLoading?: boolean, isDivisionSwitch?: boolean) => Promise<void>;
  registerUser: (name: string, phone: string, avatarUrl?: string, city?: string, club?: string) => Promise<void>;
  approveRegistration: (registrationId: string, tier: string) => Promise<void>;
  updateRegistrationTier: (registrationId: string, tier: string) => Promise<void>;
  rejectRegistration: (registrationId: string) => Promise<void>;
  deleteRegistration: (registrationId: string) => Promise<void>;
  deleteAllRejected: () => Promise<void>;
  updateTournamentStatus: (status: string) => Promise<void>;
  updatePrizePool: (prizes: { champion: number; runnerUp: number; third: number; mvp: number }) => Promise<void>;
  generateTeams: () => Promise<void>;
  resetTeams: () => Promise<void>;
  generateBracket: (type: string, strategy?: string) => Promise<void>;
  updateMatchScore: (matchId: string, scoreA: number, scoreB: number, mvpId?: string) => Promise<void>;
  setMVP: (userId: string, mvpScore: number) => Promise<void>;
  removeMVP: (userId: string) => Promise<void>;
  finalizeTournament: () => Promise<void>;
  donate: (amount: number, message: string, anonymous: boolean, paymentMethod: string, proofUrl?: string, donorName?: string) => Promise<void>;
  seedDatabase: () => Promise<void>;
  resetSeason: () => Promise<void>;
  createTournament: (opts: { name: string; division: string; type: string; bracketType: string; week: number; startDate?: string | null; mode?: string; bpm?: string; lokasi?: string }) => Promise<void>;
  
  // AI Actions
  aiChat: (sessionId: string, message: string) => Promise<string>;
  generateImage: (prompt: string, size?: string) => Promise<{ success: boolean; imageUrl?: string; error?: string }>;
}

// Restore admin auth from localStorage
let storedAdminAuth = false;
let storedAdminUser = null;
let storedPlayer: PlayerAuthUser | null = null;
// Player auth is now managed by NextAuth (httpOnly cookies)
// No longer reading from localStorage — session is verified server-side
if (typeof localStorage !== 'undefined') {
  // Clean up old localStorage data if it exists
  try {
    const playerRaw = localStorage.getItem('idm_player_auth');
    if (playerRaw) {
      localStorage.removeItem('idm_player_auth');
    }
  } catch { /* silent */ }
  try {
    storedAdminAuth = localStorage.getItem('idm_admin_auth') === 'true';
    const raw = localStorage.getItem('idm_admin_user');
    const hash = localStorage.getItem('idm_admin_hash');

    if (storedAdminAuth && !hash) {
      console.warn('[Store] Admin auth is true but hash is missing - clearing session');
      localStorage.removeItem('idm_admin_auth');
      localStorage.removeItem('idm_admin_user');
      localStorage.removeItem('idm_admin_hash');
      storedAdminAuth = false;
    } else if (raw && storedAdminAuth && hash) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.id && parsed.name && parsed.role) {
        storedAdminUser = parsed;
      } else {
        storedAdminAuth = false;
        localStorage.removeItem('idm_admin_auth');
        localStorage.removeItem('idm_admin_user');
        localStorage.removeItem('idm_admin_hash');
      }
    }
  } catch {
    storedAdminAuth = false;
    localStorage.removeItem('idm_admin_auth');
    localStorage.removeItem('idm_admin_user');
    localStorage.removeItem('idm_admin_hash');
  }
}

// Helper for admin fetch
async function adminFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const adminHeaders: Record<string, string> = {};
  
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem('idm_admin_user');
      const hash = localStorage.getItem('idm_admin_hash');
      if (raw && hash) {
        const user = JSON.parse(raw);
        if (user?.id) {
          adminHeaders['x-admin-id'] = user.id;
          adminHeaders['x-admin-hash'] = hash;
        }
      }
    } catch {}
  }

  const headers: Record<string, string> = {};
  if (options.headers) {
    const existingHeaders = options.headers as Record<string, string>;
    Object.entries(existingHeaders).forEach(([key, value]) => {
      headers[key] = value;
    });
  }
  Object.assign(headers, adminHeaders);

  return fetch(url, { ...options, headers });
}

export const useAppStore = create<AppState>((set, get) => ({
  // Initial State
  activeTab: 'dashboard',
  division: 'male',
  isLoading: false,
  isSwitchingDivision: false,
  toasts: [],
  isAdminAuthenticated: storedAdminAuth,
  adminUser: storedAdminUser,
  currentPlayer: storedPlayer,
  loginPlayer: (user) => {
    // Player session is now managed by NextAuth (httpOnly cookies)
    // This just updates the Zustand state for UI reactivity
    set({ currentPlayer: user });
  },
  logoutPlayer: () => {
    set({ currentPlayer: null });
    // Sign out from NextAuth to clear httpOnly cookie
    if (typeof window !== 'undefined') {
      import('next-auth/react').then(({ signOut }) => {
        signOut({ redirect: false });
      }).catch(() => { /* silent */ });
    }
  },
  currentUser: null,
  users: [],
  tournaments: [],
  currentTournament: null,
  registrations: [],
  teams: [],
  matches: [],
  donations: [],
  totalDonation: 0,
  totalSawer: 0,
  
  // Toast Actions
  addToast: (message, type) => {
    const id = Math.random().toString(36).substring(2, 11);
    set((state) => ({
      toasts: [...state.toasts, { id, message, type }],
    }));
    setTimeout(() => {
      set((state) => ({
        toasts: state.toasts.filter((t) => t.id !== id),
      }));
    }, 4000);
  },
  removeToast: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    }));
  },
  
  // Setters
  setActiveTab: (tab) => set({ activeTab: tab }),
  setDivision: (division) => set({ division }),
  setSwitchingDivision: (switching) => set({ isSwitchingDivision: switching }),
  setLoading: (loading) => set({ isLoading: loading }),
  loginAdmin: async (username, password) => {
    try {
      const res = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password }),
      });
      if (!res.ok) {
        console.error('[Store] loginAdmin HTTP error:', res.status);
        return false;
      }
      const data = await res.json();
      if (data.success && data.admin) {
        set({
          isAdminAuthenticated: true,
          adminUser: data.admin,
        });
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem('idm_admin_auth', 'true');
          localStorage.setItem('idm_admin_user', JSON.stringify(data.admin));
          const encoder = new TextEncoder();
          const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(password));
          const hashArray = Array.from(new Uint8Array(hashBuffer));
          const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
          localStorage.setItem('idm_admin_hash', hashHex);
        }
        return true;
      }
      return false;
    } catch (err) {
      console.error('[Store] loginAdmin network error:', err);
      return false;
    }
  },
  logoutAdmin: () => {
    set({ isAdminAuthenticated: false, adminUser: null });
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('idm_admin_auth');
      localStorage.removeItem('idm_admin_user');
      localStorage.removeItem('idm_admin_hash');
    }
  },
  fetchAdmins: async () => {
    try {
      const res = await fetch('/api/admin/auth');
      const data = await res.json();
      if (data.success) {
        const currentAdmin = get().adminUser;
        if (currentAdmin) {
          const updated = data.admins.find((a: { id: string }) => a.id === currentAdmin.id);
          if (updated) set({ adminUser: { ...updated, permissions: JSON.parse(updated.permissions || '{}') } });
        }
      }
    } catch {}
  },
  verifyAdminSession: async () => {
    try {
      const adminHash = typeof localStorage !== 'undefined' ? localStorage.getItem('idm_admin_hash') : null;
      let { adminUser } = get();

      // Try to load adminUser from localStorage if not in state
      if (!adminUser && typeof localStorage !== 'undefined') {
        const raw = localStorage.getItem('idm_admin_user');
        if (raw) {
          try {
            const parsed = JSON.parse(raw);
            if (parsed && parsed.id) {
              adminUser = parsed;
              set({ adminUser: parsed, isAdminAuthenticated: true });
            }
          } catch {}
        }
      }

      if (!adminUser || !adminHash) {
        return false;
      }

      const res = await fetch('/api/admin/verify-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminId: adminUser.id, adminHash }),
      });

      const data = await res.json();

      if (!data.valid) {
        console.warn('[Store] Admin session invalid:', data.error);
        set({ isAdminAuthenticated: false, adminUser: null });
        if (typeof localStorage !== 'undefined') {
          localStorage.removeItem('idm_admin_auth');
          localStorage.removeItem('idm_admin_user');
          localStorage.removeItem('idm_admin_hash');
        }
        get().addToast('Session admin tidak valid. Silakan login kembali.', 'warning');
        return false;
      }

      if (data.admin) {
        set({ adminUser: data.admin });
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem('idm_admin_user', JSON.stringify(data.admin));
        }
      }

      return true;
    } catch (err) {
      console.error('[Store] verifyAdminSession error:', err);
      return false;
    }
  },
  
  // API Actions
  fetchData: async (showLoading = true, isDivisionSwitch = false) => {
    try {
      const { division } = get();

      if (isDivisionSwitch) {
        set({ isSwitchingDivision: true });
      }
      
      const res = await fetch(`/api/init?division=${division}`).catch(() => null);
      const data = res ? await res.json().catch(() => null) : null;

      if (data?.success && data.data) {
        const { users, tournaments, currentTournament, donations, totalDonation, totalSawer } = data.data;
        
        const transformedTeams = currentTournament?.teams?.map((team: { TeamMember?: { user: { id: string; name: string; tier: string; avatar: string; points: number }; role: string }[]; members?: unknown }) => ({
          ...team,
          members: team.TeamMember || team.members || [],
          TeamMember: undefined,
        })) || [];
        
        // Transform matches to include team member data
        const transformedMatches = currentTournament?.matches?.map((match: { 
          id: string;
          round: number;
          matchNumber: number;
          teamAId: string | null;
          teamBId: string | null;
          teamA?: { TeamMember?: { user: { id: string; name: string; tier: string; avatar: string; points: number }; role: string }[]; members?: unknown } | null;
          teamB?: { TeamMember?: { user: { id: string; name: string; tier: string; avatar: string; points: number }; role: string }[]; members?: unknown } | null;
          scoreA: number | null;
          scoreB: number | null;
          winnerId: string | null;
          status: string;
          bracket: string;
          mvpId?: string | null;
        }) => ({
          ...match,
          teamA: match.teamA ? {
            ...match.teamA,
            members: match.teamA.TeamMember || match.teamA.members || [],
            TeamMember: undefined,
          } : null,
          teamB: match.teamB ? {
            ...match.teamB,
            members: match.teamB.TeamMember || match.teamB.members || [],
            TeamMember: undefined,
          } : null,
        })) || [];
        
        set({
          users: users || [],
          tournaments: tournaments || [],
          currentTournament: currentTournament ? {
            ...currentTournament,
            teams: transformedTeams,
          } : null,
          registrations: currentTournament?.registrations || [],
          teams: transformedTeams,
          matches: transformedMatches,
          donations: donations || [],
          totalDonation: totalDonation || 0,
          totalSawer: totalSawer || 0,
        });
      }

      set({ isLoading: false, isSwitchingDivision: false });
    } catch (error) {
      console.error('Error fetching data:', error);
      set({ isLoading: false, isSwitchingDivision: false });
      get().addToast('Gagal memuat data', 'error');
    }
  },
  
  registerUser: async (name, phone, avatarUrl, city, club) => {
    try {
      const { currentTournament, division } = get();
      if (!currentTournament) {
        get().addToast('Belum ada turnamen aktif', 'error');
        return;
      }

      const userRes = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, phone, gender: division, club, avatar: avatarUrl, city }),
      });
      const userData = await userRes.json();

      if (!userData.success) {
        get().addToast(userData.error || 'Gagal mendaftar', 'error');
        return;
      }

      if (userData.isExisting) {
        get().addToast(`Nama "${name}" sudah terdaftar, mendaftarkan ke turnamen...`, 'info');
      }

      const regRes = await fetch('/api/tournaments/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: userData.user.id,
          tournamentId: currentTournament.id,
        }),
      });
      const regData = await regRes.json();

      if (regRes.ok && regData.success) {
        get().addToast('Pendaftaran berhasil dikirim!', 'success');
        get().fetchData(false);
      } else if (regData.error === 'Already registered for this tournament') {
        get().addToast('Anda sudah terdaftar di turnamen ini!', 'warning');
      } else {
        get().addToast(regData.error || 'Pendaftaran gagal', 'error');
      }
    } catch (error) {
      console.error('Error registering:', error);
      get().addToast('Pendaftaran gagal', 'error');
    }
  },
  
  approveRegistration: async (registrationId, tier) => {
    try {
      const res = await adminFetch('/api/tournaments/register', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ registrationId, status: 'approved', tierAssigned: tier }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        get().addToast(data.error || 'Gagal menyetujui', 'error');
        return;
      }
      
      if (res.ok) {
        get().addToast('Pendaftaran disetujui!', 'success');
        get().fetchData(false);
      }
    } catch (error) {
      console.error('Error approving:', error);
      get().addToast('Gagal menyetujui pendaftaran', 'error');
    }
  },
  
  updateRegistrationTier: async (registrationId, tier) => {
    try {
      const res = await adminFetch('/api/tournaments/register', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ registrationId, tierAssigned: tier }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        get().addToast(data.error || 'Gagal mengubah tier', 'error');
        return;
      }
      
      if (res.ok) {
        get().addToast(`Tier diubah ke ${tier}!`, 'success');
        get().fetchData(false);
      }
    } catch (error) {
      console.error('Error updating tier:', error);
      get().addToast('Gagal mengubah tier', 'error');
    }
  },
  
  rejectRegistration: async (registrationId) => {
    try {
      const res = await adminFetch('/api/tournaments/register', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ registrationId, status: 'rejected' }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        get().addToast(data.error || 'Gagal menolak', 'error');
        return;
      }
      
      if (res.ok) {
        get().addToast('Pendaftaran ditolak', 'info');
        get().fetchData(false);
      }
    } catch (error) {
      console.error('Error rejecting:', error);
      get().addToast('Gagal menolak pendaftaran', 'error');
    }
  },
  
  deleteRegistration: async (registrationId) => {
    try {
      const res = await adminFetch(`/api/tournaments/register?id=${registrationId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      
      if (!res.ok) {
        get().addToast(data.error || 'Gagal menghapus', 'error');
        return;
      }
      
      get().addToast(data.message || 'Pendaftaran dihapus', 'success');
      get().fetchData(false);
    } catch (error) {
      console.error('Error deleting:', error);
      get().addToast('Gagal menghapus pendaftaran', 'error');
    }
  },
  
  deleteAllRejected: async () => {
    try {
      const { currentTournament } = get();
      if (!currentTournament) return;
      
      const res = await adminFetch(`/api/tournaments/register?deleteAllRejected=true&tournamentId=${currentTournament.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      
      if (!res.ok) {
        get().addToast(data.error || 'Gagal menghapus', 'error');
        return;
      }
      
      get().addToast(data.message || 'Semua pendaftaran ditolak telah dihapus', 'success');
      get().fetchData(false);
    } catch (error) {
      console.error('Error deleting all rejected:', error);
      get().addToast('Gagal menghapus pendaftaran', 'error');
    }
  },
  
  updateTournamentStatus: async (status) => {
    try {
      const { currentTournament } = get();
      if (!currentTournament) return;
      
      const res = await adminFetch('/api/tournaments', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tournamentId: currentTournament.id, status }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        get().addToast(data.error || 'Akses ditolak', 'error');
        return;
      }
      
      if (res.ok) {
        set({ currentTournament: { ...currentTournament, status } });
        get().addToast(`Status diubah ke ${status}`, 'success');
        get().fetchData(false);
      }
    } catch (error) {
      console.error('Error updating status:', error);
      get().addToast('Gagal mengubah status', 'error');
    }
  },

  updatePrizePool: async (prizes) => {
    try {
      const { currentTournament } = get();
      if (!currentTournament) return;

      const { champion, runnerUp, third, mvp } = prizes;
      const total = champion + runnerUp + third + mvp;

      const res = await adminFetch('/api/tournaments', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          tournamentId: currentTournament.id, 
          prizePool: total,
          prizeChampion: champion,
          prizeRunnerUp: runnerUp,
          prizeThird: third,
          prizeMvp: mvp,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        get().addToast(data.error || 'Akses ditolak', 'error');
        return;
      }

      if (res.ok) {
        get().addToast(`Hadiah diatur! Total: Rp ${total.toLocaleString('id-ID')}`, 'success');
        get().fetchData(false);
      }
    } catch (error) {
      console.error('Error updating prize pool:', error);
      get().addToast('Gagal mengatur hadiah', 'error');
    }
  },

  generateTeams: async () => {
    try {
      const { currentTournament } = get();
      if (!currentTournament) return;
      
      const res = await adminFetch('/api/teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tournamentId: currentTournament.id }),
      });
      const data = await res.json();
      
      if (data.success) {
        get().addToast(`${data.teams.length} tim berhasil dibuat!`, 'success');
        get().fetchData(false);
      } else {
        get().addToast(data.error || 'Gagal membuat tim', 'error');
      }
    } catch (error) {
      console.error('Error generating teams:', error);
      get().addToast('Gagal membuat tim', 'error');
    }
  },

  resetTeams: async () => {
    try {
      const { currentTournament } = get();
      if (!currentTournament) return;

      const res = await adminFetch(`/api/teams?tournamentId=${currentTournament.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();

      if (data.success) {
        get().addToast('Tim berhasil direset! Silakan buat ulang.', 'success');
        get().fetchData(false);
      } else {
        get().addToast(data.error || 'Gagal reset tim', 'error');
      }
    } catch (error) {
      console.error('Error resetting teams:', error);
      get().addToast('Gagal reset tim', 'error');
    }
  },

  generateBracket: async (type, strategy) => {
    try {
      const { currentTournament } = get();
      if (!currentTournament) return;
      
      const res = await adminFetch('/api/tournaments/bracket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tournamentId: currentTournament.id, bracketType: type, strategy: strategy || undefined }),
      });
      const data = await res.json();
      
      if (data.success) {
        get().addToast('Bracket berhasil dibuat!', 'success');
        get().fetchData(false);
      } else {
        get().addToast(data.error || 'Gagal membuat bracket', 'error');
      }
    } catch (error) {
      console.error('Error generating bracket:', error);
      get().addToast('Gagal membuat bracket', 'error');
    }
  },
  
  updateMatchScore: async (matchId, scoreA, scoreB, mvpId) => {
    try {
      const res = await adminFetch('/api/matches', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matchId, scoreA, scoreB, mvpId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        get().addToast(data.error || 'Akses ditolak', 'error');
        return;
      }
      
      if (res.ok) {
        const data = await res.json();
        if (data.match?.status === 'completed' && data.match?.winnerId) {
          const winnerName = data.match.winnerId === data.match.teamA?.id
            ? data.match.teamA?.name
            : data.match.teamB?.name;
          const mvpText = mvpId ? ' dengan MVP' : '';
          get().addToast(`${winnerName} menang! +100 pts${mvpText}.`, 'success');
        } else {
          get().addToast('Skor berhasil diperbarui!', 'success');
        }
        get().fetchData(false);
      }
    } catch (error) {
      console.error('Error updating score:', error);
      get().addToast('Gagal memperbarui skor', 'error');
    }
  },

  setMVP: async (userId, mvpScore) => {
    try {
      const { currentTournament } = get();
      if (!currentTournament) return;

      const res = await adminFetch('/api/users/mvp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, mvpScore, tournamentId: currentTournament.id }),
      });

      if (res.ok) {
        const data = await res.json();
        get().addToast(data.message || 'MVP ditetapkan!', 'success');
        get().fetchData(false);
      } else {
        const data = await res.json();
        get().addToast(data.error || 'Gagal menetapkan MVP', 'error');
      }
    } catch (error) {
      console.error('Error setting MVP:', error);
      get().addToast('Gagal menetapkan MVP', 'error');
    }
  },

  removeMVP: async (userId) => {
    try {
      const res = await adminFetch(`/api/users/mvp?userId=${userId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        const data = await res.json();
        get().addToast(data.message || 'MVP dicabut', 'info');
        get().fetchData(false);
      }
    } catch (error) {
      console.error('Error removing MVP:', error);
      get().addToast('Gagal mencabut MVP', 'error');
    }
  },

  finalizeTournament: async () => {
    try {
      const { currentTournament } = get();
      if (!currentTournament) return;
      
      const res = await adminFetch('/api/tournaments/finalize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tournamentId: currentTournament.id }),
      });
      const data = await res.json();
      
      if (data.success) {
        get().addToast('Turnamen selesai!', 'success');
        get().fetchData(false);
      } else {
        get().addToast(data.error || 'Gagal menyelesaikan turnamen', 'error');
      }
    } catch (error) {
      console.error('Error finalizing:', error);
      get().addToast('Gagal menyelesaikan turnamen', 'error');
    }
  },
  
  donate: async (amount, message, anonymous, paymentMethod, proofUrl, donorName) => {
    try {
      const { currentUser } = get();

      const res = await fetch('/api/donations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser?.id,
          donorName: donorName || null,
          amount,
          message,
          anonymous,
          paymentMethod,
          proofImageUrl: proofUrl || null,
        }),
      });

      if (res.ok) {
        get().addToast('Donasi tercatat! Menunggu konfirmasi pembayaran.', 'info');
        get().fetchData(false);
      }
    } catch (error) {
      console.error('Error donating:', error);
      get().addToast('Donasi gagal', 'error');
    }
  },
  
  resetSeason: async () => {
    try {
      const { currentTournament } = get();
      if (!currentTournament) return;

      const res = await adminFetch('/api/tournaments/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tournamentId: currentTournament.id }),
      });
      const data = await res.json();

      if (data.success) {
        if (data.isGrandFinal) {
          get().addToast('Musim baru dimulai dari Minggu 1!', 'success');
        } else {
          get().addToast(`Data direset! Memulai Minggu ${data.nextWeek}.`, 'success');
        }
        get().fetchData(false);
      } else {
        get().addToast(data.error || 'Gagal mereset data', 'error');
      }
    } catch (error) {
      console.error('Error resetting season:', error);
      get().addToast('Gagal mereset data', 'error');
    }
  },

  createTournament: async (opts) => {
    try {
      const res = await adminFetch('/api/tournaments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(opts),
      });
      const data = await res.json();

      if (data.success) {
        get().addToast(`Turnamen "${opts.name}" berhasil dibuat!`, 'success');
        get().fetchData(false);
      } else {
        get().addToast(data.error || 'Gagal membuat turnamen', 'error');
      }
    } catch (error) {
      console.error('Error creating tournament:', error);
      get().addToast('Gagal membuat turnamen', 'error');
    }
  },

  seedDatabase: async () => {
    try {
      const res = await fetch('/api/seed', { method: 'POST' });
      const data = await res.json();

      if (data.success) {
        get().addToast('Database berhasil diisi!', 'success');
        get().fetchData(false);
      }
    } catch (error) {
      console.error('Error seeding:', error);
      get().addToast('Gagal mengisi database', 'error');
    }
  },

  // AI Actions
  aiChat: async (sessionId, message) => {
    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, message }),
      });
      const data = await res.json();

      if (data.success) {
        return data.response;
      }
      return 'Maaf, terjadi kesalahan. Silakan coba lagi.';
    } catch (error) {
      console.error('AI Chat Error:', error);
      return 'Maaf, terjadi kesalahan jaringan.';
    }
  },

  generateImage: async (prompt, size = '1024x1024') => {
    try {
      const res = await fetch('/api/ai/image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, size }),
      });
      const data = await res.json();

      if (data.success) {
        return { success: true, imageUrl: data.imageUrl };
      }
      return { success: false, error: data.error };
    } catch (error) {
      console.error('Image Generation Error:', error);
      return { success: false, error: 'Network error' };
    }
  },
}));

// Listen for admin auth changes from other parts of the app
if (typeof window !== 'undefined') {
  window.addEventListener('admin-auth-changed', ((event: CustomEvent) => {
    if (!event.detail?.authenticated) {
      useAppStore.getState().logoutAdmin();
    }
  }) as EventListener);
}
