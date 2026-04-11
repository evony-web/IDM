'use client';

import { useState, useCallback } from 'react';
import { signIn } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User,
  Phone,
  Lock,
  Eye,
  EyeOff,
  XCircle,
  CheckCircle,
  LogIn,
  UserPlus,
  X,
  Gamepad2,
  ShieldCheck,
} from 'lucide-react';

/* ═══════════════════════════════════════════════════════════════
   Types
   ═══════════════════════════════════════════════════════════════ */

export interface PlayerUser {
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

interface PlayerAuthProps {
  division: 'male' | 'female';
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onAuthSuccess: (user: PlayerUser) => void;
  /** Called after successful NextAuth sign-in (session is managed by NextAuth) */
  onSessionAuthSuccess?: () => void;
}

type AuthMode = 'daftar' | 'masuk';

/* ═══════════════════════════════════════════════════════════════
   Helpers
   ═══════════════════════════════════════════════════════════════ */

function validatePhone(phone: string): boolean {
  const digits = phone.replace(/\D/g, '');
  return digits.length >= 10;
}

function validatePin(pin: string): boolean {
  return /^\d{4,6}$/.test(pin);
}

/* ═══════════════════════════════════════════════════════════════
   Accent Input — custom input with division-colored focus ring
   ═══════════════════════════════════════════════════════════════ */

function AccentInput({
  accentRgb,
  icon: Icon,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  accentRgb: string;
  icon: React.ElementType;
}) {
  return (
    <div className="relative group">
      <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
        <Icon className="w-4 h-4 text-white/15 group-focus-within:text-white/40 transition-colors duration-300" />
      </div>
      <input
        {...props}
        className="w-full bg-white/5 border border-white/8 rounded-2xl pl-11 pr-12 py-3.5 text-white/90 text-[14px] font-medium placeholder-white/15 focus:outline-none transition-all duration-300 lg:text-base lg:px-4 lg:py-3"
        style={
          {
            '--accent-rgb': accentRgb,
          } as React.CSSProperties
        }
        onFocus={(e) => {
          e.currentTarget.style.borderColor = `rgba(${accentRgb},0.30)`;
          e.currentTarget.style.background = `rgba(${accentRgb},0.02)`;
          e.currentTarget.style.boxShadow = `0 0 24px rgba(${accentRgb},0.08)`;
          props.onFocus?.(e);
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
          e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
          e.currentTarget.style.boxShadow = 'none';
          props.onBlur?.(e);
        }}
      />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Component
   ═══════════════════════════════════════════════════════════════ */

export function PlayerAuth({
  division,
  isOpen,
  onOpenChange,
  onAuthSuccess,
  onSessionAuthSuccess,
}: PlayerAuthProps) {
  /* ── Division accent colors ── */
  const isMale = division === 'male';
  const accentHex = isMale ? '#73FF00' : '#38BDF8';
  const accentRgb = isMale ? '115,255,0' : '56,189,248';
  const accentHex2 = isMale ? '#5FD400' : '#0EA5E9';
  const divisionLabel = isMale ? 'MALE' : 'FEMALE';

  /* ── Mode ── */
  const [mode, setMode] = useState<AuthMode>('daftar');

  /* ── Sign Up fields ── */
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [gender, setGender] = useState<'male' | 'female'>(division);
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [showConfirmPin, setShowConfirmPin] = useState(false);

  /* ── Login fields ── */
  const [loginPhone, setLoginPhone] = useState('');
  const [loginPin, setLoginPin] = useState('');
  const [showLoginPin, setShowLoginPin] = useState(false);

  /* ── UI state ── */
  const [error, setError] = useState('');
  const [shake, setShake] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  /* ── Reset form ── */
  const resetForm = useCallback(() => {
    setName('');
    setPhone('');
    setGender(division);
    setPin('');
    setConfirmPin('');
    setShowPin(false);
    setShowConfirmPin(false);
    setLoginPhone('');
    setLoginPin('');
    setShowLoginPin(false);
    setError('');
    setSuccessMsg('');
  }, [division]);

  /* ── Switch mode ── */
  const handleModeSwitch = useCallback(
    (newMode: AuthMode) => {
      setMode(newMode);
      setError('');
      setSuccessMsg('');
    },
    []
  );

  /* ── Shake animation helper ── */
  const triggerShake = useCallback(() => {
    setShake(true);
    setTimeout(() => setShake(false), 600);
  }, []);

  /* ── Close modal ── */
  const closeModal = useCallback(() => {
    resetForm();
    onOpenChange(false);
  }, [resetForm, onOpenChange]);

  /* ── Sign Up submit ── */
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const trimmedName = name.trim();
    const trimmedPhone = phone.trim();

    if (!trimmedName) {
      setError('Nama wajib diisi');
      triggerShake();
      return;
    }

    if (!trimmedPhone) {
      setError('Nomor HP wajib diisi');
      triggerShake();
      return;
    }

    if (!validatePhone(trimmedPhone)) {
      setError('Nomor HP tidak valid. Gunakan format 08xx atau +62xx (min. 10 digit)');
      triggerShake();
      return;
    }

    if (!validatePin(pin)) {
      setError('PIN harus 4-6 digit angka');
      triggerShake();
      return;
    }

    if (pin !== confirmPin) {
      setError('PIN dan konfirmasi PIN tidak cocok');
      triggerShake();
      return;
    }

    setIsSubmitting(true);

    try {
      // Step 1: Create account via /api/player-auth
      const res = await fetch('/api/player-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: trimmedName,
          phone: trimmedPhone,
          gender,
          pin,
          division,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error || 'Gagal mendaftar. Coba lagi.');
        triggerShake();
        setIsSubmitting(false);
        return;
      }

      /* ── Success messages ── */
      if (data.isNewAccount) {
        setSuccessMsg('Akun berhasil dibuat! Memverifikasi sesi...');
      } else if (data.isNewLink) {
        setSuccessMsg('Akun berhasil dikaitkan! Memverifikasi sesi...');
      } else {
        setSuccessMsg('Pendaftaran berhasil! Memverifikasi sesi...');
      }

      // Step 2: Auto-login via NextAuth (sets httpOnly cookie)
      const result = await signIn('player-credentials', {
        phone: trimmedPhone,
        pin,
        redirect: false,
      });

      if (result?.error) {
        setError('Sesi gagal dibuat. Silakan login manual.');
        triggerShake();
        setIsSubmitting(false);
        return;
      }

      // Step 3: Build PlayerUser from signup response for backward compat
      const user: PlayerUser = {
        id: data.user.id,
        name: data.user.name,
        phone: data.user.phone || trimmedPhone,
        gender: data.user.gender || gender,
        tier: data.user.tier || 'B',
        points: data.user.points ?? 0,
        avatar: data.user.avatar ?? null,
        eloRating: data.user.eloRating ?? 1000,
        eloTier: data.user.eloTier ?? 'Bronze',
        clubId: data.user.clubId ?? null,
      };

      /* ── Brief delay to show success message, then close ── */
      setTimeout(() => {
        onAuthSuccess(user);
        onSessionAuthSuccess?.();
        closeModal();
      }, 1200);
    } catch {
      setError('Terjadi kesalahan jaringan. Coba lagi.');
      triggerShake();
    } finally {
      setIsSubmitting(false);
    }
  };

  /* ── Login submit — uses NextAuth for secure httpOnly session ── */
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const trimmedPhone = loginPhone.trim();

    if (!trimmedPhone) {
      setError('Nomor HP wajib diisi');
      triggerShake();
      return;
    }

    if (!validatePhone(trimmedPhone)) {
      setError('Nomor HP tidak valid. Gunakan format 08xx atau +62xx (min. 10 digit)');
      triggerShake();
      return;
    }

    if (!validatePin(loginPin)) {
      setError('PIN harus 4-6 digit angka');
      triggerShake();
      return;
    }

    setIsSubmitting(true);

    try {
      // Use NextAuth signIn — validates server-side, sets httpOnly cookie
      const result = await signIn('player-credentials', {
        phone: trimmedPhone,
        pin: loginPin,
        redirect: false,
      });

      if (result?.error) {
        // Map NextAuth error to user-friendly messages
        let errorMsg = 'Login gagal. Periksa nomor HP dan PIN.';
        if (result.error === 'Nomor HP tidak terdaftar') {
          errorMsg = 'Nomor HP tidak terdaftar';
        } else if (result.error === 'PIN salah') {
          errorMsg = 'PIN salah';
        } else if (result.error === 'Akun belum memiliki PIN. Silakan daftar terlebih dahulu.') {
          errorMsg = 'Akun belum memiliki PIN. Silakan daftar terlebih dahulu.';
        }
        setError(errorMsg);
        triggerShake();
        setIsSubmitting(false);
        return;
      }

      setSuccessMsg('Login berhasil! Sesi aman dibuat.');

      // Build PlayerUser from NextAuth session data
      // We need to fetch the session to get user data
      const sessionRes = await fetch('/api/auth/session');
      const sessionData = await sessionRes.json();

      if (sessionData?.user) {
        const user: PlayerUser = {
          id: sessionData.user.id,
          name: sessionData.user.name,
          phone: sessionData.user.phone || trimmedPhone,
          gender: sessionData.user.gender || division,
          tier: sessionData.user.tier || 'B',
          points: sessionData.user.points ?? 0,
          avatar: sessionData.user.avatar ?? null,
          eloRating: sessionData.user.eloRating ?? 1000,
          eloTier: sessionData.user.eloTier ?? 'Bronze',
          clubId: sessionData.user.clubId ?? null,
        };

        setTimeout(() => {
          onAuthSuccess(user);
          onSessionAuthSuccess?.();
          closeModal();
        }, 800);
      } else {
        // Fallback: session not available yet, just close
        setTimeout(() => {
          onSessionAuthSuccess?.();
          closeModal();
        }, 800);
      }
    } catch {
      setError('Terjadi kesalahan jaringan. Coba lagi.');
      triggerShake();
    } finally {
      setIsSubmitting(false);
    }
  };

  /* ═══════════════════════════════════════════════════════════
     Shared styles
     ═══════════════════════════════════════════════════════════ */
  const labelClass = 'text-[10px] text-white/30 uppercase tracking-[0.15em] font-bold mb-2 block';
  const toggleBtnClass = 'absolute right-3 top-1/2 -translate-y-1/2 text-white/15 hover:text-white/40 transition-colors duration-200 p-1.5 rounded-lg hover:bg-white/5';

  /* ═══════════════════════════════════════════════════════════
     Render
     ═══════════════════════════════════════════════════════════ */
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          onClick={closeModal}
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/70 backdrop-blur-md"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          {/* Auth Card */}
          <motion.div
            className="relative w-full sm:max-w-md rounded-t-[28px] sm:rounded-[28px] overflow-hidden"
            style={{
              background: 'linear-gradient(180deg, rgba(18,18,22,0.98) 0%, rgba(12,12,16,0.99) 100%)',
              border: `1px solid rgba(${accentRgb},0.12)`,
              borderBottom: 'none',
            }}
            initial={{ y: 80, opacity: 0, scale: 0.95 }}
            animate={
              shake
                ? {
                    x: [0, -12, 10, -8, 6, -3, 0],
                    y: 0,
                    opacity: 1,
                    scale: 1,
                  }
                : { y: 0, opacity: 1, scale: 1 }
            }
            exit={{ y: 80, opacity: 0, scale: 0.95 }}
            transition={
              shake
                ? { x: { duration: 0.5, ease: 'easeInOut' }, y: { duration: 0 }, opacity: { duration: 0 }, scale: { duration: 0 } }
                : { type: 'spring', damping: 28, stiffness: 350 }
            }
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top accent gradient line */}
            <div
              className="h-[2px] w-full"
              style={{
                background: `linear-gradient(90deg, transparent 0%, rgba(${accentRgb},0.5) 50%, transparent 100%)`,
              }}
            />

            {/* Close button */}
            <motion.button
              onClick={closeModal}
              className="absolute top-4 right-4 w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/30 hover:text-white/60 transition-all z-10 cursor-pointer"
              whileTap={{ scale: 0.88 }}
            >
              <X className="w-4 h-4" />
            </motion.button>

            {/* Content */}
            <div
              className="relative p-6 sm:p-8 pb-8 sm:pb-9 max-h-[90vh] overflow-y-auto"
              style={{ scrollbarWidth: 'thin', scrollbarColor: `rgba(${accentRgb},0.12) transparent` }}
            >
              {/* Icon + Title */}
              <div className="flex flex-col items-center mb-6">
                <motion.div
                  className="relative mb-4"
                  initial={{ y: -8, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.1, type: 'spring', stiffness: 300 }}
                >
                  {/* Glow behind icon */}
                  <div
                    className="absolute -inset-3 rounded-2xl blur-xl opacity-60"
                    style={{
                      background: `linear-gradient(135deg, rgba(${accentRgb},0.20), rgba(${accentRgb},0.05))`,
                    }}
                  />
                  <div
                    className="relative w-[68px] h-[68px] rounded-2xl flex items-center justify-center"
                    style={{
                      background: `linear-gradient(135deg, rgba(${accentRgb},0.15), rgba(${accentRgb},0.05))`,
                      border: `1px solid rgba(${accentRgb},0.20)`,
                    }}
                  >
                    <Gamepad2 className="w-8 h-8" style={{ color: accentHex }} />
                  </div>
                </motion.div>
                <motion.h2
                  className="text-[20px] font-bold text-white/90 tracking-tight"
                  initial={{ y: -5, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.15, type: 'spring', stiffness: 300 }}
                >
                  {mode === 'daftar' ? 'Daftar Pemain' : 'Masuk'}
                </motion.h2>
                <motion.p
                  className="text-[12px] text-white/25 mt-1.5 font-medium"
                  initial={{ y: -5, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.2, type: 'spring', stiffness: 300 }}
                >
                  {divisionLabel} DIVISION &middot;{' '}
                  <span
                    style={{
                      background: `linear-gradient(135deg, ${accentHex}, ${accentHex2})`,
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text',
                    }}
                  >
                    IDOL META
                  </span>
                </motion.p>
              </div>

              {/* Mode Toggle Tabs */}
              <motion.div
                className="flex mb-6 rounded-xl overflow-hidden"
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.06)',
                }}
                initial={{ y: 8, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.22, duration: 0.3 }}
              >
                <button
                  type="button"
                  onClick={() => handleModeSwitch('daftar')}
                  className="flex-1 py-2.5 text-[12px] font-bold tracking-wide uppercase transition-all duration-300 flex items-center justify-center gap-1.5 cursor-pointer"
                  style={{
                    background: mode === 'daftar' ? `rgba(${accentRgb},0.12)` : 'transparent',
                    color: mode === 'daftar' ? accentHex : 'rgba(255,255,255,0.30)',
                    borderBottom: mode === 'daftar' ? `2px solid ${accentHex}` : '2px solid transparent',
                  }}
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  Daftar
                </button>
                <button
                  type="button"
                  onClick={() => handleModeSwitch('masuk')}
                  className="flex-1 py-2.5 text-[12px] font-bold tracking-wide uppercase transition-all duration-300 flex items-center justify-center gap-1.5 cursor-pointer"
                  style={{
                    background: mode === 'masuk' ? `rgba(${accentRgb},0.12)` : 'transparent',
                    color: mode === 'masuk' ? accentHex : 'rgba(255,255,255,0.30)',
                    borderBottom: mode === 'masuk' ? `2px solid ${accentHex}` : '2px solid transparent',
                  }}
                >
                  <LogIn className="w-3.5 h-3.5" />
                  Masuk
                </button>
              </motion.div>

              {/* Success message */}
              <AnimatePresence>
                {successMsg && (
                  <motion.div
                    initial={{ opacity: 0, y: -6, height: 0 }}
                    animate={{ opacity: 1, y: 0, height: 'auto' }}
                    exit={{ opacity: 0, y: -6, height: 0 }}
                    transition={{ duration: 0.3 }}
                    className="mb-4"
                  >
                    <div
                      className="flex items-center gap-2 text-[12px] rounded-xl px-4 py-3 font-medium"
                      style={{
                        color: accentHex,
                        background: `rgba(${accentRgb},0.08)`,
                        border: `1px solid rgba(${accentRgb},0.15)`,
                      }}
                    >
                      <CheckCircle className="w-4 h-4 flex-shrink-0" />
                      {successMsg}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Error message */}
              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -6, height: 0 }}
                    animate={{ opacity: 1, y: 0, height: 'auto' }}
                    exit={{ opacity: 0, y: -6, height: 0 }}
                    transition={{ duration: 0.25 }}
                    className="mb-4"
                  >
                    <div className="flex items-center gap-2 text-[12px] text-red-400 bg-red-500/8 border border-red-500/12 rounded-xl px-4 py-3 font-medium">
                      <XCircle className="w-4 h-4 flex-shrink-0" />
                      {error}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Form Content */}
              <AnimatePresence mode="wait">
                {mode === 'daftar' ? (
                  /* ═══════════════════════════════════════
                     SIGN UP FORM
                     ═══════════════════════════════════════ */
                  <motion.form
                    key="daftar"
                    onSubmit={handleSignUp}
                    className="space-y-4"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -12 }}
                    transition={{ delay: 0.05, duration: 0.35 }}
                    data-form-type="other"
                    autoComplete="off"
                  >
                    {/* Anti-autofill */}
                    <input type="text" name="prevent_autofill_username" autoComplete="off" className="hidden" tabIndex={-1} />
                    <input type="password" name="prevent_autofill_password" autoComplete="off" className="hidden" tabIndex={-1} />

                    {/* Name */}
                    <div>
                      <label className={labelClass}>Nama Lengkap</label>
                      <AccentInput
                        accentRgb={accentRgb}
                        icon={User}
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Nama panggilan kamu"
                        autoComplete="off"
                        data-form-type="other"
                        data-lpignore="true"
                      />
                    </div>

                    {/* Phone */}
                    <div>
                      <label className={labelClass}>Nomor HP</label>
                      <div className="relative group">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
                          <Phone className="w-4 h-4 text-white/15 group-focus-within:text-white/40 transition-colors duration-300" />
                        </div>
                        <input
                          type="tel"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="08xxxxxxxxxx"
                          autoComplete="off"
                          data-form-type="other"
                          data-lpignore="true"
                          className="w-full bg-white/5 border border-white/8 rounded-2xl pl-11 pr-14 py-3.5 text-white/90 text-[14px] font-medium placeholder-white/15 focus:outline-none transition-all duration-300 lg:text-base lg:px-4 lg:py-3"
                          onFocus={(e) => {
                            e.currentTarget.style.borderColor = `rgba(${accentRgb},0.30)`;
                            e.currentTarget.style.background = `rgba(${accentRgb},0.02)`;
                            e.currentTarget.style.boxShadow = `0 0 24px rgba(${accentRgb},0.08)`;
                          }}
                          onBlur={(e) => {
                            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
                            e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                            e.currentTarget.style.boxShadow = 'none';
                          }}
                        />
                        {/* +62 prefix hint */}
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-white/15 font-medium pointer-events-none">
                          +62
                        </span>
                      </div>
                    </div>

                    {/* Gender toggle */}
                    <div>
                      <label className={labelClass}>Gender</label>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setGender('male')}
                          className="flex-1 py-3 rounded-2xl text-[13px] font-bold tracking-wide uppercase transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer"
                          style={{
                            background: gender === 'male'
                              ? 'rgba(115,255,0,0.12)'
                              : 'rgba(255,255,255,0.03)',
                            border: gender === 'male'
                              ? '1.5px solid rgba(115,255,0,0.30)'
                              : '1.5px solid rgba(255,255,255,0.06)',
                            color: gender === 'male' ? '#73FF00' : 'rgba(255,255,255,0.30)',
                          }}
                        >
                          <User className="w-4 h-4" />
                          Male
                        </button>
                        <button
                          type="button"
                          onClick={() => setGender('female')}
                          className="flex-1 py-3 rounded-2xl text-[13px] font-bold tracking-wide uppercase transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer"
                          style={{
                            background: gender === 'female'
                              ? 'rgba(56,189,248,0.12)'
                              : 'rgba(255,255,255,0.03)',
                            border: gender === 'female'
                              ? '1.5px solid rgba(56,189,248,0.30)'
                              : '1.5px solid rgba(255,255,255,0.06)',
                            color: gender === 'female' ? '#38BDF8' : 'rgba(255,255,255,0.30)',
                          }}
                        >
                          <User className="w-4 h-4" />
                          Female
                        </button>
                      </div>
                    </div>

                    {/* PIN */}
                    <div>
                      <label className={labelClass}>PIN (4-6 digit)</label>
                      <div className="relative group">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
                          <Lock className="w-4 h-4 text-white/15 group-focus-within:text-white/40 transition-colors duration-300" />
                        </div>
                        <input
                          type={showPin ? 'text' : 'password'}
                          value={pin}
                          onChange={(e) => {
                            const val = e.target.value.replace(/\D/g, '');
                            if (val.length <= 6) setPin(val);
                          }}
                          placeholder="••••••"
                          autoComplete="off"
                          data-form-type="other"
                          data-lpignore="true"
                          inputMode="numeric"
                          pattern="\d{4,6}"
                          maxLength={6}
                          className="w-full bg-white/5 border border-white/8 rounded-2xl pl-11 pr-12 py-3.5 text-white/90 text-[14px] font-medium placeholder-white/15 focus:outline-none transition-all duration-300 lg:text-base lg:px-4 lg:py-3"
                          onFocus={(e) => {
                            e.currentTarget.style.borderColor = `rgba(${accentRgb},0.30)`;
                            e.currentTarget.style.background = `rgba(${accentRgb},0.02)`;
                            e.currentTarget.style.boxShadow = `0 0 24px rgba(${accentRgb},0.08)`;
                          }}
                          onBlur={(e) => {
                            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
                            e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                            e.currentTarget.style.boxShadow = 'none';
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPin(!showPin)}
                          className={toggleBtnClass}
                        >
                          {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {/* Confirm PIN */}
                    <div>
                      <label className={labelClass}>Konfirmasi PIN</label>
                      <div className="relative group">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
                          <Lock className="w-4 h-4 text-white/15 group-focus-within:text-white/40 transition-colors duration-300" />
                        </div>
                        <input
                          type={showConfirmPin ? 'text' : 'password'}
                          value={confirmPin}
                          onChange={(e) => {
                            const val = e.target.value.replace(/\D/g, '');
                            if (val.length <= 6) setConfirmPin(val);
                          }}
                          placeholder="Ulangi PIN"
                          autoComplete="off"
                          data-form-type="other"
                          data-lpignore="true"
                          inputMode="numeric"
                          pattern="\d{4,6}"
                          maxLength={6}
                          className="w-full bg-white/5 border border-white/8 rounded-2xl pl-11 pr-12 py-3.5 text-white/90 text-[14px] font-medium placeholder-white/15 focus:outline-none transition-all duration-300 lg:text-base lg:px-4 lg:py-3"
                          onFocus={(e) => {
                            e.currentTarget.style.borderColor = `rgba(${accentRgb},0.30)`;
                            e.currentTarget.style.background = `rgba(${accentRgb},0.02)`;
                            e.currentTarget.style.boxShadow = `0 0 24px rgba(${accentRgb},0.08)`;
                          }}
                          onBlur={(e) => {
                            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
                            e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                            e.currentTarget.style.boxShadow = 'none';
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPin(!showConfirmPin)}
                          className={toggleBtnClass}
                        >
                          {showConfirmPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      {/* PIN match indicator */}
                      {confirmPin.length > 0 && (
                        <motion.p
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className={`text-[10px] mt-1.5 font-medium ${
                            pin === confirmPin ? 'text-emerald-400' : 'text-red-400'
                          }`}
                        >
                          {pin === confirmPin ? '✓ PIN cocok' : '✗ PIN tidak cocok'}
                        </motion.p>
                      )}
                    </div>

                    {/* Submit */}
                    <motion.button
                      type="submit"
                      disabled={isSubmitting}
                      whileHover={{ scale: 1.01, y: -1 }}
                      whileTap={{ scale: 0.98 }}
                      className="w-full py-4 lg:py-3.5 flex items-center justify-center gap-2.5 text-[14px] font-bold mt-2 disabled:opacity-50 disabled:pointer-events-none rounded-2xl transition-all duration-300 cursor-pointer"
                      style={{
                        background: `linear-gradient(135deg, rgba(${accentRgb},0.20) 0%, rgba(${accentRgb},0.08) 100%)`,
                        border: `1.5px solid rgba(${accentRgb},0.30)`,
                        color: accentHex,
                      }}
                    >
                      {isSubmitting ? (
                        <motion.div
                          className="w-4 h-4 border-2 rounded-full"
                          style={{
                            borderColor: `rgba(${accentRgb},0.20)`,
                            borderTopColor: accentHex,
                          }}
                          animate={{ rotate: 360 }}
                          transition={{ repeat: Infinity, duration: 0.6 }}
                        />
                      ) : (
                        <UserPlus className="w-4 h-4" />
                      )}
                      {isSubmitting ? 'Mendaftar...' : 'Daftar'}
                    </motion.button>
                  </motion.form>
                ) : (
                  /* ═══════════════════════════════════════
                     LOGIN FORM
                     ═══════════════════════════════════════ */
                  <motion.form
                    key="masuk"
                    onSubmit={handleLogin}
                    className="space-y-4"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -12 }}
                    transition={{ delay: 0.05, duration: 0.35 }}
                    data-form-type="other"
                    autoComplete="off"
                  >
                    {/* Anti-autofill */}
                    <input type="text" name="prevent_autofill_username" autoComplete="off" className="hidden" tabIndex={-1} />
                    <input type="password" name="prevent_autofill_password" autoComplete="off" className="hidden" tabIndex={-1} />

                    {/* Phone */}
                    <div>
                      <label className={labelClass}>Nomor HP</label>
                      <div className="relative group">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
                          <Phone className="w-4 h-4 text-white/15 group-focus-within:text-white/40 transition-colors duration-300" />
                        </div>
                        <input
                          type="tel"
                          value={loginPhone}
                          onChange={(e) => setLoginPhone(e.target.value)}
                          placeholder="08xxxxxxxxxx"
                          autoComplete="off"
                          data-form-type="other"
                          data-lpignore="true"
                          autoFocus
                          className="w-full bg-white/5 border border-white/8 rounded-2xl pl-11 pr-14 py-3.5 text-white/90 text-[14px] font-medium placeholder-white/15 focus:outline-none transition-all duration-300 lg:text-base lg:px-4 lg:py-3"
                          onFocus={(e) => {
                            e.currentTarget.style.borderColor = `rgba(${accentRgb},0.30)`;
                            e.currentTarget.style.background = `rgba(${accentRgb},0.02)`;
                            e.currentTarget.style.boxShadow = `0 0 24px rgba(${accentRgb},0.08)`;
                          }}
                          onBlur={(e) => {
                            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
                            e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                            e.currentTarget.style.boxShadow = 'none';
                          }}
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-white/15 font-medium pointer-events-none">
                          +62
                        </span>
                      </div>
                    </div>

                    {/* PIN */}
                    <div>
                      <label className={labelClass}>PIN</label>
                      <div className="relative group">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
                          <Lock className="w-4 h-4 text-white/15 group-focus-within:text-white/40 transition-colors duration-300" />
                        </div>
                        <input
                          type={showLoginPin ? 'text' : 'password'}
                          value={loginPin}
                          onChange={(e) => {
                            const val = e.target.value.replace(/\D/g, '');
                            if (val.length <= 6) setLoginPin(val);
                          }}
                          placeholder="••••••"
                          autoComplete="off"
                          data-form-type="other"
                          data-lpignore="true"
                          inputMode="numeric"
                          pattern="\d{4,6}"
                          maxLength={6}
                          className="w-full bg-white/5 border border-white/8 rounded-2xl pl-11 pr-12 py-3.5 text-white/90 text-[14px] font-medium placeholder-white/15 focus:outline-none transition-all duration-300 lg:text-base lg:px-4 lg:py-3"
                          onFocus={(e) => {
                            e.currentTarget.style.borderColor = `rgba(${accentRgb},0.30)`;
                            e.currentTarget.style.background = `rgba(${accentRgb},0.02)`;
                            e.currentTarget.style.boxShadow = `0 0 24px rgba(${accentRgb},0.08)`;
                          }}
                          onBlur={(e) => {
                            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
                            e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                            e.currentTarget.style.boxShadow = 'none';
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => setShowLoginPin(!showLoginPin)}
                          className={toggleBtnClass}
                        >
                          {showLoginPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {/* Submit */}
                    <motion.button
                      type="submit"
                      disabled={isSubmitting}
                      whileHover={{ scale: 1.01, y: -1 }}
                      whileTap={{ scale: 0.98 }}
                      className="w-full py-4 lg:py-3.5 flex items-center justify-center gap-2.5 text-[14px] font-bold mt-2 disabled:opacity-50 disabled:pointer-events-none rounded-2xl transition-all duration-300 cursor-pointer"
                      style={{
                        background: `linear-gradient(135deg, rgba(${accentRgb},0.20) 0%, rgba(${accentRgb},0.08) 100%)`,
                        border: `1.5px solid rgba(${accentRgb},0.30)`,
                        color: accentHex,
                      }}
                    >
                      {isSubmitting ? (
                        <motion.div
                          className="w-4 h-4 border-2 rounded-full"
                          style={{
                            borderColor: `rgba(${accentRgb},0.20)`,
                            borderTopColor: accentHex,
                          }}
                          animate={{ rotate: 360 }}
                          transition={{ repeat: Infinity, duration: 0.6 }}
                        />
                      ) : (
                        <LogIn className="w-4 h-4" />
                      )}
                      {isSubmitting ? 'Memverifikasi...' : 'Masuk'}
                    </motion.button>
                  </motion.form>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
