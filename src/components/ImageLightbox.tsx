import React, { useCallback, useEffect, useState } from 'react';
import { useI18n } from '../I18nContext';

export type ImageLightboxState = { src: string; alt: string } | null;

export function useImageLightbox() {
  const [image, setImage] = useState<ImageLightboxState>(null);

  const handleImageClick = useCallback((e: React.MouseEvent<HTMLElement>) => {
    const target = e.target as HTMLElement;
    if (target.tagName !== 'IMG') return;
    const img = target as HTMLImageElement;
    e.preventDefault();
    e.stopPropagation();
    setImage({ src: img.currentSrc || img.src, alt: img.alt || '' });
  }, []);

  const closeLightbox = useCallback(() => setImage(null), []);

  useEffect(() => {
    if (!image) return;
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === 'Escape') setImage(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [image]);

  useEffect(() => {
    if (!image) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [image]);

  return { image, handleImageClick, closeLightbox };
}

interface ImageLightboxProps {
  image: ImageLightboxState;
  onClose: () => void;
}

export function ImageLightbox({ image, onClose }: ImageLightboxProps) {
  const { t } = useI18n();

  if (!image) return null;

  return (
    <div
      className="fixed inset-0 z-[10050] flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))]"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={image.alt || 'Image preview'}
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute top-[max(1rem,env(safe-area-inset-top))] right-[max(1rem,env(safe-area-inset-right))] z-10 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white ring-1 ring-white/30 transition-colors hover:bg-white/20"
        aria-label={t('close') || 'Close'}
      >
        <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
      <img
        src={image.src}
        alt={image.alt}
        onClick={(e) => e.stopPropagation()}
        className="max-h-[min(90vh,900px)] max-w-[min(95vw,1200px)] cursor-default select-none object-contain rounded-lg shadow-2xl"
        draggable={false}
      />
    </div>
  );
}
