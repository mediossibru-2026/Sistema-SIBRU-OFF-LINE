// js/seed.js
import { db } from './db.js';

const URL_SEED = 'articulos.xlsx';
const INACTIVOS = new Set(['1471', '1268', '1066']);

function normalizarUnidad(u) {
  const t = (u || '').toUpperCase().trim();
  if (['KG', 'LTS', 'LT', 'LITRO'].includes(t)) return 'KG';
  if (t === 'SERVICIO') return 'SERVICIO';
  return 'PZA';
}

export async function cargarSeedDesdeExcel() {
  const res = await fetch(URL_SEED);
  if (!res.ok) throw new Error('No se encontró data/articulos.xlsx');
  const buf = await res.arrayBuffer();

  const XLSX = await import('https://cdn.sheetjs.com/xlsx-0.20.3/package/xlsx.mjs');
  const wb = XLSX.read(buf, { type: 'array' });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });

  const productos = rows
    .filter(r => /^\d+$/.test(String(r['Clave'] ?? '').trim()))
    .map(r => ({
      clave: String(r['Clave']).trim(),
      nombre: String(r['Nombre']).trim().toUpperCase(),
      unidad: normalizarUnidad(String(r['U.med.'])),
      unidadOriginal: String(r['U.med.']).trim(),
      claveSAT: String(r['Clave SAT'] ?? '').trim(),
      linea: String(r['Línea'] ?? '').trim().toUpperCase(),
      precioSugerido: 0,
      activo: !INACTIVOS.has(String(r['Clave']).trim()),
      updatedAt: new Date().toISOString()
    }));

  // Elimina duplicados por clave (conserva el último)
  const map = new Map(productos.map(p => [p.clave, p]));

  await db.products.bulkPut(Array.from(map.values()));
  return map.size;
}
