// js/folio.js
import { db } from './db.js';
import { APP_CONFIG } from './config.js';

export async function generarNuevoFolio() {
  // 1. Obtener el último folio registrado en esta terminal
  const setting = await db.settings.get('folioActual');
  let ultimoFolio = setting ? setting.value : (APP_CONFIG.folioInicial - 1);
  
  // 2. Calcular el nuevo
  const nuevoFolio = ultimoFolio + 1;
  
  // 3. Persistir inmediatamente en IndexedDB (transacción atómica)
  await db.settings.put({ key: 'folioActual', value: nuevoFolio });
  
  return nuevoFolio;
}

export async function obtenerFolioActual() {
  const setting = await db.settings.get('folioActual');
  return setting ? setting.value : (APP_CONFIG.folioInicial - 1);
}

export async function actualizarFolioDesdeAdmin(nuevoValor) {
  await db.settings.put({ key: 'folioActual', value: parseInt(nuevoValor, 10) });
}
