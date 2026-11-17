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

console.log('🚀 Admin: Iniciando...');

document.addEventListener('DOMContentLoaded', async () => {
  console.log('✅ DOM cargado');
  
  try {
    await initDB();
    console.log('✅ DB inicializada');
    
    setupNavigation();
    console.log('✅ Navegación configurada');
    
    setupTicketModule();
    console.log('✅ Módulo tickets configurado');
    
    setupProductModule();
    console.log('✅ Módulo productos configurado');
    
    setupCashierModule();
    console.log('✅ Módulo cajeros configurado');
    
    setupSettingsModule();
    console.log('✅ Módulo configuración configurado');

    await loadAllData();
    console.log('✅ Datos cargados');
  } catch (error) {
    console.error('❌ Error en inicialización:', error);
    alert('Error al cargar el panel: ' + error.message);
  }
});

async function loadAllData() {
  try {
    await renderTickets();
    console.log('✅ Tickets renderizados');
    
    await renderProducts();
    console.log('✅ Productos renderizados');
    
    await renderCashiers();
    console.log('✅ Cajeros renderizados');
    
    await loadSettings();
    console.log('✅ Configuración cargada');
    
    updateKPIs();
    console.log('✅ KPIs actualizados');
  } catch (error) {
    console.error('❌ Error al cargar datos:', error);
  }
}

async function updateKPIs() {
  try {
    const tickets = await db.tickets.toArray();
    const hoy = new Date().toDateString();
    const ticketsHoy = tickets.filter(t => new Date(t.fecha).toDateString() === hoy);
    const montoHoy = ticketsHoy.reduce((s, t) => s + t.total, 0);
    const pending = tickets.filter(t => !t.synced).length;

    const kpiTotal = document.getElementById('kpi-total');
    const kpiHoy = document.getElementById('kpi-hoy');
    const kpiMonto = document.getElementById('kpi-monto');
    const kpiPending = document.getElementById('kpi-pending');

    if (kpiTotal) kpiTotal.textContent = tickets.length;
    if (kpiHoy) kpiHoy.textContent = ticketsHoy.length;
    if (kpiMonto) kpiMonto.textContent = `$${montoHoy.toFixed(2)}`;
    if (kpiPending) kpiPending.textContent = pending;
  } catch (error) {
    console.error('Error al actualizar KPIs:', error);
  }
}

function setupNavigation() {
  console.log('Configurando navegación...');
  const tabs = document.querySelectorAll('.nav-tab');
  console.log(`Encontradas ${tabs.length} pestañas`);
  
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      console.log(`Clic en pestaña: ${tab.dataset.module}`);
      
      // Remover active de todas las pestañas
      document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      
      // Ocultar todos los módulos
      document.querySelectorAll('.module').forEach(m => m.classList.add('hidden'));
      
      // Mostrar el módulo seleccionado
      const moduleId = `module-${tab.dataset.module}`;
      const moduleEl = document.getElementById(moduleId);
      if (moduleEl) {
        moduleEl.classList.remove('hidden');
        console.log(`✅ Módulo ${moduleId} mostrado`);
      } else {
        console.error(`❌ No se encontró el módulo ${moduleId}`);
      }
    });
  });
}

function setupTicketModule() {
  const btnSearch = document.getElementById('btn-search-ticket');
  const btnApply = document.getElementById('btn-apply-filters');
  const btnClear = document.getElementById('btn-clear-filters');
  const btnCsv = document.getElementById('btn-export-csv');
  const btnPdf = document.getElementById('btn-export-pdf');
  const btnDetail = document.getElementById('btn-export-detail');

  if (btnSearch) btnSearch.addEventListener('click', applyTicketFilters);
  if (btnApply) btnApply.addEventListener('click', applyTicketFilters);
  if (btnClear) btnClear.addEventListener('click', async () => {
    clearTicketFilters();
    await renderTickets();
  });
  if (btnCsv) btnCsv.addEventListener('click', async () => {
    const tickets = await getFilteredTickets();
    if (tickets.length === 0) return alert('No hay tickets para exportar');
    exportTicketsResumido(tickets);
  });
  if (btnPdf) btnPdf.addEventListener('click', async () => {
    const tickets = await getFilteredTickets();
    if (tickets.length === 0) return alert('No hay tickets para exportar');
    exportTicketsPDF(tickets);
  });
  if (btnDetail) btnDetail.addEventListener('click', async () => {
    const tickets = await getFilteredTickets();
    if (tickets.length === 0) return alert('No hay tickets para exportar');
    exportTicketsDetallePDF(tickets);
  });
}

function setupProductModule() {
  const btnSearch = document.getElementById('btn-search-product');
  const btnApply = document.getElementById('btn-apply-product-filters');
  const btnClear = document.getElementById('btn-clear-product-filters');
  const btnReload = document.getElementById('btn-reload-seed');
  const btnExport = document.getElementById('btn-export-products');

  if (btnSearch) btnSearch.addEventListener('click', applyProductFilters);
  if (btnApply) btnApply.addEventListener('click', applyProductFilters);
  if (btnClear) btnClear.addEventListener('click', async () => {
    clearProductFilters();
    await renderProducts();
  });
  if (btnReload) btnReload.addEventListener('click', async () => {
    if (confirm('¿Recargar catálogo desde articulos.xlsx? Se conservarán los precios sugeridos editados.')) {
      const n = await cargarSeedDesdeExcel();
      alert(`Catálogo recargado: ${n} productos`);
      await renderProducts();
    }
  });
  if (btnExport) btnExport.addEventListener('click', async () => {
    const products = await db.products.toArray();
    exportProductosCSV(products);
  });
}

function setupCashierModule() {
  const btnAdd = document.getElementById('btn-add-cashier');
  if (btnAdd) {
    btnAdd.addEventListener('click', async () => {
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
}

function setupSettingsModule() {
  const btnFolio = document.getElementById('btn-save-folio');
  const btnPayment = document.getElementById('btn-add-payment');
  const btnLogo = document.getElementById('btn-regenerate-logo');

  if (btnFolio) btnFolio.addEventListener('click', saveFolio);
  if (btnPayment) btnPayment.addEventListener('click', addPaymentMethod);
  if (btnLogo) btnLogo.addEventListener('click', regenerateLogo);
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
