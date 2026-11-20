// js/folio.js
import { db } from './db.js';
import { APP_CONFIG } from './config.js';

export async function generarNuevoFolio() {
  console.log('🔢 Generando nuevo folio...');
  
  try {
    // Intentar leer el folio actual de settings
    const folioSetting = await db.settings.get('folioActual');
    console.log('📋 Folio actual en settings:', folioSetting);
    
    let folioActual;
    
    if (folioSetting && folioSetting.value) {
      folioActual = folioSetting.value;
      console.log('✅ Usando folio de settings:', folioActual);
    } else {
      // Si no existe, usar el folio inicial de config
      folioActual = APP_CONFIG.folioInicial;
      console.log('⚠️ No hay folio en settings, usando inicial:', folioActual);
    }
    
    // Incrementar folio
    const nuevoFolio = folioActual;
    const siguienteFolio = folioActual + 1;
    
    console.log('📈 Folio a usar:', nuevoFolio, '| Siguiente:', siguienteFolio);
    
    // Guardar el siguiente folio para la próxima venta
    await db.settings.put({ key: 'folioActual', value: siguienteFolio });
    console.log('✅ Folio actualizado a:', siguienteFolio);
    
    return nuevoFolio;
  } catch (error) {
    console.error('❌ Error al generar folio:', error);
    // Fallback: usar folio inicial
    return APP_CONFIG.folioInicial;
  }
}
