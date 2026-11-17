// js/main-admin.js
import { auth } from './auth.js';
import { APP_CONFIG } from './config.js';
import { initDB, db } from './db.js';
import { cargarSeedDesdeExcel } from './seed.js';
import { renderTickets, applyTicketFilters, clearTicketFilters, getFilteredTickets, obtenerTicketsDesdeFirestore } from './admin/tickets.js';
import { renderProducts, applyProductFilters, clearProductFilters } from './admin/products.js';
import { renderCashiers, addCashier, toggleCashier } from './admin/cashiers.js';
import { loadSettings, saveFolio, addPaymentMethod, regenerateLogo } from './admin/settings.js';
import { exportTicketsResumido, exportTicketsPDF, exportTicketsDetallePDF, exportProductosCSV } from './reports.js';
import { sincronizarAhora } from './sync.js';

console.log('🚀 Admin: Iniciando...');

document.addEventListener('DOMContentLoaded', async () => {
  console.log('✅ DOM cargado');
  
  try {
    await initDB();
    console.log('✅ DB inicializada');
    
    setupNavigation();
    setupTicketModule();
    setupProductModule();
    setupCashierModule();
    setupSettingsModule();

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
    await renderProducts();
    await renderCashiers();
    await loadSettings();
    await updateKPIs();
  } catch (error) {
    console.error('❌ Error al cargar datos:', error);
  }
}

async function updateKPIs() {
  try {
    // TOTAL, HOY y MONTO: fuente de verdad = Firestore
    const tickets = await obtenerTicketsDesdeFirestore();
    const hoy = new Date().toDateString();
    const ticketsHoy = tickets.filter(t => new Date(t.fecha).toDateString() === hoy);
    const montoHoy = ticketsHoy.reduce((s, t) => s + (t.total || 0), 0);

    // PENDIENTES SYNC: cola local de ESTA PC (IndexedDB)
    let pending = 0;
    try {
      const pendientes = await db.syncQueue.where('status').equals('pending').toArray();
      const fallidos = await db.syncQueue.where('status').equals('failed').toArray();
      pending = pendientes.length + fallidos.length;
    } catch (e) {
      pending = 0;
    }

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
  const tabs = document.querySelectorAll('.nav-tab');
  
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      document.querySelectorAll('.module').forEach(m => m.classList.add('hidden'));
      
      const moduleId = `module-${tab.dataset.module}`;
      const moduleEl = document.getElementById(moduleId);
      if (moduleEl) {
        moduleEl.classList.remove('hidden');
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
  const btnSync = document.getElementById('btn-sync-now');

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

  if (btnSync) {
    btnSync.addEventListener('click', async () => {
      btnSync.disabled = true;
      btnSync.textContent = 'Sincronizando...';
      try {
        const res = await sincronizarAhora();
        await renderTickets();
        await updateKPIs();
        if (res.error === 'offline') {
          alert('Sin conexión. Los tickets se enviarán automáticamente al reconectar.');
        } else if (res.fail > 0) {
          alert(`Sincronización parcial. Éxito: ${res.ok} | Fallidos: ${res.fail}`);
        } else {
          alert(`Sincronización completada. ${res.ok} tickets enviados.`);
        }
      } catch (e) {
        alert('Error: ' + e.message);
      } finally {
        btnSync.disabled = false;
        btnSync.textContent = 'Sincronizar Ahora';
      }
    });
  }
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
      if (!name) return alert('El nombre es obligatorio');
      await addCashier(name, email);
      document.getElementById('cashier-name').value = '';
      document.getElementById('cashier-email').value = '';
      if (document.getElementById('cashier-password')) {
        document.getElementById('cashier-password').value = '';
      }
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

// NOTA: window.reprintTicket se define en js/admin/tickets.js (lee de Firestore).
// No se redefine aquí para no sobrescribirlo con la versión de IndexedDB.

window.removePayment = async (idx) => {
  const formas = (await db.settings.get('formasPago'))?.value || APP_CONFIG.formasPagoDefault;
  formas.splice(idx, 1);
  await db.settings.put({ key: 'formasPago', value: formas });
  await loadSettings();
};

// ═══════════════════════════════════════════════════════
// ATAJOS DE TECLADO GLOBALES
// ═══════════════════════════════════════════════════════

document.addEventListener('keydown', (e) => {
  const ctrl = e.ctrlKey || e.metaKey;
  
  if (ctrl && (e.key === 'ñ' || e.key === 'Ñ' || (e.shiftKey && e.key.toLowerCase() === 'f'))) {
    e.preventDefault();
    irAFormasDePago();
  }
});

async function irAFormasDePago() {
  console.log('⌨️ Atajo: ir a Formas de Pago');
  
  const tabConfig = document.querySelector('.nav-tab[data-module="settings"]');
  const moduleConfig = document.getElementById('module-settings');
  
  if (!tabConfig || !moduleConfig) {
    console.warn('⚠️ No se encontró el módulo de Configuración');
    return;
  }
  
  if (moduleConfig.classList.contains('hidden')) {
    tabConfig.click();
    await new Promise(r => setTimeout(r, 100));
  }
  
  const inputPago = document.getElementById('new-payment');
  if (inputPago) {
    inputPago.focus();
    inputPago.select();
    inputPago.style.boxShadow = '0 0 0 3px #ffd54f';
    setTimeout(() => {
      inputPago.style.boxShadow = '';
    }, 800);
  }
}
