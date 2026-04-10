'use client';

import { useCallback, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, X, Image as ImageIcon, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { compressImageToBase64 } from '@/lib/image-utils';

interface ImageUploadProps {
  value?: string | null;
  onChange: (url: string | null) => void;
  accept?: string;
  maxSize?: number; // in MB
  className?: string;
  disabled?: boolean;
  onUpload?: (file: File) => Promise<string>;
  /** Max width for base64 compression (default: 400) */
  maxWidth?: number;
  /** JPEG quality 0-1 for base64 compression (default: 0.5) */
  quality?: number;
  /** Max base64 output size in bytes (default: 200KB) */
  maxBase64Size?: number;
}

/**
 * ImageUpload component that converts images to base64 data URLs.
 * This ensures images persist across sessions and work on serverless platforms like Vercel.
 * 
 * Note: Base64 images are stored directly in the database, so keep maxSize reasonable (default 5MB).
 */
export function ImageUpload({
  value,
  onChange,
  accept = 'image/*',
  maxSize = 5,
  className,
  disabled = false,
  onUpload,
  maxWidth = 400,
  quality = 0.5,
  maxBase64Size = 200 * 1024,
}: ImageUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    async (file: File) => {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setError('File harus berupa gambar');
        return;
      }

      // Validate file size (5MB max input, will be compressed to ~100KB)
      if (file.size > 5 * 1024 * 1024) {
        setError('Ukuran file maksimal 5MB');
        return;
      }

      setError(null);
      setIsUploading(true);

      try {
        if (onUpload) {
          // Use custom upload handler if provided
          const url = await onUpload(file);
          onChange(url);
        } else {
          // Compress to maxWidth, quality, maxBase64Size
          const base64Url = await compressImageToBase64(file, maxWidth, quality, maxBase64Size);
          console.log(`[ImageUpload] Compressed: ${file.size} bytes -> ${base64Url.length} chars base64 (${Math.round(base64Url.length / 1024)}KB)`);
          onChange(base64Url);
        }
      } catch (err) {
        setError('Gagal memproses gambar');
        console.error(err);
      } finally {
        setIsUploading(false);
      }
    },
    [onChange, onUpload]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      if (disabled) return;

      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [disabled, handleFile]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleClick = useCallback(() => {
    if (disabled) return;
    inputRef.current?.click();
  }, [disabled]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleRemove = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onChange(null);
    },
    [onChange]
  );

  return (
    <div
      className={cn(
        'relative rounded-xl border-2 border-dashed transition-all duration-200 overflow-hidden',
        isDragging ? 'border-amber-400 bg-amber-400/5' : 'border-white/10 hover:border-white/20',
        disabled && 'opacity-50 cursor-not-allowed',
        className
      )}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onClick={handleClick}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleChange}
        disabled={disabled}
        className="hidden"
      />

      <AnimatePresence mode="wait">
        {value ? (
          <motion.div
            key="preview"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="relative w-full h-full"
          >
            <img
              src={value}
              alt="Preview"
              className="w-full h-full object-cover rounded-xl"
            />
            <button
              onClick={handleRemove}
              className="absolute top-1 right-1 p-1 rounded-full bg-black/60 hover:bg-black/80 transition-colors"
            >
              <X className="w-3 h-3 text-white" />
            </button>
          </motion.div>
        ) : (
          <motion.div
            key="placeholder"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center w-full h-full py-4"
          >
            {isUploading ? (
              <Loader2 className="w-6 h-6 text-amber-400 animate-spin" />
            ) : (
              <>
                <div className="w-8 h-8 rounded-lg bg-amber-400/10 flex items-center justify-center mb-2">
                  {isDragging ? (
                    <ImageIcon className="w-4 h-4 text-amber-400" />
                  ) : (
                    <Upload className="w-4 h-4 text-amber-400" />
                  )}
                </div>
                <p className="text-[10px] text-white/60 font-medium text-center">
                  {isDragging ? 'Lepaskan' : 'Upload'}
                </p>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute bottom-2 left-2 right-2 px-3 py-2 rounded-lg bg-red-500/20 border border-red-500/30"
          >
            <p className="text-xs text-red-400">{error}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
