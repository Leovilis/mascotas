import { redirect } from 'next/navigation';

/**
 * Antes había acá un login con usuario y contraseña escritos en el código.
 * El ingreso ahora se hace en /admin con la clave ADMIN_API_KEY verificada en el servidor.
 */
export default function AdminLoginPage() {
  redirect('/admin');
}
