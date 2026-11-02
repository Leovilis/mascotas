import React from 'react';
import { REGION_LIST } from '@/config/regions';
import type { Association } from '@/lib/adoption/types';
import { Field } from './Notice';
import { PhoneInput, inputClass } from './FormBits';

/** Campos del formulario de asociación (alta y edición) */
export function AssociationFields({ value, defaultRegion, lockRegion }: { value?: Association | null; defaultRegion: string; lockRegion?: boolean }) {
  return (
    <div className="grid sm:grid-cols-2 gap-4">
      <Field label="Nombre de la asociación o refugio *">
        <input name="name" required maxLength={100} defaultValue={value?.name} className={inputClass} />
      </Field>
      <Field label="Email de contacto *" hint="Acá te llegan las solicitudes de adopción.">
        <input name="email" type="email" required maxLength={254} defaultValue={value?.email} className={inputClass} />
      </Field>
      <Field label="Provincia *" hint={lockRegion ? 'Para cambiarla, escribinos.' : undefined}>
        <select name="region_slug" defaultValue={value?.region_slug || defaultRegion} disabled={lockRegion} className={inputClass}>
          {REGION_LIST.map((r) => (
            <option key={r.slug} value={r.slug}>
              {r.provinceName}
            </option>
          ))}
        </select>
        {lockRegion && <input type="hidden" name="region_slug" value={value?.region_slug} />}
      </Field>
      <Field label="Ciudad *">
        <input name="city" required maxLength={80} defaultValue={value?.city || ''} className={inputClass} />
      </Field>
      <Field label="WhatsApp">
        <PhoneInput name="whatsapp" defaultValue={value?.whatsapp} placeholder="Ej: 388 412-3456" />
      </Field>
      <Field label="Teléfono">
        <PhoneInput name="phone" defaultValue={value?.phone} />
      </Field>
      <Field label="Instagram">
        <input name="instagram" maxLength={60} defaultValue={value?.instagram || ''} placeholder="@turefugio" className={inputClass} />
      </Field>
      <div className="sm:col-span-2">
        <Field label="Contá quiénes son" hint="Cuántos animales rescatan, cómo trabajan, requisitos para adoptar…">
          <textarea name="description" rows={4} maxLength={1000} defaultValue={value?.description || ''} className={inputClass} />
        </Field>
      </div>
    </div>
  );
}
