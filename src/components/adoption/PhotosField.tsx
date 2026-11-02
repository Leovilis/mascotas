'use client';

import React, { useRef, useState } from 'react';
import { ImagePlus, Loader2, X } from 'lucide-react';
import { uploadPetPhoto } from '@/services/reports.service';
import { compressImage } from '@/lib/image-compressor';

/** Subida de fotos (hasta `max`). Las URLs viajan al servidor en un input oculto como JSON. */
export function PhotosField({ name = 'photos', initial = [], max = 6 }: { name?: string; initial?: string[]; max?: number }) {
  const [photos, setPhotos] = useState<string[]>(initial);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const onFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setError(null);
    setUploading(true);
    try {
      const room = max - photos.length;
      const added: string[] = [];
      for (const file of Array.from(files).slice(0, room)) {
        const compressed = await compressImage(file).then((r) => r.file).catch(() => file);
        added.push(await uploadPetPhoto(compressed));
      }
      setPhotos((p) => [...p, ...added].slice(0, max));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo subir la foto');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-2">
      <input type="hidden" name={name} value={JSON.stringify(photos)} />
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
        {photos.map((url, i) => (
          <div key={url} className="relative aspect-square rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-700">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt={`Foto ${i + 1}`} className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={() => setPhotos((p) => p.filter((u) => u !== url))}
              className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center"
              aria-label="Quitar foto"
            >
              <X className="w-3.5 h-3.5" />
            </button>
            {i === 0 && <span className="absolute bottom-1 left-1 text-[10px] font-bold bg-emerald-600 text-white px-1.5 rounded">Principal</span>}
          </div>
        ))}
        {photos.length < max && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="aspect-square rounded-xl border-2 border-dashed border-zinc-300 dark:border-zinc-700 flex flex-col items-center justify-center gap-1 text-xs font-bold text-zinc-500 hover:border-emerald-500 hover:text-emerald-600"
          >
            {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <ImagePlus className="w-5 h-5" />}
            {uploading ? 'Subiendo…' : 'Agregar'}
          </button>
        )}
      </div>
      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" multiple className="hidden" onChange={(e) => onFiles(e.target.files)} />
      {error && <p className="text-xs text-rose-600 font-semibold">{error}</p>}
    </div>
  );
}
