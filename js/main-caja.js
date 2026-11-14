// js/main-caja.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { firebaseConfig, APP_CONFIG } from './config.js';
import { initDB, db } from './db.js';
import { buscarProducto } from './catalog.js';
import { agregarAlCarrito, procesarVenta, renderizarCarrito } from './pos.js';

// Inicializar Firebase
const app = initializeApp(firebaseConfig);

// Estado local de la UI
let productoSeleccionado = null;

document.addEventListener('DOMContentLoaded', async () => {
  await initDB();
  cargarCajerosYFormasPago();
  
  // Enfocar búsqueda al iniciar
  document.getElementById('busqueda').focus();

  // Listener de búsqueda (autocompletado)
  const inputBusqueda = document.getElementById('busqueda');
  const listaSugerencias = document.getElementById('sugerencias');

  inputBusqueda.addEventListener('input', async (e) => {
    const termino = e.target.value;
    if (termino.length < 2) {
      listaSugerencias.innerHTML = '';
      productoSeleccionado = null;
      return;
    }

    const resultados = await buscarProducto(termino);
    listaSugerencias.innerHTML = '';
    
    if (resultados.length === 1 && resultados[0].clave === termino) {
      // Selección automática si la clave es exacta
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

  // Listener para campo cantidad (salto con Enter)
  document.getElementById('cantidad').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      document.getElementById('precio').focus();
    }
  });

  // Listener para campo precio (agregar con Enter)
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

  // Listener botón cobrar
  document.getElementById('btn-cobrar').addEventListener('click', () => {
    const cajero = document.getElementById('selector-cajero').value;
    const formaPago = document.getElementById('selector-pago').value;
    procesarVenta(cajero, formaPago);
  });
});

function seleccionarProducto(p) {
  productoSeleccionado = p;
  document.getElementById('busqueda').value = `[${p.clave}] ${p.nombre}`;
  document.getElementById('sugerencias').innerHTML = '';
  
  const inputCantidad = document.getElementById('cantidad');
  inputCantidad.value = p.unidad === 'KG' ? '0.00' : '1';
  inputCantidad.focus();
  inputCantidad.select();
}

async function cargarCajerosYFormasPago() {
  const cajeros = APP_CONFIG.cajeros || [{nombre: "Nyx"}, {nombre: "Sarahi"}];
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
