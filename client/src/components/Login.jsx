import React, { useState } from 'react';
import { Card, CardContent, Typography, TextField, Button, Box, Alert } from '@mui/material';
import RemoveRedEyeIcon from '@mui/icons-material/RemoveRedEye';
import BusinessIcon from '@mui/icons-material/Business';
import axios from 'axios';
import '../styles/Login.css';

function Login({ alIngresar }) {
  const [usuario, setUsuario] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  
  const [step, setStep] = useState(1);
  const [sedesDisponibles, setSedesDisponibles] = useState([]);
  const [usuarioTemporal, setUsuarioTemporal] = useState(null);

  const manejarLogin = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const respuesta = await axios.post('http://localhost:5000/api/login', {
        usuario: usuario,
        password: password
      });

      const { usuario: userData, sedes } = respuesta.data;

      const rolNormalizado = userData.rol ? userData.rol.toUpperCase() : '';

      if (rolNormalizado === 'ADMINISTRADOR') {
        const usuarioAdmin = { ...userData, listaSedes: sedes };
        alIngresar(usuarioAdmin);
        return;
      }

      if (!sedes || sedes.length === 0) {
        setError('El usuario no tiene sedes asignadas.');
        return;
      }

      if (sedes.length === 1) {
        const usuarioFinal = { ...userData, sede: sedes[0] };
        alIngresar(usuarioFinal);
      } else {
        setUsuarioTemporal(userData);
        setSedesDisponibles(sedes);
        setStep(2);
      }

    } catch (err) {
      console.error(err);
      if (err.response && err.response.data && err.response.data.error) {
        setError(err.response.data.error);
      } else {
        setError('Error de conexión con el servidor');
      }
    }
  };

  const seleccionarSede = (sede) => {
    const usuarioFinal = { ...usuarioTemporal, sede: sede };
    alIngresar(usuarioFinal);
  };

  return (
    <div className="login-container">
      <Card className="login-card">
        <CardContent>
          
          <Box className="login-header">
            {step === 1 ? (
              <RemoveRedEyeIcon sx={{ fontSize: 50, mb: 1 }} />
            ) : (
              <BusinessIcon sx={{ fontSize: 50, mb: 1 }} />
            )}
            
            <Typography variant="h4" component="h1" className="login-title" gutterBottom>
              Óptica
            </Typography>
            <Typography variant="subtitle1" className="login-subtitle">
              {step === 1 ? 'Acceso al Sistema' : 'Selecciona tu Sede'}
            </Typography>
          </Box>

          {error && <Alert severity="error" className="login-alert">{error}</Alert>}

          {step === 1 ? (
            <form onSubmit={manejarLogin}>
              <TextField
                label="Usuario"
                variant="filled"
                fullWidth
                className="login-input"
                value={usuario}
                // --- CAMBIO AQUÍ: Forzar mayúsculas al escribir ---
                onChange={(e) => setUsuario(e.target.value.toUpperCase())}
                InputProps={{ disableUnderline: true }}
              />
              <TextField
                label="Contraseña"
                type="password"
                variant="filled"
                fullWidth
                className="login-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                InputProps={{ disableUnderline: true }}
              />
              
              <Button 
                type="submit" 
                variant="contained" 
                fullWidth 
                size="large" 
                className="login-button"
              >
                Ingresar
              </Button>
            </form>
          ) : (
            <Box>
              {sedesDisponibles.map((sede) => (
                <Button 
                  key={sede.id}
                  variant="contained" 
                  fullWidth 
                  size="large" 
                  className="login-button"
                  onClick={() => seleccionarSede(sede)}
                  sx={{ mb: 2 }}
                >
                  {sede.nombre}
                </Button>
              ))}
              <Button 
                variant="text" 
                fullWidth 
                onClick={() => setStep(1)}
                sx={{ mt: 1, color: '#0d47a1', fontWeight: 'bold' }}
              >
                Volver
              </Button>
            </Box>
          )}

        </CardContent>
      </Card>
    </div>
  );
}

export default Login;