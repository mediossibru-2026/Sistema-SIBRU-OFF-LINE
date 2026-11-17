// js/admin/tickets.js
import { db } from '../db.js';

export async function renderTickets() {
  console.log('Renderizando tickets...');
  
  const tickets = await db.tickets.orderBy('fecha').reverse().toArray();
  console.log(`Encontrados ${tickets.length} tickets`);
  
  const tbody = document.getElementById('tickets-body');
  if (!tbody) {
    console.error('❌ No se encontró tbody de tickets');
    return;
  }
  
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
  console.log('Poblando filtros...');
  
  const cajeros = [...new Set(tickets.map(t => t.cajeroNombre))];
  const pagos = [...new Set(tickets.map(t => t.formaPago))];

  console.log(`Cajeros encontrados: ${cajeros.length}`);
  console.log(`Formas de pago encontradas: ${pagos.length}`);

  const selCajero = document.getElementById('filter-cashier');
  const selPago = document.getElementById('filter-payment');

  if (selCajero) {
    // Mantener la opción "Todos" y agregar cajeros únicos
    const currentOptions = Array.from(selCajero.options).map(o => o.value);
    cajeros.forEach(c => {
      if (c && !currentOptions.includes(c)) {
        const opt = document.createElement('option');
        opt.value = c;
        opt.textContent = c;
        selCajero.appendChild(opt);
      }
    });
    console.log(`✅ Select de cajeros actualizado`);
  } else {
    console.warn('⚠️ No se encontró select filter-cashier');
  }

  if (selPago) {
    const currentOptions = Array.from(selPago.options).map(o => o.value);
    pagos.forEach(p => {
      if (p && !currentOptions.includes(p)) {
        const opt = document.createElement('option');
        opt.value = p;
        opt.textContent = p;
        selPago.appendChild(opt);
      }
    });
    console.log(`✅ Select de formas de pago actualizado`);
  } else {
    console.warn('⚠️ No se encontró select filter-payment');
  }
}

export async function getFilteredTickets() {
  let tickets = await db.tickets.orderBy('fecha').reverse().toArray();

  const searchEl = document.getElementById('search-ticket');
  const fromEl = document.getElementById('filter-date-from');
  const toEl = document.getElementById('filter-date-to');
  const cashierEl = document.getElementById('filter-cashier');
  const paymentEl = document.getElementById('filter-payment');

  const search = searchEl ? searchEl.value.toLowerCase() : '';
  const from = fromEl ? fromEl.value : '';
  const to = toEl ? toEl.value : '';
  const cashier = cashierEl ? cashierEl.value : '';
  const payment = paymentEl ? paymentEl.value : '';

  if (search) tickets = tickets.filter(t => t.folio.toLowerCase().includes(search));
  if (from) tickets = tickets.filter(t => new Date(t.fecha) >= new Date(from));
  if (to) tickets = tickets.filter(t => new Date(t.fecha) <= new Date(to + 'T23:59:59'));
  if (cashier) tickets = tickets.filter(t => t.cajeroNombre === cashier);
  if (payment) tickets = tickets.filter(t => t.formaPago === payment);

  return tickets;
}

export async function applyTicketFilters() {
  console.log('Aplicando filtros de tickets...');
  
  const tickets = await getFilteredTickets();
  console.log(`Tickets filtrados: ${tickets.length}`);
  
  const tbody = document.getElementById('tickets-body');
  if (!tbody) return;
  
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
  const searchEl = document.getElementById('search-ticket');
  const fromEl = document.getElementById('filter-date-from');
  const toEl = document.getElementById('filter-date-to');
  const cashierEl = document.getElementById('filter-cashier');
  const paymentEl = document.getElementById('filter-payment');

  if (searchEl) searchEl.value = '';
  if (fromEl) fromEl.value = '';
  if (toEl) toEl.value = '';
  if (cashierEl) cashierEl.value = '';
  if (paymentEl) paymentEl.value = '';
}
