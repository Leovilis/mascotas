import React from 'react';
import type { AdoptionAnimal } from '@/lib/adoption/types';
import { Field } from './Notice';
import { SubmitButton, inputClass } from './FormBits';
import { PhotosField } from './PhotosField';
import { saveAnimalAction } from '@/app/adopcion/actions';

export function AnimalForm({ animal }: { animal?: AdoptionAnimal | null }) {
  return (
    <form action={saveAnimalAction} className="space-y-4">
      {animal && <input type="hidden" name="id" value={animal.id} />}
      <Field label="Fotos" hint="La primera es la principal. Hasta 6.">
        <PhotosField initial={animal?.photos || []} />
      </Field>
      <div className="grid sm:grid-cols-3 gap-4">
        <Field label="Nombre *">
          <input name="name" required maxLength={50} defaultValue={animal?.name} className={inputClass} />
        </Field>
        <Field label="Especie *">
          <select name="species" defaultValue={animal?.species || 'dog'} className={inputClass}>
            <option value="dog">Perro</option>
            <option value="cat">Gato</option>
            <option value="other">Otro</option>
          </select>
        </Field>
        <Field label="Sexo">
          <select name="sex" defaultValue={animal?.sex || 'unknown'} className={inputClass}>
            <option value="female">Hembra</option>
            <option value="male">Macho</option>
            <option value="unknown">Sin dato</option>
          </select>
        </Field>
        <Field label="Edad aproximada">
          <input name="age" maxLength={40} defaultValue={animal?.age || ''} placeholder="Ej: 2 años, cachorro" className={inputClass} />
        </Field>
        <Field label="Tamaño">
          <select name="size" defaultValue={animal?.size || ''} className={inputClass}>
            <option value="">Sin dato</option>
            <option value="small">Chico</option>
            <option value="medium">Mediano</option>
            <option value="large">Grande</option>
          </select>
        </Field>
        <Field label="Raza">
          <input name="breed" maxLength={80} defaultValue={animal?.breed || ''} placeholder="Mestizo" className={inputClass} />
        </Field>
      </div>
      <Field label="Descripción" hint="Carácter, si se lleva bien con chicos u otros animales, cuidados especiales…">
        <textarea name="description" rows={4} maxLength={1500} defaultValue={animal?.description || ''} className={inputClass} />
      </Field>
      <label className="flex items-center gap-2 text-sm font-bold">
        <input type="checkbox" name="neutered" defaultChecked={animal?.neutered} /> Castrado/a
      </label>
      <SubmitButton>{animal ? 'Guardar cambios' : 'Cargar animal'}</SubmitButton>
    </form>
  );
}
