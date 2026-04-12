'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState, useMemo, useCallback, useEffect } from 'react';
import {
  Search,
  X,
  Users,
  Edit3,
  Trash2,
  Save,
  UserRound,
  ChevronDown,
  Image as ImageIcon,
  CheckCircle,
  AlertTriangle,
  Crown,
  Plus,
  Trophy,
} from 'lucide-react';
import { ImageUploader } from '@/components/esports/ImageUploader';
import { adminFetch } from '@/lib/admin-fetch';

interface User {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  gender: string;
  tier: string;
  avatar: string | null;
  points: number;
  city?: string | null;
  isMVP?: boolean;
  mvpScore?: number;
  clubId?: string | null;
  club?: {
    id: string;
    name: string;
    slug: string;
    logoUrl: string | null;
  } | null;
  rankings?: {
    wins: number;
    losses: number;
  } | null;
}

interface PesertaManagementTabProps {
  division: 'male' | 'female';
  accentClass: string;
  accentBgSubtle: string;
  addToast: (message: string, type: 'success' | 'error' | 'warning' | 'info') => void;
  onRefresh: () => void;
  refreshTrigger?: number; // External trigger to refresh data
  tournamentId?: string | null; // For MVP assignment
}

export function PesertaManagementTab({
  division,
  accentClass,
  accentBgSubtle,
  addToast,
  onRefresh,
  refreshTrigger = 0,
  tournamentId = null,
}: PesertaManagementTabProps) {
  const [search, setSearch] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editForm, setEditForm] = useState({
    name: '',
    tier: 'B' as 'S' | 'A' | 'B',
    avatar: '',
    city: '',
    club: '',
    points: 0,
  });
  const [saving, setSaving] = useState(false);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [avatarChanged, setAvatarChanged] = useState(false);
  const [mvpDialogUserId, setMvpDialogUserId] = useState<string | null>(null);
  const [mvpScoreInput, setMvpScoreInput] = useState('0');
  const [mvpSaving, setMvpSaving] = useState(false);
  const [nameWarning, setNameWarning] = useState<string | null>(null);

  // Season points state
  const [seasonPoints, setSeasonPoints] = useState<Array<{ id: string; season: number; points: number }>>([]);
  const [seasonPointsLoading, setSeasonPointsLoading] = useState(false);
  const [newSeason, setNewSeason] = useState('');
  const [newSeasonPoints, setNewSeasonPoints] = useState('');
  const [seasonSaving, setSeasonSaving] = useState(false);
  const [showSeasonPanel, setShowSeasonPanel] = useState(false);

  const isMale = division === 'male';

  // Fetch users
  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/users?gender=${division}`);
      const data = await res.json();
      if (data.success) {
        setUsers(data.users || []);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  }, [division]);

  // Load users on mount and when refreshTrigger changes
  useEffect(() => {
    fetchUsers();
  }, [fetchUsers, refreshTrigger]);

  // Filter users by search
  const filteredUsers = useMemo(() => {
    if (!search.trim()) return users;
    const q = search.toLowerCase();
    return users.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        (u.club?.name && u.club.name.toLowerCase().includes(q)) ||
        (u.city && u.city.toLowerCase().includes(q))
    );
  }, [users, search]);

  // Fetch season points for a user
  const fetchSeasonPoints = useCallback(async (userId: string) => {
    setSeasonPointsLoading(true);
    try {
      const res = await adminFetch(`/api/admin/player-seasons?userId=${userId}`);
      const data = await res.json();
      if (data?.success && Array.isArray(data.data)) {
        setSeasonPoints(data.data);
      } else {
        setSeasonPoints([]);
      }
    } catch {
      setSeasonPoints([]);
    } finally {
      setSeasonPointsLoading(false);
    }
  }, []);

  // Start editing a user
  const startEdit = (user: User) => {
    console.log('[PesertaManagement] startEdit called for user:', user.name, 'avatar size:', user.avatar?.length || 0);
    setEditingUser(user);
    setEditForm({
      name: user.name,
      tier: user.tier as 'S' | 'A' | 'B',
      avatar: user.avatar || '',
      city: user.city || '',
      club: user.club?.name || '',
      points: user.points,
    });
    setAvatarChanged(false);
    setNameWarning(null);
    setShowSeasonPanel(false);
    setNewSeason('');
    setNewSeasonPoints('');
    fetchSeasonPoints(user.id);
  };

  // Cancel editing
  const cancelEdit = () => {
    setEditingUser(null);
    setEditForm({ name: '', tier: 'B', avatar: '', city: '', club: '', points: 0 });
    setAvatarChanged(false);
  };

  // Save user changes
  const saveUser = async () => {
    if (!editingUser) return;
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        userId: editingUser.id,
        name: editForm.name,
        tier: editForm.tier,
        city: editForm.city || null,
        club: editForm.club || null,
        points: editForm.points,
      };
      
      // Only include avatar if it was actually changed
      if (avatarChanged) {
        payload.avatar = editForm.avatar || null;
      }
      
      const bodyStr = JSON.stringify(payload);
      console.log('[PesertaManagement] PUT payload size:', bodyStr.length, 'bytes, avatarChanged:', avatarChanged);
      
      const res = await adminFetch('/api/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: bodyStr,
      });
      
      let data;
      try {
        data = await res.json();
      } catch (parseErr) {
        // Vercel sometimes returns HTML error pages for oversized bodies
        console.error('[PesertaManagement] Failed to parse response, status:', res.status);
        if (res.status === 500) {
          addToast('Server error (500). Payload mungkin terlalu besar. Coba tanpa ubah avatar.', 'error');
        } else if (res.status === 413) {
          addToast('Data terlalu besar untuk server. Kompres gambar atau kurangi data.', 'error');
        } else {
          addToast(`Server error (${res.status}). Coba lagi.`, 'error');
        }
        return;
      }
      
      console.log('[PesertaManagement] PUT response:', data);
      if (data.success) {
        addToast(`Data ${editForm.name} berhasil diperbarui!`, 'success');
        setEditingUser(null);
        // Optimistic update: directly update the user in the local list
        setUsers(prev => prev.map(u => 
          u.id === editingUser.id 
            ? { ...u, name: editForm.name, tier: editForm.tier, city: editForm.city, points: editForm.points, avatar: avatarChanged ? editForm.avatar : u.avatar }
            : u
        ));
        // Notify parent to sync data with other components
        onRefresh();
      } else {
        addToast(data.error || 'Gagal menyimpan perubahan', 'error');
      }
    } catch (error) {
      console.error('[PesertaManagement] saveUser error:', error);
      addToast('Gagal menyimpan perubahan', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Delete user
  const deleteUser = async (userId: string) => {
    setDeletingUserId(userId);
    try {
      const res = await adminFetch(`/api/users?id=${userId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        addToast(data.message || 'User berhasil dihapus', 'success');
        setShowDeleteConfirm(null);
        // Optimistic update: remove user from local list
        setUsers(prev => prev.filter(u => u.id !== userId));
        // Notify parent to sync data with other components
        onRefresh();
      } else {
        addToast(data.error || 'Gagal menghapus user', 'error');
      }
    } catch (error) {
      addToast('Gagal menghapus user', 'error');
    } finally {
      setDeletingUserId(null);
    }
  };

  // Set MVP for a user
  const setMVP = async (userId: string, score: number) => {
    if (!tournamentId) {
      addToast('Tidak ada tournament aktif. Buat tournament dulu.', 'warning');
      return;
    }
    setMvpSaving(true);
    try {
      const res = await adminFetch('/api/users/mvp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, mvpScore: score, tournamentId }),
      });
      const data = await res.json();
      if (data.success) {
        addToast(data.message, 'success');
        setMvpDialogUserId(null);
        setMvpScoreInput('0');
        // Refresh data
        fetchUsers();
        onRefresh();
      } else {
        addToast(data.error || 'Gagal menetapkan MVP', 'error');
      }
    } catch (error) {
      addToast('Gagal menetapkan MVP', 'error');
    } finally {
      setMvpSaving(false);
    }
  };

  // Remove MVP from a user
  const removeMVP = async (userId: string) => {
    setMvpSaving(true);
    try {
      const res = await adminFetch(`/api/users/mvp?userId=${userId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        addToast(data.message, 'success');
        fetchUsers();
        onRefresh();
      } else {
        addToast(data.error || 'Gagal menghapus MVP', 'error');
      }
    } catch (error) {
      addToast('Gagal menghapus MVP', 'error');
    } finally {
      setMvpSaving(false);
    }
  };

  // Clear avatar
  const clearAvatar = async () => {
    if (!editingUser) return;
    setSaving(true);
    try {
      const res = await adminFetch('/api/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: editingUser.id,
          clearAvatar: true,
        }),
      });
      const data = await res.json();
      if (data.success) {
        addToast('Avatar berhasil dihapus', 'success');
        setEditForm((prev) => ({ ...prev, avatar: '' }));
        // Optimistic update
        setUsers(prev => prev.map(u => 
          u.id === editingUser.id 
            ? { ...u, avatar: null }
            : u
        ));
        // Notify parent to sync data
        onRefresh();
      }
    } catch (error) {
      addToast('Gagal menghapus avatar', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Stats
  const stats = useMemo(() => {
    return {
      total: users.length,
      tierS: users.filter((u) => u.tier === 'S').length,
      tierA: users.filter((u) => u.tier === 'A').length,
      tierB: users.filter((u) => u.tier === 'B').length,
      withAvatar: users.filter((u) => u.avatar).length,
    };
  }, [users]);

  const getTierStyle = (tier: string) => {
    switch (tier) {
      case 'S':
        return 'bg-gradient-to-br from-amber-400 to-yellow-600 text-black font-black';
      case 'A':
        return 'bg-gradient-to-br from-gray-200 to-gray-400 text-gray-800 font-black';
      case 'B':
        return 'bg-gradient-to-br from-orange-400 to-orange-600 text-white font-black';
      default:
        return 'bg-white/10 text-white/50';
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        <div className={`w-8 h-8 rounded-xl ${accentBgSubtle} flex items-center justify-center`}>
          <Users className={`w-4 h-4 ${accentClass}`} />
        </div>
        <div>
          <p className="text-[13px] font-bold text-white/90">Kelola Peserta</p>
          <p className="text-[10px] text-white/30">Edit data & hapus peserta</p>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-5 gap-2">
        <div className="glass-subtle rounded-xl p-2.5 text-center">
          <p className="text-lg font-black text-white/90">{stats.total}</p>
          <p className="text-[9px] text-white/30 uppercase">Total</p>
        </div>
        <div className="glass-subtle rounded-xl p-2.5 text-center">
          <p className="text-lg font-black text-amber-400">{stats.tierS}</p>
          <p className="text-[9px] text-white/30 uppercase">Tier S</p>
        </div>
        <div className="glass-subtle rounded-xl p-2.5 text-center">
          <p className="text-lg font-black text-gray-300">{stats.tierA}</p>
          <p className="text-[9px] text-white/30 uppercase">Tier A</p>
        </div>
        <div className="glass-subtle rounded-xl p-2.5 text-center">
          <p className="text-lg font-black text-orange-400">{stats.tierB}</p>
          <p className="text-[9px] text-white/30 uppercase">Tier B</p>
        </div>
        <div className="glass-subtle rounded-xl p-2.5 text-center">
          <p className="text-lg font-black text-blue-400">{stats.withAvatar}</p>
          <p className="text-[9px] text-white/30 uppercase">Avatar</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari nama, club, atau kota..."
          className="w-full bg-white/5 border border-white/8 rounded-xl pl-10 pr-4 py-2.5 text-white/90 text-[13px] placeholder-white/20 focus:outline-none focus:border-white/20 transition-colors"
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-white/40 hover:text-white/70"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* User List */}
      <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-6 h-6 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="text-center py-12">
            <UserRound className="w-10 h-10 text-white/15 mx-auto mb-3" />
            <p className="text-[13px] text-white/35">
              {search ? 'Tidak ditemukan' : 'Belum ada peserta'}
            </p>
          </div>
        ) : (
          filteredUsers.map((user, index) => (
            <motion.div
              key={user.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.02 }}
              className={`glass-subtle rounded-xl p-3 ${
                editingUser?.id === user.id ? 'ring-1 ring-purple-500/30' : ''
              }`}
            >
              {editingUser?.id === user.id ? (
                /* Edit Mode */
                <div className="space-y-3">
                  {/* Avatar Editor */}
                  <div className="flex items-start gap-3">
                    <div className="relative flex-shrink-0">
                      <div className="w-14 h-14 rounded-full bg-gradient-to-br from-gray-600 to-gray-800 flex items-center justify-center overflow-hidden">
                        {editForm.avatar ? (
                          <img src={editForm.avatar} alt="" loading="lazy" className="w-full h-full object-cover object-top" />
                        ) : (
                          <span className="text-lg font-bold text-white/70">{editForm.name[0]}</span>
                        )}
                      </div>
                      {editForm.avatar && (
                        <button
                          onClick={clearAvatar}
                          className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 flex items-center justify-center"
                        >
                          <X className="w-3 h-3 text-white" />
                        </button>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <ImageUploader
                        division={editForm.gender === 'female' ? 'female' : 'male'}
                        onUpload={(url) => {
                          console.log('[PesertaManagement] ImageUploader onUpload, avatarChanged -> true, url:', url);
                          setEditForm((prev) => ({ ...prev, avatar: url || '' }));
                          setAvatarChanged(true);
                        }}
                        currentImage={editForm.avatar}
                        className="w-full"
                      />
                    </div>
                  </div>

                  {/* Name */}
                  <div>
                    <label className="text-[10px] text-white/40 uppercase tracking-wider font-semibold mb-1 block">
                      Nama
                    </label>
                    <input
                      type="text"
                      value={editForm.name}
                      onChange={(e) => {
                        const newName = e.target.value;
                        setEditForm((prev) => ({ ...prev, name: newName }));
                        // Real-time duplicate name check (case-insensitive, same division)
                        if (editingUser && newName.trim()) {
                          const normalized = newName.trim().toLowerCase();
                          const currentName = editingUser.name.trim().toLowerCase();
                          if (normalized !== currentName) {
                            const dup = users.find(
                              (u) => u.id !== editingUser.id && u.name.trim().toLowerCase() === normalized
                            );
                            if (dup) {
                              setNameWarning(`Nama "${newName}" sudah digunakan oleh pemain lain!`);
                            } else {
                              setNameWarning(null);
                            }
                          } else {
                            setNameWarning(null);
                          }
                        } else {
                          setNameWarning(null);
                        }
                      }}
                      className={`w-full bg-white/5 border rounded-lg px-3 py-2 text-white/90 text-[13px] focus:outline-none transition-colors ${
                        nameWarning
                          ? 'border-red-500/40 focus:border-red-500/60'
                          : 'border-white/10 focus:border-white/25'
                      }`}
                    />
                    {nameWarning && (
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <AlertTriangle className="w-3 h-3 text-red-400 flex-shrink-0" />
                        <p className="text-[10px] text-red-400 font-medium">{nameWarning}</p>
                      </div>
                    )}
                  </div>

                  {/* Tier & Points */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-white/40 uppercase tracking-wider font-semibold mb-1 block">
                        Tier
                      </label>
                      <div className="flex gap-1">
                        {(['S', 'A', 'B'] as const).map((t) => (
                          <button
                            key={t}
                            onClick={() => setEditForm((prev) => ({ ...prev, tier: t }))}
                            className={`flex-1 py-2 rounded-lg text-[12px] font-bold transition-all ${
                              editForm.tier === t ? getTierStyle(t) : 'bg-white/5 text-white/30'
                            }`}
                          >
                            {t}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] text-white/40 uppercase tracking-wider font-semibold mb-1 block">
                        Points
                      </label>
                      <input
                        type="number"
                        value={editForm.points}
                        onChange={(e) =>
                          setEditForm((prev) => ({ ...prev, points: parseInt(e.target.value) || 0 }))
                        }
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white/90 text-[13px] focus:outline-none focus:border-white/25"
                      />
                    </div>
                  </div>

                  {/* City & Club */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-white/40 uppercase tracking-wider font-semibold mb-1 block">
                        Kota
                      </label>
                      <input
                        type="text"
                        value={editForm.city}
                        onChange={(e) => setEditForm((prev) => ({ ...prev, city: e.target.value }))}
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white/90 text-[13px] focus:outline-none focus:border-white/25"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-white/40 uppercase tracking-wider font-semibold mb-1 block">
                        Club
                      </label>
                      <input
                        type="text"
                        value={editForm.club}
                        onChange={(e) => setEditForm((prev) => ({ ...prev, club: e.target.value }))}
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white/90 text-[13px] focus:outline-none focus:border-white/25"
                      />
                    </div>
                  </div>

                  {/* Season Points Section */}
                  <div className="border border-white/[0.06] rounded-xl overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setShowSeasonPanel(!showSeasonPanel)}
                      className="w-full flex items-center gap-2 px-3 py-2.5 bg-white/[0.03] hover:bg-white/[0.05] transition-colors"
                    >
                      <Trophy className="w-3.5 h-3.5" style={{ color: '#FFD700' }} />
                      <span className="text-[11px] font-semibold text-white/60 uppercase tracking-wider flex-1 text-left">Points Per Season</span>
                      {seasonPoints.length > 0 && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/15">{seasonPoints.length} season</span>
                      )}
                      <motion.div animate={{ rotate: showSeasonPanel ? 90 : 0 }} transition={{ duration: 0.2 }}>
                        <ChevronDown className="w-3 h-3 text-white/30" />
                      </motion.div>
                    </button>
                    <AnimatePresence>
                      {showSeasonPanel && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="p-3 space-y-2.5 bg-white/[0.01]">
                            {/* Add new season form */}
                            <div className="flex gap-2">
                              <input
                                type="number"
                                placeholder="Season #"
                                value={newSeason}
                                onChange={(e) => setNewSeason(e.target.value)}
                                className="w-20 bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-white/90 text-[12px] focus:outline-none focus:border-amber-500/30"
                                min={1}
                              />
                              <input
                                type="number"
                                placeholder="Points"
                                value={newSeasonPoints}
                                onChange={(e) => setNewSeasonPoints(e.target.value)}
                                className="flex-1 bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-white/90 text-[12px] focus:outline-none focus:border-amber-500/30"
                                min={0}
                              />
                              <button
                                onClick={async () => {
                                  if (!editingUser || !newSeason || !newSeasonPoints) return;
                                  setSeasonSaving(true);
                                  try {
                                    const res = await adminFetch('/api/admin/player-seasons', {
                                      method: 'POST',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({
                                        userId: editingUser.id,
                                        season: parseInt(newSeason),
                                        points: parseInt(newSeasonPoints) || 0,
                                      }),
                                    });
                                    const data = await res.json();
                                    if (data.success) {
                                      addToast(`Season ${newSeason} berhasil disimpan!`, 'success');
                                      setNewSeason('');
                                      setNewSeasonPoints('');
                                      fetchSeasonPoints(editingUser.id);
                                      try { new BroadcastChannel('idm-player-seasons').postMessage('updated'); } catch {}
                                    } else {
                                      addToast(data.error || 'Gagal menyimpan season', 'error');
                                    }
                                  } catch {
                                    addToast('Gagal menyimpan season', 'error');
                                  } finally {
                                    setSeasonSaving(false);
                                  }
                                }}
                                disabled={seasonSaving || !newSeason || !newSeasonPoints}
                                className="px-3 py-1.5 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-all disabled:opacity-30"
                                style={{ background: 'rgba(255,215,0,0.12)', border: '1px solid rgba(255,215,0,0.18)', color: '#FFD700' }}
                              >
                                <Plus className="w-3 h-3" />
                                Add
                              </button>
                            </div>

                            {/* Existing season points list */}
                            {seasonPointsLoading ? (
                              <div className="flex justify-center py-3">
                                <div className="w-4 h-4 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
                              </div>
                            ) : seasonPoints.length === 0 ? (
                              <p className="text-[11px] text-white/20 text-center py-2">Belum ada data season</p>
                            ) : (
                              <div className="space-y-1">
                                {seasonPoints.map((sp) => (
                                  <div key={sp.id} className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.04]">
                                    <div className="w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-black shrink-0" style={{ background: 'rgba(255,215,0,0.10)', color: '#FFD700' }}>
                                      S{sp.season}
                                    </div>
                                    <span className="text-[12px] font-semibold text-white/80 flex-1">{sp.points.toLocaleString()} pts</span>
                                    <button
                                      onClick={async () => {
                                        if (!editingUser) return;
                                        try {
                                          const res = await adminFetch(`/api/admin/player-seasons?id=${sp.id}`, { method: 'DELETE' });
                                          const data = await res.json();
                                          if (data.success) {
                                            addToast('Season berhasil dihapus', 'success');
                                            fetchSeasonPoints(editingUser.id);
                                            try { new BroadcastChannel('idm-player-seasons').postMessage('updated'); } catch {}
                                          }
                                        } catch {
                                          addToast('Gagal menghapus season', 'error');
                                        }
                                      }}
                                      className="w-6 h-6 rounded-md flex items-center justify-center text-white/25 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                                    >
                                      <X className="w-3 h-3" />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={saveUser}
                      disabled={saving || !editForm.name.trim() || !!nameWarning}
                      className={`flex-1 py-2.5 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all ${
                        saving || !editForm.name.trim() || !!nameWarning
                          ? 'bg-white/5 text-white/30'
                          : 'bg-purple-500/15 text-purple-400 border border-purple-500/20 hover:bg-purple-500/25'
                      }`}
                    >
                      {saving ? (
                        <div className="w-4 h-4 border-2 border-purple-400/30 border-t-purple-400 rounded-full animate-spin" />
                      ) : (
                        <>
                          <Save className="w-3.5 h-3.5" />
                          Simpan
                        </>
                      )}
                    </button>
                    <button
                      onClick={cancelEdit}
                      className="px-4 py-2.5 rounded-xl text-[11px] font-semibold bg-white/5 text-white/40 hover:bg-white/10"
                    >
                      Batal
                    </button>
                  </div>
                </div>
              ) : (
                /* View Mode */
                <div className="flex items-center gap-3">
                  {/* Avatar */}
                  <div className="relative flex-shrink-0">
                    <div className="w-11 h-11 rounded-full bg-gradient-to-br from-gray-600 to-gray-800 flex items-center justify-center overflow-hidden">
                      {user.avatar ? (
                        <img src={user.avatar} alt={user.name} loading="lazy" className="w-full h-full object-cover object-top" />
                      ) : (
                        <span className="text-sm font-bold text-white/70">{user.name[0]}</span>
                      )}
                    </div>
                    {user.isMVP && (
                      <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-500 flex items-center justify-center">
                        <Crown className="w-2.5 h-2.5 text-black" />
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-[13px] font-bold text-white/90 truncate">{user.name}</p>
                      <span
                        className={`px-2 py-0.5 rounded-md text-[9px] font-black ${getTierStyle(user.tier)}`}
                      >
                        {user.tier}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] text-white/30">
                        {user.points.toLocaleString()} pts
                      </span>
                      {user.club && (
                        <span className="text-[10px] text-white/25 bg-white/5 px-1.5 py-0.5 rounded">
                          {user.club.name}
                        </span>
                      )}
                      {user.city && <span className="text-[10px] text-white/20">{user.city}</span>}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5">
                    {/* MVP Button */}
                    {tournamentId && (
                      <button
                        onClick={() => {
                          if (user.isMVP) {
                            removeMVP(user.id);
                          } else {
                            setMvpDialogUserId(user.id);
                            setMvpScoreInput(String(user.mvpScore || 0));
                          }
                        }}
                        disabled={mvpSaving}
                        className={`h-8 px-2.5 rounded-lg flex items-center gap-1 text-[11px] font-bold transition-all ${
                          user.isMVP
                            ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30 hover:bg-amber-500/30'
                            : 'bg-amber-500/10 text-amber-400/70 border border-amber-500/15 hover:bg-amber-500/20 hover:text-amber-400'
                        }`}
                      >
                        <Crown className="w-3.5 h-3.5" />
                        {user.isMVP ? 'MVP' : 'Set MVP'}
                      </button>
                    )}
                    <button
                      onClick={() => startEdit(user)}
                      className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-white/40 hover:text-white/70 hover:bg-white/10 transition-colors"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setShowDeleteConfirm(user.id)}
                      className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-white/40 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          ))
        )}
      </div>

      {/* MVP Score Input Dialog */}
      <AnimatePresence>
        {mvpDialogUserId && (() => {
          const mvpUser = users.find(u => u.id === mvpDialogUserId);
          if (!mvpUser) return null;
          return (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[70] flex items-center justify-center p-4"
            >
              <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => { setMvpDialogUserId(null); setMvpScoreInput('0'); }} />
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="relative glass-subtle rounded-2xl p-5 max-w-sm w-full border border-amber-500/20"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/15 flex items-center justify-center">
                    <Crown className="w-5 h-5 text-amber-400" />
                  </div>
                  <div>
                    <p className="text-[14px] font-bold text-white/90">Tetapkan MVP</p>
                    <p className="text-[11px] text-white/40">Pilih peserta dan input skor MVP</p>
                  </div>
                </div>

                {/* Selected player info */}
                <div className="flex items-center gap-2 mb-4 p-2.5 rounded-xl bg-white/5">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-gray-600 to-gray-800 flex items-center justify-center overflow-hidden">
                    {mvpUser.avatar ? (
                      <img src={mvpUser.avatar} alt={mvpUser.name} loading="lazy" className="w-full h-full object-cover object-top" />
                    ) : (
                      <span className="text-sm font-bold text-white/70">{mvpUser.name[0]}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-bold text-white/90 truncate">{mvpUser.name}</p>
                    <p className="text-[10px] text-white/30">{mvpUser.points.toLocaleString()} pts • Tier {mvpUser.tier}</p>
                  </div>
                  <span className={`px-2 py-0.5 rounded-md text-[9px] font-black ${getTierStyle(mvpUser.tier)}`}>
                    {mvpUser.tier}
                  </span>
                </div>

                {/* Score Input */}
                <div className="mb-4">
                  <label className="text-[10px] text-white/40 uppercase tracking-wider font-semibold mb-1.5 block">
                    Skor MVP
                  </label>
                  <input
                    type="number"
                    value={mvpScoreInput}
                    onChange={(e) => setMvpScoreInput(e.target.value)}
                    placeholder="Masukkan skor MVP..."
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white/90 text-[15px] font-bold text-center focus:outline-none focus:border-amber-500/30 transition-colors"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !mvpSaving) {
                        setMVP(mvpDialogUserId, parseInt(mvpScoreInput) || 0);
                      }
                    }}
                  />
                  <p className="text-[9px] text-white/25 mt-1.5 text-center">
                    MVP akan mendapat bonus +25 pts otomatis
                  </p>
                </div>

                {/* Buttons */}
                <div className="flex gap-2">
                  <button
                    onClick={() => { setMvpDialogUserId(null); setMvpScoreInput('0'); }}
                    className="flex-1 py-2.5 rounded-xl text-[12px] font-semibold bg-white/5 text-white/50 hover:bg-white/10 transition-colors"
                  >
                    Batal
                  </button>
                  <button
                    onClick={() => setMVP(mvpDialogUserId, parseInt(mvpScoreInput) || 0)}
                    disabled={mvpSaving}
                    className="flex-1 py-2.5 rounded-xl text-[12px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/20 hover:bg-amber-500/25 flex items-center justify-center gap-2 transition-colors"
                  >
                    {mvpSaving ? (
                      <div className="w-4 h-4 border-2 border-amber-400/30 border-t-amber-400 rounded-full animate-spin" />
                    ) : (
                      <>
                        <Crown className="w-3.5 h-3.5" />
                        Tetapkan MVP
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          );
        })()}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] flex items-center justify-center p-4"
          >
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowDeleteConfirm(null)} />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative glass-subtle rounded-2xl p-5 max-w-sm w-full border border-red-500/20"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-red-500/15 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-red-400" />
                </div>
                <div>
                  <p className="text-[14px] font-bold text-white/90">Hapus Peserta?</p>
                  <p className="text-[11px] text-white/40">Tindakan ini tidak dapat dibatalkan</p>
                </div>
              </div>
              <p className="text-[12px] text-white/50 mb-4">
                Peserta akan dihapus secara permanen beserta data pendaftaran dan statistiknya.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowDeleteConfirm(null)}
                  className="flex-1 py-2.5 rounded-xl text-[12px] font-semibold bg-white/5 text-white/50 hover:bg-white/10"
                >
                  Batal
                </button>
                <button
                  onClick={() => deleteUser(showDeleteConfirm)}
                  disabled={deletingUserId === showDeleteConfirm}
                  className="flex-1 py-2.5 rounded-xl text-[12px] font-bold bg-red-500/15 text-red-400 border border-red-500/20 hover:bg-red-500/25 flex items-center justify-center gap-2"
                >
                  {deletingUserId === showDeleteConfirm ? (
                    <div className="w-4 h-4 border-2 border-red-400/30 border-t-red-400 rounded-full animate-spin" />
                  ) : (
                    <>
                      <Trash2 className="w-3.5 h-3.5" />
                      Hapus
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
