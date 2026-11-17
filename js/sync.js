// js/sync.js
import { db } from './db.js';
import { firebaseConfig } from './config.js';

let isOnline = navigator.onLine;
let firestoreRef = null;

window.addEventListener('online', () => {
  isOnline = true;
  updateStatusIndicator(true);
  sincronizarAhora();
});

window.addEventListener('offline', () => {
  isOnline = false;
  updateStatusIndicator(false);
});

function updateStatusIndicator(online) {
  const indicator = document.getElementById('estado-red');
  if (indicator) {
    indicator.textContent = online ? '🟢 En línea' : '🔴 Sin conexión';
    indicator.className = online ? 'status-online' : 'status-offline';
  }
}

async function getFirestore() {
  if (firestoreRef) return firestoreRef;
  const { initializeApp } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js');
  const { getFirestore } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
  const app = initializeApp(firebaseConfig);
  firestoreRef = getFirestore(app);
  return firestoreRef;
}

// RESCATE MEJORADO: detecta tickets con synced:false y los encola
export async function rescatarTicketsPendientes() {
  console.log('🔍 Iniciando rescate de tickets huérfanos...');
  
  const tickets = await db.tickets.toArray();
  console.log(`📋 Total tickets en IndexedDB: ${tickets.length}`);
  
  const enCola = await db.syncQueue.toArray();
  console.log(`📋 Total en cola de sincronización: ${enCola.length}`);
  
  const foliosEnCola = new Set(enCola.map(q => String(q.ticketFolio)));
  console.log(`📋 Folios en cola:`, Array.from(foliosEnCola));
  
  let rescatados = 0;
  for (const t of tickets) {
    console.log(`🔎 Revisando ticket ${t.folio}: synced=${t.synced}, enCola=${foliosEnCola.has(String(t.folio))}`);
    
    if (!t.synced && !foliosEnCola.has(String(t.folio))) {
      console.log(`🛟 Rescatando ticket ${t.folio}...`);
      await db.syncQueue.add({
        ticketFolio: String(t.folio),
        timestamp: Date.now(),
        status: 'pending'
      });
      rescatados++;
    }
  }
  
  if (rescatados > 0) {
    console.log(`✅ Rescatados ${rescatados} tickets huérfanos a la cola`);
  } else {
    console.log(`ℹ️ No hay tickets huérfanos para rescatar`);
  }
  
  return rescatados;
}

export async function sincronizarAhora() {
  if (!isOnline) {
    console.log('⏸️ Sin conexión, sincronización en pausa');
    return { ok: 0, fail: 0, error: 'offline' };
  }

  // Ejecutar rescate primero
  const rescatados = await rescatarTicketsPendientes();
  console.log(`🔄 Rescate completado: ${rescatados} tickets encolados`);

  console.log('🔄 Procesando cola de sincronización...');
  let ok = 0, fail = 0;

  try {
    const pendientes = await db.syncQueue.where('status').equals('pending').toArray();
    console.log(`📤 ${pendientes.length} tickets en cola pendientes`);

    if (pendientes.length === 0) {
      return { ok: 0, fail: 0, rescatados };
    }

    const firestore = await getFirestore();
    const { collection, addDoc } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');

    for (const item of pendientes) {
      try {
        console.log(`📤 Sincronizando ticket ${item.ticketFolio}...`);
        const ticket = await db.tickets.get(item.ticketFolio);
        
        if (!ticket) {
          console.warn(`⚠️ Ticket ${item.ticketFolio} no encontrado en IndexedDB, marcando como synced`);
          await db.syncQueue.update(item.id, { status: 'synced', syncedAt: Date.now() });
          continue;
        }

        console.log(`📤 Subiendo ticket ${item.ticketFolio} a Firestore...`);
        await addDoc(collection(firestore, 'tickets'), {
          ...ticket,
          terminalId: ticket.terminalId || 'caja1',
          syncedAt: new Date().toISOString()
        });

        console.log(`✅ Ticket ${item.ticketFolio} subido a Firestore`);
        await db.tickets.update(item.ticketFolio, { synced: true });
        await db.syncQueue.update(item.id, { status: 'synced', syncedAt: Date.now() });
        ok++;
        console.log(`✅ Ticket ${item.ticketFolio} marcado como synced`);
      } catch (error) {
        fail++;
        console.error(`❌ Error al sincronizar ticket ${item.ticketFolio}:`, error);
        await db.syncQueue.update(item.id, { status: 'failed', error: error.message });
      }
    }

    console.log(`Cola completada. Éxito: ${ok} | Fallidos: ${fail}`);
    return { ok, fail, rescatados };
  } catch (error) {
    console.error('❌ Error general de sincronización:', error);
    return { ok, fail, error: error.message };
  }
}

export function initSync() {
  console.log('Sistema de sincronización inicializado (v2)');
  updateStatusIndicator(isOnline);
  if (isOnline) {
    setTimeout(sincronizarAhora, 1500);
  }
}
