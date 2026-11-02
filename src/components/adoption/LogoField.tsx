'use client';

import React, { useState } from 'react';
import { Loader2, Upload } from 'lucide-react';
import { uploadPetPhoto } from '@/services/reports.service';
import { compressImage } from '@/lib/image-compressor';

export function LogoField({ initial }: { initial: string | null }) {
  const [url, setUrl] = useState(initial || '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="flex items-center gap-3">
      <input type="hidden" name="logo_url" value={url} />
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="Logo" className="w-16 h-16 rounded-2xl object-cover border border-zinc-200 dark:border-zinc-700" />
      ) : (
        <div className="w-16 h-16 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-2xl">🏠</div>
      )}
      <label className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 text-xs font-bold cursor-pointer">
        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />} {url ? 'Cambiar' : 'Subir logo'}
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            setBusy(true);
            setError(null);
            try {
              const small = await compressImage(file, 400, 400).then((r) => r.file).catch(() => file);
              setUrl(await uploadPetPhoto(small));
            } catch (err) {
              setError(err instanceof Error ? err.message : 'No se pudo subir');
            } finally {
              setBusy(false);
            }
          }}
        />
      </label>
      {error && <span className="text-xs text-rose-600">{error}</span>}
    </div>
  );
}
