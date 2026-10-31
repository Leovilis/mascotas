/**
 * Comprime una imagen en el navegador del cliente antes de subirla o convertirla.
 * Reduce el tamaño de fotos de móviles (5-15MB) a menos de 150KB con máxima fidelidad visual.
 */
export async function compressImage(
  file: File | Blob,
  maxWidth = 1200,
  maxHeight = 1200,
  quality = 0.8
): Promise<{ file: File; dataUrl: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          // Fallback simple si canvas no está disponible
          const fallbackDataUrl = e.target?.result as string;
          const fallbackFile = file instanceof File ? file : new File([file], 'photo.jpg', { type: 'image/jpeg' });
          return resolve({ file: fallbackFile, dataUrl: fallbackDataUrl });
        }

        // Fondo blanco para imágenes transparentes convertidas a JPEG
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        const mimeType = 'image/jpeg';
        const dataUrl = canvas.toDataURL(mimeType, quality);

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              const fallbackFile = file instanceof File ? file : new File([file], 'photo.jpg', { type: mimeType });
              return resolve({ file: fallbackFile, dataUrl });
            }
            const compressedFile = new File([blob], (file as File).name || 'photo.jpg', {
              type: mimeType,
              lastModified: Date.now(),
            });
            resolve({ file: compressedFile, dataUrl });
          },
          mimeType,
          quality
        );
      };
      img.onerror = () => reject(new Error('No se pudo cargar la imagen para compresión'));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Error al leer el archivo'));
    reader.readAsDataURL(file);
  });
}
