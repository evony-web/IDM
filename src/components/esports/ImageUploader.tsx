'use client';

import { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, X, ImagePlus, Loader2, Check, AlertCircle } from 'lucide-react';

interface ImageUploaderProps {
  division: 'male' | 'female';
  onUpload: (url: string) => void;
  currentImage?: string | null;
  className?: string;
}

export function ImageUploader({ division, onUpload, currentImage, className = '' }: ImageUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentImage || null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isMale = division === 'male';
  const accentColor = isMale ? '#73FF00' : '#38BDF8';

  const uploadToCloudinary = useCallback(async (file: File): Promise<string | null> => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', 'avatars');

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Upload gagal');
      }

      return data.url; // Cloudinary CDN URL (WebP)
    } catch {
      return null;
    }
  }, []);

  const handleFile = useCallback(async (file: File) => {
    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setError('Tipe file tidak didukung. Gunakan JPG, PNG, GIF, atau WebP');
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      setError('Ukuran file terlalu besar. Maksimal 5MB');
      return;
    }

    setError(null);
    setIsUploading(true);

    // Create local preview immediately
    const localPreview = URL.createObjectURL(file);
    setPreviewUrl(localPreview);

    try {
      // Upload to Cloudinary (WebP + resize + CDN)
      const cdnUrl = await uploadToCloudinary(file);

      if (cdnUrl) {
        setPreviewUrl(cdnUrl);
        onUpload(cdnUrl);
      } else {
        setError('Gagal upload ke server. Coba lagi.');
        setPreviewUrl(null);
      }
    } catch {
      setError('Gagal memproses gambar');
      setPreviewUrl(null);
    } finally {
      URL.revokeObjectURL(localPreview);
      setIsUploading(false);
    }
  }, [onUpload, uploadToCloudinary]);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  }, [handleFile]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  }, [handleFile]);

  const handleClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleRemove = useCallback(() => {
    setPreviewUrl(null);
    setError(null);
    onUpload('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [onUpload]);

  return (
    <div className={className}>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp"
        onChange={handleChange}
        className="hidden"
      />

      <AnimatePresence mode="wait">
        {previewUrl ? (
          <motion.div
            key="preview"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="relative"
          >
            <div
              className="relative rounded-xl overflow-hidden"
              style={{
                background: 'rgba(255,255,255,0.03)',
                border: `1px solid ${isMale ? 'rgba(115,255,0,0.2)' : 'rgba(56, 189, 248,0.2)'}`,
              }}
            >
              <div className="flex items-center gap-3 p-3">
                {/* Image Preview */}
                <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-lg overflow-hidden flex-shrink-0">
                  <img
                    src={previewUrl}
                    alt="Avatar preview"
                    className="w-full h-full object-cover"
                  />
                  {isUploading && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center backdrop-blur-sm">
                      <Loader2
                        className="w-5 h-5 animate-spin"
                        style={{ color: accentColor }}
                      />
                    </div>
                  )}
                </div>

                {/* Info & Actions */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    {!isUploading && (
                      <div
                        className="w-5 h-5 rounded-full flex items-center justify-center"
                        style={{
                          background: accentColor,
                          boxShadow: `0 0 8px ${accentColor}40`,
                        }}
                      >
                        <Check className="w-3 h-3 text-black" strokeWidth={3} />
                      </div>
                    )}
                    <p className="text-xs font-semibold text-white/80 truncate">
                      {isUploading ? 'Mengupload...' : 'Avatar Dipilih'}
                    </p>
                  </div>
                  <p className="text-[10px] text-white/40 mt-0.5">
                    WebP • Auto-resize • CDN cached
                  </p>
                </div>

                {!isUploading && (
                  <motion.button
                    onClick={handleRemove}
                    className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-white/40 hover:text-white/70 hover:bg-white/10 transition-colors flex-shrink-0"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    title="Hapus avatar"
                  >
                    <X className="w-4 h-4" />
                  </motion.button>
                )}
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="upload"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
          >
            <motion.button
              onClick={handleClick}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              className="w-full rounded-xl overflow-hidden cursor-pointer group"
              style={{
                background: dragActive
                  ? isMale
                    ? 'rgba(115,255,0,0.08)'
                    : 'rgba(56, 189, 248,0.08)'
                  : 'rgba(255,255,255,0.03)',
                border: dragActive
                  ? `2px dashed ${accentColor}`
                  : '2px dashed rgba(255,255,255,0.15)',
                transition: 'all 0.2s ease',
              }}
              whileHover={{ scale: 1.005 }}
              whileTap={{ scale: 0.995 }}
            >
              {/* Mobile: Square layout */}
              <div className="aspect-square flex flex-col items-center justify-center p-6 sm:hidden">
                <motion.div
                  className={`w-14 h-14 rounded-xl flex items-center justify-center mb-3 transition-colors`}
                  style={{
                    background: dragActive
                      ? isMale
                        ? 'rgba(115,255,0,0.15)'
                        : 'rgba(56, 189, 248,0.15)'
                      : 'rgba(255,255,255,0.05)',
                  }}
                  animate={dragActive ? { scale: [1, 1.1, 1] } : {}}
                  transition={{ duration: 0.3 }}
                >
                  {dragActive ? (
                    <Upload className="w-6 h-6" style={{ color: accentColor }} />
                  ) : (
                    <ImagePlus className="w-6 h-6 text-white/30 group-hover:text-white/50 transition-colors" />
                  )}
                </motion.div>

                <div className="text-center">
                  <p
                    className="text-sm font-semibold mb-1"
                    style={{ color: dragActive ? accentColor : 'rgba(255,255,255,0.6)' }}
                  >
                    {dragActive ? 'Lepaskan di sini' : 'Upload Avatar'}
                  </p>
                  <p className="text-xs text-white/30">
                    Klik atau drag & drop
                  </p>
                  <p className="text-[10px] text-white/20 mt-1">
                    WebP • Auto-resize • CDN cached • Maks 5MB
                  </p>
                </div>
              </div>

              {/* Desktop: Compact horizontal layout */}
              <div className="hidden sm:flex items-center gap-3 p-3">
                <motion.div
                  className={`w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors`}
                  style={{
                    background: dragActive
                      ? isMale
                        ? 'rgba(115,255,0,0.15)'
                        : 'rgba(56, 189, 248,0.15)'
                      : 'rgba(255,255,255,0.05)',
                  }}
                  animate={dragActive ? { scale: [1, 1.1, 1] } : {}}
                  transition={{ duration: 0.3 }}
                >
                  {dragActive ? (
                    <Upload className="w-5 h-5" style={{ color: accentColor }} />
                  ) : (
                    <ImagePlus className="w-5 h-5 text-white/30 group-hover:text-white/50 transition-colors" />
                  )}
                </motion.div>

                <div className="flex-1 text-left">
                  <p
                    className="text-xs font-semibold"
                    style={{ color: dragActive ? accentColor : 'rgba(255,255,255,0.6)' }}
                  >
                    {dragActive ? 'Lepaskan di sini' : 'Upload Avatar'}
                  </p>
                  <p className="text-[10px] text-white/30 mt-0.5">
                    WebP • Auto-resize • CDN cached • Maks 5MB
                  </p>
                </div>

                <div className="flex-shrink-0 px-2.5 py-1.5 rounded-lg bg-white/5 border border-white/10">
                  <span className="text-[10px] text-white/30 font-medium">Pilih File</span>
                </div>
              </div>
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error message */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -8, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: -8, height: 0 }}
            className="mt-2 flex items-center gap-2 px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/20"
          >
            <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
            <p className="text-xs text-red-400">{error}</p>
            <button
              onClick={() => setError(null)}
              className="ml-auto text-red-400/60 hover:text-red-400"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
