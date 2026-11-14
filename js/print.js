// js/print.js
import { db } from './db.js';
import { APP_CONFIG } from './config.js';

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
    console.warn("No se pudo cargar el logo:", e);
    return "";
  }
}

export function imprimirTicket(ticket) {
  const fecha = new Date(ticket.fecha).toLocaleString('es-MX', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });

  const lineas = ticket.items.map(item => {
    const nombre = item.nombre.substring(0, 26).padEnd(26, ' ');
    const cant = item.cantidad.toString().padStart(5, ' ');
    const precio = `$${item.precio.toFixed(2)}`.padStart(8, ' ');
    const importe = `$${item.importe.toFixed(2)}`.padStart(9, ' ');
    return `${nombre}${cant}${precio}${importe}`;
  }).join('\n');

  const logoImg = ticket.logoBase64
    ? `<img src="${ticket.logoBase64}" class="logo" alt="Logo">`
    : `<div class="logo-text">${APP_CONFIG.nombreEmpresa}</div>`;

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Ticket ${ticket.folio}</title>
  <style>
    @page {
      size: 80mm auto;
      margin: 0;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Courier New', Courier, monospace;
      font-size: 11px;
      width: 72mm;
      margin: 0 auto;
      padding: 3mm;
    }
    .header { text-align: center; margin-bottom: 4mm; }
    .logo { max-width: 55mm; height: auto; display: block; margin: 0 auto 2mm; }
    .logo-text { font-size: 14px; font-weight: bold; margin-bottom: 2mm; }
    .header h2 { font-size: 13px; margin: 2mm 0; text-transform: uppercase; }
    .header p { font-size: 10px; margin: 1mm 0; }
    .divider { border-top: 1px dashed #000; margin: 3mm 0; }
    .items-header {
      display: grid;
      grid-template-columns: 26mm 10mm 13mm 13mm;
      font-weight: bold;
      font-size: 10px;
      margin-bottom: 2mm;
    }
    .item {
      display: grid;
      grid-template-columns: 26mm 10mm 13mm 13mm;
      font-size: 10px;
      margin-bottom: 1mm;
    }
    .total {
      text-align: right;
      font-size: 14px;
      font-weight: bold;
      margin-top: 3mm;
      border-top: 1px dashed #000;
      padding-top: 2mm;
    }
    .footer {
      text-align: center;
      margin-top: 4mm;
      font-size: 10px;
    }
    .btn-close {
      display: block;
      margin: 5mm auto 0;
      padding: 2mm 4mm;
      background: #2e7d32;
      color: white;
      border: none;
      border-radius: 2mm;
      cursor: pointer;
      font-size: 11px;
    }
    @media print {
      .btn-close { display: none; }
      body { padding: 0; }
    }
  </style>
</head>
<body>
  <div class="header">
    ${logoImg}
    <h2>${APP_CONFIG.nombreEmpresa}</h2>
    <p>VENTA MOSTRADOR</p>
    <p>Folio: <strong>${ticket.folio}</strong> | Caja: ${APP_CONFIG.terminalId}</p>
    <p>${fecha}</p>
    <p>Cajero: ${ticket.cajeroNombre}</p>
  </div>
  <div class="divider"></div>
  <div class="items-header">
    <span>PRODUCTO</span><span>CANT</span><span>PRECIO</span><span>IMPORTE</span>
  </div>
  ${ticket.items.map(item => `
    <div class="item">
      <span>${item.nombre.substring(0, 26)}</span>
      <span>${item.cantidad} ${item.unidad}</span>
      <span>$${item.precio.toFixed(2)}</span>
      <span>$${item.importe.toFixed(2)}</span>
    </div>
  `).join('')}
  <div class="divider"></div>
  <div class="total">
    <p>TOTAL: $${ticket.total.toFixed(2)}</p>
    <p style="font-size: 11px; font-weight: normal; margin-top: 1mm;">
      Pago: ${ticket.formaPago}
    </p>
  </div>
  <div class="footer">
    <p>¡GRACIAS POR SU PREFERENCIA!</p>
  </div>
  <button class="btn-close" onclick="window.close()">Cerrar ticket</button>
  <script>
    window.onload = function() {
      setTimeout(function() { window.print(); }, 300);
    };
  </script>
</body>
</html>`;

  const ventana = window.open('', '_blank', 'width=350,height=600,scrollbars=yes');
  if (!ventana) {
    alert('El navegador bloqueó la ventana del ticket. Permite las ventanas emergentes para este sitio.');
    return;
  }
  ventana.document.open();
  ventana.document.write(html);
  ventana.document.close();
}
