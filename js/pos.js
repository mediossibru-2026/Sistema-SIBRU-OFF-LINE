// js/pos.js
import { db } from './db.js';
import { generarNuevoFolio } from './folio.js';
import { obtenerLogoBase64, imprimirTicket } from './print.js';

export let carrito = [];

export function agregarAlCarrito(producto, cantidad, precio) {
  const importe = cantidad * precio;
  carrito.push({
    clave: producto.clave,
    nombre: producto.nombre,
    unidad: producto.unidad,
    cantidad: parseFloat(cantidad),
    precio: parseFloat(precio),
    importe: parseFloat(importe.toFixed(2))
  });
  renderizarCarrito();
}

export function eliminarDelCarrito(index) {
  carrito.splice(index, 1);
  renderizarCarrito();
}

export function calcularTotal() {
  return carrito.reduce((sum, item) => sum + item.importe, 0);
}

export function renderizarCarrito() {
  const tbody = document.getElementById('carrito-body');
  if (!tbody) return;

  tbody.innerHTML = '';
  carrito.forEach((item, index) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${item.nombre}</td>
      <td>${item.cantidad} ${item.unidad}</td>
      <td>$${item.precio.toFixed(2)}</td>
      <td>$${item.importe.toFixed(2)}</td>
      <td><button class="btn-danger" onclick="window.eliminarItem(${index})">X</button></td>
    `;
    tbody.appendChild(tr);
  });
  document.getElementById('total-venta').textContent = `$${calcularTotal().toFixed(2)}`;
}

window.eliminarItem = eliminarDelCarrito;

export async function procesarVenta(cajeroNombre, formaPago) {
  console.log('🛒 procesarVenta iniciado', { cajeroNombre, formaPago, items: carrito.length });
  
  if (carrito.length === 0) {
    alert("El carrito está vacío");
    return;
  }

  try {
    // Generar folio
    const folio = await generarNuevoFolio();
    console.log('🔢 Folio generado:', folio);
    
    const logoBase64 = await obtenerLogoBase64();
    
    const ticket = {
      folio: folio.toString(),
      fecha: new Date().toISOString(),
      cajeroId: "caja1",
      cajeroNombre: cajeroNombre,
      items: [...carrito],
      total: calcularTotal(),
      formaPago: formaPago,
      status: 'closed',
      synced: false,
      logoBase64: logoBase64
    };

    console.log('📝 Ticket a guardar:', ticket);

    // 1. Guardar en IndexedDB
    await db.tickets.add(ticket);
    console.log('✅ Ticket guardado en IndexedDB');

    // 2. Agregar a la cola de sincronización
    const queueEntry = {
      ticketFolio: ticket.folio,
      timestamp: Date.now(),
      status: 'pending'
    };
    console.log('📤 Agregando a syncQueue:', queueEntry);
    await db.syncQueue.add(queueEntry);
    console.log('✅ Ticket encolado para sincronización');

    // 3. Imprimir
    imprimirTicket(ticket);

    // 4. Limpiar carrito
    carrito = [];
    renderizarCarrito();
    document.getElementById('busqueda').value = '';
    document.getElementById('busqueda').focus();
    
    console.log('🎉 Venta completada exitosamente');
  } catch (error) {
    console.error('❌ Error al procesar venta:', error);
    alert('Error al procesar la venta: ' + error.message);
  }
}
