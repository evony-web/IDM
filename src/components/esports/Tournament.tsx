'use client';

import { motion } from 'framer-motion';
import { useState, useMemo } from 'react';
import {
  UserPlus,
  Check,
  Users,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { ImageUploader } from '@/components/esports/ImageUploader';

interface Registration {
  id: string;
  name: string;
  email: string;
  avatar: string;
  tier: string;
  gender: string;
  status: string;
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
  }[];
}

interface TournamentTabProps {
  division: 'male' | 'female';
  tournament: {
    id: string;
    name: string;
    division: string;
    type: string;
    status: string;
    week: number;
    bracketType: string;
    prizePool: number;
  } | null;
  registrations: Registration[];
  teams: Team[];
  isAdmin?: boolean;
  onRegister: (name: string, phone: string, avatarUrl: string, city: string, club?: string) => void;
  onApprove: (id: string, tier: string) => void;
  onGenerateTeams: () => void;
  onResetTeams: () => void;
  onGenerateBracket: (type: string, strategy?: string) => void;
}

const itemVariants = {
  enter: { opacity: 0, y: 12 },
  center: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.4, 0, 0.2, 1] } },
};

export function TournamentTab({
  division,
  tournament,
  registrations,
  teams,
  isAdmin = false,
  onRegister,
  onApprove,
  onGenerateTeams,
  onResetTeams,
  onGenerateBracket,
}: TournamentTabProps) {
  const [registerName, setRegisterName] = useState('');
  const [registerPhone, setRegisterPhone] = useState('');
  const [registerCity, setRegisterCity] = useState('');
  const [registerClub, setRegisterClub] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  const isMale = division === 'male';
  const accentClass = isMale ? 'text-[--ios-gold]' : 'text-[--ios-pink]';
  const cardClass = isMale ? 'card-gold' : 'card-pink';
  const btnClass = isMale ? 'btn-gold' : 'btn-pink';
  const avatarRingClass = isMale ? 'avatar-ring-gold' : 'avatar-ring-pink';

  const pendingRegistrations = useMemo(
    () => registrations.filter((r) => r.status === 'pending'),
    [registrations],
  );

  const approvedRegistrations = useMemo(
    () => registrations.filter((r) => r.status === 'approved'),
    [registrations],
  );

  const handleRegister = () => {
    if (registerName.trim() && avatarUrl) {
      onRegister(registerName.trim(), registerPhone.trim(), avatarUrl, registerCity.trim(), registerClub.trim() || undefined);
      setRegisterName('');
      setRegisterPhone('');
      setRegisterCity('');
      setRegisterClub('');
      setAvatarUrl(null);
    }
  };

  const getStatusStyle = (status: string) => {
    if (status === 'pending') return 'status-registration';
    if (status === 'approved') return 'status-live';
    if (status === 'rejected') return 'status-setup';
    return 'status-setup';
  };

  const getTierBadgeClass = (tier: string) => {
    if (tier === 'S') return 'tier-s';
    if (tier === 'A') return 'tier-a';
    return 'tier-b';
  };

  return (
    <div className="space-y-5">
      {/* Tournament Hero Card */}
      <motion.div
        className={`${cardClass} rounded-2xl p-5 lg:flex lg:items-center lg:gap-8 lg:p-8`}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
      >
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <p className="text-[11px] tracking-[0.2em] uppercase text-white/40 font-medium mb-1">
              Week {tournament?.week || 1}
            </p>
            <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-white/90 tracking-tight">
              {tournament?.name || 'Turnamen Mingguan'}
            </h2>
          </div>
          <span className={`status-pill lg:text-xs lg:px-3 lg:py-1.5 ${getStatusStyle(tournament?.status || 'setup')}`}>
            {tournament?.status?.toUpperCase() || 'SETUP'}
          </span>
        </div>

        <div className="flex items-center gap-3 text-white/40 text-xs">
          <span className="flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5" />
            {approvedRegistrations.length} pemain
          </span>
          <span>•</span>
          <span>
            {(tournament?.bracketType || 'single').charAt(0).toUpperCase() +
              (tournament?.bracketType || 'single').slice(1)} Elim
          </span>
          {tournament?.prizePool !== undefined && tournament.prizePool > 0 && (
            <>
              <span>•</span>
              <span className={accentClass}>Rp {tournament.prizePool.toLocaleString('id-ID')}</span>
            </>
          )}
        </div>
      </motion.div>

      {/* Section Content - Only Registration */}
      {/* Section Header */}
      <div className="flex items-center gap-2.5 px-1 mt-5">
        <UserPlus className={`w-4 h-4 ${accentClass}`} />
        <h3 className="text-[11px] tracking-[0.2em] uppercase font-semibold text-white/60">
          Gabung Turnamen
        </h3>
      </div>

            {/* Inline Registration Form — Clean Flow */}
            {tournament?.status === 'registration' && (
              <motion.div
                variants={itemVariants}
                className="glass-heavy rounded-2xl p-4 sm:p-5 lg:max-w-2xl lg:mx-auto space-y-3.5"
              >
                {/* ── Header ── */}
                <div className="flex items-center gap-3 mb-1">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isMale ? 'bg-[#73FF00]/12' : 'bg-[#0EA5E9]/12'}`}>
                    <UserPlus className={`w-5 h-5 ${isMale ? 'text-[#73FF00]' : 'text-[#38BDF8]'}`} />
                  </div>
                  <div>
                    <h3 className="text-[13px] font-bold text-white/90">Formulir Pendaftaran</h3>
                    <p className="text-[11px] text-white/30 font-medium">Isi data dan pilih karakter untuk bergabung</p>
                  </div>
                </div>

                {/* ── Step 1: Data Fields ── */}
                <div className="space-y-3">
                  {/* Nama */}
                  <div>
                    <label className="text-[11px] text-white/40 mb-1.5 block uppercase tracking-wider font-semibold">
                      Nama <span className="text-purple-400/60">*</span>
                    </label>
                    <input
                      type="text"
                      value={registerName}
                      onChange={(e) => setRegisterName(e.target.value)}
                      placeholder="Nama lengkap pemain"
                      className="w-full bg-white/[0.04] border border-white/[0.06] rounded-xl px-4 py-3 text-white/90 text-sm placeholder-white/25 focus:outline-none focus:border-[#73FF00]/30 focus:bg-white/[0.06] focus:ring-1 focus:ring-[#73FF00]/10 transition-all"
                    />
                  </div>

                  {/* WA + City side by side */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] text-white/40 mb-1.5 block uppercase tracking-wider font-semibold">
                        No. WhatsApp
                      </label>
                      <input
                        type="tel"
                        value={registerPhone}
                        onChange={(e) => setRegisterPhone(e.target.value)}
                        placeholder="08xxx"
                        className="w-full bg-white/[0.04] border border-white/[0.06] rounded-xl px-3.5 py-3 text-white/90 text-[13px] placeholder-white/25 focus:outline-none focus:border-[#73FF00]/30 focus:bg-white/[0.06] focus:ring-1 focus:ring-[#73FF00]/10 transition-all"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] text-white/40 mb-1.5 block uppercase tracking-wider font-semibold">
                        Asal Kota
                      </label>
                      <input
                        type="text"
                        value={registerCity}
                        onChange={(e) => setRegisterCity(e.target.value)}
                        placeholder="Jakarta, Batam, dll"
                        className="w-full bg-white/[0.04] border border-white/[0.06] rounded-xl px-3.5 py-3 text-white/90 text-[13px] placeholder-white/25 focus:outline-none focus:border-[#73FF00]/30 focus:bg-white/[0.06] focus:ring-1 focus:ring-[#73FF00]/10 transition-all"
                      />
                    </div>
                  </div>

                  {/* Club */}
                  <div>
                    <label className="flex items-center gap-1.5 text-[11px] text-white/40 mb-1.5 uppercase tracking-wider font-semibold">
                      <Users className="w-3 h-3" />
                      Club
                    </label>
                    <input
                      type="text"
                      value={registerClub}
                      onChange={(e) => setRegisterClub(e.target.value)}
                      placeholder="Nama club (opsional)"
                      className="w-full bg-white/[0.04] border border-white/[0.06] rounded-xl px-4 py-3 text-white/90 text-sm placeholder-white/25 focus:outline-none focus:border-[#73FF00]/30 focus:bg-white/[0.06] focus:ring-1 focus:ring-[#73FF00]/10 transition-all"
                    />
                  </div>
                </div>

                {/* ── Divider ── */}
                <div className="divider" />

                {/* ── Step 2: Avatar Upload ── */}
                <div>
                  <label className="flex items-center gap-1.5 text-[11px] text-white/40 mb-2 uppercase tracking-wider font-semibold">
                    <Sparkles className={`w-3 h-3 ${isMale ? 'text-[#73FF00]' : 'text-[#38BDF8]'}`} />
                    Avatar <span className="text-purple-400/60">*</span>
                  </label>
                  <ImageUploader
                    division={division}
                    onUpload={(url) => setAvatarUrl(url || null)}
                    currentImage={avatarUrl}
                  />
                </div>

                {/* ── Submit ── */}
                <motion.button
                  onClick={handleRegister}
                  className={`${btnClass} btn-ios w-full py-3.5 text-[14px] flex items-center justify-center gap-2 disabled:opacity-40 hero-shimmer-btn relative overflow-hidden`}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  disabled={!registerName.trim() || !avatarUrl}
                >
                  <span className="relative z-[2] flex items-center gap-2">
                    <UserPlus className="w-[18px] h-[18px]" />
                    GABUNG TURNAMEN
                    <ChevronRight className="w-[16px] h-[16px]" />
                  </span>
                </motion.button>

                {!avatarUrl && (
                  <p className="text-[11px] text-white/30 text-center -mt-1">
                    Upload avatar untuk melanjutkan pendaftaran
                  </p>
                )}
              </motion.div>
            )}

            {/* Pending Registrations */}
            {pendingRegistrations.length > 0 && (
              <motion.div variants={itemVariants} className="space-y-2">
                <p className="text-[11px] tracking-[0.15em] uppercase text-white/30 font-medium px-1">
                  Pendaftaran Menunggu
                </p>
                {pendingRegistrations.map((reg, i) => (
                  <motion.div
                    key={reg.id}
                    className="list-row p-4"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                  >
                    <div className="flex items-center gap-3">
                      <div className={avatarRingClass}>
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-600 to-gray-800 flex items-center justify-center overflow-hidden">
                          {reg.avatar ? (
                            <img src={reg.avatar} alt={reg.name} loading="lazy" className="w-full h-full object-cover" />
                          ) : (
                            <span className="font-semibold text-white/70 text-sm">{reg.name[0]}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-white/90 text-sm truncate">{reg.name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className={`tier-badge ${getTierBadgeClass(reg.tier)}`}>{reg.tier}</span>
                          <span className="status-pill status-registration">Menunggu</span>
                        </div>
                      </div>
                      {/* Admin Approve Pills — only visible when admin is logged in */}
                      {isAdmin && (
                      <div className="flex items-center gap-1.5">
                        {['S', 'A', 'B'].map((tier) => (
                          <motion.button
                            key={tier}
                            onClick={() => onApprove(reg.id, tier)}
                            className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold ${getTierBadgeClass(tier)}`}
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            title={`Setujui sebagai tier ${tier}`}
                          >
                            {tier}
                          </motion.button>
                        ))}
                      </div>
                      )}
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            )}

            {/* Approved Registrations */}
            {approvedRegistrations.length > 0 && (
              <motion.div variants={itemVariants} className="space-y-2">
                <p className="text-[11px] tracking-[0.15em] uppercase text-white/30 font-medium px-1">
                  Pemain Disetujui ({approvedRegistrations.length})
                </p>
                {approvedRegistrations.map((reg, i) => (
                  <motion.div
                    key={reg.id}
                    className="list-row p-3.5"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                  >
                    <div className="flex items-center gap-3">
                      <div className={avatarRingClass}>
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-gray-600 to-gray-800 flex items-center justify-center overflow-hidden">
                          {reg.avatar ? (
                            <img src={reg.avatar} alt={reg.name} loading="lazy" className="w-full h-full object-cover" />
                          ) : (
                            <span className="font-semibold text-white/70 text-xs">{reg.name[0]}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-white/90 text-sm truncate">{reg.name}</p>
                      </div>
                      <span className={`tier-badge ${getTierBadgeClass(reg.tier)}`}>{reg.tier}</span>
                      <Check className="w-4 h-4 text-[--ios-green]" />
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            )}

            {/* Empty State */}
            {registrations.length === 0 && (
              <motion.div
                variants={itemVariants}
                className="card-light p-10 text-center"
              >
                <div className={`w-14 h-14 rounded-2xl mx-auto mb-3 flex items-center justify-center ${isMale ? 'bg-[#73FF00]/8' : 'bg-[#0EA5E9]/8'}`}>
                  <UserPlus className={`w-7 h-7 ${isMale ? 'text-[--ios-gold]/30' : 'text-[--ios-pink]/30'}`} />
                </div>
                <p className="text-white/40 text-sm font-medium">Belum ada pendaftaran</p>
                <p className="text-white/35 text-xs mt-1">Jadilah yang pertama bergabung!</p>
              </motion.div>
            )}
    </div>
  );
}
