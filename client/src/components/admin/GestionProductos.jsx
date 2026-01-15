import React, { useState, useEffect } from 'react';
import { 
  Box, Typography, Button, TextField, Paper, Table, TableBody, 
  TableCell, TableContainer, TableHead, TableRow, InputAdornment, 
  Dialog, DialogTitle, DialogContent, DialogActions, Alert, IconButton,
  FormControl, InputLabel, Select, MenuItem, Chip
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import CloseIcon from '@mui/icons-material/Close';
import axios from 'axios';
import '../../styles/GestionProductos.css'; 

function GestionProductos() {
  const [productos, setProductos] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [openModal, setOpenModal] = useState(false);
  
  const [formulario, setFormulario] = useState({
    codigo: '',
    descripcion: '',
    categoria: 'MONTURA',
    marca: '',
    color: '',
    tipo: '',
    modelo: '',
    precio_venta: ''
  });
  const [mensaje, setMensaje] = useState(null);

  useEffect(() => {
    cargarProductos();
  }, []);

  const cargarProductos = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/productos');
      setProductos(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const productosFiltrados = productos.filter((p) => {
    return (
      p.codigo.toLowerCase().includes(busqueda.toLowerCase()) ||
      p.descripcion.toLowerCase().includes(busqueda.toLowerCase()) ||
      p.modelo?.toLowerCase().includes(busqueda.toLowerCase())
    );
  });

  const handleOpen = () => { setMensaje(null); setOpenModal(true); };
  
  const handleClose = () => { 
    setOpenModal(false); 
    setFormulario({ 
      codigo: '', descripcion: '', categoria: 'MONTURA', marca: '', 
      color: '', tipo: '', modelo: '', precio_venta: '' 
    }); 
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    const camposTexto = ['codigo', 'descripcion', 'marca', 'color', 'tipo', 'modelo'];
    
    const valorFinal = camposTexto.includes(name) ? value.toUpperCase() : value;

    setFormulario({ ...formulario, [name]: valorFinal });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMensaje(null);
    try {
      if (formulario.categoria === 'MONTURA' && !formulario.marca.trim()) {
        setMensaje({ tipo: 'error', texto: 'La marca es obligatoria para Monturas.' });
        return;
      }
      
      await axios.post('http://localhost:5000/api/productos', formulario);
      cargarProductos(); 
      handleClose(); 
    } catch (err) {
      setMensaje({ tipo: 'error', texto: err.response?.data?.error || 'Error al guardar' });
    }
  };

  return (
    <Box sx={{ width: '100%', maxWidth: '100%' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" className="gp-title">
          Catálogo de Productos
        </Typography>
        
        <Button 
          variant="contained" 
          startIcon={<AddIcon />}
          onClick={handleOpen}
          sx={{ 
            bgcolor: '#0ea5e9', color: 'white', fontWeight: 'bold', borderRadius: '8px',
            '&:hover': { bgcolor: '#0284c7' }
          }}
        >
          Nuevo Producto
        </Button>
      </Box>

      <Paper className="gp-card" sx={{ p: 2 }}>
        <TextField
          className="gp-input"
          placeholder="Buscar por código, descripción o modelo..."
          variant="outlined"
          size="small"
          fullWidth
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ color: '#64748b' }} />
              </InputAdornment>
            ),
          }}
        />
      </Paper>

      <TableContainer component={Paper} className="gp-card gp-table-container" sx={{ p: 0 }}>
        <Table sx={{ minWidth: 800 }} aria-label="tabla de productos">
          <TableHead className="gp-table-head">
            <TableRow>
              <TableCell className="gp-table-header-cell">Código</TableCell>
              <TableCell className="gp-table-header-cell">Categoría</TableCell>
              <TableCell className="gp-table-header-cell">Descripción</TableCell>
              <TableCell className="gp-table-header-cell">Marca</TableCell>
              <TableCell className="gp-table-header-cell">Modelo</TableCell>
              <TableCell className="gp-table-header-cell">Color/Tipo</TableCell>
              <TableCell className="gp-table-header-cell">Estado</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {productosFiltrados.length > 0 ? (
              productosFiltrados.map((p) => (
                <TableRow key={p.id} className="gp-table-row">
                  <TableCell className="gp-table-cell" sx={{ fontWeight: 'bold' }}>{p.codigo}</TableCell>
                  <TableCell className="gp-table-cell">
                    <Chip 
                      label={p.categoria} 
                      size="small" 
                      sx={{ 
                        bgcolor: p.categoria === 'MONTURA' ? '#e0f2fe' : '#f3e8ff',
                        color: p.categoria === 'MONTURA' ? '#0369a1' : '#7e22ce',
                        fontWeight: 'bold', fontSize: '0.7rem'
                      }} 
                    />
                  </TableCell>
                  <TableCell className="gp-table-cell">{p.descripcion}</TableCell>
                  <TableCell className="gp-table-cell">{p.marca || '-'}</TableCell>
                  <TableCell className="gp-table-cell">{p.modelo || '-'}</TableCell>
                  <TableCell className="gp-table-cell">
                    <Box sx={{ display: 'flex', flexDirection: 'column', fontSize: '0.8rem' }}>
                      <span>{p.color}</span>
                      <span style={{ color: '#64748b' }}>{p.tipo}</span>
                    </Box>
                  </TableCell>
                  <TableCell className="gp-table-cell">
                      <span style={{ color: p.estado ? '#16a34a' : '#dc2626', fontWeight: 'bold' }}>
                        {p.estado ? 'Activo' : 'Inactivo'}
                      </span>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 3, color: '#64748b' }}>
                  No se encontraron productos.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog 
        open={openModal} 
        onClose={handleClose}
        PaperProps={{ className: 'gp-modal-paper', style: { minWidth: '600px' } }}
      >
        <DialogTitle className="gp-modal-title" sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          Registrar Producto
          <IconButton onClick={handleClose} size="small"><CloseIcon /></IconButton>
        </DialogTitle>
        
        <DialogContent sx={{ mt: 2 }}>
          {mensaje && <Alert severity={mensaje.tipo} sx={{ mb: 2 }}>{mensaje.texto}</Alert>}

          <form id="form-producto" onSubmit={handleSubmit}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
              
              <Box sx={{ display: 'flex', gap: 2 }}>
                 <TextField 
                  className="gp-input" label="Código (Obligatorio)" name="codigo" required fullWidth
                  value={formulario.codigo} onChange={handleChange}
                />
                <FormControl fullWidth className="gp-input">
                  <InputLabel>Categoría</InputLabel>
                  <Select
                    name="categoria"
                    value={formulario.categoria}
                    label="Categoría"
                    onChange={handleChange}
                  >
                    <MenuItem value="MONTURA">Montura</MenuItem>
                    <MenuItem value="LUNA">Luna</MenuItem>
                  </Select>
                </FormControl>
              </Box>

              <TextField 
                className="gp-input" label="Descripción General" name="descripcion" required fullWidth
                value={formulario.descripcion} onChange={handleChange}
              />

              <Box sx={{ display: 'flex', gap: 2 }}>
                <TextField 
                  className="gp-input" label="Marca" name="marca" fullWidth
                  value={formulario.marca} onChange={handleChange}
                  disabled={formulario.categoria === 'LUNA'}
                  required={formulario.categoria === 'MONTURA'}
                  placeholder={formulario.categoria === 'LUNA' ? 'No aplica' : ''}
                />
                 <TextField 
                  className="gp-input" label="Modelo" name="modelo" fullWidth
                  value={formulario.modelo} onChange={handleChange}
                />
              </Box>

              <Box sx={{ display: 'flex', gap: 2 }}>
                <TextField 
                  className="gp-input" label="Color" name="color" fullWidth
                  value={formulario.color} onChange={handleChange}
                />
                 <TextField 
                  className="gp-input" label="Tipo/Material" name="tipo" fullWidth
                  value={formulario.tipo} onChange={handleChange}
                />
              </Box>

              <TextField 
                className="gp-input" label="Precio Venta (S/)" name="precio_venta" type="number" fullWidth
                value={formulario.precio_venta} onChange={handleChange}
                inputProps={{ step: "0.01", min: "0" }}
              />

            </Box>
          </form>
        </DialogContent>

        <DialogActions sx={{ p: 2, borderTop: '1px solid #e2e8f0' }}>
          <Button onClick={handleClose} color="inherit">Cancelar</Button>
          <Button type="submit" form="form-producto" variant="contained" sx={{ bgcolor: '#0ea5e9' }}>
            Guardar Producto
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default GestionProductos;