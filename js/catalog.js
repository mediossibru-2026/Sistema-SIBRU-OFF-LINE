// js/catalog.js
import { db } from './db.js';

// Caché en memoria: se carga una sola vez y se filtra en <1 ms
let cache = null;

async function getCache() {
  if (cache) return cache;
  const all = await db.products.toArray();
  cache = all.filter(p => p.activo !== false);
  return cache;
}

export async function buscarProducto(termino) {
  if (!termino || termino.length < 2) return [];
  const t = termino.toLowerCase().trim();
  const productos = await getCache();
  return productos
    .filter(p => p.clave === termino.trim() || p.nombre.toLowerCase().includes(t))
    .slice(0, 10);
}

// Para invalidar la caché cuando el admin edite productos
export function invalidarCache() {
  cache = null;
}
