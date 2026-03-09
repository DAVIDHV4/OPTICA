import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login';
import DashboardAdmin from './components/DashboardAdmin';

function App() {
  const [usuario, setUsuario] = useState(null);

  useEffect(() => {
    const usuarioGuardado = localStorage.getItem('usuario_optica');
    if (usuarioGuardado) {
      setUsuario(JSON.parse(usuarioGuardado));
    }
  }, []);

  const manejarIngreso = (datosUsuario) => {
    setUsuario(datosUsuario);
    localStorage.setItem('usuario_optica', JSON.stringify(datosUsuario));
  };

  const manejarSalida = () => {
    setUsuario(null);
    localStorage.removeItem('usuario_optica');
  };

  return (
    <BrowserRouter>
      <Routes>
        <Route 
          path="/" 
          element={
            !usuario ? (
              <Login alIngresar={manejarIngreso} />
            ) : (
              <Navigate to="/admin" />
            )
          } 
        />

        <Route 
          path="/admin/*" 
          element={
            usuario ? (
              <DashboardAdmin usuario={usuario} cerrarSesion={manejarSalida} />
            ) : (
              <Navigate to="/" />
            )
          } 
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;