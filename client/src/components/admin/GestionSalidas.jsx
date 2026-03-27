import React, { useState, useEffect } from 'react';
import { 
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer, 
  TableHead, TableRow, Button, TextField, Select, MenuItem, FormControl, 
  InputLabel, Dialog, DialogTitle, DialogContent, 
  DialogActions, Chip, IconButton, Grid, Divider, Alert, DialogContentText 
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import DeleteIcon from '@mui/icons-material/Delete';
import CloseIcon from '@mui/icons-material/Close';
import OutputIcon from '@mui/icons-material/Output'; 
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import EventNoteIcon from '@mui/icons-material/EventNote';
import StoreIcon from '@mui/icons-material/Store';
import axios from 'axios';
import '../../styles/GestionEntradas.css'; 

function GestionSalidas({ usuario }) {
  const [salidas, setSalidas] = useState([]); 
  const [sedes, setSedes] = useState([]);
  const [inventarioSede, setInventarioSede] = useState([]); 
  
  const [filtroSede, setFiltroSede] = useState('todas');
  const [filtroTipo, setFiltroTipo] = useState('todos');

  const [openModal, setOpenModal] = useState(false);
  const [openConfirmClose, setOpenConfirmClose] = useState(false);
  const [openConfirmAnular, setOpenConfirmAnular] = useState(false);
  const [guiaAAnular, setGuiaAAnular] = useState(null);
  
  const [busquedaProd, setBusquedaProd] = useState('');
  
  const [nuevaSalida, setNuevaSalida] = useState({
    sede_id: '',
    sede_destino_id: '', 
    tipo_salida: 'AJUSTE', 
    fecha: new Date().toISOString().split('T')[0],
    observacion: '',
    serie: '---', 
    numero: '---'
  });
  
  const [carrito, setCarrito] = useState([]);
  const [mensaje, setMensaje] = useState(null);
  const [mensajeGeneral, setMensajeGeneral] = useState(null);

  useEffect(() => {
    cargarSedes();
    cargarSalidas();
  }, []);

  useEffect(() => {
    cargarSalidas();
  }, [filtroSede, filtroTipo]);

  useEffect(() => {
    if (nuevaSalida.sede_id) {
        cargarInventario(nuevaSalida.sede_id);
        obtenerSerie(nuevaSalida.sede_id);
        setCarrito([]); 
    }
  }, [nuevaSalida.sede_id]);

  const cargarSedes = async () => {
    try { const res = await axios.get('http://localhost:5000/api/sedes'); setSedes(res.data); } catch(e) { console.error(e); }
  };

  const cargarSalidas = async () => {
    try {
        const res = await axios.get('http://localhost:5000/api/salidas', {
            params: { sede_id: filtroSede, tipo: filtroTipo }
        });
        setSalidas(res.data);
    } catch(e) { console.error(e); }
  };

  const cargarInventario = async (idSede) => {
    try {
        const res = await axios.get(`http://localhost:5000/api/inventario/${idSede}`);
        setInventarioSede(res.data); 
    } catch (e) { console.error(e); }
  };

  const obtenerSerie = async (sedeId) => {
    try {
        const res = await axios.get(`http://localhost:5000/api/salidas/serie/${sedeId}`);
        setNuevaSalida(prev => ({ 
            ...prev, 
            serie: res.data.serie, 
            numero: res.data.numero.toString().padStart(8, '0') 
        }));
    } catch(e) { console.error(e); }
  };

  const handleOpen = () => {
    setMensaje(null);
    setNuevaSalida({
        sede_id: '',
        sede_destino_id: '',
        tipo_salida: 'AJUSTE',
        fecha: new Date().toISOString().split('T')[0],
        observacion: '',
        serie: '---',
        numero: '---'
    });
    setCarrito([]);
    setOpenModal(true);
  };

  const handleCloseRequest = () => {
    if (nuevaSalida.sede_id || carrito.length > 0) {
        setOpenConfirmClose(true);
    } else {
        setOpenModal(false);
    }
  };

  const confirmarCierre = () => {
    setOpenConfirmClose(false);
    setOpenModal(false);
  };

  const confirmarAnulacion = (guia) => {
    setGuiaAAnular(guia);
    setOpenConfirmAnular(true);
  };

  const ejecutarAnulacion = async () => {
    try {
        await axios.put(`http://localhost:5000/api/salidas/${guiaAAnular.id}/anular`);
        setMensajeGeneral({ tipo: 'success', texto: 'Guía anulada y stock revertido correctamente.' });
        setOpenConfirmAnular(false);
        cargarSalidas();
        setTimeout(() => setMensajeGeneral(null), 4000);
    } catch (err) {
        console.error(err);
        setMensajeGeneral({ tipo: 'error', texto: err.response?.data?.error || 'Error al anular la guía.' });
        setOpenConfirmAnular(false);
    }
  };

  const agregarProducto = (prodInventario) => {
    if (prodInventario.cantidad <= 0) {
        setMensaje({ tipo: 'warning', texto: 'No hay stock disponible de este producto.' });
        return;
    }
    const existe = carrito.find(p => p.codigo === prodInventario.codigo);
    if (existe) {
        setMensaje({ tipo: 'warning', texto: 'El producto ya está en la lista.' });
        return;
    }
    setCarrito([...carrito, { 
        ...prodInventario, 
        cantidadSalida: 1, 
        stockMaximo: prodInventario.cantidad 
    }]);
    setBusquedaProd('');
  };

  const cambiarCantidad = (codigo, valor) => {
    const val = parseInt(valor);
    if (val < 1) return;
    setCarrito(carrito.map(p => {
        if (p.codigo === codigo) {
            if (val > p.stockMaximo) {
                setMensaje({ tipo: 'warning', texto: `Stock insuficiente. Solo hay ${p.stockMaximo} disponibles.` });
                return { ...p, cantidadSalida: p.stockMaximo };
            }
            return { ...p, cantidadSalida: val };
        }
        return p;
    }));
  };

  const eliminarDelCarrito = (codigo) => {
    setCarrito(carrito.filter(p => p.codigo !== codigo));
  };

  const handleSubmit = async () => {
    if (!nuevaSalida.sede_id || carrito.length === 0) {
        setMensaje({ tipo: 'error', texto: 'Seleccione Sede y agregue productos.' });
        return;
    }
    if (nuevaSalida.tipo_salida === 'TRANSFERENCIA' && !nuevaSalida.sede_destino_id) {
        setMensaje({ tipo: 'error', texto: 'Para transferencia debe seleccionar la Sede Destino.' });
        return;
    }
    if (nuevaSalida.tipo_salida === 'TRANSFERENCIA' && nuevaSalida.sede_id === nuevaSalida.sede_destino_id) {
        setMensaje({ tipo: 'error', texto: 'La sede destino no puede ser igual a la de origen.' });
        return;
    }

    try {
        const productosParaEnviar = carrito.map(item => ({
            id: item.id, 
            cantidad: item.cantidadSalida,
            precio_venta: item.precio_venta,
            codigo: item.codigo 
        }));

        await axios.post('http://localhost:5000/api/salidas', {
            sede_id: nuevaSalida.sede_id,
            usuario_id: usuario.id,
            tipo_salida: nuevaSalida.tipo_salida,
            fecha: nuevaSalida.fecha,
            sede_destino_id: nuevaSalida.sede_destino_id || null,
            observacion: nuevaSalida.observacion,
            productos: productosParaEnviar
        });

        setOpenModal(false);
        setMensajeGeneral({ tipo: 'success', texto: 'Guía generada y stock descontado correctamente.' });
        cargarSalidas(); 
        setTimeout(() => setMensajeGeneral(null), 4000);
        
    } catch (err) {
        console.error(err);
        setMensaje({ 
            tipo: 'error', 
            texto: err.response?.data?.error || 'Error al guardar la salida.' 
        });
    }
  };

  const productosFiltrados = busquedaProd ? inventarioSede.filter(p => 
    p.codigo.includes(busquedaProd.toUpperCase()) || p.descripcion.includes(busquedaProd.toUpperCase())
  ).slice(0, 5) : [];

  return (
    <Box className="ge-container">
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" className="ge-title">Gestión de Salidas</Typography>
        <Button 
            variant="contained" 
            startIcon={<AddIcon />} 
            onClick={handleOpen}
            sx={{ bgcolor: '#ef4444', fontWeight: 'bold', '&:hover':{ bgcolor: '#dc2626'} }}
        >
            Nueva Salida
        </Button>
      </Box>

      {mensajeGeneral && <Alert severity={mensajeGeneral.tipo} sx={{ mb: 3 }}>{mensajeGeneral.texto}</Alert>}

      <Paper className="ge-card" sx={{ p: 2, display: 'flex', gap: 2, mb: 3 }}>
        <FormControl size="small" sx={{ minWidth: 200 }} className="ge-input-glass">
            <InputLabel shrink>Filtrar por Sede</InputLabel>
            <Select 
                value={filtroSede} 
                onChange={(e) => setFiltroSede(e.target.value)}
                displayEmpty
                label="Filtrar por Sede"
            >
                <MenuItem value="todas">Todas</MenuItem>
                {sedes.map(s => <MenuItem key={s.id} value={s.id}>{s.nombre}</MenuItem>)}
            </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 200 }} className="ge-input-glass">
            <InputLabel shrink>Tipo de Salida</InputLabel>
            <Select 
                value={filtroTipo} 
                onChange={(e) => setFiltroTipo(e.target.value)}
                displayEmpty
                label="Tipo de Salida"
            >
                <MenuItem value="todos">Todos</MenuItem>
                <MenuItem value="AJUSTE">Ajuste</MenuItem>
                <MenuItem value="TRANSFERENCIA">Transferencia</MenuItem>
            </Select>
        </FormControl>
      </Paper>

      <TableContainer component={Paper} className="ge-card ge-table-container" sx={{ p: 0 }}>
        <Table>
            <TableHead className="ge-table-head">
                <TableRow>
                    <TableCell className="ge-table-header-cell">Fecha</TableCell>
                    <TableCell className="ge-table-header-cell">N° Comprobante</TableCell>
                    <TableCell className="ge-table-header-cell">Sede Origen</TableCell>
                    <TableCell className="ge-table-header-cell">Tipo Salida</TableCell>
                    <TableCell className="ge-table-header-cell">Destino / Obs</TableCell>
                    <TableCell className="ge-table-header-cell">Responsable</TableCell>
                    <TableCell className="ge-table-header-cell">Estado</TableCell>
                    <TableCell className="ge-table-header-cell" align="center">Acciones</TableCell>
                </TableRow>
            </TableHead>
            <TableBody>
                {salidas.map((row) => (
                    <TableRow key={row.id} className="ge-table-row" sx={{ opacity: row.estado === 'ANULADO' ? 0.6 : 1 }}>
                        <TableCell className="ge-table-cell">{new Date(row.fecha).toLocaleDateString()}</TableCell>
                        <TableCell className="ge-table-cell" sx={{ fontWeight: 'bold', textDecoration: row.estado === 'ANULADO' ? 'line-through' : 'none' }}>{row.nro_comprobante}</TableCell>
                        <TableCell className="ge-table-cell">{row.nombre_sede}</TableCell>
                        <TableCell className="ge-table-cell">
                            <Chip 
                                label={row.tipo_salida} size="small"
                                sx={{ 
                                    fontWeight: 'bold', fontSize: '0.75rem',
                                    bgcolor: row.tipo_salida === 'AJUSTE' ? '#fee2e2' : '#dbeafe',
                                    color: row.tipo_salida === 'AJUSTE' ? '#991b1b' : '#1e40af'
                                }} 
                            />
                        </TableCell>
                        <TableCell className="ge-table-cell">
                            {row.tipo_salida === 'TRANSFERENCIA' ? 
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: '#1e293b', fontWeight:'bold' }}>
                                    <LocalShippingIcon fontSize="small" sx={{color:'#64748b'}}/> {row.nombre_destino}
                                </Box> 
                                : <span style={{color:'#64748b', fontStyle:'italic'}}>{row.observacion || '-'}</span>
                            }
                        </TableCell>
                        <TableCell className="ge-table-cell">{row.nombre_usuario}</TableCell>
                        <TableCell className="ge-table-cell">
                            <Chip 
                                label={row.estado} size="small" 
                                sx={{ 
                                    fontWeight: 'bold', 
                                    bgcolor: row.estado === 'PENDIENTE' ? '#fef3c7' : row.estado === 'ANULADO' ? '#f1f5f9' : '#dcfce7', 
                                    color: row.estado === 'PENDIENTE' ? '#b45309' : row.estado === 'ANULADO' ? '#64748b' : '#16a34a' 
                                }} 
                            />
                        </TableCell>
                        <TableCell className="ge-table-cell" align="center">
                            {row.estado !== 'ANULADO' ? (
                                <IconButton size="small" sx={{ color: '#ef4444' }} onClick={() => confirmarAnulacion(row)}>
                                    <DeleteIcon fontSize="small" />
                                </IconButton>
                            ) : (
                                <span style={{ color: '#94a3b8', fontSize: '0.8rem', fontWeight: 'bold' }}>---</span>
                            )}
                        </TableCell>
                    </TableRow>
                ))}
                {salidas.length === 0 && (
                    <TableRow><TableCell colSpan={8} align="center" className="ge-table-cell">No hay salidas registradas.</TableCell></TableRow>
                )}
            </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={openModal} onClose={handleCloseRequest} maxWidth="md" fullWidth PaperProps={{ className: 'ge-modal-paper' }}>
        <DialogTitle className="ge-modal-title" sx={{ display: 'flex', justifyContent: 'space-between', bgcolor: '#b91c1c' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <OutputIcon /> Nueva Guía de Salida
            </Box>
            <IconButton onClick={handleCloseRequest} sx={{ color: 'white' }}><CloseIcon /></IconButton>
        </DialogTitle>
        
        <DialogContent>
            {mensaje && <Alert severity={mensaje.tipo} sx={{ mb: 2, mt: 2 }}>{mensaje.texto}</Alert>}
            
            <Box sx={{ mt: 2 }}>
                <Paper elevation={0} sx={{ p: 2, mb: 2, bgcolor: 'rgba(255,255,255,0.5)', border: '1px solid #e2e8f0' }}>
                    <Typography variant="subtitle2" sx={{ mb: 2, color: '#475569', display:'flex', alignItems:'center', gap:1 }}>
                        <StoreIcon fontSize="small"/> DATOS DE ORIGEN Y TIPO
                    </Typography>
                    <Grid container spacing={2}>
                        <Grid item xs={12} md={6}>
                            <FormControl fullWidth size="small">
                                <Select 
                                    displayEmpty
                                    value={nuevaSalida.sede_id} 
                                    onChange={(e) => setNuevaSalida({...nuevaSalida, sede_id: e.target.value})}
                                    sx={{ bgcolor: 'white' }}
                                    renderValue={(selected) => {
                                        if (!selected) return <span style={{ color: '#94a3b8' }}>Seleccione una Sede de Origen</span>;
                                        const s = sedes.find(x => x.id === selected);
                                        return s ? s.nombre : '';
                                    }}
                                >
                                    <MenuItem disabled value=""><em>Seleccione Sede Origen</em></MenuItem>
                                    {sedes.map(s => <MenuItem key={s.id} value={s.id}>{s.nombre}</MenuItem>)}
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <FormControl fullWidth size="small">
                                <Select 
                                    value={nuevaSalida.tipo_salida} 
                                    onChange={(e) => setNuevaSalida({...nuevaSalida, tipo_salida: e.target.value, sede_destino_id: ''})}
                                    sx={{ bgcolor: 'white' }}
                                >
                                    <MenuItem value="AJUSTE">Ajuste (Merma/Uso Interno)</MenuItem>
                                    <MenuItem value="TRANSFERENCIA">Transferencia a otra Sede</MenuItem>
                                </Select>
                            </FormControl>
                        </Grid>
                    </Grid>
                </Paper>

                {nuevaSalida.tipo_salida === 'TRANSFERENCIA' && (
                    <Paper elevation={0} sx={{ p: 2, mb: 2, bgcolor: '#eff6ff', border: '1px dashed #3b82f6' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <LocalShippingIcon sx={{ color: '#2563eb' }} />
                            <FormControl fullWidth size="small">
                                <Select 
                                    displayEmpty
                                    value={nuevaSalida.sede_destino_id} 
                                    onChange={(e) => setNuevaSalida({...nuevaSalida, sede_destino_id: e.target.value})}
                                    sx={{ bgcolor: 'white' }}
                                    renderValue={(selected) => {
                                        if (!selected) return <span style={{ color: '#94a3b8' }}>Seleccione Sede de Destino</span>;
                                        const s = sedes.find(x => x.id === selected);
                                        return s ? s.nombre : '';
                                    }}
                                >
                                    <MenuItem disabled value=""><em>Seleccione Destino</em></MenuItem>
                                    {sedes.filter(s => s.id !== nuevaSalida.sede_id).map(s => (
                                        <MenuItem key={s.id} value={s.id}>{s.nombre}</MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Box>
                    </Paper>
                )}

                <Grid container spacing={2} sx={{ mb: 3 }}>
                    <Grid item xs={4}>
                        <TextField label="Fecha" type="date" size="small" fullWidth value={nuevaSalida.fecha} onChange={(e) => setNuevaSalida({...nuevaSalida, fecha: e.target.value})} sx={{ bgcolor: 'rgba(255,255,255,0.5)' }} />
                    </Grid>
                    <Grid item xs={4}>
                        <TextField label="Nro Guía" value={`${nuevaSalida.serie}-${nuevaSalida.numero}`} disabled size="small" fullWidth sx={{ bgcolor: '#f1f5f9' }} />
                    </Grid>
                    <Grid item xs={4}>
                        <TextField label="Responsable" value={usuario.nombre} disabled size="small" fullWidth sx={{ bgcolor: '#f1f5f9' }} />
                    </Grid>
                    <Grid item xs={12}>
                        <TextField label="Observación / Comentario" value={nuevaSalida.observacion} onChange={(e) => setNuevaSalida({...nuevaSalida, observacion: e.target.value})} fullWidth size="small" sx={{ bgcolor: 'rgba(255,255,255,0.5)' }} />
                    </Grid>
                </Grid>

                <Divider sx={{ my: 2 }}>
                    <Chip icon={<SearchIcon />} label="SELECCIÓN DE PRODUCTOS" sx={{ fontWeight: 'bold' }} />
                </Divider>

                <Box sx={{ position: 'relative', mb: 2 }}>
                    <TextField 
                        fullWidth size="small"
                        placeholder={nuevaSalida.sede_id ? "Escriba código o nombre del producto para agregar..." : "⚠️ Seleccione una Sede de Origen primero"}
                        value={busquedaProd}
                        disabled={!nuevaSalida.sede_id}
                        onChange={(e) => setBusquedaProd(e.target.value.toUpperCase())}
                        InputProps={{ startAdornment: <SearchIcon sx={{ color: '#475569', mr: 1 }} />, sx: { bgcolor: 'white' } }}
                    />
                    
                    {busquedaProd && (
                        <Paper className="ge-product-list">
                            {productosFiltrados.length > 0 ? (
                                productosFiltrados.map(p => (
                                    <Box key={p.codigo} className="ge-product-item" onClick={() => agregarProducto(p)}>
                                        <Box>
                                            <Typography variant="subtitle2" fontWeight="bold">{p.codigo}</Typography>
                                            <Typography variant="caption">{p.descripcion}</Typography>
                                        </Box>
                                        <Chip label={`Stock: ${p.cantidad}`} size="small" color={p.cantidad < 5 ? "error" : "success"} />
                                    </Box>
                                ))
                            ) : (
                                <Box sx={{ p: 2, textAlign: 'center', color: '#64748b' }}>
                                    No se encuentra en esta sede.
                                </Box>
                            )}
                        </Paper>
                    )}
                </Box>

                <TableContainer sx={{ border: '1px solid #e2e8f0', borderRadius: 1, maxHeight: 200 }}>
                    <Table size="small" stickyHeader>
                        <TableHead>
                            <TableRow>
                                <TableCell sx={{ fontWeight: 'bold', bgcolor: '#f8fafc' }}>Código</TableCell>
                                <TableCell sx={{ fontWeight: 'bold', bgcolor: '#f8fafc' }}>Descripción</TableCell>
                                <TableCell align="center" sx={{ fontWeight: 'bold', bgcolor: '#f8fafc' }}>Stock</TableCell>
                                <TableCell align="center" width={100} sx={{ fontWeight: 'bold', bgcolor: '#f8fafc' }}>Salida</TableCell>
                                <TableCell align="center" sx={{ fontWeight: 'bold', bgcolor: '#f8fafc' }}></TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {carrito.map((item) => (
                                <TableRow key={item.codigo}>
                                    <TableCell>{item.codigo}</TableCell>
                                    <TableCell>{item.descripcion}</TableCell>
                                    <TableCell align="center" sx={{ color: '#64748b' }}>{item.stockMaximo}</TableCell>
                                    <TableCell align="center">
                                        <TextField 
                                            type="number" size="small" variant="standard"
                                            value={item.cantidadSalida}
                                            onChange={(e) => cambiarCantidad(item.codigo, e.target.value)}
                                            InputProps={{ style: { color: '#b91c1c', fontWeight: 'bold', textAlign: 'center' } }} 
                                        />
                                    </TableCell>
                                    <TableCell align="center">
                                        <IconButton size="small" sx={{ color: '#ef4444' }} onClick={() => eliminarDelCarrito(item.codigo)}>
                                            <DeleteIcon fontSize="small" />
                                        </IconButton>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {carrito.length === 0 && <TableRow><TableCell colSpan={5} align="center" sx={{ py: 3, color: '#64748b' }}>Carrito vacío</TableCell></TableRow>}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2, bgcolor: '#f8fafc', borderTop: '1px solid #e2e8f0' }}>
            <Button onClick={handleCloseRequest} sx={{ color: '#64748b' }}>Cancelar</Button>
            <Button 
                variant="contained" 
                startIcon={nuevaSalida.tipo_salida === 'TRANSFERENCIA' ? <LocalShippingIcon/> : <EventNoteIcon />} 
                onClick={handleSubmit} 
                disabled={carrito.length === 0} 
                sx={{ bgcolor: '#b91c1c', fontWeight: 'bold', '&:hover': { bgcolor: '#991b1b' } }}
            >
                {nuevaSalida.tipo_salida === 'TRANSFERENCIA' ? 'Procesar Transferencia' : 'Confirmar Ajuste'}
            </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={openConfirmClose} onClose={() => setOpenConfirmClose(false)} PaperProps={{ className: 'ge-alert-paper' }}>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, color: '#f59e0b' }}><WarningAmberIcon /> ¿Descartar Salida?</DialogTitle>
        <DialogContent><DialogContentText sx={{ color: '#475569' }}>Se perderán los datos seleccionados.</DialogContentText></DialogContent>
        <DialogActions sx={{ p: 2 }}>
            <Button onClick={() => setOpenConfirmClose(false)} sx={{ color: '#64748b' }}>Continuar</Button>
            <Button onClick={confirmarCierre} variant="contained" color="error">Salir</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={openConfirmAnular} onClose={() => setOpenConfirmAnular(false)} PaperProps={{ className: 'ge-alert-paper' }}>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, color: '#ef4444' }}><WarningAmberIcon /> Confirmar Anulación</DialogTitle>
        <DialogContent>
            <DialogContentText sx={{ color: '#475569' }}>
                ¿Está seguro que desea anular la guía <b>{guiaAAnular?.nro_comprobante}</b>? 
                <br/><br/>
                El stock será devuelto automáticamente al almacén de origen {guiaAAnular?.estado === 'COMPLETADO' && 'y se descontará de la sede destino'}. Esta acción no se puede deshacer.
            </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
            <Button onClick={() => setOpenConfirmAnular(false)} sx={{ color: '#64748b' }}>Cancelar</Button>
            <Button onClick={ejecutarAnulacion} variant="contained" color="error">Sí, Anular Guía</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default GestionSalidas;