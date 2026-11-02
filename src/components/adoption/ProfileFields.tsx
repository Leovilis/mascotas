import React from 'react';
import type { AdopterProfile } from '@/lib/adoption/types';
import { Field } from './Notice';
import { DniInput, PhoneInput, inputClass } from './FormBits';

/** Datos personales del adoptante / responsable (privados) */
export function ProfileFields({ value }: { value?: AdopterProfile | null }) {
  return (
    <div className="grid sm:grid-cols-2 gap-4">
      <Field label="Nombre *">
        <input name="first_name" required maxLength={60} autoComplete="given-name" defaultValue={value?.first_name} className={inputClass} />
      </Field>
      <Field label="Apellido *">
        <input name="last_name" required maxLength={60} autoComplete="family-name" defaultValue={value?.last_name} className={inputClass} />
      </Field>
      <Field label="DNI *">
        <DniInput defaultValue={value?.dni} />
      </Field>
      <Field label="Teléfono / WhatsApp *">
        <PhoneInput name="phone" required defaultValue={value?.phone} placeholder="Ej: 388 412-3456" />
      </Field>
      <Field label="Domicilio *" hint="Calle, número y barrio">
        <input name="address" required maxLength={150} autoComplete="street-address" defaultValue={value?.address} className={inputClass} />
      </Field>
      <Field label="Ciudad">
        <input name="city" maxLength={80} autoComplete="address-level2" defaultValue={value?.city || ''} className={inputClass} />
      </Field>
    </div>
  );
}
