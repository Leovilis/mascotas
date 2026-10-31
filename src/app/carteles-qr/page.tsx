'use client';

import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { QrCode, Printer, Download, MapPin, Sparkles, Home, ExternalLink } from 'lucide-react';
import { useRegion } from '@/components/region/RegionProvider';
import { RegionConfig, SITE_URL } from '@/config/regions';

export default function CartelesQRPage() {
  const { region } = useRegion();
  // key: al cambiar de provincia se reinicia el formulario con los textos de esa provincia
  return <CartelesQRInner key={region.slug} region={region} />;
}

function CartelesQRInner({ region }: { region: RegionConfig }) {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [campaign, setCampaign] = useState(region.qrCampaignDefault);
  const [targetType, setTargetType] = useState('home');
  const [customOrigin, setCustomOrigin] = useState('');

  const posterRef = useRef<HTMLDivElement>(null);

  const PROD_BASE_URL = SITE_URL;
  // ?region=... hace que quien escanee el QR vea directamente los avisos de esta provincia
  const regionQuery = `?region=${region.slug}`;

  useEffect(() => {
    let targetUrl = `${PROD_BASE_URL}/${regionQuery}`;

    if (targetType === 'home') {
      targetUrl = `${PROD_BASE_URL}/${regionQuery}`;
    } else if (targetType === 'general') {
      targetUrl = `${PROD_BASE_URL}/publicar/perdida${regionQuery}`;
    } else if (targetType === 'mapa') {
      targetUrl = `${PROD_BASE_URL}/mapa${regionQuery}`;
    }

    QRCode.toDataURL(targetUrl, {
      width: 400,
      margin: 2,
      errorCorrectionLevel: 'H',
      color: {
        dark: '#ea580c', // Orange-600
        light: '#ffffff',
      },
    }).then(setQrDataUrl);
  }, [targetType, PROD_BASE_URL, regionQuery]);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadQR = () => {
    if (!qrDataUrl) return;
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = `qr-mascotas-${region.slug}-${targetType}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const currentUrl = targetType === 'home' 
    ? `${PROD_BASE_URL}/${regionQuery}`
    : targetType === 'general'
      ? `${PROD_BASE_URL}/publicar/perdida${regionQuery}`
      : `${PROD_BASE_URL}/mapa${regionQuery}`;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 print:p-0 print:m-0 print:max-w-none print:w-full print:space-y-0">
      
      {/* Header (Oculto en Impresión) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-5 print:hidden">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-100 dark:bg-orange-950/60 text-orange-700 dark:text-orange-300 text-xs font-bold uppercase mb-1">
            <QrCode className="w-3.5 h-3.5" />
            Estrategia de Difusión Física
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-zinc-900 dark:text-white">
            Generador de Carteles y Códigos QR
          </h1>
          <p className="text-sm text-zinc-500">
            Generá el QR oficial de la página principal o secciones clave para veterinarias, plazas y comercios de {region.provinceName}.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={handleDownloadQR}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-white font-bold text-xs shadow-sm transition-all cursor-pointer"
          >
            <Download className="w-4 h-4" />
            Descargar PNG
          </button>
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            Imprimir Cartel A4
          </button>
        </div>
      </div>

      {/* Controles del Cartel (Ocultos en Impresión) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-5 rounded-2xl bg-zinc-100 dark:bg-zinc-900 text-xs border border-zinc-200 dark:border-zinc-800 print:hidden">
        <div>
          <label className="block font-bold text-zinc-700 dark:text-zinc-300 mb-1">
            Destino del Código QR:
          </label>
          <select
            value={targetType}
            onChange={(e) => setTargetType(e.target.value)}
            className="w-full p-2.5 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 font-bold text-zinc-900 dark:text-white cursor-pointer focus:ring-2 focus:ring-orange-500 focus:outline-none"
          >
            <option value="home">🏠 Página Principal (Inicio - /)</option>
            <option value="general">🚨 Publicar Mascota Perdida Express (/publicar/perdida)</option>
            <option value="mapa">🗺️ Ver Mapa en Vivo de {region.provinceName} (/mapa)</option>
          </select>
          <p className="mt-1.5 text-[11px] text-zinc-500 flex items-center gap-1">
            <ExternalLink className="w-3 h-3 text-orange-500" />
            Enlace destino: <span className="font-mono text-zinc-700 dark:text-zinc-300 font-semibold">{currentUrl}</span>
          </p>
        </div>

        <div>
          <label className="block font-bold text-zinc-700 dark:text-zinc-300 mb-1">
            Ubicación / Campaña Asignada:
          </label>
          <input
            type="text"
            value={campaign}
            onChange={(e) => setCampaign(e.target.value)}
            placeholder={region.qrPlacePlaceholder}
            className="w-full p-2.5 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 font-semibold text-zinc-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:outline-none"
          />
          <p className="mt-1.5 text-[11px] text-zinc-500">
            Aparece al pie del afiche para registrar el punto físico de difusión.
          </p>
        </div>
      </div>

      {/* Preview del Cartel Imprimible A4 (Solo esto se imprime, en 1 sola hoja limpia) */}
      <div
        ref={posterRef}
        className="max-w-md mx-auto bg-white text-zinc-950 p-8 sm:p-10 rounded-3xl border-4 border-dashed border-orange-500 shadow-2xl text-center space-y-6 print:border-4 print:border-solid print:border-orange-600 print:shadow-none print:m-0 print:p-8 print:w-full print:max-w-none print:rounded-3xl print:break-inside-avoid print:page-break-inside-avoid"
      >
        <div className="space-y-1.5">
          <span className="text-5xl animate-bounce print:animate-none inline-block">🐾</span>
          {targetType === 'home' ? (
            <>
              <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-orange-600 uppercase">
                {region.brandName}
              </h2>
              <p className="text-sm sm:text-base font-extrabold text-zinc-800 uppercase tracking-wide">
                Red Comunitaria de Búsqueda y Rescate
              </p>
            </>
          ) : targetType === 'general' ? (
            <>
              <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-rose-600 uppercase">
                ¿Perdiste a tu Mascota?
              </h2>
              <p className="text-sm sm:text-base font-extrabold text-zinc-800 uppercase tracking-wide">
                Publicala en el mapa comunitario
              </p>
            </>
          ) : (
            <>
              <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-orange-600 uppercase">
                Mapa en Vivo
              </h2>
              <p className="text-sm sm:text-base font-extrabold text-zinc-800 uppercase tracking-wide">
                Alertas y Avistamientos en {region.provinceName}
              </p>
            </>
          )}
        </div>

        <div className="p-4 bg-orange-50 rounded-2xl border-2 border-orange-200">
          <p className="text-xs sm:text-sm font-bold text-orange-950 leading-relaxed">
            {targetType === 'home'
              ? `Escaneá con la cámara de tu celular para acceder a la plataforma comunitaria de ${region.mainCity}: reportá perdidas, encontradas o avistamientos.`
              : targetType === 'general'
              ? `Publicala GRATIS en menos de 60 segundos con foto y ubicación exacta en el mapa de ${region.provinceName}.`
              : 'Mirá en tiempo real los perros y gatos perdidos cerca de tu barrio o reportá si viste alguno.'}
          </p>
        </div>

        {/* Imagen del Código QR */}
        {qrDataUrl && (
          <div className="inline-block p-4 bg-white rounded-2xl shadow-md border-2 border-orange-500">
            <img src={qrDataUrl} alt="Código QR Página Principal" className="w-56 h-56 sm:w-64 sm:h-64 mx-auto" />
            <span className="block text-xs font-mono font-bold text-zinc-700 mt-2 tracking-wider">
              ESCANEA CON LA CÁMARA
            </span>
          </div>
        )}

        <div className="space-y-1.5 pt-3 border-t-2 border-zinc-200">
          <p className="text-xs sm:text-sm font-bold text-zinc-900 tracking-wide font-mono">
            {currentUrl}
          </p>
          <p className="text-xs text-zinc-600 font-bold">
            {campaign} • {region.mainCity}, {region.provinceName}
          </p>
        </div>
      </div>

    </div>
  );
}

