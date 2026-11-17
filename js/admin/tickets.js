// js/admin/tickets.js
import { db } from '../db.js';
import { APP_CONFIG } from '../config.js';

export async function renderTickets() {
  console.log('🔄 Renderizando tickets...');
  
  const tickets = await db.tickets.orderBy('fecha').reverse().toArray();
  console.log(`📋 Encontrados ${tickets.length} tickets`);
  
  const tbody = document.getElementById('tickets-body');
  if (!tbody) {
    console.error('❌ No se encontró tbody de tickets');
    return;
  }
  
  tbody.innerHTML = '';

  if (tickets.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;color:#888;padding:20px">No hay tickets registrados. Genera el primero desde la caja.</td></tr>';
  } else {
    tickets.forEach(t => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><strong>${t.folio}</strong></td>
        <td>${new Date(t.fecha).toLocaleString('es-MX')}</td>
        <td>${t.cajeroNombre || '—'}</td>
        <td>${t.items ? t.items.length : 0}</td>
        <td>${t.formaPago || '—'}</td>
        <td><strong>$${t.total.toFixed(2)}</strong></td>
        <td><span class="status-badge ${t.synced ? 'status-synced' : 'status-pending'}">${t.synced ? 'Synced' : 'Pending'}</span></td>
        <td>
          <button class="btn-icon success" onclick="window.reprintTicket('${t.folio}')" title="Reimprimir">🖨️</button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  }

  // Poblar filtros con datos de settings + tickets
  await populateFilterSelects(tickets);
}

async function populateFilterSelects(tickets) {
  console.log('🔍 Poblando filtros...');
  
  const selCajero = document.getElementById('filter-cashier');
  const selPago = document.getElementById('filter-payment');

  // 1. CAJEROS: desde la lista registrada en settings + tickets existentes
  if (selCajero) {
    const cajerosReg = (await db.settings.get('cajeros'))?.value || [];
    const cajerosDeTickets = [...new Set(tickets.map(t => t.cajeroNombre).filter(Boolean))];
    const todosCajeros = [...new Set([...cajerosReg.map(c => c.nombre), ...cajerosDeTickets])].filter(Boolean).sort();
    
    // Reconstruir el select manteniendo "Todos"
    selCajero.innerHTML = '<option value="">Todos</option>';
    todosCajeros.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c;
      opt.textContent = c;
      selCajero.appendChild(opt);
    });
    console.log(`✅ Select de cajeros: ${todosCajeros.length} opciones`);
  } else {
    console.warn('⚠️ No se encontró select filter-cashier');
  }

  // 2. FORMAS DE PAGO: desde la configuración + tickets existentes
  if (selPago) {
    const formasConfig = (await db.settings.get('formasPago'))?.value || APP_CONFIG.formasPagoDefault;
    const formasDeTickets = [...new Set(tickets.map(t => t.formaPago).filter(Boolean))];
    const todasFormas = [...new Set([...formasConfig, ...formasDeTickets])].filter(Boolean);
    
    selPago.innerHTML = '<option value="">Todas</option>';
    todasFormas.forEach(p => {
      const opt = document.createElement('option');
      opt.value = p;
      opt.textContent = p;
      selPago.appendChild(opt);
    });
    console.log(`✅ Select de formas de pago: ${todasFormas.length} opciones`);
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

  const search = searchEl ? searchEl.value.toLowerCase().trim() : '';
  const from = fromEl ? fromEl.value : '';
  const to = toEl ? toEl.value : '';
  const cashier = cashierEl ? cashierEl.value : '';
  const payment = paymentEl ? paymentEl.value : '';

  if (search) tickets = tickets.filter(t => String(t.folio).toLowerCase().includes(search));
  if (from) tickets = tickets.filter(t => new Date(t.fecha) >= new Date(from));
  if (to) tickets = tickets.filter(t => new Date(t.fecha) <= new Date(to + 'T23:59:59'));
  if (cashier) tickets = tickets.filter(t => t.cajeroNombre === cashier);
  if (payment) tickets = tickets.filter(t => t.formaPago === payment);

  return tickets;
}

export async function applyTicketFilters() {
  console.log('🔎 Aplicando filtros de tickets...');
  
  const tickets = await getFilteredTickets();
  console.log(`📊 Tickets filtrados: ${tickets.length}`);
  
  const tbody = document.getElementById('tickets-body');
  if (!tbody) return;
  
  tbody.innerHTML = '';

  if (tickets.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;color:#888;padding:20px">Sin resultados con los filtros aplicados.</td></tr>';
  } else {
    tickets.forEach(t => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><strong>${t.folio}</strong></td>
        <td>${new Date(t.fecha).toLocaleString('es-MX')}</td>
        <td>${t.cajeroNombre || '—'}</td>
        <td>${t.items ? t.items.length : 0}</td>
        <td>${t.formaPago || '—'}</td>
        <td><strong>$${t.total.toFixed(2)}</strong></td>
        <td><span class="status-badge ${t.synced ? 'status-synced' : 'status-pending'}">${t.synced ? 'Synced' : 'Pending'}</span></td>
        <td><button class="btn-icon success" onclick="window.reprintTicket('${t.folio}')">🖨️</button></td>
      `;
      tbody.appendChild(tr);
    });
  }
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
