// js/folio.js
import { db } from './db.js';
import { APP_CONFIG } from './config.js';

export async function generarNuevoFolio() {
  const setting = await db.settings.get('folioActual');
  let ultimo = setting ? setting.value : (APP_CONFIG.folioInicial - 1);
  const nuevo = ultimo + 1;
  await db.settings.put({ key: 'folioActual', value: nuevo });
  return nuevo;
}
