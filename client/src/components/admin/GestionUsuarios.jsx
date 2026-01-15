import React, { useState, useEffect } from 'react';
import { 
  Box, Typography, Button, TextField, Select, MenuItem, 
  FormControl, InputLabel, Paper, Table, TableBody, 
  TableCell, TableContainer, TableHead, TableRow, Chip, 
  InputAdornment, Dialog, DialogTitle, DialogContent, DialogActions, Alert, IconButton
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import CloseIcon from '@mui/icons-material/Close';
import axios from 'axios';
import '../../styles/GestionUsuarios.css'; 

function GestionUsuarios() {
  const [usuarios, setUsuarios] = useState([]);
  const [sedes, setSedes] = useState([]); 
  const [busqueda, setBusqueda] = useState('');
  const [filtroRol, setFiltroRol] = useState('todos');
  const [openModal, setOpenModal] = useState(false);
  
  const [modoEdicion, setModoEdicion] = useState(false);
  const [usuarioEditarId, setUsuarioEditarId] = useState(null);
  const [mostrarSelectSede, setMostrarSelectSede] = useState(true);

  const [formulario, setFormulario] = useState({
    nombres: '',
    apellido_paterno: '',
    apellido_materno: '',
    dni: '',
    fecha_nacimiento: '',
    usuario: '',
    password: '',
    rol: 'Vendedor',
    sedesIds: [] 
  });
  const [mensaje, setMensaje] = useState(null);

  useEffect(() => {
    cargarUsuarios();
    cargarSedes(); 
  }, []);

  useEffect(() => {
    if (formulario.sedesIds.length === 0) {
        setMostrarSelectSede(true);
    } else {
        setMostrarSelectSede(false);
    }
  }, [formulario.sedesIds]);

  const cargarUsuarios = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/usuarios');
      setUsuarios(res.data);
    } catch (err) { console.error(err); }
  };

  const cargarSedes = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/sedes');
      setSedes(res.data);
    } catch (err) { console.error(err); }
  };

  const usuariosFiltrados = usuarios.filter((u) => {
    const nombreCompleto = `${u.nombres} ${u.apellido_paterno} ${u.apellido_materno}`.toLowerCase();
    const coincideTexto = 
      nombreCompleto.includes(busqueda.toLowerCase()) ||
      u.usuario.toLowerCase().includes(busqueda.toLowerCase()) ||
      (u.dni && u.dni.includes(busqueda));
      
    const coincideRol = filtroRol === 'todos' || u.rol === filtroRol;
    return coincideTexto && coincideRol;
  });

  const handleOpenNuevo = () => { 
    setMensaje(null); 
    setModoEdicion(false);
    setUsuarioEditarId(null);
    setFormulario({ 
        nombres: '', apellido_paterno: '', apellido_materno: '', dni: '', fecha_nacimiento: '',
        usuario: '', password: '', rol: 'Vendedor', sedesIds: [] 
    });
    setOpenModal(true); 
  };

  const handleOpenEditar = async (usuario) => {
    setMensaje(null);
    setModoEdicion(true);
    setUsuarioEditarId(usuario.id);

    let sedesDelUsuario = [];
    if (usuario.rol === 'Vendedor' || usuario.rol === 'Almacenero') {
        try {
            const res = await axios.get(`http://localhost:5000/api/usuarios/${usuario.id}/sedes`);
            sedesDelUsuario = res.data; 
        } catch (error) { console.error(error); }
    }

    let fechaFormat = '';
    if (usuario.fecha_nacimiento) {
        const fechaObj = new Date(usuario.fecha_nacimiento);
        if (!isNaN(fechaObj.getTime())) {
            fechaFormat = fechaObj.toISOString().split('T')[0];
        }
    }

    setFormulario({
        nombres: usuario.nombres || '',
        apellido_paterno: usuario.apellido_paterno || '',
        apellido_materno: usuario.apellido_materno || '',
        dni: usuario.dni || '',
        fecha_nacimiento: fechaFormat,
        usuario: usuario.usuario || '',
        password: '', 
        rol: usuario.rol,
        sedesIds: sedesDelUsuario
    });
    setOpenModal(true);
  };
  
  const handleClose = () => { setOpenModal(false); };

  // --- AQUÍ ESTÁ EL CAMBIO CLAVE PARA MAYÚSCULAS ---
  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // Lista de campos que deben ir en MAYÚSCULAS
    const camposTexto = ['nombres', 'apellido_paterno', 'apellido_materno', 'usuario', 'dni'];
    
    // Si el campo está en la lista, lo convertimos. Si es password o fecha, lo dejamos igual.
    const valorFinal = camposTexto.includes(name) ? value.toUpperCase() : value;

    setFormulario({ ...formulario, [name]: valorFinal });
  };

  const agregarSede = (idSede) => {
    if (!formulario.sedesIds.includes(idSede)) {
        setFormulario({ ...formulario, sedesIds: [...formulario.sedesIds, idSede] });
    }
    setMostrarSelectSede(false);
  };

  const eliminarSede = (idSedeToDelete) => {
    setFormulario({ ...formulario, sedesIds: formulario.sedesIds.filter(id => id !== idSedeToDelete) });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMensaje(null);
    try {
        if ((formulario.rol === 'Vendedor' || formulario.rol === 'Almacenero') && formulario.sedesIds.length === 0) {
            setMensaje({ tipo: 'warning', texto: 'Debes asignar al menos una sede.' });
            return;
        }

        if (modoEdicion) {
            await axios.put(`http://localhost:5000/api/usuarios/${usuarioEditarId}`, formulario);
        } else {
            if (!formulario.password) {
                setMensaje({ tipo: 'error', texto: 'La contraseña es obligatoria para nuevos usuarios.' });
                return;
            }
            await axios.post('http://localhost:5000/api/usuarios', formulario);
        }
      cargarUsuarios(); 
      handleClose(); 
    } catch (err) {
      setMensaje({ tipo: 'error', texto: err.response?.data?.error || 'Error al guardar' });
    }
  };

  return (
    <Box sx={{ width: '100%', maxWidth: '100%' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" className="gu-title">Gestión de Usuarios</Typography>
        <Button 
          variant="contained" startIcon={<AddIcon />} onClick={handleOpenNuevo}
          sx={{ bgcolor: '#0ea5e9', color: 'white', fontWeight: 'bold', borderRadius: '8px', '&:hover': { bgcolor: '#0284c7' } }}
        >
          Nuevo Usuario
        </Button>
      </Box>

      <Paper className="gu-card" sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap', p: 2 }}>
        <TextField
          className="gu-input" placeholder="Buscar por nombre, usuario o DNI..." variant="outlined" size="small"
          value={busqueda} onChange={(e) => setBusqueda(e.target.value)}
          sx={{ flex: 2, minWidth: '200px' }}
          InputProps={{ startAdornment: (<InputAdornment position="start"><SearchIcon sx={{ color: '#64748b' }} /></InputAdornment>) }}
        />
        <FormControl size="small" className="gu-input" sx={{ flex: 1, minWidth: '150px' }}>
          <InputLabel>Rol</InputLabel>
          <Select value={filtroRol} label="Rol" onChange={(e) => setFiltroRol(e.target.value)}>
            <MenuItem value="todos">Todos</MenuItem>
            <MenuItem value="Administrador">Administrador</MenuItem>
            <MenuItem value="Vendedor">Vendedor</MenuItem>
            <MenuItem value="Almacenero">Almacenero</MenuItem>
          </Select>
        </FormControl>
      </Paper>

      <TableContainer component={Paper} className="gu-card gu-table-container" sx={{ p: 0 }}>
        <Table sx={{ minWidth: 650 }}>
          <TableHead className="gu-table-head">
            <TableRow>
              <TableCell className="gu-table-header-cell">DNI</TableCell>
              <TableCell className="gu-table-header-cell">Nombre Completo</TableCell>
              <TableCell className="gu-table-header-cell">Usuario</TableCell>
              <TableCell className="gu-table-header-cell">Rol</TableCell>
              <TableCell className="gu-table-header-cell">Estado</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {usuariosFiltrados.map((u) => (
                <TableRow 
                    key={u.id} className="gu-table-row" onClick={() => handleOpenEditar(u)}
                    sx={{ cursor: 'pointer', '&:hover': { backgroundColor: 'rgba(14, 165, 233, 0.05) !important' } }}
                >
                  <TableCell className="gu-table-cell" sx={{ fontWeight: 'bold' }}>{u.dni || '-'}</TableCell>
                  <TableCell className="gu-table-cell">
                    {`${u.nombres || ''} ${u.apellido_paterno || ''} ${u.apellido_materno || ''}`}
                  </TableCell>
                  <TableCell className="gu-table-cell">{u.usuario}</TableCell>
                  <TableCell className="gu-table-cell">
                    <Chip label={u.rol} size="small" sx={{ fontWeight: '600', fontSize: '0.75rem', 
                        bgcolor: u.rol === 'Administrador' ? '#fce7f3' : u.rol === 'Almacenero' ? '#fef3c7' : '#dcfce7',
                        color: u.rol === 'Administrador' ? '#be185d' : u.rol === 'Almacenero' ? '#b45309' : '#15803d',
                      }} />
                  </TableCell>
                  <TableCell className="gu-table-cell">
                    <Chip label={u.activo ? "Activo" : "Inactivo"} size="small" sx={{ 
                        bgcolor: u.activo ? '#dcfce7' : '#fee2e2', color: u.activo ? '#16a34a' : '#dc2626', fontWeight: 'bold' 
                    }} />
                  </TableCell>
                </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog 
        open={openModal} onClose={handleClose}
        PaperProps={{ className: 'gu-modal-paper', style: { minWidth: '550px' } }}
      >
        <DialogTitle className="gu-modal-title" sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {modoEdicion ? 'Editar Usuario' : 'Nuevo Usuario'}
          <IconButton onClick={handleClose} size="small"><CloseIcon sx={{ color: 'white' }}/></IconButton>
        </DialogTitle>
        
        <DialogContent sx={{ mt: 2 }}>
          {mensaje && <Alert severity={mensaje.tipo} sx={{ mb: 2 }}>{mensaje.texto}</Alert>}

          <form id="form-usuario" onSubmit={handleSubmit}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
              <Box sx={{ display: 'flex', gap: 2 }}>
                  <TextField 
                    className="gu-input" label="DNI" name="dni" required sx={{ flex: 1 }}
                    value={formulario.dni} onChange={handleChange}
                    inputProps={{ maxLength: 15 }}
                  />
                  <TextField 
                    className="gu-input" label="Fecha Nacimiento" name="fecha_nacimiento" type="date" required sx={{ flex: 1 }}
                    value={formulario.fecha_nacimiento} onChange={handleChange}
                    InputLabelProps={{ shrink: true }}
                  />
              </Box>

              <TextField 
                className="gu-input" label="Nombres" name="nombres" required fullWidth
                value={formulario.nombres} onChange={handleChange}
              />

              <Box sx={{ display: 'flex', gap: 2 }}>
                  <TextField 
                    className="gu-input" label="Apellido Paterno" name="apellido_paterno" required fullWidth
                    value={formulario.apellido_paterno} onChange={handleChange}
                  />
                  <TextField 
                    className="gu-input" label="Apellido Materno" name="apellido_materno" required fullWidth
                    value={formulario.apellido_materno} onChange={handleChange}
                  />
              </Box>

              <Box sx={{ borderBottom: '1px solid rgba(255,255,255,0.3)', my: 1 }} />

              <TextField 
                className="gu-input" label="Usuario (Login)" name="usuario" required fullWidth
                value={formulario.usuario} onChange={handleChange}
              />
              <TextField 
                className="gu-input" 
                label={modoEdicion ? "Nueva Contraseña (Opcional)" : "Contraseña"} 
                name="password" type="password" 
                required={!modoEdicion} fullWidth
                value={formulario.password} onChange={handleChange}
                helperText={modoEdicion ? "Dejar en blanco para mantener la actual" : ""}
                FormHelperTextProps={{ style: { color: 'rgba(255,255,255,0.7)' } }}
              />
              
              <FormControl fullWidth className="gu-input">
                <InputLabel>Rol</InputLabel>
                <Select name="rol" value={formulario.rol} onChange={handleChange} label="Rol">
                  <MenuItem value="Administrador">Administrador</MenuItem>
                  <MenuItem value="Vendedor">Vendedor</MenuItem>
                  <MenuItem value="Almacenero">Almacenero</MenuItem>
                </Select>
              </FormControl>

              {(formulario.rol === 'Vendedor' || formulario.rol === 'Almacenero') && (
                  <Box sx={{ border: '1px solid rgba(255,255,255,0.5)', borderRadius: 2, p: 2, bgcolor: 'rgba(255,255,255,0.1)' }}>
                    <Typography variant="subtitle2" sx={{ color: 'white', mb: 1 }}>Sedes Asignadas:</Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                        {formulario.sedesIds.map((id) => {
                            const sedeObj = sedes.find(s => s.id === id);
                            return (
                                <Chip 
                                    key={id} 
                                    label={sedeObj ? sedeObj.nombre : 'Cargando...'} 
                                    onDelete={() => eliminarSede(id)}
                                    deleteIcon={<CloseIcon style={{ color: 'white' }} />}
                                    sx={{ bgcolor: '#0ea5e9', color: 'white', fontWeight: 'bold' }}
                                />
                            );
                        })}
                        {formulario.sedesIds.length === 0 && (
                            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.6)', fontStyle: 'italic' }}>Ninguna sede asignada.</Typography>
                        )}
                    </Box>
                    {mostrarSelectSede ? (
                        <FormControl fullWidth size="small" className="gu-input">
                            <InputLabel>Seleccionar Sede</InputLabel>
                            <Select value="" label="Seleccionar Sede" onChange={(e) => agregarSede(e.target.value)}>
                                {sedes.filter(s => !formulario.sedesIds.includes(s.id)).map((sede) => (
                                    <MenuItem key={sede.id} value={sede.id}>{sede.nombre}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    ) : (
                        <Button 
                            startIcon={<AddIcon />} onClick={() => setMostrarSelectSede(true)}
                            size="small" sx={{ color: '#fff', borderColor: '#fff', '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' } }}
                            variant="outlined"
                        >
                            Agregar otra sede
                        </Button>
                    )}
                  </Box>
              )}
            </Box>
          </form>
        </DialogContent>

        <DialogActions sx={{ p: 2, borderTop: '1px solid rgba(255,255,255,0.2)' }}>
          <Button onClick={handleClose} sx={{ color: 'white' }}>Cancelar</Button>
          <Button type="submit" form="form-usuario" variant="contained" sx={{ bgcolor: '#0ea5e9', fontWeight: 'bold' }}>
            {modoEdicion ? 'Actualizar' : 'Guardar'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default GestionUsuarios;