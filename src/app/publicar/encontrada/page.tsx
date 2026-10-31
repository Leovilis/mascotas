'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function PublicarEncontradaRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/publicar/avistamiento');
  }, [router]);

  return (
    <div className="max-w-md mx-auto py-20 text-center space-y-3">
      <div className="w-8 h-8 border-3 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto" />
      <p className="text-xs text-zinc-500">Redirigiendo al formulario unificado de avistamiento y tránsito...</p>
    </div>
  );
}
