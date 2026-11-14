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

  const logoImg = ticket.logoBase64
    ? `<img src="${ticket.logoBase64}" class="logo" alt="Logo">`
    : `<div class="logo-text">${APP_CONFIG.nombreEmpresa}</div>`;

  const itemsHTML = ticket.items.map(item => `
    <div class="item">
      <span class="item-nombre">${item.nombre}</span>
      <span class="item-cant">${item.cantidad} ${item.unidad}</span>
      <span class="item-precio">$${item.precio.toFixed(2)}</span>
      <span class="item-importe">$${item.importe.toFixed(2)}</span>
    </div>
  `).join('');

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Ticket ${ticket.folio} - ${APP_CONFIG.nombreEmpresa}</title>
  <style>
    @page {
      size: 80mm auto;
      margin: 2mm;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Courier New', Courier, monospace;
      font-size: 11px;
      width: 72mm;
      margin: 0 auto;
      padding: 2mm;
      color: #000;
    }
    .header { text-align: center; margin-bottom: 3mm; }
    .logo { max-width: 50mm; height: auto; display: block; margin: 0 auto 2mm; }
    .logo-text { font-size: 14px; font-weight: bold; margin-bottom: 2mm; }
    .header h2 { font-size: 13px; margin: 1mm 0; text-transform: uppercase; }
    .header p { font-size: 10px; margin: 0.5mm 0; }
    .divider { border-top: 1px dashed #000; margin: 2mm 0; }
    .items-header {
      display: grid;
      grid-template-columns: 28mm 10mm 12mm 12mm;
      font-weight: bold;
      font-size: 10px;
      margin-bottom: 1mm;
      padding-bottom: 1mm;
      border-bottom: 1px solid #000;
    }
    .item {
      display: grid;
      grid-template-columns: 28mm 10mm 12mm 12mm;
      font-size: 10px;
      margin-bottom: 1mm;
      gap: 1mm;
    }
    .item-nombre { word-wrap: break-word; }
    .item-cant, .item-precio, .item-importe { text-align: right; }
    .total {
      text-align: right;
      font-size: 14px;
      font-weight: bold;
      margin-top: 2mm;
      padding-top: 2mm;
      border-top: 1px dashed #000;
    }
    .total p { margin: 1mm 0; }
    .total .pago { font-size: 11px; font-weight: normal; }
    .footer {
      text-align: center;
      margin-top: 3mm;
      font-size: 10px;
    }
    .acciones {
      text-align: center;
      margin-top: 5mm;
      padding-top: 3mm;
      border-top: 1px solid #ccc;
    }
    .btn {
      padding: 2mm 5mm;
      margin: 1mm;
      border: none;
      border-radius: 2mm;
      cursor: pointer;
      font-size: 11px;
      font-weight: bold;
    }
    .btn-print { background: #2e7d32; color: white; }
    .btn-print:hover { background: #1b5e20; }
    .btn-close { background: #666; color: white; }
    .btn-close:hover { background: #444; }
    @media print {
      .acciones { display: none !important; }
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
    <span>PRODUCTO</span>
    <span style="text-align:right">CANT</span>
    <span style="text-align:right">PRECIO</span>
    <span style="text-align:right">IMPORTE</span>
  </div>
  ${itemsHTML}
  <div class="divider"></div>
  <div class="total">
    <p>TOTAL: $${ticket.total.toFixed(2)}</p>
    <p class="pago">Pago: ${ticket.formaPago}</p>
  </div>
  <div class="footer">
    <p>¡GRACIAS POR SU PREFERENCIA!</p>
  </div>
  <div class="acciones">
    <button class="btn btn-print" onclick="window.print()">🖨️ IMPRIMIR</button>
    <button class="btn btn-close" onclick="window.close()">✕ CERRAR</button>
  </div>
</body>
</html>`;

  // Abrir ventana nueva
  const ventana = window.open('', '_blank', 'width=380,height=650,scrollbars=yes,resizable=yes');
  
  if (!ventana) {
    alert('El navegador bloqueó la ventana del ticket. Permite las ventanas emergentes para este sitio.');
    return;
  }

  // Escribir el HTML
  try {
    ventana.document.open();
    ventana.document.write(html);
    ventana.document.close();
    ventana.focus();
  } catch (error) {
    console.error('Error al escribir el ticket:', error);
    alert('Error al generar el ticket: ' + error.message);
  }
}
