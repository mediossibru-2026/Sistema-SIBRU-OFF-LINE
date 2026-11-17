// js/main-caja.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { firebaseConfig, APP_CONFIG } from './config.js';
import { initDB, db } from './db.js';
import { buscarProducto } from './catalog.js';
import { agregarAlCarrito, procesarVenta, renderizarCarrito } from './pos.js';
import { cargarSeedDesdeExcel } from './seed.js';
import { initSync } from './sync.js';

const app = initializeApp(firebaseConfig);
let productoSeleccionado = null;
let indiceSeleccionado = -1;
let resultadosActuales = [];

document.addEventListener('DOMContentLoaded', async () => {
  await initDB();
  initSync(); // Inicializar sistema de sincronización

  const totalProductos = await db.products.count();
  if (totalProductos === 0) {
    try {
      console.log('⏳ Primera ejecución: cargando catálogo...');
      const n = await cargarSeedDesdeExcel();
      console.log(`✅ Catálogo cargado: ${n} productos`);
    } catch (e) {
      console.warn('⚠️ No se pudo cargar el catálogo:', e);
    }
  } else {
    console.log(`✅ Catálogo local existente: ${totalProductos} productos`);
  }

  cargarCajerosYFormasPago();
  document.getElementById('busqueda').focus();

  const inputBusqueda = document.getElementById('busqueda');
  const listaSugerencias = document.getElementById('sugerencias');

  inputBusqueda.addEventListener('input', async (e) => {
    const termino = e.target.value.trim();
    if (termino.length < 2) {
      listaSugerencias.innerHTML = '';
      productoSeleccionado = null;
      indiceSeleccionado = -1;
      resultadosActuales = [];
      return;
    }

    const resultados = await buscarProducto(termino);
    resultadosActuales = resultados;
    indiceSeleccionado = -1;
    listaSugerencias.innerHTML = '';

    if (resultados.length === 1 && resultados[0].clave === termino) {
      seleccionarProducto(resultados[0]);
    } else {
      resultados.forEach((p, idx) => {
        const div = document.createElement('div');
        div.className = 'sugerencia-item';
        div.textContent = `[${p.clave}] ${p.nombre} (${p.unidad})`;
        div.onclick = () => seleccionarProducto(p);
        listaSugerencias.appendChild(div);
      });
    }
  });

  inputBusqueda.addEventListener('keydown', (e) => {
    const items = listaSugerencias.querySelectorAll('.sugerencia-item');
    if (items.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      indiceSeleccionado = (indiceSeleccionado + 1) % items.length;
      actualizarSeleccionVisual(items);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      indiceSeleccionado = (indiceSeleccionado - 1 + items.length) % items.length;
      actualizarSeleccionVisual(items);
    } else if (e.key === 'Enter' && indiceSeleccionado >= 0) {
      e.preventDefault();
      const producto = resultadosActuales[indiceSeleccionado];
      if (producto) seleccionarProducto(producto);
    }
  });

  document.getElementById('cantidad').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      document.getElementById('precio').focus();
    }
  });

  document.getElementById('precio').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      ejecutarAgregar();
    }
  });

  document.getElementById('btn-agregar').addEventListener('click', (e) => {
    e.preventDefault();
    ejecutarAgregar();
  });

  document.getElementById('btn-cobrar').addEventListener('click', () => {
    const cajero = document.getElementById('selector-cajero').value;
    const formaPago = document.getElementById('selector-pago').value;
    procesarVenta(cajero, formaPago);
  });
});

function actualizarSeleccionVisual(items) {
  items.forEach((item, idx) => {
    if (idx === indiceSeleccionado) {
      item.classList.add('selected');
      item.scrollIntoView({ block: 'nearest' });
    } else {
      item.classList.remove('selected');
    }
  });
}

function ejecutarAgregar() {
  if (!productoSeleccionado) {
    alert('Selecciona un producto primero');
    return;
  }
  const cant = parseFloat(document.getElementById('cantidad').value) || 1;
  const prec = parseFloat(document.getElementById('precio').value) || 0;
  
  if (prec <= 0) {
    alert('Ingresa un precio válido');
    return;
  }

  agregarAlCarrito(productoSeleccionado, cant, prec);
  productoSeleccionado = null;
  document.getElementById('busqueda').value = '';
  document.getElementById('cantidad').value = '';
  document.getElementById('precio').value = '';
  document.getElementById('sugerencias').innerHTML = '';
  document.getElementById('busqueda').focus();
}

function seleccionarProducto(p) {
  productoSeleccionado = p;
  document.getElementById('busqueda').value = `[${p.clave}] ${p.nombre}`;
  document.getElementById('sugerencias').innerHTML = '';
  indiceSeleccionado = -1;

  const inputCantidad = document.getElementById('cantidad');
  inputCantidad.value = p.unidad === 'KG' ? '0.00' : '1';
  inputCantidad.focus();
  inputCantidad.select();
}

async function cargarCajerosYFormasPago() {
  const cajeros = APP_CONFIG.cajeros || [{ nombre: "Nyx" }, { nombre: "Sarahi" }];
  const selCajero = document.getElementById('selector-cajero');
  cajeros.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c.nombre;
    opt.textContent = c.nombre;
    selCajero.appendChild(opt);
  });

  const formas = await db.settings.get('formasPago');
  const formasPago = formas ? formas.value : APP_CONFIG.formasPagoDefault;
  const selPago = document.getElementById('selector-pago');
  formasPago.forEach(f => {
    const opt = document.createElement('option');
    opt.value = f;
    opt.textContent = f;
    selPago.appendChild(opt);
  });
}

// ═══════════════════════════════════════════════════════
// MÓDULO DE HISTORIAL EN CAJA (Lee desde Firestore)
// ═══════════════════════════════════════════════════════

const modalHistorial = document.getElementById('modal-historial');
const btnAbrirHistorial = document.getElementById('btn-abrir-historial');
const btnCerrarHistorial = document.getElementById('btn-cerrar-historial');
const btnFiltrarHistorial = document.getElementById('btn-filtrar-historial');
const inputFechaHistorial = document.getElementById('filtro-fecha-historial');

if (inputFechaHistorial) {
  inputFechaHistorial.valueAsDate = new Date();
}

let firestoreRef = null;

async function getFirestore() {
  if (firestoreRef) return firestoreRef;
  const { initializeApp } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js');
  const { getFirestore } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
  const appFs = initializeApp(firebaseConfig);
  firestoreRef = getFirestore(appFs);
  return firestoreRef;
}

async function cargarHistorial(fechaStr) {
  const tbody = document.getElementById('historial-body');
  if (!tbody) return;
  
  tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:20px">Cargando...</td></tr>';

  try {
    const firestore = await getFirestore();
    const { collection, getDocs } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
    
    const snapshot = await getDocs(collection(firestore, 'tickets'));
    const tickets = snapshot.docs.map(doc => doc.data());
    
    console.log(`📥 Historial: ${tickets.length} tickets desde Firestore`);
    
    const filtrados = tickets.filter(t => {
      const fechaTicket = new Date(t.fecha).toISOString().split('T')[0];
      return fechaTicket === fechaStr;
    }).sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

    tbody.innerHTML = '';
    if (filtrados.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:20px;color:#888">No hay tickets en esta fecha.</td></tr>';
      return;
    }

    filtrados.forEach(t => {
      const hora = new Date(t.fecha).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><strong>${t.folio}</strong></td>
        <td>${hora}</td>
        <td>${t.formaPago}</td>
        <td><strong>$${t.total.toFixed(2)}</strong></td>
        <td><button class="btn-reimprimir-sm" onclick="window.reimprimirDesdeHistorial('${t.folio}')">🖨️ Reimprimir</button></td>
      `;
      tbody.appendChild(tr);
    });
  } catch (error) {
    console.error('❌ Error al cargar historial:', error);
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:20px;color:#c62828">Error al cargar. Revisa tu conexión.</td></tr>';
  }
}

if (btnAbrirHistorial) {
  btnAbrirHistorial.addEventListener('click', () => {
    modalHistorial.classList.remove('hidden');
    cargarHistorial(inputFechaHistorial.value);
  });
}

if (btnCerrarHistorial) {
  btnCerrarHistorial.addEventListener('click', () => {
    modalHistorial.classList.add('hidden');
  });
}

if (btnFiltrarHistorial) {
  btnFiltrarHistorial.addEventListener('click', () => {
    cargarHistorial(inputFechaHistorial.value);
  });
}

window.reimprimirDesdeHistorial = async (folio) => {
  try {
    const firestore = await getFirestore();
    const { collection, query, where, getDocs } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
    
    const q = query(collection(firestore, 'tickets'), where('folio', '==', String(folio)));
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      alert('Ticket no encontrado');
      return;
    }
    
    const ticket = snapshot.docs[0].data();
    const { imprimirTicket } = await import('./print.js');
    imprimirTicket(ticket);
  } catch (error) {
    console.error('Error al reimprimir:', error);
    alert('Error al reimprimir: ' + error.message);
  }
};

if (modalHistorial) {
  modalHistorial.addEventListener('click', (e) => {
    if (e.target === modalHistorial) {
      modalHistorial.classList.add('hidden');
    }
  });
}
