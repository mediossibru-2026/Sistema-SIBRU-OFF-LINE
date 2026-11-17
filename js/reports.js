// js/reports.js
// Importaciones ESM válidas (builds +esm de jsDelivr)
import { jsPDF } from 'https://cdn.jsdelivr.net/npm/jspdf@2.5.1/+esm';
import autoTable from 'https://cdn.jsdelivr.net/npm/jspdf-autotable@3.8.2/+esm';

export function downloadCSV(filename, rows) {
  const BOM = '\uFEFF';
  const csv = rows.map(r => r.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

export function exportTicketsResumido(tickets) {
  const rows = tickets.map(t => [
    t.folio,
    new Date(t.fecha).toLocaleString('es-MX'),
    t.cajeroNombre,
    t.formaPago,
    `$${t.total.toFixed(2)}`
  ]);
  downloadCSV(`tickets_${Date.now()}.csv`, [['Folio','Fecha','Cajero','Forma Pago','Total'], ...rows]);
}

export function exportTicketsDetalle(tickets) {
  const rows = [];
  tickets.forEach(t => {
    const fecha = new Date(t.fecha).toLocaleString('es-MX');
    t.items.forEach((item, idx) => {
      rows.push([
        t.folio, fecha, t.cajeroNombre, t.formaPago,
        item.nombre, item.cantidad, item.unidad,
        `$${item.precio.toFixed(2)}`, `$${item.importe.toFixed(2)}`,
        idx === 0 ? `$${t.total.toFixed(2)}` : ''
      ]);
    });
  });
  downloadCSV(`tickets_detalle_${Date.now()}.csv`, [
    ['Folio','Fecha','Cajero','Forma Pago','Producto','Cantidad','Unidad','Precio','Importe','Total Ticket'], ...rows
  ]);
}

export function exportTicketsPDF(tickets) {
  const doc = new jsPDF('landscape', 'mm', 'letter');
  doc.setFontSize(16);
  doc.text('Reporte de Tickets - GRUPO SIBRU', 14, 15);
  doc.setFontSize(10);
  doc.text(`Generado: ${new Date().toLocaleString('es-MX')} | Total: ${tickets.length} tickets`, 14, 22);

  autoTable(doc, {
    startY: 28,
    head: [['Folio', 'Fecha', 'Cajero', 'Forma Pago', 'Total']],
    body: tickets.map(t => [
      t.folio,
      new Date(t.fecha).toLocaleString('es-MX'),
      t.cajeroNombre,
      t.formaPago,
      `$${t.total.toFixed(2)}`
    ]),
    headStyles: { fillColor: [46, 125, 50] },
    styles: { fontSize: 9 }
  });

  doc.save(`tickets_${Date.now()}.pdf`);
}

export function exportTicketsDetallePDF(tickets) {
  const doc = new jsPDF('landscape', 'mm', 'letter');
  doc.setFontSize(16);
  doc.text('Reporte Detallado - GRUPO SIBRU', 14, 15);
  doc.setFontSize(10);
  doc.text(`Generado: ${new Date().toLocaleString('es-MX')} | ${tickets.length} tickets`, 14, 22);

  const body = [];
  tickets.forEach(t => {
    const fecha = new Date(t.fecha).toLocaleString('es-MX');
    t.items.forEach((item, idx) => {
      body.push([
        t.folio, fecha, t.cajeroNombre, t.formaPago,
        item.nombre, `${item.cantidad} ${item.unidad}`,
        `$${item.precio.toFixed(2)}`, `$${item.importe.toFixed(2)}`,
        idx === 0 ? `$${t.total.toFixed(2)}` : ''
      ]);
    });
  });

  autoTable(doc, {
    startY: 28,
    head: [['Folio','Fecha','Cajero','Pago','Producto','Cantidad','Precio','Importe','Total']],
    body,
    headStyles: { fillColor: [46, 125, 50] },
    styles: { fontSize: 8 },
    columnStyles: { 4: { cellWidth: 60 } }
  });

  doc.save(`tickets_detalle_${Date.now()}.pdf`);
}

export function exportProductosCSV(products) {
  const rows = products.map(p => [p.clave, p.nombre, p.unidad, p.linea, p.claveSAT, p.precioSugerido, p.activo ? 'Activo' : 'Pausado']);
  downloadCSV(`productos_${Date.now()}.csv`, [['Clave','Nombre','Unidad','Linea','Clave SAT','Precio','Estado'], ...rows]);
}
