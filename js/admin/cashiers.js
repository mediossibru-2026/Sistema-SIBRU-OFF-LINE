// js/admin/cashiers.js
import { db } from '../db.js';

export async function renderCashiers() {
  const cajeros = (await db.settings.get('cajeros'))?.value || [];
  const tbody = document.getElementById('cashiers-body');
  const listDiv = document.getElementById('cashiers-list');
  
  if (!tbody || !listDiv) return;
  
  tbody.innerHTML = '';
  listDiv.innerHTML = '';

  if (cajeros.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:#888;padding:20px">No hay cajeros registrados. Agrega el primero.</td></tr>';
    return;
  }

  cajeros.forEach(c => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${c.nombre}</td>
      <td>${c.email || '—'}</td>
      <td><span class="status-badge ${c.activo !== false ? 'status-active' : 'status-paused'}">${c.activo !== false ? 'Activo' : 'Pausado'}</span></td>
      <td><button class="btn-icon ${c.activo !== false ? 'danger' : 'success'}" onclick="window.toggleCashierStatus('${c.email || c.nombre}')">${c.activo !== false ? '⏸️' : '▶️'}</button></td>
    `;
    tbody.appendChild(tr);

    const div = document.createElement('div');
    div.className = 'cashier-item';
    div.innerHTML = `<strong>${c.nombre}</strong> ${c.email ? '- ' + c.email : ''}`;
    listDiv.appendChild(div);
  });
}

export async function addCashier(nombre, email) {
  // SIN Firebase Auth — solo IndexedDB
  try {
    const cajeros = (await db.settings.get('cajeros'))?.value || [];
    if (cajeros.find(c => c.nombre.toLowerCase() === nombre.toLowerCase())) {
      alert('Ya existe un cajero con ese nombre');
      return;
    }
    cajeros.push({ nombre, email: email || '', activo: true, role: 'cajero' });
    await db.settings.put({ key: 'cajeros', value: cajeros });
    alert(`✅ Cajero "${nombre}" agregado correctamente`);
  } catch (error) {
    alert('Error: ' + error.message);
  }
}

export async function toggleCashier(identifier) {
  const cajeros = (await db.settings.get('cajeros'))?.value || [];
  const c = cajeros.find(x => x.email === identifier || x.nombre === identifier);
  if (c) {
    c.activo = c.activo === false ? true : false;
    await db.settings.put({ key: 'cajeros', value: cajeros });
  }
}
