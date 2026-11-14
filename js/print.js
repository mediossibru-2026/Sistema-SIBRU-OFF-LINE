// js/print.js
import { db } from './db.js';
import { APP_CONFIG } from './config.js';

// Convierte la URL del logo a Base64 para impresión offline
export async function obtenerLogoBase64() {
  let setting = await db.settings.get('logoBase64');
  if (setting && setting.value) return setting.value;

  try {
    const response = await fetch(APP_CONFIG.logoUrl);
    const blob = await response.blob();
    const base64 = await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.readAsDataURL(blob);
    });
    await db.settings.put({ key: 'logoBase64', value: base64 });
    return base64;
  } catch (e) {
    console.warn("No se pudo cargar el logo, se imprimirá sin él.", e);
    return "";
  }
}

export function imprimirTicket(ticket) {
  const fecha = new Date(ticket.fecha).toLocaleString('es-MX', { 
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' 
  });

  let lineas = ticket.items.map(item => {
    const nombre = item.nombre.substring(0, 28).padEnd(28, ' ');
    const cant = item.cantidad.toString().padStart(6, ' ');
    const precio = `$${item.precio.toFixed(2)}`.padStart(8, ' ');
    const importe = `$${item.importe.toFixed(2)}`.padStart(9, ' ');
    return `${nombre}${cant}${precio}${importe}`;
  }).join('\n');

  const html = `
    <html>
      <head>
        <link rel="stylesheet" href="css/ticket.css">
      </head>
      <body onload="window.print(); window.close();">
        <div class="ticket">
          <div class="header">
            <img src="${ticket.logoBase64 || ''}" class="logo" alt="Logo">
            <h2>${APP_CONFIG.nombreEmpresa}</h2>
            <p>VENTA MOSTRADOR</p>
            <p>Folio: ${ticket.folio} | Caja: ${APP_CONFIG.terminalId}</p>
            <p>${fecha}</p>
            <p>Cajero: ${ticket.cajeroNombre}</p>
          </div>
          <div class="divider">================================</div>
          <div class="items-header">PRODUCTO                   CANT  PRECIO  IMPORTE</div>
          <div class="items-body"><pre>${lineas}</pre></div>
          <div class="divider">================================</div>
          <div class="total">
            <p>TOTAL: $${ticket.total.toFixed(2)}</p>
            <p>PAGO: ${ticket.formaPago}</p>
          </div>
          <div class="footer">
            <p>¡GRACIAS POR SU PREFERENCIA!</p>
          </div>
        </div>
      </body>
    </html>
  `;

  const ventana = window.open('', '_blank', 'width=400,height=600');
  ventana.document.write(html);
  ventana.document.close();
}
