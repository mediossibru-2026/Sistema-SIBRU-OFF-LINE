// js/main-admin.js
import { auth } from './auth.js';
import { APP_CONFIG } from './config.js';
import { initDB, db } from './db.js';
import { cargarSeedDesdeExcel } from './seed.js';
import { renderTickets, applyTicketFilters, clearTicketFilters, getFilteredTickets } from './admin/tickets.js';
import { renderProducts, applyProductFilters, clearProductFilters } from './admin/products.js';
import { renderCashiers, addCashier, toggleCashier } from './admin/cashiers.js';
import { loadSettings, saveFolio, addPaymentMethod, regenerateLogo } from './admin/settings.js';
import { exportTicketsResumido, exportTicketsPDF, exportTicketsDetallePDF, exportProductosCSV } from './reports.js';

document.addEventListener('DOMContentLoaded', async () => {
  await initDB();
  setupNavigation();
  setupTicketModule();
  setupProductModule();
  setupCashierModule();
  setupSettingsModule();

  await loadAllData();
});

async function loadAllData() {
  await renderTickets();
  await renderProducts();
  await renderCashiers();
  await loadSettings();
  updateKPIs();
}

async function updateKPIs() {
  const tickets = await db.tickets.toArray();
  const hoy = new Date().toDateString();
  const ticketsHoy = tickets.filter(t => new Date(t.fecha).toDateString() === hoy);
  const montoHoy = ticketsHoy.reduce((s, t) => s + t.total, 0);
  const pending = tickets.filter(t => !t.synced).length;

  document.getElementById('kpi-total').textContent = tickets.length;
  document.getElementById('kpi-hoy').textContent = ticketsHoy.length;
  document.getElementById('kpi-monto').textContent = `$${montoHoy.toFixed(2)}`;
  document.getElementById('kpi-pending').textContent = pending;
}

function setupNavigation() {
  document.querySelectorAll('.nav-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.module').forEach(m => m.classList.add('hidden'));
      tab.classList.add('active');
      document.getElementById(`module-${tab.dataset.module}`).classList.remove('hidden');
    });
  });
}

function setupTicketModule() {
  document.getElementById('btn-search-ticket').addEventListener('click', applyTicketFilters);
  document.getElementById('btn-apply-filters').addEventListener('click', applyTicketFilters);
  document.getElementById('btn-clear-filters').addEventListener('click', async () => {
    clearTicketFilters();
    await renderTickets();
  });
  document.getElementById('btn-export-csv').addEventListener('click', async () => {
    const tickets = await getFilteredTickets();
    if (tickets.length === 0) return alert('No hay tickets para exportar');
    exportTicketsResumido(tickets);
  });
  document.getElementById('btn-export-pdf').addEventListener('click', async () => {
    const tickets = await getFilteredTickets();
    if (tickets.length === 0) return alert('No hay tickets para exportar');
    exportTicketsPDF(tickets);
  });
  document.getElementById('btn-export-detail').addEventListener('click', async () => {
    const tickets = await getFilteredTickets();
    if (tickets.length === 0) return alert('No hay tickets para exportar');
    exportTicketsDetallePDF(tickets);
  });
}

function setupProductModule() {
  document.getElementById('btn-search-product').addEventListener('click', applyProductFilters);
  document.getElementById('btn-apply-product-filters').addEventListener('click', applyProductFilters);
  document.getElementById('btn-clear-product-filters').addEventListener('click', async () => {
    clearProductFilters();
    await renderProducts();
  });
  document.getElementById('btn-reload-seed').addEventListener('click', async () => {
    if (confirm('¿Recargar catálogo desde articulos.xlsx? Se conservarán los precios sugeridos editados.')) {
      const n = await cargarSeedDesdeExcel();
      alert(`Catálogo recargado: ${n} productos`);
      await renderProducts();
    }
  });
  document.getElementById('btn-export-products').addEventListener('click', async () => {
    const products = await db.products.toArray();
    exportProductosCSV(products);
  });
}

function setupCashierModule() {
  document.getElementById('btn-add-cashier').addEventListener('click', async () => {
    const name = document.getElementById('cashier-name').value.trim();
    const email = document.getElementById('cashier-email').value.trim();
    const password = document.getElementById('cashier-password').value;
    if (!name || !email || !password) return alert('Completa todos los campos');
    await addCashier(name, email, password);
    document.getElementById('cashier-name').value = '';
    document.getElementById('cashier-email').value = '';
    document.getElementById('cashier-password').value = '';
    await renderCashiers();
  });
}

function setupSettingsModule() {
  document.getElementById('btn-save-folio').addEventListener('click', saveFolio);
  document.getElementById('btn-add-payment').addEventListener('click', addPaymentMethod);
  document.getElementById('btn-regenerate-logo').addEventListener('click', regenerateLogo);
}

// Funciones globales para onclick en tablas
window.toggleProduct = async (clave) => {
  const p = await db.products.get(clave);
  await db.products.update(clave, { activo: !p.activo, updatedAt: new Date().toISOString() });
  await renderProducts();
  updateKPIs();
};

window.deleteProduct = async (clave) => {
  if (confirm('¿Eliminar este producto?')) {
    await db.products.delete(clave);
    await renderProducts();
  }
};

window.toggleCashierStatus = async (email) => {
  await toggleCashier(email);
  await renderCashiers();
};

window.reprintTicket = async (folio) => {
  const ticket = await db.tickets.get(folio);
  if (!ticket) return alert('Ticket no encontrado');
  const { imprimirTicket } = await import('./print.js');
  imprimirTicket(ticket);
};

window.removePayment = async (idx) => {
  const formas = (await db.settings.get('formasPago'))?.value || APP_CONFIG.formasPagoDefault;
  formas.splice(idx, 1);
  await db.settings.put({ key: 'formasPago', value: formas });
  await loadSettings();
};
