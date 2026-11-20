// js/folio.js
import { db } from './db.js';
import { APP_CONFIG } from './config.js';

export async function generarNuevoFolio() {
  console.log('🔢 Generando nuevo folio...');
  
  try {
    const folioSetting = await db.settings.get('folioActual');
    const prefixSetting = await db.settings.get('folioPrefix');
    
    console.log('📋 Folio actual en settings:', folioSetting);
    console.log('📋 Prefijo en settings:', prefixSetting);
    
    let folioActual;
    let prefix = '';
    
    if (folioSetting && folioSetting.value) {
      folioActual = folioSetting.value;
      console.log('✅ Usando folio de settings:', folioActual);
    } else {
      folioActual = APP_CONFIG.folioInicial;
      console.log('⚠️ No hay folio en settings, usando inicial:', folioActual);
    }
    
    if (prefixSetting && prefixSetting.value) {
      prefix = prefixSetting.value;
      console.log('✅ Usando prefijo:', prefix);
    }
    
    const nuevoFolio = folioActual;
    const siguienteFolio = folioActual + 1;
    
    console.log('📈 Folio a usar:', nuevoFolio, '| Siguiente:', siguienteFolio);
    
    await db.settings.put({ key: 'folioActual', value: siguienteFolio });
    console.log('✅ Folio actualizado a:', siguienteFolio);
    
    // Formatear folio con prefijo y ceros a la izquierda
    const folioFormateado = prefix 
      ? `${prefix}-${String(nuevoFolio).padStart(4, '0')}`
      : String(nuevoFolio);
    
    console.log('🎫 Folio formateado:', folioFormateado);
    
    return folioFormateado;
  } catch (error) {
    console.error('❌ Error al generar folio:', error);
    return String(APP_CONFIG.folioInicial);
  }
}
