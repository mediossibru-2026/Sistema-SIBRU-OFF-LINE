// js/catalog.js
import { db } from './db.js';

export async function buscarProducto(termino) {
  if (!termino || termino.length < 2) return [];
  const t = termino.toLowerCase();
  
  // Busca por clave exacta o nombre que contenga el término
  const productos = await db.products
    .where('activo').equals(true)
    .filter(p => p.clave === termino || p.nombre.toLowerCase().includes(t))
    .limit(10)
    .toArray();
    
  return productos;
}
