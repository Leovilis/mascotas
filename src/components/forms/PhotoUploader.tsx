'use client';

import React, { useState } from 'react';
import { Camera, UploadCloud, X, Plus, Image as ImageIcon } from 'lucide-react';

interface PhotoUploaderProps {
  photos: string[];
  onChange: (photos: string[]) => void;
  maxPhotos?: number;
  label?: string;
  helperText?: string;
}

export default function PhotoUploader({
  photos,
  onChange,
  maxPhotos = 3,
  label = 'Fotografía de la mascota',
  helperText = 'Subí al menos una foto clara donde se distinga el color, tamaño y rasgos.',
}: PhotoUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    if (file.size > 5 * 1024 * 1024) {
      alert('La imagen no puede pesar más de 5MB');
      return;
    }

    setIsUploading(true);

    try {
      // 1. Comprimir en cliente (Canvas) a máx 1000px y calidad 0.75 (~50-80KB)
      const { compressImage } = await import('@/lib/image-compressor');
      const { file: compressedFile } = await compressImage(file, 1000, 1000, 0.75);

      // 2. Subir al endpoint seguro /api/upload
      const formData = new FormData();
      formData.append('file', compressedFile);

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        const json = await res.json();
        if (json.url) {
          onChange([...photos, json.url]);
          setIsUploading(false);
          return;
        }
      }

      // Si /api/upload falla, intentar subir directamente con cliente de Supabase
      const { uploadPetPhoto } = await import('@/services/reports.service');
      const directUrl = await uploadPetPhoto(compressedFile);
      if (directUrl && !directUrl.startsWith('data:')) {
        onChange([...photos, directUrl]);
        setIsUploading(false);
        return;
      }

      alert('No se pudo subir la foto al servidor. Por favor, verificá tu conexión y volvé a intentar.');
    } catch (err) {
      console.error('Error al procesar foto:', err);
      alert('Ocurrió un error al procesar la imagen.');
    } finally {
      setIsUploading(false);
    }
  };

  const removePhoto = (index: number) => {
    const next = photos.filter((_, i) => i !== index);
    onChange(next);
  };

  return (
    <div className="space-y-2">
      <label className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
        <Camera className="w-4 h-4 text-orange-500" />
        {label} <span className="text-rose-500">*</span>
      </label>
      <p className="text-xs text-zinc-500">{helperText}</p>

      <div className="grid grid-cols-3 gap-3">
        {photos.map((photoUrl, idx) => (
          <div key={idx} className="relative aspect-square rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-800 group shadow-xs">
            <img src={photoUrl} alt={`Foto ${idx + 1}`} className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={() => removePhoto(idx)}
              aria-label="Eliminar foto"
              className="absolute top-1.5 right-1.5 w-6 h-6 bg-rose-600 text-white rounded-full flex items-center justify-center opacity-90 group-hover:opacity-100 shadow-md transition-opacity"
            >
              <X className="w-3.5 h-3.5" />
            </button>
            {idx === 0 && (
              <span className="absolute bottom-1.5 left-1.5 bg-black/60 backdrop-blur-xs text-white text-[10px] px-1.5 py-0.5 rounded font-medium">
                Principal
              </span>
            )}
          </div>
        ))}

        {photos.length < maxPhotos && (
          <label className="aspect-square rounded-xl border-2 border-dashed border-zinc-300 dark:border-zinc-700 hover:border-orange-500 dark:hover:border-orange-500 bg-zinc-50 dark:bg-zinc-900/50 flex flex-col items-center justify-center p-3 text-center cursor-pointer transition-colors group">
            <UploadCloud className="w-6 h-6 text-zinc-400 group-hover:text-orange-500 transition-colors mb-1" />
            <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              {isUploading ? 'Procesando...' : 'Subir foto'}
            </span>
            <span className="text-[10px] text-zinc-400">JPG, PNG o WebP</span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileSelect}
              disabled={isUploading}
            />
          </label>
        )}
      </div>
    </div>
  );
}
