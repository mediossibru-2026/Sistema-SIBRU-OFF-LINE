// js/admin/products.js
import { db } from '../db.js';

export async function renderProducts() {
  const products = await db.products.orderBy('clave').toArray();
  const tbody = document.getElementById('products-body');
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

  tbody.querySelectorAll('.price-input').forEach(input => {
    input.addEventListener('change', async (e) => {
      const clave = e.target.dataset.clave;
      const precio = parseFloat(e.target.value) || 0;
      await db.products.update(clave, { precioSugerido: precio, updatedAt: new Date().toISOString() });
    });
  });

  const selLinea = document.getElementById('filter-line');
  if (selLinea.options.length <= 1) {
    const lineas = [...new Set(products.map(p => p.linea).filter(Boolean))].sort();
    lineas.forEach(l => {
      const opt = document.createElement('option');
      opt.value = l; opt.textContent = l;
      selLinea.appendChild(opt);
    });
  }
}

export async function applyProductFilters() {
  let products = await db.products.toArray();
  const search = document.getElementById('search-product').value.toLowerCase();
  const linea = document.getElementById('filter-line').value;
  const status = document.getElementById('filter-status').value;

  if (search) products = products.filter(p => p.clave.includes(search) || p.nombre.toLowerCase().includes(search));
  if (linea) products = products.filter(p => p.linea === linea);
  if (status !== '') products = products.filter(p => String(p.activo) === status);

  const tbody = document.getElementById('products-body');
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
  document.getElementById('search-product').value = '';
  document.getElementById('filter-line').value = '';
  document.getElementById('filter-status').value = '';
}
