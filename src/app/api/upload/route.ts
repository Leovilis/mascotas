import { randomUUID } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { rateLimit } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

/** Las fotos se comprimen en el navegador (~150 KB); 5 MB deja margen sin permitir abusos */
const MAX_BYTES = 5 * 1024 * 1024;

/** Solo imágenes. El tipo se verifica por los primeros bytes del archivo, no por el nombre. */
function detectImageType(buf: Buffer): { mime: string; ext: string } | null {
  if (buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return { mime: 'image/jpeg', ext: 'jpg' };
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return { mime: 'image/png', ext: 'png' };
  if (buf.subarray(0, 4).toString('ascii') === 'RIFF' && buf.subarray(8, 12).toString('ascii') === 'WEBP') return { mime: 'image/webp', ext: 'webp' };
  if (buf.subarray(0, 6).toString('ascii') === 'GIF87a' || buf.subarray(0, 6).toString('ascii') === 'GIF89a') return { mime: 'image/gif', ext: 'gif' };
  return null;
}

export async function POST(req: NextRequest) {
  // 20 fotos cada 10 minutos por IP alcanza para publicar con varias fotos
  if (!rateLimit(req, 'upload', 20, 10 * 60 * 1000)) {
    return NextResponse.json({ error: 'Demasiadas subidas seguidas. Esperá unos minutos.' }, { status: 429 });
  }

  const declaredLength = Number(req.headers.get('content-length') || 0);
  if (declaredLength > MAX_BYTES + 64 * 1024) {
    return NextResponse.json({ error: 'La imagen supera los 5 MB.' }, { status: 413 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file');

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'No se envió ningún archivo' }, { status: 400 });
    }
    if (file.size === 0 || file.size > MAX_BYTES) {
      return NextResponse.json({ error: 'La imagen supera los 5 MB o está vacía.' }, { status: 413 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const type = detectImageType(buffer);
    if (!type) {
      return NextResponse.json({ error: 'Formato no permitido. Usá JPG, PNG, WEBP o GIF.' }, { status: 415 });
    }

    const supabase = createAdminClient();
    const bucketName = 'pet-photos';
    const filePath = `reports/${Date.now()}_${randomUUID()}.${type.ext}`;

    const { error: uploadError } = await supabase.storage.from(bucketName).upload(filePath, buffer, {
      contentType: type.mime,
      cacheControl: '31536000',
      upsert: false,
    });

    if (uploadError) {
      console.error('Error al subir a Supabase Storage:', uploadError);
      return NextResponse.json({ error: 'No se pudo guardar la imagen.' }, { status: 500 });
    }

    const { data: publicUrlData } = supabase.storage.from(bucketName).getPublicUrl(filePath);
    return NextResponse.json({ url: publicUrlData.publicUrl });
  } catch (error) {
    console.error('Error en /api/upload:', error);
    return NextResponse.json({ error: 'Error interno al subir imagen' }, { status: 500 });
  }
}
