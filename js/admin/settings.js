// js/admin/settings.js
import { db } from '../db.js';
import { APP_CONFIG } from '../config.js';
import { obtenerLogoBase64 } from '../print.js';

export async function loadSettings() {
  const folio = await db.settings.get('folioActual');
  const prefix = await db.settings.get('folioPrefix');
  const formas = await db.settings.get('formasPago');
  const logo = await db.settings.get('logoBase64');

  document.getElementById('setting-folio').value = folio ? folio.value : APP_CONFIG.folioInicial;
  document.getElementById('setting-prefix').value = prefix ? prefix.value : '';
  document.getElementById('setting-logo-url').value = APP_CONFIG.logoUrl;
  document.getElementById('setting-terminal').value = APP_CONFIG.terminalId;

  if (logo && logo.value) {
    document.getElementById('logo-preview').innerHTML = `<img src="${logo.value}" alt="Logo">`;
  }

  renderPaymentMethods(formas ? formas.value : APP_CONFIG.formasPagoDefault);
}

function renderPaymentMethods(formas) {
  const container = document.getElementById('payment-methods-list');
  container.innerHTML = '';
  formas.forEach((f, idx) => {
    const div = document.createElement('div');
    div.className = 'payment-item';
    div.innerHTML = `<span>${f}</span><button class="btn-icon danger" onclick="window.removePayment(${idx})">✕</button>`;
    container.appendChild(div);
  });
}

export async function saveFolio() {
  const nuevo = parseInt(document.getElementById('setting-folio').value);
  const prefix = document.getElementById('setting-prefix').value.trim().toUpperCase();
  
  if (isNaN(nuevo) || nuevo < 1) return alert('Folio inválido');
  
  await db.settings.put({ key: 'folioActual', value: nuevo });
  if (prefix) {
    await db.settings.put({ key: 'folioPrefix', value: prefix });
  } else {
    await db.settings.delete('folioPrefix');
  }
  
  alert(`Folio actualizado a: ${prefix ? prefix + '-' : ''}${nuevo}`);
}

export async function addPaymentMethod() {
  const input = document.getElementById('new-payment');
  const nombre = input.value.trim();
  if (!nombre) return;

  const formas = (await db.settings.get('formasPago'))?.value || APP_CONFIG.formasPagoDefault;
  if (formas.includes(nombre)) return alert('Ya existe');

  formas.push(nombre);
  await db.settings.put({ key: 'formasPago', value: formas });
  input.value = '';
  renderPaymentMethods(formas);
}

export async function regenerateLogo() {
  try {
    const base64 = await obtenerLogoBase64();
    document.getElementById('logo-preview').innerHTML = `<img src="${base64}" alt="Logo">`;
    alert('Logo regenerado correctamente');
  } catch (e) {
    alert('Error: ' + e.message);
  }
}

window.removePayment = async (idx) => {
  const formas = (await db.settings.get('formasPago'))?.value || APP_CONFIG.formasPagoDefault;
  formas.splice(idx, 1);
  await db.settings.put({ key: 'formasPago', value: formas });
  await loadSettings();
};
