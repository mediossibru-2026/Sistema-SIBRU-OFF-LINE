// js/db.js
import Dexie from 'https://cdn.jsdelivr.net/npm/dexie@3.2.4/dist/dexie.mjs';
import { APP_CONFIG } from './config.js';

export const db = new Dexie('SibruTicketDB');

db.version(1).stores({
  products: 'clave, nombre, linea, activo',
  tickets: 'folio, fecha, cajeroId, synced',
  syncQueue: '++id, ticketFolio, timestamp, status',
  settings: 'key'
});

export async function initDB() {
  const count = await db.settings.count();
  if (count === 0) {
    await db.settings.bulkPut([
      { key: 'folioActual', value: APP_CONFIG.folioInicial - 1 },
      { key: 'formasPago', value: APP_CONFIG.formasPagoDefault },
      { key: 'logoBase64', value: null }
    ]);
  }
}

// Función auxiliar para cargar el seed inicial (usar solo una vez desde la consola o admin)
export async function cargarSeedProductos(productsArray) {
  await db.products.clear();
  await db.products.bulkPut(productsArray);
  console.log(`✅ ${productsArray.length} productos cargados en IndexedDB`);
}
