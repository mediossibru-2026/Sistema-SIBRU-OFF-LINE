// js/folio.js
import { db } from './db.js';
import { APP_CONFIG } from './config.js';

let firestoreRef = null;

async function getFirestore() {
  if (firestoreRef) return firestoreRef;
  const { initializeApp } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js');
  const { getFirestore } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
  const app = initializeApp(APP_CONFIG.firebaseConfig || firebaseConfig);
  firestoreRef = getFirestore(app);
  return firestoreRef;
}

export async function generarNuevoFolio() {
  console.log('🔢 Generando nuevo folio global...');
  
  try {
    const firestore = await getFirestore();
    const { doc, getDoc, setDoc, updateDoc, increment } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
    
    // Referencia al documento de configuración de folios en Firestore
    const folioDocRef = doc(firestore, 'config', 'folios');
    
    // Intentar leer de Firestore primero
    const folioDoc = await getDoc(folioDocRef);
    
    let folioActual, prefix;
    
    if (folioDoc.exists()) {
      const data = folioDoc.data();
      folioActual = data.siguienteFolio || 1;
      prefix = data.prefix || '';
      console.log('✅ Folio global desde Firestore:', folioActual);
    } else {
      // Primera vez: crear documento
      folioActual = 1;
      prefix = 'TP';
      await setDoc(folioDocRef, {
        siguienteFolio: 2,
        prefix: prefix,
        updatedAt: new Date().toISOString()
      });
      console.log('🆕 Documento de folios creado en Firestore');
    }
    
    // Incrementar el contador en Firestore
    await updateDoc(folioDocRef, {
      siguienteFolio: increment(1),
      updatedAt: new Date().toISOString()
    });
    
    console.log('📈 Folio usado:', folioActual, '| Siguiente:', folioActual + 1);
    
    // También guardar localmente como backup offline
    await db.settings.put({ key: 'folioActual', value: folioActual + 1 });
    if (prefix) {
      await db.settings.put({ key: 'folioPrefix', value: prefix });
    }
    
    // Formatear folio
    const folioFormateado = prefix 
      ? `${prefix}-${String(folioActual).padStart(4, '0')}`
      : String(folioActual);
    
    console.log('🎫 Folio formateado:', folioFormateado);
    
    return folioFormateado;
  } catch (error) {
    console.error('❌ Error al generar folio global:', error);
    
    // Fallback: usar IndexedDB local si Firestore falla
    console.log('⚠️ Usando folio local como fallback');
    const folioSetting = await db.settings.get('folioActual');
    const prefixSetting = await db.settings.get('folioPrefix');
    
    let folioActual = folioSetting?.value || 1;
    let prefix = prefixSetting?.value || '';
    
    const folioFormateado = prefix 
      ? `${prefix}-${String(folioActual).padStart(4, '0')}`
      : String(folioActual);
    
    await db.settings.put({ key: 'folioActual', value: folioActual + 1 });
    
    return folioFormateado;
  }
}
