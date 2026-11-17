// js/auth.js
// Módulo de autenticación compartido entre login.html y admin.html
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { firebaseConfig } from './config.js';

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Lista de emails autorizados como administradores
// Agrega aquí los emails de los 3 admins migrados
const ADMIN_EMAILS = [
  'tu-correo@gruposibru.com',
  'admin2@gruposibru.com',
  'admin3@gruposibru.com'
];

const currentPage = window.location.pathname.split('/').pop();

if (currentPage === 'login.html') {
  setupLoginForm();
}

if (currentPage === 'admin.html') {
  protectAdminRoute();
}

function setupLoginForm() {
  const form = document.getElementById('login-form');
  const errorDiv = document.getElementById('login-error');
  const btnSubmit = form.querySelector('button[type="submit"]');

  // Si ya está autenticado como admin, redirigir directo
  onAuthStateChanged(auth, (user) => {
    if (user && ADMIN_EMAILS.includes(user.email)) {
      window.location.href = 'admin.html';
    }
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorDiv.textContent = '';
    btnSubmit.disabled = true;
    btnSubmit.textContent = 'Iniciando sesión...';

    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;

    try {
      await signInWithEmailAndPassword(auth, email, password);

      // Verificar que sea admin
      if (!ADMIN_EMAILS.includes(email)) {
        await signOut(auth);
        errorDiv.textContent = 'No tienes permisos de administrador';
        btnSubmit.disabled = false;
        btnSubmit.textContent = 'Iniciar Sesión';
        return;
      }

      window.location.href = 'admin.html';
    } catch (error) {
      console.error('Error de login:', error);
      let mensaje = 'Error al iniciar sesión';

      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        mensaje = 'Credenciales incorrectas';
      } else if (error.code === 'auth/invalid-email') {
        mensaje = 'Correo inválido';
      } else if (error.code === 'auth/too-many-requests') {
        mensaje = 'Demasiados intentos. Intenta más tarde';
      }

      errorDiv.textContent = mensaje;
      btnSubmit.disabled = false;
      btnSubmit.textContent = 'Iniciar Sesión';
    }
  });
}

function protectAdminRoute() {
  onAuthStateChanged(auth, (user) => {
    if (!user) {
      window.location.href = 'login.html';
      return;
    }

    if (!ADMIN_EMAILS.includes(user.email)) {
      alert('No tienes permisos de administrador');
      signOut(auth).then(() => {
        window.location.href = 'login.html';
      });
      return;
    }

    const userEmail = document.getElementById('user-email');
    if (userEmail) {
      userEmail.textContent = user.email;
    }
  });

  const btnLogout = document.getElementById('btn-logout');
  if (btnLogout) {
    btnLogout.addEventListener('click', async () => {
      if (confirm('¿Cerrar sesión?')) {
        await signOut(auth);
        window.location.href = 'login.html';
      }
    });
  }
}

export { auth, signOut, ADMIN_EMAILS };
