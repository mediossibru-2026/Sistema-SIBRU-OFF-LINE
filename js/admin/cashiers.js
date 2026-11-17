// js/admin/cashiers.js
import { db } from '../db.js';

export async function renderCashiers() {
  const cajeros = (await db.settings.get('cajeros'))?.value || [];
  const tbody = document.getElementById('cashiers-body');
  const listDiv = document.getElementById('cashiers-list');
  
  if (!tbody || !listDiv) return;
  
  tbody.innerHTML = '';
  listDiv.innerHTML = '';

  cajeros.forEach(c => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${c.nombre}</td>
      <td>${c.email}</td>
      <td><span class="status-badge ${c.activo !== false ? 'status-active' : 'status-paused'}">${c.activo !== false ? 'Activo' : 'Pausado'}</span></td>
      <td><button class="btn-icon ${c.activo !== false ? 'danger' : 'success'}" onclick="window.toggleCashierStatus('${c.email}')">${c.activo !== false ? '⏸️' : '▶️'}</button></td>
    `;
    tbody.appendChild(tr);

    const div = document.createElement('div');
    div.className = 'cashier-item';
    div.innerHTML = `<strong>${c.nombre}</strong> - ${c.email}`;
    listDiv.appendChild(div);
  });
}

export async function addCashier(nombre, email, password) {
  // TEMPORAL: Solo guarda en IndexedDB, omite Firebase Auth
  try {
    const cajeros = (await db.settings.get('cajeros'))?.value || [];
    if (cajeros.find(c => c.email === email)) {
      alert('El cajero ya existe');
      return;
    }
    cajeros.push({ nombre, email, activo: true, role: 'cajero' });
    await db.settings.put({ key: 'cajeros', value: cajeros });
    alert(`✅ Cajero "${nombre}" agregado localmente.\n(Nota: La creación en Firebase Auth está pausada hasta resolver la migración).`);
  } catch (error) {
    alert('Error: ' + error.message);
  }
}

export async function toggleCashier(email) {
  const cajeros = (await db.settings.get('cajeros'))?.value || [];
  const c = cajeros.find(x => x.email === email);
  if (c) {
    c.activo = c.activo === false ? true : false;
    await db.settings.put({ key: 'cajeros', value: cajeros });
  }
}
