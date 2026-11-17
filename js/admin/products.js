// js/admin/products.js
import { db } from '../db.js';

export async function renderProducts() {
  console.log('Renderizando productos...');
  
  const products = await db.products.orderBy('clave').toArray();
  console.log(`Encontrados ${products.length} productos`);
  
  const tbody = document.getElementById('products-body');
  if (!tbody) {
    console.error('❌ No se encontró tbody de productos');
    return;
  }
  
  tbody.innerHTML = '';

  products.forEach(p => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${p.clave}</td>
      <td>${p.nombre}</td>
      <td>${p.unidad}</td>
      <td>${p.linea}</td>
      <td>${p.claveSAT}</td>
      <td><input type="number" step="0.01" value="${p.precioSugerido || 0}" data-clave="${p.clave}" class="price-input" style="width:80px"></td>
      <td><span class="status-badge ${p.activo ? 'status-active' : 'status-paused'}">${p.activo ? 'Activo' : 'Pausado'}</span></td>
      <td>
        <button class="btn-icon ${p.activo ? 'danger' : 'success'}" onclick="window.toggleProduct('${p.clave}')" title="${p.activo ? 'Pausar' : 'Activar'}">${p.activo ? '⏸️' : '▶️'}</button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  // Guardar precio al cambiar
  tbody.querySelectorAll('.price-input').forEach(input => {
    input.addEventListener('change', async (e) => {
      const clave = e.target.dataset.clave;
      const precio = parseFloat(e.target.value) || 0;
      await db.products.update(clave, { precioSugerido: precio, updatedAt: new Date().toISOString() });
    });
  });

  // Poblar filtro de líneas
  const selLinea = document.getElementById('filter-line');
  if (selLinea && selLinea.options.length <= 1) {
    const lineas = [...new Set(products.map(p => p.linea).filter(Boolean))].sort();
    lineas.forEach(l => {
      const opt = document.createElement('option');
      opt.value = l;
      opt.textContent = l;
      selLinea.appendChild(opt);
    });
  }
}

export async function applyProductFilters() {
  console.log('Aplicando filtros de productos...');
  
  let products = await db.products.toArray();
  const searchEl = document.getElementById('search-product');
  const lineaEl = document.getElementById('filter-line');
  const statusEl = document.getElementById('filter-status');

  const search = searchEl ? searchEl.value.toLowerCase() : '';
  const linea = lineaEl ? lineaEl.value : '';
  const status = statusEl ? statusEl.value : '';

  if (search) products = products.filter(p => p.clave.includes(search) || p.nombre.toLowerCase().includes(search));
  if (linea) products = products.filter(p => p.linea === linea);
  if (status !== '') products = products.filter(p => String(p.activo) === status);

  const tbody = document.getElementById('products-body');
  if (!tbody) return;
  
  tbody.innerHTML = '';

  products.forEach(p => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${p.clave}</td>
      <td>${p.nombre}</td>
      <td>${p.unidad}</td>
      <td>${p.linea}</td>
      <td>${p.claveSAT}</td>
      <td><input type="number" step="0.01" value="${p.precioSugerido || 0}" data-clave="${p.clave}" class="price-input" style="width:80px"></td>
      <td><span class="status-badge ${p.activo ? 'status-active' : 'status-paused'}">${p.activo ? 'Activo' : 'Pausado'}</span></td>
      <td><button class="btn-icon ${p.activo ? 'danger' : 'success'}" onclick="window.toggleProduct('${p.clave}')">${p.activo ? '⏸️' : '▶️'}</button></td>
    `;
    tbody.appendChild(tr);
  });

  tbody.querySelectorAll('.price-input').forEach(input => {
    input.addEventListener('change', async (e) => {
      const clave = e.target.dataset.clave;
      const precio = parseFloat(e.target.value) || 0;
      await db.products.update(clave, { precioSugerido: precio, updatedAt: new Date().toISOString() });
    });
  });
}

export function clearProductFilters() {
  const searchEl = document.getElementById('search-product');
  const lineaEl = document.getElementById('filter-line');
  const statusEl = document.getElementById('filter-status');

  if (searchEl) searchEl.value = '';
  if (lineaEl) lineaEl.value = '';
  if (statusEl) statusEl.value = '';
}
