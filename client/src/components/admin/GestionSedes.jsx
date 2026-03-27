import React, { useState, useEffect } from 'react';
import { 
  Box, Typography, Button, Paper, Table, TableBody, TableCell, 
  TableContainer, TableHead, TableRow, IconButton, Dialog, 
  DialogTitle, DialogContent, DialogActions, TextField, Chip, Switch 
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import CloseIcon from '@mui/icons-material/Close';
import axios from 'axios';
import '../../styles/GestionEntradas.css'; // Reutilizamos los estilos base

function GestionSedes() {
  const [sedes, setSedes] = useState([]);
  const [openModal, setOpenModal] = useState(false);
  const [modoEdicion, setModoEdicion] = useState(false);
  
  const [sedeActual, setSedeActual] = useState({
    id: null,
    nombre: '',
    codigo: '',
    activo: true
  });

  const [errores, setErrores] = useState({});

  useEffect(() => {
    cargarSedes();
  }, []);

  const cargarSedes = async () => {
    try {
      // Usamos la ruta existente, pero ahora necesitamos traer todas (incluyendo inactivas si las hubiera)
      // Para este caso, la ruta actual /api/sedes trae solo activas, ajustaremos eso luego si es necesario
      const res = await axios.get('http://localhost:5000/api/sedes');
      setSedes(res.data);
    } catch (error) {
      console.error('Error cargando sedes:', error);
    }
  };

  const handleOpenNuevo = () => {
    setSedeActual({ id: null, nombre: '', codigo: '', activo: true });
    setErrores({});
    setModoEdicion(false);
    setOpenModal(true);
  };

  const handleOpenEditar = (sede) => {
    setSedeActual({ ...sede });
    setErrores({});
    setModoEdicion(true);
    setOpenModal(true);
  };

  const handleClose = () => {
    setOpenModal(false);
  };

  const validar = () => {
    const nuevosErrores = {};
    if (!sedeActual.nombre.trim()) nuevosErrores.nombre = 'El nombre es obligatorio';
    if (!sedeActual.codigo.trim()) nuevosErrores.codigo = 'El código es obligatorio';
    
    setErrores(nuevosErrores);
    return Object.keys(nuevosErrores).length === 0;
  };

  const handleSubmit = async () => {
    if (!validar()) return;

    try {
      if (modoEdicion) {
        await axios.put(`http://localhost:5000/api/sedes/${sedeActual.id}`, sedeActual);
      } else {
        await axios.post('http://localhost:5000/api/sedes', sedeActual);
      }
      handleClose();
      cargarSedes();
    } catch (error) {
      console.error('Error guardando sede:', error);
      alert(error.response?.data?.error || 'Error al guardar la sede');
    }
  };

  return (
    <Box className="ge-container">
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" className="ge-title">Gestión de Sedes</Typography>
        <Button 
          variant="contained" 
          startIcon={<AddIcon />} 
          onClick={handleOpenNuevo}
          sx={{ bgcolor: '#0ea5e9', fontWeight: 'bold' }}
        >
          Nueva Sede
        </Button>
      </Box>

      <TableContainer component={Paper} className="ge-card ge-table-container">
        <Table>
          <TableHead className="ge-table-head">
            <TableRow>
              <TableCell className="ge-table-header-cell">ID</TableCell>
              <TableCell className="ge-table-header-cell">Código</TableCell>
              <TableCell className="ge-table-header-cell">Nombre</TableCell>
              <TableCell className="ge-table-header-cell" align="center">Estado</TableCell>
              <TableCell className="ge-table-header-cell" align="center">Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {sedes.map((sede) => (
              <TableRow key={sede.id} className="ge-table-row">
                <TableCell className="ge-table-cell">{sede.id}</TableCell>
                <TableCell className="ge-table-cell" sx={{ fontWeight: 'bold' }}>{sede.codigo}</TableCell>
                <TableCell className="ge-table-cell">{sede.nombre}</TableCell>
                <TableCell className="ge-table-cell" align="center">
                  <Chip 
                    label={sede.activo ? 'ACTIVO' : 'INACTIVO'} 
                    size="small" 
                    sx={{ 
                        bgcolor: sede.activo ? '#dcfce7' : '#fee2e2', 
                        color: sede.activo ? '#16a34a' : '#ef4444', 
                        fontWeight: 'bold' 
                    }} 
                  />
                </TableCell>
                <TableCell className="ge-table-cell" align="center">
                  <IconButton color="primary" onClick={() => handleOpenEditar(sede)}>
                    <EditIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
            {sedes.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} align="center" className="ge-table-cell">No hay sedes registradas</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* MODAL */}
      <Dialog open={openModal} onClose={handleClose} maxWidth="sm" fullWidth PaperProps={{ className: 'ge-modal-paper' }}>
        <DialogTitle className="ge-modal-title" sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Typography variant="h6">{modoEdicion ? 'Editar Sede' : 'Nueva Sede'}</Typography>
            <IconButton onClick={handleClose} sx={{ color: 'white' }}><CloseIcon /></IconButton>
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, pt: 1 }}>
                <TextField 
                    label="Código de Sede" 
                    variant="outlined" 
                    fullWidth 
                    value={sedeActual.codigo}
                    onChange={(e) => setSedeActual({...sedeActual, codigo: e.target.value.toUpperCase()})}
                    error={!!errores.codigo}
                    helperText={errores.codigo}
                    disabled={modoEdicion} // El código generalmente no se edita
                    className="ge-modal-input"
                />
                <TextField 
                    label="Nombre de Sede" 
                    variant="outlined" 
                    fullWidth 
                    value={sedeActual.nombre}
                    onChange={(e) => setSedeActual({...sedeActual, nombre: e.target.value.toUpperCase()})}
                    error={!!errores.nombre}
                    helperText={errores.nombre}
                    className="ge-modal-input"
                />
                
                {modoEdicion && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                        <Typography sx={{ color: '#475569' }}>Estado Activo:</Typography>
                        <Switch 
                            checked={sedeActual.activo} 
                            onChange={(e) => setSedeActual({...sedeActual, activo: e.target.checked})} 
                            color="success"
                        />
                    </Box>
                )}
            </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
            <Button onClick={handleClose} sx={{ color: '#64748b' }}>Cancelar</Button>
            <Button variant="contained" onClick={handleSubmit} sx={{ bgcolor: '#0ea5e9' }}>
                Guardar
            </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default GestionSedes;