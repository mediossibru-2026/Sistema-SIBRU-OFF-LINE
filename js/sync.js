// js/sync.js
// Sistema de sincronización offline → Firestore
import { db } from './db.js';
import { firebaseConfig } from './config.js';

let isOnline = navigator.onLine;

// Detectar cambios de conexión
window.addEventListener('online', () => {
  console.log('🟢 Sistema en línea');
  isOnline = true;
  updateStatusIndicator(true);
  procesarColaSync();
});

window.addEventListener('offline', () => {
  console.log('🔴 Sistema sin conexión');
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

// Procesar cola de sincronización
export async function procesarColaSync() {
  if (!isOnline) {
    console.log('⏸️ Sin conexión, cola en pausa');
    return;
  }

  console.log('🔄 Procesando cola de sincronización...');

  try {
    // Obtener tickets pendientes
    const pendientes = await db.syncQueue
      .where('status')
      .equals('pending')
      .toArray();

    console.log(`📤 ${pendientes.length} tickets pendientes de sincronizar`);

    if (pendientes.length === 0) return;

    // Inicializar Firestore dinámicamente
    const { getFirestore } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
    const { initializeApp } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js');
    
    const app = initializeApp(firebaseConfig);
    const firestore = getFirestore(app);
    const { collection, addDoc, updateDoc, doc } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');

    // Sincronizar cada ticket
    for (const item of pendientes) {
      try {
        const ticket = await db.tickets.get(item.ticketFolio);
        if (!ticket) {
          console.warn(`⚠️ Ticket ${item.ticketFolio} no encontrado, marcando como synced`);
          await db.syncQueue.update(item.id, { status: 'synced', syncedAt: Date.now() });
          continue;
        }

        // Subir a Firestore
        await addDoc(collection(firestore, 'tickets'), {
          ...ticket,
          syncedAt: new Date().toISOString(),
          terminalId: ticket.terminalId || 'caja1'
        });

        // Marcar como sincronizado en IndexedDB
        await db.tickets.update(item.ticketFolio, { synced: true });
        await db.syncQueue.update(item.id, { status: 'synced', syncedAt: Date.now() });

        console.log(`✅ Ticket ${item.ticketFolio} sincronizado`);
      } catch (error) {
        console.error(`❌ Error al sincronizar ticket ${item.ticketFolio}:`, error);
        await db.syncQueue.update(item.id, { status: 'failed', error: error.message });
      }
    }

    console.log('✅ Cola de sincronización completada');
  } catch (error) {
    console.error('❌ Error al procesar cola:', error);
  }
}

// Inicializar al cargar
export function initSync() {
  console.log('🔄 Sistema de sincronización inicializado');
  updateStatusIndicator(isOnline);
  
  // Intentar sincronizar al iniciar si hay conexión
  if (isOnline) {
    setTimeout(procesarColaSync, 2000); // Esperar 2 segundos para que todo cargue
  }
}
