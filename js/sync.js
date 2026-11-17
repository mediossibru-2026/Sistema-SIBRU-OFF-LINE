// js/sync.js
import { db } from './db.js';
import { firebaseConfig } from './config.js';
import { APP_CONFIG } from './config.js';

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
export async function rescatarTicketsPendientes() {
  console.log('🔍 Iniciando rescate de tickets huérfanos...');

  const tickets = await db.tickets.toArray();
  const enCola = await db.syncQueue.toArray();
  const foliosEnCola = new Set(enCola.map(q => String(q.ticketFolio)));

  let rescatados = 0;
  for (const t of tickets) {
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

  console.log(rescatados > 0
    ? `✅ Rescatados ${rescatados} tickets huérfanos`
    : `ℹ️ No hay tickets huérfanos`);

  return rescatados;
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
    // ✅ CAMBIO CRÍTICO: procesar TODO lo que no esté sincronizado (pending + failed)
    const pendientes = await db.syncQueue
      .filter(q => q.status !== 'synced')
      .toArray();

    console.log(`📤 ${pendientes.length} tickets a sincronizar (incluye reintentos)`);

    if (pendientes.length === 0) {
      return { ok: 0, fail: 0 };
    }

    const firestore = await getFirestore();
    const { doc, setDoc } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');

    for (const item of pendientes) {
      try {
        const ticket = await db.tickets.get(item.ticketFolio);

        if (!ticket) {
          console.warn(`⚠️ Ticket ${item.ticketFolio} no existe, cerrando cola`);
          await db.syncQueue.update(item.id, { status: 'synced', syncedAt: Date.now() });
          continue;
        }

        // ✅ ID determinístico: caja1_3142 — reintentos NO duplican documentos
        const terminalId = ticket.terminalId || APP_CONFIG.terminalId || 'caja1';
        const docId = `${terminalId}_${ticket.folio}`;

        console.log(`📤 Subiendo ticket ${ticket.folio} a Firestore como "${docId}"...`);

        await setDoc(doc(firestore, 'tickets', docId), {
          ...ticket,
          terminalId,
          docId,
          syncedAt: new Date().toISOString()
        });

        await db.tickets.update(item.ticketFolio, { synced: true });
        await db.syncQueue.update(item.id, { status: 'synced', syncedAt: Date.now() });
        ok++;
        console.log(`✅ Ticket ${ticket.folio} sincronizado`);
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
  console.log('🔄 Sistema de sincronización inicializado (v3)');
  updateStatusIndicator(isOnline);
  if (isOnline) {
    setTimeout(sincronizarAhora, 1500);
  }
}
