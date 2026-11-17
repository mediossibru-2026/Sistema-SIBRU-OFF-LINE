// js/auth.js
// MODO TEMPORAL: Acceso directo sin login para pruebas del panel

const currentPage = window.location.pathname.split('/').pop();

if (currentPage === 'login.html') {
  // Redirigir automáticamente al panel si alguien entra a login
  window.location.href = 'admin.html';
}

if (currentPage === 'admin.html') {
  // Mostrar un indicador de modo temporal en el header
  const userEmail = document.getElementById('user-email');
  if (userEmail) {
    userEmail.textContent = 'admin@gruposibru.com (Modo sin login)';
  }
  
  // Botón de salir redirige a la caja
  const btnLogout = document.getElementById('btn-logout');
  if (btnLogout) {
    btnLogout.addEventListener('click', () => {
      window.location.href = 'caja.html';
    });
  }
}

// Exportaciones simuladas para que no fallen los otros módulos
export const auth = null;
export const ADMIN_EMAILS = ['admin@gruposibru.com'];

export async function signOut() {
  window.location.href = 'caja.html';
}
