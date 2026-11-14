// js/main-caja.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { firebaseConfig, APP_CONFIG } from './config.js';
import { initDB, db } from './db.js';
import { buscarProducto } from './catalog.js';
import { agregarAlCarrito, procesarVenta, renderizarCarrito } from './pos.js';
import { cargarSeedDesdeExcel } from './seed.js';

// Inicializar Firebase
const app = initializeApp(firebaseConfig);

// Estado local de la UI
let productoSeleccionado = null;

document.addEventListener('DOMContentLoaded', async () => {
  // 1. Inicializar IndexedDB
  await initDB();

  // 2. Carga automática del catálogo la primera vez
  const totalProductos = await db.products.count();
  if (totalProductos === 0) {
    try {
      console.log('⏳ Primera ejecución: cargando catálogo desde articulos.xlsx...');
      const n = await cargarSeedDesdeExcel();
      console.log(`✅ Catálogo cargado: ${n} productos`);
    } catch (e) {
      console.warn('⚠️ No se pudo cargar el catálogo automático:', e);
    }
  } else {
    console.log(`✅ Catálogo local existente: ${totalProductos} productos`);
  }

  // 3. Cargar cajeros y formas de pago
  cargarCajerosYFormasPago();

  // 4. Enfocar búsqueda al iniciar
  document.getElementById('busqueda').focus();

  // 5. Listener de búsqueda (autocompletado en tiempo real)
  const inputBusqueda = document.getElementById('busqueda');
  const listaSugerencias = document.getElementById('sugerencias');

  inputBusqueda.addEventListener('input', async (e) => {
    const termino = e.target.value.trim();
    if (termino.length < 2) {
      listaSugerencias.innerHTML = '';
      productoSeleccionado = null;
      return;
    }

    const resultados = await buscarProducto(termino);
    listaSugerencias.innerHTML = '';

    // Si hay coincidencia exacta por clave, seleccionar automáticamente
    if (resultados.length === 1 && resultados[0].clave === termino) {
      seleccionarProducto(resultados[0]);
    } else {
      resultados.forEach(p => {
        const div = document.createElement('div');
        div.className = 'sugerencia-item';
        div.textContent = `[${p.clave}] ${p.nombre} (${p.unidad})`;
        div.onclick = () => seleccionarProducto(p);
        listaSugerencias.appendChild(div);
      });
    }
  });

  // 6. Listener para campo cantidad (salto con Enter)
  document.getElementById('cantidad').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      document.getElementById('precio').focus();
    }
  });

  // 7. Listener para campo precio (agregar con Enter)
  document.getElementById('precio').addEventListener('keydown', async (e) => {
    if (e.key === 'Enter' && productoSeleccionado) {
      e.preventDefault();
      const cant = parseFloat(document.getElementById('cantidad').value) || 1;
      const prec = parseFloat(document.getElementById('precio').value) || 0;

      agregarAlCarrito(productoSeleccionado, cant, prec);

      // Resetear campos y volver a enfocar búsqueda
      productoSeleccionado = null;
      inputBusqueda.value = '';
      document.getElementById('cantidad').value = '';
      document.getElementById('precio').value = '';
      listaSugerencias.innerHTML = '';
      inputBusqueda.focus();
    }
  });

  // 8. Listener botón cobrar
  document.getElementById('btn-cobrar').addEventListener('click', () => {
    const cajero = document.getElementById('selector-cajero').value;
    const formaPago = document.getElementById('selector-pago').value;
    procesarVenta(cajero, formaPago);
  });
});

// Función para seleccionar un producto del autocompletador
function seleccionarProducto(p) {
  productoSeleccionado = p;
  document.getElementById('busqueda').value = `[${p.clave}] ${p.nombre}`;
  document.getElementById('sugerencias').innerHTML = '';

  const inputCantidad = document.getElementById('cantidad');
  inputCantidad.value = p.unidad === 'KG' ? '0.00' : '1';
  inputCantidad.focus();
  inputCantidad.select();
}

// Cargar cajeros y formas de pago desde config y IndexedDB
async function cargarCajerosYFormasPago() {
  // Cajeros
  const cajeros = APP_CONFIG.cajeros || [{ nombre: "Nyx" }, { nombre: "Sarahi" }];
  const selCajero = document.getElementById('selector-cajero');
  cajeros.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c.nombre;
    opt.textContent = c.nombre;
    selCajero.appendChild(opt);
  });

  // Formas de pago
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
