'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Loader2,
  Check,
  Save,
  User,
  Building2,
  ImageIcon,
  RefreshCw,
  ZoomIn,
  X,
  CloudUpload,
  AlertCircle,
} from 'lucide-react';
import { adminFetch } from '@/lib/admin-fetch';

/* ────────────────────────────────────────────────
   Types
   ──────────────────────────────────────────────── */

interface CloudinaryImage {
  public_id: string;
  secure_url: string;
  url: string;
  width: number;
  height: number;
  format: string;
  bytes: number;
  created_at: string;
  folder: string;
  filename: string;
  display_name: string;
}

interface Player {
  id: string;
  name: string;
  email: string;
  avatar: string | null;
  tier: string;
  points: number;
}

interface Club {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
}

interface CloudinaryRestorePanelProps {
  accentClass: string;
  accentBgSubtle: string;
  accentColor: string;
  addToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

/* ────────────────────────────────────────────────
   Helper: format bytes
   ──────────────────────────────────────────────── */

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/* ────────────────────────────────────────────────
   Helper: get Cloudinary thumbnail URL
   ──────────────────────────────────────────────── */

function getThumbnailUrl(url: string, size = 150): string {
  // Insert transformation before /upload/ in Cloudinary URL
  if (url.includes('/upload/')) {
    return url.replace('/upload/', `/upload/c_fill,h_${size},w_${size},q_auto:good/`);
  }
  return url;
}

function getPreviewUrl(url: string, size = 600): string {
  if (url.includes('/upload/')) {
    return url.replace('/upload/', `/upload/c_limit,h_${size},q_auto:good/`);
  }
  return url;
}

/* ────────────────────────────────────────────────
   Image Zoom Modal
   ──────────────────────────────────────────────── */

function ImageZoomModal({
  url,
  onClose,
}: {
  url: string;
  onClose: () => void;
}) {
  return (
    <motion.div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
      <motion.div
        className="relative max-w-lg max-h-[80vh] rounded-2xl overflow-hidden border border-white/10"
        style={{
          boxShadow: '0 25px 60px rgba(0,0,0,0.6)',
        }}
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-black/60 flex items-center justify-center text-white/70 hover:text-white hover:bg-black/80 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
        <img
          src={getPreviewUrl(url, 800)}
          alt="Preview"
          className="w-full h-full object-contain"
        />
      </motion.div>
    </motion.div>
  );
}

/* ────────────────────────────────────────────────
   Avatar Match Card
   ──────────────────────────────────────────────── */

function AvatarMatchCard({
  image,
  players,
  matchedPlayerId,
  onSelectPlayer,
  onSave,
  saving,
  saved,
  accentClass,
  onZoom,
}: {
  image: CloudinaryImage;
  players: Player[];
  matchedPlayerId: string | null;
  onSelectPlayer: (publicId: string, playerId: string) => void;
  onSave: (publicId: string) => void;
  saving: boolean;
  saved: boolean;
  accentClass: string;
  onZoom: (url: string) => void;
}) {
  return (
    <motion.div
      className="rounded-xl p-3 space-y-3"
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: saved ? '1px solid rgba(16,185,129,0.3)' : '1px solid rgba(255,255,255,0.06)',
      }}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      {/* Image */}
      <div className="flex justify-center">
        <div className="relative group cursor-pointer" onClick={() => onZoom(image.secure_url)}>
          <img
            src={getThumbnailUrl(image.secure_url, 120)}
            alt={image.display_name}
            loading="lazy"
            className={`w-[100px] h-[100px] rounded-xl object-cover border transition-all ${
              saved ? 'border-emerald-500/30' : 'border-white/[0.08] group-hover:border-white/20'
            }`}
          />
          <div className="absolute inset-0 rounded-xl bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
            <ZoomIn className="w-5 h-5 text-white opacity-0 group-hover:opacity-80 transition-opacity" />
          </div>
          {saved && (
            <div className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center">
              <Check className="w-3 h-3 text-white" />
            </div>
          )}
        </div>
      </div>

      {/* Filename */}
      <p className="text-[10px] text-white/30 text-center truncate" title={image.display_name}>
        {image.display_name}
      </p>

      {/* Player Select */}
      <div className="space-y-2">
        <select
          value={matchedPlayerId || ''}
          onChange={(e) => onSelectPlayer(image.public_id, e.target.value)}
          className="w-full bg-white/5 border border-white/[0.08] rounded-lg px-2.5 py-1.5 text-[11px] text-white/80 focus:outline-none focus:border-white/20 transition-colors appearance-none cursor-pointer"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='rgba(255,255,255,0.3)' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'right 8px center',
          }}
        >
          <option value="" disabled>
            Pilih pemain...
          </option>
          {players.map((p) => (
            <option key={p.id} value={p.id} style={{ background: '#1a1a1f' }}>
              {p.name} [{p.tier}] — {p.points} pts
            </option>
          ))}
        </select>

        {/* Save Button */}
        <button
          onClick={() => onSave(image.public_id)}
          disabled={!matchedPlayerId || saving}
          className={`w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[10px] font-semibold transition-all ${
            saved
              ? 'bg-emerald-500/15 text-emerald-400'
              : matchedPlayerId
                ? `${accentClass.replace('text-', 'bg-').replace(']', '/15]')} ${accentClass.replace('text-', 'border-').replace(']', '/20]')} border hover:opacity-80`
                : 'bg-white/[0.03] text-white/20 cursor-not-allowed'
          }`}
        >
          {saving ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : saved ? (
            <Check className="w-3 h-3" />
          ) : (
            <Save className="w-3 h-3" />
          )}
          {saved ? 'Tersimpan' : 'Simpan'}
        </button>
      </div>
    </motion.div>
  );
}

/* ────────────────────────────────────────────────
   Logo Match Card
   ──────────────────────────────────────────────── */

function LogoMatchCard({
  image,
  clubs,
  matchedClubId,
  onSelectClub,
  onSave,
  saving,
  saved,
  accentClass,
  onZoom,
}: {
  image: CloudinaryImage;
  clubs: Club[];
  matchedClubId: string | null;
  onSelectClub: (publicId: string, clubId: string) => void;
  onSave: (publicId: string) => void;
  saving: boolean;
  saved: boolean;
  accentClass: string;
  onZoom: (url: string) => void;
}) {
  return (
    <motion.div
      className="rounded-xl p-3 space-y-3"
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: saved ? '1px solid rgba(16,185,129,0.3)' : '1px solid rgba(255,255,255,0.06)',
      }}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      {/* Logo Image */}
      <div className="flex justify-center">
        <div className="relative group cursor-pointer" onClick={() => onZoom(image.secure_url)}>
          <img
            src={getThumbnailUrl(image.secure_url, 120)}
            alt={image.display_name}
            loading="lazy"
            className={`w-[100px] h-[100px] rounded-xl object-contain border bg-white/[0.02] p-2 transition-all ${
              saved ? 'border-emerald-500/30' : 'border-white/[0.08] group-hover:border-white/20'
            }`}
          />
          <div className="absolute inset-0 rounded-xl bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
            <ZoomIn className="w-5 h-5 text-white opacity-0 group-hover:opacity-80 transition-opacity" />
          </div>
          {saved && (
            <div className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center">
              <Check className="w-3 h-3 text-white" />
            </div>
          )}
        </div>
      </div>

      {/* Filename */}
      <p className="text-[10px] text-white/30 text-center truncate" title={image.display_name}>
        {image.display_name}
      </p>

      {/* Club Select */}
      <div className="space-y-2">
        <select
          value={matchedClubId || ''}
          onChange={(e) => onSelectClub(image.public_id, e.target.value)}
          className="w-full bg-white/5 border border-white/[0.08] rounded-lg px-2.5 py-1.5 text-[11px] text-white/80 focus:outline-none focus:border-white/20 transition-colors appearance-none cursor-pointer"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='rgba(255,255,255,0.3)' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'right 8px center',
          }}
        >
          <option value="" disabled>
            Pilih club...
          </option>
          {clubs.map((c) => (
            <option key={c.id} value={c.id} style={{ background: '#1a1a1f' }}>
              {c.name}
            </option>
          ))}
        </select>

        <button
          onClick={() => onSave(image.public_id)}
          disabled={!matchedClubId || saving}
          className={`w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[10px] font-semibold transition-all ${
            saved
              ? 'bg-emerald-500/15 text-emerald-400'
              : matchedClubId
                ? `${accentClass.replace('text-', 'bg-').replace(']', '/15]')} ${accentClass.replace('text-', 'border-').replace(']', '/20]')} border hover:opacity-80`
                : 'bg-white/[0.03] text-white/20 cursor-not-allowed'
          }`}
        >
          {saving ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : saved ? (
            <Check className="w-3 h-3" />
          ) : (
            <Save className="w-3 h-3" />
          )}
          {saved ? 'Tersimpan' : 'Simpan'}
        </button>
      </div>
    </motion.div>
  );
}

/* ────────────────────────────────────────────────
   Main Panel Component
   ──────────────────────────────────────────────── */

export function CloudinaryRestorePanel({
  accentClass,
  accentBgSubtle,
  accentColor,
  addToast,
}: CloudinaryRestorePanelProps) {
  const [innerTab, setInnerTab] = useState<'avatars' | 'logos' | 'banners'>('avatars');

  // Data
  const [avatars, setAvatars] = useState<CloudinaryImage[]>([]);
  const [logos, setLogos] = useState<CloudinaryImage[]>([]);
  const [banners, setBanners] = useState<CloudinaryImage[]>([]);
  const [malePlayers, setMalePlayers] = useState<Player[]>([]);
  const [clubs, setClubs] = useState<Club[]>([]);

  // Loading
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Mappings: publicId -> targetId
  const [avatarMapping, setAvatarMapping] = useState<Record<string, string>>({});
  const [clubMapping, setClubMapping] = useState<Record<string, string>>({});

  // Saving state per item
  const [savingItem, setSavingItem] = useState<string | null>(null);
  const [savedItems, setSavedItems] = useState<Set<string>>(new Set());

  // Zoom
  const [zoomUrl, setZoomUrl] = useState<string | null>(null);

  // Banner applying state
  const [applyingBanner, setApplyingBanner] = useState<string | null>(null);
  const [appliedBanners, setAppliedBanners] = useState<Set<string>>(new Set());

  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const res = await adminFetch('/api/admin/cloudinary-restore');
      const json = await res.json();

      if (json.success) {
        setAvatars(json.data.avatars || []);
        setLogos(json.data.logos || []);
        setBanners(json.data.banners || []);
        setMalePlayers(json.data.malePlayers || []);
        setClubs(json.data.clubs || []);
      } else {
        addToast('Gagal memuat data Cloudinary', 'error');
      }
    } catch {
      addToast('Error koneksi ke Cloudinary', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [addToast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Auto-detect matching based on filename containing player name
  useEffect(() => {
    const autoMap: Record<string, string> = {};
    avatars.forEach((img) => {
      const nameLower = img.display_name.toLowerCase();
      const match = malePlayers.find((p) =>
        nameLower.includes(p.name.toLowerCase().replace(/\s+/g, '_')) ||
        nameLower.includes(p.name.toLowerCase().replace(/\s+/g, '')) ||
        p.name.toLowerCase().split(' ').some(part => part.length > 2 && nameLower.includes(part.toLowerCase()))
      );
      if (match) {
        autoMap[img.public_id] = match.id;
      }
    });
    if (Object.keys(autoMap).length > 0) {
      setAvatarMapping((prev) => ({ ...prev, ...autoMap }));
    }
  }, [avatars, malePlayers]);

  // Auto-detect matching based on filename containing club name
  useEffect(() => {
    const autoMap: Record<string, string> = {};
    logos.forEach((img) => {
      const nameLower = img.display_name.toLowerCase();
      const match = clubs.find((c) =>
        nameLower.includes(c.slug.toLowerCase()) ||
        nameLower.includes(c.name.toLowerCase().replace(/\s+/g, '_')) ||
        nameLower.includes(c.name.toLowerCase().replace(/\s+/g, '')) ||
        c.name.toLowerCase().split(' ').some(part => part.length > 2 && nameLower.includes(part.toLowerCase()))
      );
      if (match) {
        autoMap[img.public_id] = match.id;
      }
    });
    if (Object.keys(autoMap).length > 0) {
      setClubMapping((prev) => ({ ...prev, ...autoMap }));
    }
  }, [logos, clubs]);

  const handleSaveAvatar = async (publicId: string) => {
    const playerId = avatarMapping[publicId];
    if (!playerId) return;

    const image = avatars.find((a) => a.public_id === publicId);
    if (!image) return;

    setSavingItem(publicId);
    try {
      const res = await adminFetch('/api/admin/cloudinary-restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'avatar',
          userId: playerId,
          cloudinaryUrl: image.secure_url,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setSavedItems((prev) => new Set([...prev, publicId]));
        const player = malePlayers.find((p) => p.id === playerId);
        addToast(`Avatar tersimpan untuk ${player?.name || 'pemain'}`, 'success');
      } else {
        addToast(json.error || 'Gagal menyimpan', 'error');
      }
    } catch {
      addToast('Error menyimpan avatar', 'error');
    } finally {
      setSavingItem(null);
    }
  };

  const handleSaveLogo = async (publicId: string) => {
    const clubId = clubMapping[publicId];
    if (!clubId) return;

    const image = logos.find((l) => l.public_id === publicId);
    if (!image) return;

    setSavingItem(publicId);
    try {
      const res = await adminFetch('/api/admin/cloudinary-restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'logo',
          clubId,
          cloudinaryUrl: image.secure_url,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setSavedItems((prev) => new Set([...prev, publicId]));
        const club = clubs.find((c) => c.id === clubId);
        addToast(`Logo tersimpan untuk ${club?.name || 'club'}`, 'success');
      } else {
        addToast(json.error || 'Gagal menyimpan', 'error');
      }
    } catch {
      addToast('Error menyimpan logo', 'error');
    } finally {
      setSavingItem(null);
    }
  };

  const handleApplyBanner = async (image: CloudinaryImage) => {
    const isMaleBanner = image.filename.toLowerCase().includes('male') ||
                         image.display_name.toLowerCase().includes('male');
    const settingKey = isMaleBanner ? 'banner_male_url' : 'banner_female_url';

    setApplyingBanner(image.public_id);
    try {
      const res = await adminFetch('/api/admin/cloudinary-restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'banner',
          settingKey,
          cloudinaryUrl: image.secure_url,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setAppliedBanners((prev) => new Set([...prev, image.public_id]));
        addToast(`Banner ${isMaleBanner ? 'Male' : 'Female'} berhasil diterapkan!`, 'success');
      } else {
        addToast(json.error || 'Gagal menerapkan banner', 'error');
      }
    } catch {
      addToast('Error menerapkan banner', 'error');
    } finally {
      setApplyingBanner(null);
    }
  };

  const matchedAvatarsCount = savedItems.size;
  const matchedLogosCount = [...savedItems].filter((id) =>
    logos.some((l) => l.public_id === id)
  ).length;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <div className="relative">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center animate-pulse"
            style={{ background: `${accentColor}15` }}
          >
            <CloudUpload className={`w-6 h-6 ${accentClass}`} />
          </div>
        </div>
        <div className="text-center">
          <p className="text-[13px] font-semibold text-white/70">Memuat dari Cloudinary...</p>
          <p className="text-[11px] text-white/30 mt-1">Mengambil gambar & data pemain</p>
        </div>
        <Loader2 className="w-5 h-5 text-white/20 animate-spin" />
      </div>
    );
  }

  return (
    <>
      <div className="space-y-5">
        {/* Section Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-xl ${accentBgSubtle} flex items-center justify-center`}>
              <CloudUpload className={`w-4 h-4 ${accentClass}`} />
            </div>
            <div>
              <p className="text-[13px] font-bold text-white/90">Cloudinary Restore</p>
              <p className="text-[10px] text-white/30">Match gambar ke pemain & club</p>
            </div>
          </div>
          <motion.button
            onClick={() => fetchData(true)}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-semibold text-white/50 bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.07] transition-colors disabled:opacity-50"
            whileTap={{ scale: 0.95 }}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </motion.button>
        </div>

        {/* Info Banner */}
        <div className="flex items-start gap-3 px-3 py-2.5 rounded-xl bg-emerald-500/5 border border-emerald-500/10">
          <AlertCircle className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
          <div className="text-[11px] text-white/50 leading-relaxed">
            <p className="text-emerald-400/80 font-semibold mb-0.5">Panduan Restore</p>
            <p>Pilih gambar dari Cloudinary dan cocokkan dengan pemain/club yang sesuai. Klik &quot;Simpan&quot; untuk menyimpan ke database. Gambar yang sudah di-match otomatis terdeteksi dari nama file.</p>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-xl p-3 text-center" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <p className="text-[18px] font-bold text-white/80">{avatars.length}</p>
            <p className="text-[10px] text-white/30">Avatar</p>
          </div>
          <div className="rounded-xl p-3 text-center" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <p className="text-[18px] font-bold text-white/80">{logos.length}</p>
            <p className="text-[10px] text-white/30">Logo</p>
          </div>
          <div className="rounded-xl p-3 text-center" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <p className="text-[18px] font-bold text-white/80">{banners.length}</p>
            <p className="text-[10px] text-white/30">Banner</p>
          </div>
        </div>

        {/* Inner Tab Switcher */}
        <div className="flex bg-white/[0.06] rounded-xl p-1">
          {([
            { id: 'avatars' as const, label: 'Avatar Pemain', icon: User, count: `${matchedAvatarsCount}/${avatars.length}` },
            { id: 'logos' as const, label: 'Logo Club', icon: Building2, count: `${savedItems.size > 0 ? matchedLogosCount : 0}/${logos.length}` },
            { id: 'banners' as const, label: 'Banner', icon: ImageIcon, count: `${banners.length}` },
          ]).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setInnerTab(tab.id)}
              className={`relative flex-1 min-w-0 py-2 rounded-lg text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-all ${
                innerTab === tab.id
                  ? 'text-white/90'
                  : 'text-white/30 hover:text-white/50'
              }`}
            >
              {innerTab === tab.id && (
                <div
                  className="absolute inset-0 rounded-lg pointer-events-none"
                  style={{ background: 'rgba(255,255,255,0.08)' }}
                />
              )}
              <tab.icon className="w-3.5 h-3.5 relative z-10" />
              <span className="relative z-10 whitespace-nowrap hidden sm:inline">{tab.label}</span>
              <span className="relative z-10 whitespace-nowrap sm:hidden">{tab.label.split(' ')[0]}</span>
              <span className={`relative z-10 text-[9px] px-1.5 py-0.5 rounded-full ${
                innerTab === tab.id ? 'bg-white/10 text-white/60' : 'bg-white/[0.03] text-white/20'
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* ═══ AVATARS TAB ═══ */}
        {innerTab === 'avatars' && (
          <div className="glass-subtle rounded-2xl p-4 lg:p-6 space-y-4">
            {/* Progress */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <User className={`w-4 h-4 ${accentClass}`} />
                <span className="text-[12px] font-semibold text-white/70">
                  {matchedAvatarsCount} of {avatars.length} matched
                </span>
              </div>
              {/* Progress bar */}
              <div className="flex items-center gap-2">
                <div className="w-24 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: avatars.length > 0 ? `${(matchedAvatarsCount / avatars.length) * 100}%` : '0%',
                      background: accentColor,
                    }}
                  />
                </div>
                <span className="text-[10px] text-white/30">
                  {avatars.length > 0 ? Math.round((matchedAvatarsCount / avatars.length) * 100) : 0}%
                </span>
              </div>
            </div>

            {avatars.length === 0 ? (
              <div className="text-center py-8">
                <ImageIcon className="w-8 h-8 text-white/10 mx-auto mb-2" />
                <p className="text-[12px] text-white/30">Tidak ada gambar avatar di folder idm/avatars</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                {avatars.map((img) => (
                  <AvatarMatchCard
                    key={img.public_id}
                    image={img}
                    players={malePlayers}
                    matchedPlayerId={avatarMapping[img.public_id] || null}
                    onSelectPlayer={(publicId, playerId) =>
                      setAvatarMapping((prev) => ({ ...prev, [publicId]: playerId }))
                    }
                    onSave={handleSaveAvatar}
                    saving={savingItem === img.public_id}
                    saved={savedItems.has(img.public_id)}
                    accentClass={accentClass}
                    onZoom={setZoomUrl}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ═══ LOGOS TAB ═══ */}
        {innerTab === 'logos' && (
          <div className="glass-subtle rounded-2xl p-4 lg:p-6 space-y-4">
            {/* Progress */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building2 className={`w-4 h-4 ${accentClass}`} />
                <span className="text-[12px] font-semibold text-white/70">
                  {matchedLogosCount} of {logos.length} matched
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-24 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: logos.length > 0 ? `${(matchedLogosCount / logos.length) * 100}%` : '0%',
                      background: accentColor,
                    }}
                  />
                </div>
                <span className="text-[10px] text-white/30">
                  {logos.length > 0 ? Math.round((matchedLogosCount / logos.length) * 100) : 0}%
                </span>
              </div>
            </div>

            {logos.length === 0 ? (
              <div className="text-center py-8">
                <ImageIcon className="w-8 h-8 text-white/10 mx-auto mb-2" />
                <p className="text-[12px] text-white/30">Tidak ada gambar logo di folder idm/logos</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                {logos.map((img) => (
                  <LogoMatchCard
                    key={img.public_id}
                    image={img}
                    clubs={clubs}
                    matchedClubId={clubMapping[img.public_id] || null}
                    onSelectClub={(publicId, clubId) =>
                      setClubMapping((prev) => ({ ...prev, [publicId]: clubId }))
                    }
                    onSave={handleSaveLogo}
                    saving={savingItem === img.public_id}
                    saved={savedItems.has(img.public_id)}
                    accentClass={accentClass}
                    onZoom={setZoomUrl}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ═══ BANNERS TAB ═══ */}
        {innerTab === 'banners' && (
          <div className="glass-subtle rounded-2xl p-4 lg:p-6 space-y-4">
            <div className="flex items-center gap-2">
              <ImageIcon className={`w-4 h-4 ${accentClass}`} />
              <span className="text-[12px] font-semibold text-white/70">
                {banners.length} banner ditemukan
              </span>
            </div>

            {banners.length === 0 ? (
              <div className="text-center py-8">
                <ImageIcon className="w-8 h-8 text-white/10 mx-auto mb-2" />
                <p className="text-[12px] text-white/30">Tidak ada gambar banner di folder idm/banners</p>
              </div>
            ) : (
              <div className="space-y-3">
                {banners.map((img) => {
                  const isMaleBanner = img.filename.toLowerCase().includes('male') ||
                                       img.display_name.toLowerCase().includes('male');
                  const bannerLabel = isMaleBanner ? 'Male MVP' : 'Female MVP';
                  const bannerColor = isMaleBanner ? '#73FF00' : '#38BDF8';

                  return (
                    <motion.div
                      key={img.public_id}
                      className="flex items-center gap-4 rounded-xl p-4"
                      style={{
                        background: 'rgba(255,255,255,0.03)',
                        border: appliedBanners.has(img.public_id)
                          ? '1px solid rgba(16,185,129,0.3)'
                          : '1px solid rgba(255,255,255,0.06)',
                      }}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                    >
                      {/* Thumbnail */}
                      <div
                        className="relative cursor-pointer shrink-0"
                        onClick={() => setZoomUrl(img.secure_url)}
                      >
                        <img
                          src={getThumbnailUrl(img.secure_url, 80)}
                          alt={img.display_name}
                          loading="lazy"
                          className="w-20 h-12 rounded-lg object-cover border border-white/[0.08]"
                        />
                        <div className="absolute inset-0 rounded-lg bg-black/0 hover:bg-black/30 transition-colors flex items-center justify-center">
                          <ZoomIn className="w-4 h-4 text-white opacity-0 hover:opacity-80 transition-opacity" />
                        </div>
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span
                            className="text-[10px] font-bold px-2 py-0.5 rounded-md"
                            style={{
                              color: bannerColor,
                              background: `${bannerColor}15`,
                              border: `1px solid ${bannerColor}25`,
                            }}
                          >
                            {bannerLabel}
                          </span>
                          {appliedBanners.has(img.public_id) && (
                            <span className="text-[10px] text-emerald-400 flex items-center gap-1">
                              <Check className="w-3 h-3" />
                              Applied
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-white/50 mt-1 truncate" title={img.display_name}>
                          {img.display_name}
                        </p>
                        <p className="text-[10px] text-white/25 mt-0.5">
                          {img.width}×{img.height} · {formatBytes(img.bytes)}
                        </p>
                      </div>

                      {/* Apply Button */}
                      <button
                        onClick={() => handleApplyBanner(img)}
                        disabled={applyingBanner === img.public_id}
                        className={`shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-xl text-[11px] font-semibold transition-all ${
                          appliedBanners.has(img.public_id)
                            ? 'bg-emerald-500/15 text-emerald-400'
                            : 'hover:opacity-80'
                        }`}
                        style={!appliedBanners.has(img.public_id) ? {
                          color: bannerColor,
                          background: `${bannerColor}15`,
                          border: `1px solid ${bannerColor}25`,
                        } : {
                          border: '1px solid rgba(16,185,129,0.2)',
                        }}
                      >
                        {applyingBanner === img.public_id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : appliedBanners.has(img.public_id) ? (
                          <Check className="w-3.5 h-3.5" />
                        ) : (
                          <CloudUpload className="w-3.5 h-3.5" />
                        )}
                        {appliedBanners.has(img.public_id) ? 'Applied' : `Apply ${bannerLabel}`}
                      </button>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Image Zoom Modal */}
      <AnimatePresence>
        {zoomUrl && (
          <ImageZoomModal url={zoomUrl} onClose={() => setZoomUrl(null)} />
        )}
      </AnimatePresence>
    </>
  );
}
