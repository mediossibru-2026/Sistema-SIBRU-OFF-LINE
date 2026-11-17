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

// RESCATE: tickets con synced:false que no están en la cola
async function rescatarTicketsPendientes() {
  const tickets = await db.tickets.toArray();
  const enCola = await db.syncQueue.toArray();
  const foliosEnCola = new Set(enCola.map(q => String(q.ticketFolio)));

  let rescatados = 0;
  for (const t of tickets) {
    if (!t.synced && !foliosEnCola.has(String(t.folio))) {
      await db.syncQueue.add({
        ticketFolio: String(t.folio),
        timestamp: Date.now(),
        status: 'pending'
      });
      rescatados++;
    }
  }
  if (rescatados > 0) {
    console.log(`🛟 Rescatados ${rescatados} tickets huérfanos a la cola`);
  }
}

export async function sincronizarAhora() {
  if (!isOnline) {
    console.log('⏸️ Sin conexión, sincronización en pausa');
    return { ok: 0, fail: 0, error: 'offline' };
  }

  await rescatarTicketsPendientes();

  console.log('🔄 Procesando cola de sincronización...');
  let ok = 0, fail = 0;

  try {
    const pendientes = await db.syncQueue.where('status').equals('pending').toArray();
    console.log(`📤 ${pendientes.length} tickets en cola`);

    if (pendientes.length === 0) {
      return { ok: 0, fail: 0 };
    }

    const firestore = await getFirestore();
    const { collection, addDoc } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');

    for (const item of pendientes) {
      try {
        const ticket = await db.tickets.get(item.ticketFolio);
        if (!ticket) {
          await db.syncQueue.update(item.id, { status: 'synced', syncedAt: Date.now() });
          continue;
        }

        await addDoc(collection(firestore, 'tickets'), {
          ...ticket,
          terminalId: ticket.terminalId || 'caja1',
          syncedAt: new Date().toISOString()
        });

        await db.tickets.update(item.ticketFolio, { synced: true });
        await db.syncQueue.update(item.id, { status: 'synced', syncedAt: Date.now() });
        ok++;
        console.log(`✅ Ticket ${item.ticketFolio} sincronizado`);
      } catch (error) {
        fail++;
        console.error(`❌ Ticket ${item.ticketFolio}:`, error.message);
        await db.syncQueue.update(item.id, { status: 'failed', error: error.message });
      }
    }

    console.log(`🏁 Cola completada. Éxito: ${ok} | Fallidos: ${fail}`);
    return { ok, fail };
  } catch (error) {
    console.error('❌ Error general de sincronización:', error);
    return { ok, fail, error: error.message };
  }
}

export function initSync() {
  console.log('🔄 Sistema de sincronización inicializado (v2)');
  updateStatusIndicator(isOnline);
  if (isOnline) {
    setTimeout(sincronizarAhora, 1500);
  }
}
