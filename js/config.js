// js/config.js
export const firebaseConfig = {
  apiKey: "AIzaSyCsBT0lJ5671p_EOkQbkg5ZJu4rrsmqOuk",
  authDomain: "sistema-off-line.firebaseapp.com",
  projectId: "sistema-off-line",
  storageBucket: "sistema-off-line.firebasestorage.app",
  messagingSenderId: "681964055156",
  appId: "1:681964055156:web:3feb35c8ee47f7de99ff21"
};

export const APP_CONFIG = {
  firebaseConfig: firebaseConfig,
  nombreEmpresa: "GRUPO SIBRÜ",
  logoUrl: "https://res.cloudinary.com/sdhnyr5e/image/upload/v1793814011/Retrato_Google_con_Sonrisa.png",
  folioInicial: 3142,
  terminalId: "caja1",
  formasPagoDefault: ["Efectivo", "Transferencia", "Tarjeta", "Crédito"],
  cajeros: [
    { nombre: "Nyx" },
    { nombre: "Sarahi" }
  ]
};
