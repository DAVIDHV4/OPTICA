import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login';
import DashboardAdmin from './components/DashboardAdmin';

function App() {
  const [usuario, setUsuario] = useState(null);

  // Función que se ejecuta cuando el login es exitoso
  const manejarIngreso = (datosUsuario) => {
    setUsuario(datosUsuario);
  };

  // Función para cerrar sesión
  const manejarSalida = () => {
    setUsuario(null);
  };

  return (
    <BrowserRouter>
      <Routes>
        {/* RUTA PRINCIPAL (RAÍZ) */}
        <Route 
          path="/" 
          element={
            !usuario ? (
              <Login alIngresar={manejarIngreso} />
            ) : (
              // Si ya está logueado, redirigir al dashboard correspondiente
              <Navigate to="/admin" />
            )
          } 
        />

        {/* RUTA DASHBOARD ADMIN */}
        <Route 
          path="/admin" 
          element={
            usuario ? (
              <DashboardAdmin usuario={usuario} cerrarSesion={manejarSalida} />
            ) : (
              // Si intenta entrar directo sin loguearse, lo manda al Login
              <Navigate to="/" />
            )
          } 
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;