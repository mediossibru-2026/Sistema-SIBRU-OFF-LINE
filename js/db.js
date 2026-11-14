// js/db.js
import Dexie from 'https://cdn.jsdelivr.net/npm/dexie@3.2.4/dist/dexie.mjs';
import { APP_CONFIG } from './config.js';

export const db = new Dexie('SibruTicketDB');

// Definición de tablas e índices para búsquedas rápidas
db.version(1).stores({
  products: 'clave, nombre, linea, activo', // Índice compuesto para autocompletado
  tickets: 'folio, fecha, cajeroId, synced',
  syncQueue: '++id, ticketFolio, timestamp, status', // Cola de sincronización
  settings: 'key' // Almacena folioActual, formasPago, logoBase64
});

// Inicializa valores por defecto si es la primera vez que se abre
export async function initDB() {
  const settingsCount = await db.settings.count();
  if (settingsCount === 0) {
    await db.settings.bulkPut([
      { key: 'folioActual', value: APP_CONFIG.folioInicial - 1 },
      { key: 'formasPago', value: APP_CONFIG.formasPagoDefault },
      { key: 'logoBase64', value: null }
    ]);
  }
}

// Función para cargar el catálogo inicial (se ejecuta desde el Admin o primera vez en Caja)
export async function seedProducts(productsArray) {
  await db.products.clear();
  await db.products.bulkPut(productsArray);
  console.log(`${productsArray.length} productos cargados en IndexedDB`);
}
