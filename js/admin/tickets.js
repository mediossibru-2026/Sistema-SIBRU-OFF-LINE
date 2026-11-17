// js/admin/tickets.js
import { db } from '../db.js';
import { firebaseConfig } from '../config.js';

let firestoreRef = null;

async function getFirestore() {
  if (firestoreRef) return firestoreRef;
  const { initializeApp } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js');
  const { getFirestore } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
  const app = initializeApp(firebaseConfig);
  firestoreRef = getFirestore(app);
  return firestoreRef;
}

export async function obtenerTicketsDesdeFirestore() {
  try {
    const firestore = await getFirestore();
    const { collection, getDocs } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
    
    const snapshot = await getDocs(collection(firestore, 'tickets'));
    const tickets = snapshot.docs.map(doc => doc.data());
    
    console.log(`📥 Obtenidos ${tickets.length} tickets desde Firestore`);
    return tickets;
  } catch (error) {
    console.error('❌ Error al obtener tickets desde Firestore:', error);
    console.log('⚠️ Usando IndexedDB local como fallback');
    return await db.tickets.toArray();
  }
}

export async function renderTickets() {
  console.log('🔄 Renderizando tickets...');
  
  const tickets = await obtenerTicketsDesdeFirestore();
  console.log(`📋 Total tickets: ${tickets.length}`);
  
  const tbody = document.getElementById('tickets-body');
  if (!tbody) {
    console.error('❌ No se encontró tbody de tickets');
    return;
  }
  
  tbody.innerHTML = '';

  if (tickets.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;color:#888;padding:20px">No hay tickets registrados. Genera el primero desde la caja.</td></tr>';
  } else {
    // Ordenar por fecha descendente (más recientes primero)
    tickets.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
    
    tickets.forEach(t => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><strong>${t.folio}</strong></td>
        <td>${new Date(t.fecha).toLocaleString('es-MX')}</td>
        <td>${t.cajeroNombre || '—'}</td>
        <td>${t.items ? t.items.length : 0}</td>
        <td>${t.formaPago || '—'}</td>
        <td><strong>$${t.total.toFixed(2)}</strong></td>
        <td><span class="status-badge status-synced">Synced</span></td>
        <td>
          <button class="btn-icon success" onclick="window.reprintTicket('${t.folio}')" title="Reimprimir">🖨️</button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  }

  // Poblar filtros
  await populateFilterSelects(tickets);
}

async function populateFilterSelects(tickets) {
  console.log('🔍 Poblando filtros...');
  
  const selCajero = document.getElementById('filter-cashier');
  const selPago = document.getElementById('filter-payment');

  // Cajeros: desde la lista registrada en settings + tickets
  if (selCajero) {
    const cajerosReg = (await db.settings.get('cajeros'))?.value || [];
    const cajerosDeTickets = [...new Set(tickets.map(t => t.cajeroNombre).filter(Boolean))];
    const todosCajeros = [...new Set([...cajerosReg.map(c => c.nombre), ...cajerosDeTickets])].filter(Boolean).sort();
    
    selCajero.innerHTML = '<option value="">Todos</option>';
    todosCajeros.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c;
      opt.textContent = c;
      selCajero.appendChild(opt);
    });
    console.log(`✅ Select de cajeros: ${todosCajeros.length} opciones`);
  }

  // Formas de pago: desde configuración + tickets
  if (selPago) {
    const { APP_CONFIG } = await import('../config.js');
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
  }
}

export async function getFilteredTickets() {
  let tickets = await obtenerTicketsDesdeFirestore();

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
        <td><span class="status-badge status-synced">Synced</span></td>
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

// Función para reimprimir ticket (lee desde Firestore)
window.reprintTicket = async (folio) => {
  try {
    const firestore = await getFirestore();
    const { collection, query, where, getDocs } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
    
    const q = query(collection(firestore, 'tickets'), where('folio', '==', String(folio)));
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      alert('Ticket no encontrado en Firestore');
      return;
    }
    
    const ticket = snapshot.docs[0].data();
    const { imprimirTicket } = await import('../print.js');
    imprimirTicket(ticket);
  } catch (error) {
    console.error('Error al reimprimir:', error);
    alert('Error al reimprimir: ' + error.message);
  }
};
