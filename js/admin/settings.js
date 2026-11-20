// js/admin/settings.js
import { db } from '../db.js';
import { APP_CONFIG } from '../config.js';
import { obtenerLogoBase64 } from '../print.js';

let firestoreRef = null;

async function getFirestore() {
  if (firestoreRef) return firestoreRef;
  const { initializeApp } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js');
  const { getFirestore } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
  const app = initializeApp(APP_CONFIG.firebaseConfig || firebaseConfig);
  firestoreRef = getFirestore(app);
  return firestoreRef;
}

export async function loadSettings() {
  try {
    const firestore = await getFirestore();
    const { doc, getDoc } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
    
    // Cargar folios desde Firestore
    const folioDoc = await getDoc(doc(firestore, 'config', 'folios'));
    if (folioDoc.exists()) {
      const data = folioDoc.data();
      document.getElementById('setting-folio').value = data.siguienteFolio || 1;
      document.getElementById('setting-prefix').value = data.prefix || '';
    } else {
      document.getElementById('setting-folio').value = 1;
      document.getElementById('setting-prefix').value = 'TP';
    }
    
    // Cargar formas de pago desde Firestore
    const formasDoc = await getDoc(doc(firestore, 'config', 'formasPago'));
    if (formasDoc.exists()) {
      renderPaymentMethods(formasDoc.data().formas);
    } else {
      renderPaymentMethods(APP_CONFIG.formasPagoDefault);
    }
    
    // Logo y terminal (locales)
    const logo = await db.settings.get('logoBase64');
    document.getElementById('setting-logo-url').value = APP_CONFIG.logoUrl;
    document.getElementById('setting-terminal').value = APP_CONFIG.terminalId;
    
    if (logo && logo.value) {
      document.getElementById('logo-preview').innerHTML = `<img src="${logo.value}" alt="Logo">`;
    }
    
    console.log('✅ Configuración global cargada desde Firestore');
  } catch (error) {
    console.error('❌ Error al cargar configuración:', error);
    // Fallback a IndexedDB
    const folio = await db.settings.get('folioActual');
    const prefix = await db.settings.get('folioPrefix');
    document.getElementById('setting-folio').value = folio ? folio.value : 1;
    document.getElementById('setting-prefix').value = prefix ? prefix.value : '';
  }
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
  try {
    const nuevo = parseInt(document.getElementById('setting-folio').value);
    const prefix = document.getElementById('setting-prefix').value.trim().toUpperCase();
    
    if (isNaN(nuevo) || nuevo < 1) return alert('Folio inválido');
    
    const firestore = await getFirestore();
    const { doc, setDoc } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
    
    await setDoc(doc(firestore, 'config', 'folios'), {
      siguienteFolio: nuevo,
      prefix: prefix,
      updatedAt: new Date().toISOString()
    });
    
    // También guardar localmente
    await db.settings.put({ key: 'folioActual', value: nuevo });
    if (prefix) {
      await db.settings.put({ key: 'folioPrefix', value: prefix });
    }
    
    alert(`✅ Folio global actualizado: ${prefix ? prefix + '-' : ''}${nuevo}`);
    console.log('✅ Folio guardado en Firestore');
  } catch (error) {
    console.error('❌ Error al guardar folio:', error);
    alert('Error al guardar: ' + error.message);
  }
}

export async function addPaymentMethod() {
  try {
    const input = document.getElementById('new-payment');
    const nombre = input.value.trim();
    if (!nombre) return;

    const firestore = await getFirestore();
    const { doc, getDoc, setDoc } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
    
    const formasDoc = await getDoc(doc(firestore, 'config', 'formasPago'));
    let formas = formasDoc.exists() ? formasDoc.data().formas : APP_CONFIG.formasPagoDefault;
    
    if (formas.includes(nombre)) return alert('Ya existe');
    
    formas.push(nombre);
    
    await setDoc(doc(firestore, 'config', 'formasPago'), {
      formas: formas,
      updatedAt: new Date().toISOString()
    });
    
    input.value = '';
    renderPaymentMethods(formas);
    console.log('✅ Forma de pago agregada a Firestore');
  } catch (error) {
    console.error('❌ Error al agregar forma de pago:', error);
    alert('Error: ' + error.message);
  }
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
  try {
    const firestore = await getFirestore();
    const { doc, getDoc, setDoc } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
    
    const formasDoc = await getDoc(doc(firestore, 'config', 'formasPago'));
    let formas = formasDoc.exists() ? formasDoc.data().formas : APP_CONFIG.formasPagoDefault;
    
    formas.splice(idx, 1);
    
    await setDoc(doc(firestore, 'config', 'formasPago'), {
      formas: formas,
      updatedAt: new Date().toISOString()
    });
    
    renderPaymentMethods(formas);
    console.log('✅ Forma de pago eliminada de Firestore');
  } catch (error) {
    console.error('❌ Error al eliminar forma de pago:', error);
  }
};
