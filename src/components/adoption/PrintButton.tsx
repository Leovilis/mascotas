'use client';

export function PrintButton() {
  return (
    <button type="button" onClick={() => window.print()} className="print:hidden px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-bold">
      Imprimir
    </button>
  );
}
