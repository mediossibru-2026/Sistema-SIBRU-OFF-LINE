// js/admin/tickets.js
import { db } from '../db.js';

export async function renderTickets() {
  const tickets = await db.tickets.orderBy('fecha').reverse().toArray();
  const tbody = document.getElementById('tickets-body');
  tbody.innerHTML = '';

  tickets.forEach(t => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${t.folio}</strong></td>
      <td>${new Date(t.fecha).toLocaleString('es-MX')}</td>
      <td>${t.cajeroNombre}</td>
      <td>${t.items.length}</td>
      <td>${t.formaPago}</td>
      <td><strong>$${t.total.toFixed(2)}</strong></td>
      <td><span class="status-badge ${t.synced ? 'status-synced' : 'status-pending'}">${t.synced ? 'Synced' : 'Pending'}</span></td>
      <td>
        <button class="btn-icon success" onclick="window.reprintTicket('${t.folio}')" title="Reimprimir">🖨️</button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  populateFilterSelects(tickets);
}

function populateFilterSelects(tickets) {
  const cajeros = [...new Set(tickets.map(t => t.cajeroNombre))];
  const pagos = [...new Set(tickets.map(t => t.formaPago))];

  const selCajero = document.getElementById('filter-cashier');
  const selPago = document.getElementById('filter-payment');

  if (selCajero.options.length <= 1) {
    cajeros.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c; opt.textContent = c;
      selCajero.appendChild(opt);
    });
  }
  if (selPago.options.length <= 1) {
    pagos.forEach(p => {
      const opt = document.createElement('option');
      opt.value = p; opt.textContent = p;
      selPago.appendChild(opt);
    });
  }
}

export async function getFilteredTickets() {
  let tickets = await db.tickets.orderBy('fecha').reverse().toArray();

  const search = document.getElementById('search-ticket').value.toLowerCase();
  const from = document.getElementById('filter-date-from').value;
  const to = document.getElementById('filter-date-to').value;
  const cashier = document.getElementById('filter-cashier').value;
  const payment = document.getElementById('filter-payment').value;

  if (search) tickets = tickets.filter(t => t.folio.toLowerCase().includes(search));
  if (from) tickets = tickets.filter(t => new Date(t.fecha) >= new Date(from));
  if (to) tickets = tickets.filter(t => new Date(t.fecha) <= new Date(to + 'T23:59:59'));
  if (cashier) tickets = tickets.filter(t => t.cajeroNombre === cashier);
  if (payment) tickets = tickets.filter(t => t.formaPago === payment);

  return tickets;
}

export async function applyTicketFilters() {
  const tickets = await getFilteredTickets();
  const tbody = document.getElementById('tickets-body');
  tbody.innerHTML = '';

  tickets.forEach(t => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${t.folio}</strong></td>
      <td>${new Date(t.fecha).toLocaleString('es-MX')}</td>
      <td>${t.cajeroNombre}</td>
      <td>${t.items.length}</td>
      <td>${t.formaPago}</td>
      <td><strong>$${t.total.toFixed(2)}</strong></td>
      <td><span class="status-badge ${t.synced ? 'status-synced' : 'status-pending'}">${t.synced ? 'Synced' : 'Pending'}</span></td>
      <td><button class="btn-icon success" onclick="window.reprintTicket('${t.folio}')">🖨️</button></td>
    `;
    tbody.appendChild(tr);
  });
}

export function clearTicketFilters() {
  document.getElementById('search-ticket').value = '';
  document.getElementById('filter-date-from').value = '';
  document.getElementById('filter-date-to').value = '';
  document.getElementById('filter-cashier').value = '';
  document.getElementById('filter-payment').value = '';
}
