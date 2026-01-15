import React, { useState, useEffect, useRef } from 'react';
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
import SaveIcon from '@mui/icons-material/Save';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import axios from 'axios';
import * as XLSX from 'xlsx';
import '../../styles/GestionEntradas.css';

function GestionEntradas({ usuario }) {
  const [entradas, setEntradas] = useState([]);
  const [sedes, setSedes] = useState([]);
  const [filtroSede, setFiltroSede] = useState('todas');
  const [filtroTipo, setFiltroTipo] = useState('todos');

  const [openModal, setOpenModal] = useState(false);
  const [openConfirmClose, setOpenConfirmClose] = useState(false);
  
  const [productosCatalogo, setProductosCatalogo] = useState([]);
  const [busquedaProd, setBusquedaProd] = useState('');
  
  const [nuevaEntrada, setNuevaEntrada] = useState({
    sede_id: '',
    tipo_entrada: 'AJUSTE',
    fecha: new Date().toISOString().split('T')[0],
    solicitante: '',
    serie: '---', 
    numero: '---',
    nro_comprobante: '' 
  });
  
  const [carrito, setCarrito] = useState([]);
  const [mensaje, setMensaje] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    cargarSedes();
    cargarEntradas();
    cargarProductos();
  }, []);

  useEffect(() => {
    cargarEntradas();
  }, [filtroSede, filtroTipo]);

  useEffect(() => {
    if (nuevaEntrada.sede_id) {
        obtenerSerie(nuevaEntrada.sede_id);
    }
  }, [nuevaEntrada.sede_id]);

  const cargarSedes = async () => {
    try { const res = await axios.get('http://localhost:5000/api/sedes'); setSedes(res.data); } catch(e) { console.error(e); }
  };

  const cargarProductos = async () => {
    try { const res = await axios.get('http://localhost:5000/api/productos'); setProductosCatalogo(res.data); } catch(e) { console.error(e); }
  };

  const cargarEntradas = async () => {
    try {
        const res = await axios.get('http://localhost:5000/api/entradas', {
            params: { sede_id: filtroSede, tipo: filtroTipo }
        });
        setEntradas(res.data);
    } catch(e) { console.error(e); }
  };

  const obtenerSerie = async (sedeId) => {
    try {
        const res = await axios.get(`http://localhost:5000/api/entradas/serie/${sedeId}`);
        setNuevaEntrada(prev => ({ 
            ...prev, 
            serie: res.data.serie, 
            numero: res.data.numero.toString().padStart(8, '0') 
        }));
    } catch(e) { console.error(e); }
  };

  const handleOpen = () => {
    setMensaje(null);
    setNuevaEntrada({
        sede_id: '',
        tipo_entrada: 'AJUSTE',
        fecha: new Date().toISOString().split('T')[0],
        solicitante: usuario.nombre || '', 
        serie: '---',
        numero: '---',
        nro_comprobante: ''
    });
    setCarrito([]);
    setOpenModal(true);
  };

  const handleCloseRequest = (event, reason) => {
    if (reason && reason === "backdropClick") return; 
    
    if (nuevaEntrada.sede_id || carrito.length > 0 || nuevaEntrada.solicitante !== usuario.nombre) {
        setOpenConfirmClose(true);
    } else {
        setOpenModal(false);
    }
  };

  const confirmarCierre = () => {
    setOpenConfirmClose(false);
    setOpenModal(false);
  };

  const agregarProducto = (prod) => {
    const existe = carrito.find(p => p.id === prod.id);
    if (existe) {
        setMensaje({ tipo: 'warning', texto: 'El producto ya está en lista.' });
        return;
    }
    setCarrito([...carrito, { ...prod, cantidad: 1 }]);
    setBusquedaProd('');
  };

  const cambiarCantidad = (id, valor) => {
    const val = parseInt(valor);
    if (val < 1) return;
    setCarrito(carrito.map(p => p.id === id ? { ...p, cantidad: val } : p));
  };

  const eliminarDelCarrito = (id) => {
    setCarrito(carrito.filter(p => p.id !== id));
  };

  const calcularTotalGlobal = () => {
    return carrito.reduce((acc, item) => acc + (item.cantidad * (item.precio_venta || 0)), 0).toFixed(2);
  };

  // LOGICA CARGA MASIVA EXCEL
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const bstr = evt.target.result;
      const wb = XLSX.read(bstr, { type: 'binary' });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const data = XLSX.utils.sheet_to_json(ws);

      let nuevosProductos = [];
      let noEncontrados = 0;

      data.forEach(row => {
        // Asumiendo columnas: CODIGO, CANTIDAD
        const codigoExcel = String(row.CODIGO || row.codigo || '').trim().toUpperCase();
        const cantidadExcel = parseInt(row.CANTIDAD || row.cantidad || 1);

        if (codigoExcel) {
            const productoEncontrado = productosCatalogo.find(p => p.codigo === codigoExcel);
            
            // Validar que exista, que no sea servicio (LUNA) y que no este ya en carrito
            if (productoEncontrado && productoEncontrado.tipo_bien !== 'SERVICIO') {
                const yaEnCarrito = carrito.find(c => c.id === productoEncontrado.id) || nuevosProductos.find(n => n.id === productoEncontrado.id);
                
                if (!yaEnCarrito) {
                    nuevosProductos.push({
                        ...productoEncontrado,
                        cantidad: cantidadExcel > 0 ? cantidadExcel : 1
                    });
                }
            } else {
                noEncontrados++;
            }
        }
      });

      setCarrito(prev => [...prev, ...nuevosProductos]);
      if (nuevosProductos.length > 0) {
          setMensaje({ tipo: 'success', texto: `Se cargaron ${nuevosProductos.length} productos correctamente.` });
      } else {
          setMensaje({ tipo: 'warning', texto: 'No se añadieron productos. Verifique códigos o si son servicios.' });
      }
      
      // Limpiar input
      if(fileInputRef.current) fileInputRef.current.value = "";
    };
    reader.readAsBinaryString(file);
  };

  const handleSubmit = async () => {
    if (!nuevaEntrada.sede_id || !nuevaEntrada.solicitante || carrito.length === 0) {
        setMensaje({ tipo: 'error', texto: 'Complete la Sede, Solicitante y agregue productos.' });
        return;
    }

    try {
        await axios.post('http://localhost:5000/api/entradas', {
            ...nuevaEntrada,
            usuario_id: usuario.id,
            productos: carrito,
            total_global: calcularTotalGlobal(),
            nro_comprobante: `${nuevaEntrada.serie}-${nuevaEntrada.numero}`
        });
        setOpenModal(false);
        cargarEntradas(); 
    } catch (err) {
        setMensaje({ tipo: 'error', texto: 'Error al guardar la entrada.' });
    }
  };

  const productosFiltrados = busquedaProd ? productosCatalogo.filter(p => 
    (p.codigo.includes(busquedaProd.toUpperCase()) || p.descripcion.includes(busquedaProd.toUpperCase())) &&
    p.tipo_bien !== 'SERVICIO' // Usamos la nueva columna lógica o categoria 'LUNA'
  ).slice(0, 5) : [];

  return (
    <Box className="ge-container">
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" className="ge-title">Registro de Entradas</Typography>
        <Button 
            variant="contained" 
            startIcon={<AddIcon />} 
            onClick={handleOpen}
            sx={{ bgcolor: '#0ea5e9', fontWeight: 'bold' }}
        >
            Nueva Entrada
        </Button>
      </Box>

      <Paper className="ge-card" sx={{ p: 2, display: 'flex', gap: 2, mb: 3 }}>
        <FormControl size="small" sx={{ minWidth: 200 }} className="ge-input-glass">
            <InputLabel>Filtrar por Sede</InputLabel>
            <Select value={filtroSede} label="Filtrar por Sede" onChange={(e) => setFiltroSede(e.target.value)}>
                <MenuItem value="todas">Todas</MenuItem>
                {sedes.map(s => <MenuItem key={s.id} value={s.id}>{s.nombre}</MenuItem>)}
            </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 200 }} className="ge-input-glass">
            <InputLabel>Tipo de Entrada</InputLabel>
            <Select value={filtroTipo} label="Tipo de Entrada" onChange={(e) => setFiltroTipo(e.target.value)}>
                <MenuItem value="todos">Todos</MenuItem>
                <MenuItem value="SALDO INICIAL">Saldo Inicial</MenuItem>
                <MenuItem value="AJUSTE">Ajuste de Stock</MenuItem>
                <MenuItem value="TRANSFERENCIA">Transferencia</MenuItem>
                <MenuItem value="COMPRA">Compra</MenuItem>
            </Select>
        </FormControl>
      </Paper>

      <TableContainer component={Paper} className="ge-card ge-table-container" sx={{ p: 0 }}>
        <Table>
            <TableHead className="ge-table-head">
                <TableRow>
                    <TableCell className="ge-table-header-cell">Fecha</TableCell>
                    <TableCell className="ge-table-header-cell">N° Comprobante</TableCell>
                    <TableCell className="ge-table-header-cell">Sede</TableCell>
                    <TableCell className="ge-table-header-cell">Concepto</TableCell>
                    <TableCell className="ge-table-header-cell">Solicitado Por</TableCell>
                    <TableCell className="ge-table-header-cell">Total (Ref.)</TableCell>
                    <TableCell className="ge-table-header-cell">Estado</TableCell>
                </TableRow>
            </TableHead>
            <TableBody>
                {entradas.map((row) => (
                    <TableRow key={row.id} className="ge-table-row">
                        <TableCell className="ge-table-cell">{new Date(row.fecha).toLocaleDateString()}</TableCell>
                        <TableCell className="ge-table-cell" sx={{ fontWeight: 'bold' }}>{row.serie}-{row.numero}</TableCell>
                        <TableCell className="ge-table-cell">{row.nombre_sede}</TableCell>
                        <TableCell className="ge-table-cell">
                            <Chip 
                                label={row.tipo_entrada} 
                                size="small"
                                sx={{ 
                                    fontWeight: 'bold', fontSize: '0.75rem',
                                    bgcolor: row.tipo_entrada === 'SALDO INICIAL' ? '#fecaca' : 
                                             row.tipo_entrada === 'TRANSFERENCIA' ? '#bfdbfe' : '#bbf7d0',
                                    color: row.tipo_entrada === 'SALDO INICIAL' ? '#991b1b' : 
                                           row.tipo_entrada === 'TRANSFERENCIA' ? '#1e40af' : '#166534'
                                }} 
                            />
                        </TableCell>
                        <TableCell className="ge-table-cell">{row.solicitante}</TableCell>
                        <TableCell className="ge-table-cell" sx={{ fontWeight: 'bold' }}>S/ {row.total_monto}</TableCell>
                        <TableCell className="ge-table-cell">
                            <Chip label={row.estado} size="small" sx={{ bgcolor: '#dcfce7', color: '#16a34a', fontWeight: 'bold' }} />
                        </TableCell>
                    </TableRow>
                ))}
                {entradas.length === 0 && (
                    <TableRow><TableCell colSpan={7} align="center" className="ge-table-cell">No hay registros.</TableCell></TableRow>
                )}
            </TableBody>
        </Table>
      </TableContainer>

      <Dialog 
        open={openModal} 
        onClose={handleCloseRequest}
        maxWidth="md" 
        fullWidth 
        PaperProps={{ className: 'ge-modal-paper' }} 
      >
        <DialogTitle className="ge-modal-title" sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <ReceiptLongIcon /> Nueva Guía de Entrada
            </Box>
            <IconButton onClick={handleCloseRequest} sx={{ color: 'white' }}><CloseIcon /></IconButton>
        </DialogTitle>
        
        <DialogContent>
            {mensaje && <Alert severity={mensaje.tipo} sx={{ mb: 2, mt: 2 }}>{mensaje.texto}</Alert>}
            
            <Box sx={{ mt: 3, width: '100%' }}>
                <Grid container spacing={2}>
                    
                    <Grid item xs={12} md={8}>
                        <FormControl fullWidth size="small" className="ge-modal-input">
                            <Select 
                                displayEmpty
                                value={nuevaEntrada.sede_id} 
                                onChange={(e) => setNuevaEntrada({...nuevaEntrada, sede_id: e.target.value})}
                                renderValue={(selected) => {
                                    if (selected === '') return <span style={{ color: '#475569' }}>Seleccione una Sede</span>;
                                    const sede = sedes.find(s => s.id === selected);
                                    return sede ? sede.nombre : selected;
                                }}
                            >
                                <MenuItem disabled value=""><em>Seleccione una Sede</em></MenuItem>
                                {sedes.map(s => <MenuItem key={s.id} value={s.id}>{s.nombre}</MenuItem>)}
                            </Select>
                        </FormControl>
                    </Grid>
                    <Grid item xs={12} md={4}>
                        <TextField 
                            className="ge-modal-input"
                            label="Fecha" type="date"
                            value={nuevaEntrada.fecha} 
                            onChange={(e) => setNuevaEntrada({...nuevaEntrada, fecha: e.target.value})}
                            fullWidth size="small"
                        />
                    </Grid>

                    <Grid item xs={12} md={4}>
                        <FormControl fullWidth size="small" className="ge-modal-input">
                            <InputLabel>Concepto *</InputLabel>
                            <Select 
                                value={nuevaEntrada.tipo_entrada} 
                                label="Concepto *"
                                onChange={(e) => setNuevaEntrada({...nuevaEntrada, tipo_entrada: e.target.value})}
                            >
                                <MenuItem value="AJUSTE">Ajuste de Stock</MenuItem>
                                <MenuItem value="SALDO INICIAL">Saldo Inicial</MenuItem>
                                <MenuItem value="COMPRA">Compra</MenuItem>
                                <MenuItem value="TRANSFERENCIA">Transferencia</MenuItem>
                            </Select>
                        </FormControl>
                    </Grid>
                    <Grid item xs={12} md={4}>
                        <TextField 
                            className="ge-modal-input"
                            label="Nro Comprobante" 
                            value={`${nuevaEntrada.serie} - ${nuevaEntrada.numero}`} 
                            disabled fullWidth size="small" 
                        />
                    </Grid>
                    <Grid item xs={12} md={4}>
                        <TextField 
                            className="ge-modal-input"
                            label="Solicitado Por *" 
                            value={nuevaEntrada.solicitante}
                            onChange={(e) => setNuevaEntrada({...nuevaEntrada, solicitante: e.target.value.toUpperCase()})}
                            fullWidth size="small"
                        />
                    </Grid>

                    <Grid item xs={12}>
                        <TextField 
                            className="ge-modal-input"
                            label="Encargado" 
                            value={usuario.nombre} 
                            disabled fullWidth size="small"
                        />
                    </Grid>

                </Grid>
            </Box>

            <Divider sx={{ my: 3, borderColor: '#e2e8f0' }}>
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                    <Chip label="DETALLE DE PRODUCTOS" sx={{ bgcolor: '#f1f5f9', color: '#1e293b', fontWeight: 'bold' }} />
                    
                    {/* BOTON CARGA MASIVA EXCEL - SOLO PARA SALDO INICIAL O AJUSTE */}
                    {(nuevaEntrada.tipo_entrada === 'SALDO INICIAL' || nuevaEntrada.tipo_entrada === 'AJUSTE') && (
                        <>
                            <input 
                                type="file" 
                                accept=".xlsx, .xls" 
                                style={{ display: 'none' }} 
                                ref={fileInputRef}
                                onChange={handleFileUpload}
                            />
                            <Button 
                                size="small" 
                                variant="outlined" 
                                startIcon={<UploadFileIcon />}
                                onClick={() => fileInputRef.current.click()}
                                sx={{ color: '#fff', borderColor: '#fff', fontWeight: 'bold', '&:hover': { borderColor: '#bef264', color: '#bef264' } }}
                            >
                                Cargar Excel
                            </Button>
                        </>
                    )}
                </Box>
            </Divider>

            <Box sx={{ position: 'relative', mb: 2 }}>
                <TextField 
                    className="ge-modal-input"
                    fullWidth size="small"
                    placeholder="Escriba código o nombre del producto..."
                    value={busquedaProd}
                    onChange={(e) => setBusquedaProd(e.target.value.toUpperCase())}
                    InputProps={{ startAdornment: <SearchIcon sx={{ color: '#475569', mr: 1 }} /> }}
                />
                {busquedaProd && productosFiltrados.length > 0 && (
                    <Paper className="ge-product-list">
                        {productosFiltrados.map(p => (
                            <Box 
                                key={p.id} className="ge-product-item"
                                onClick={() => agregarProducto(p)}
                            >
                                <Typography variant="subtitle2" fontWeight="bold">{p.codigo}</Typography>
                                <Typography variant="caption">{p.descripcion} {p.marca}</Typography>
                            </Box>
                        ))}
                    </Paper>
                )}
            </Box>

            <TableContainer className="ge-modal-table-container">
                <Table size="small">
                    <TableHead className="ge-modal-table-head">
                        <TableRow>
                            <TableCell sx={{ fontWeight: 'bold', color: '#1e293b' }}>Código</TableCell>
                            <TableCell sx={{ fontWeight: 'bold', color: '#1e293b' }}>Descripción</TableCell>
                            <TableCell align="center" width={80} sx={{ fontWeight: 'bold', color: '#1e293b' }}>Cant.</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 'bold', color: '#1e293b' }}>Total</TableCell>
                            <TableCell align="center" sx={{ fontWeight: 'bold', color: '#1e293b' }}>X</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {carrito.map((item) => (
                            <TableRow key={item.id}>
                                <TableCell sx={{ color: '#1e293b' }}>{item.codigo}</TableCell>
                                <TableCell sx={{ color: '#1e293b' }}>{item.descripcion}</TableCell>
                                <TableCell align="center">
                                    <TextField 
                                        type="number" size="small" variant="standard"
                                        value={item.cantidad}
                                        onChange={(e) => cambiarCantidad(item.id, e.target.value)}
                                        className="ge-qty-input"
                                        InputProps={{ style: { color: '#1e293b', fontWeight: 'bold' } }}
                                    />
                                </TableCell>
                                <TableCell align="right" sx={{ fontWeight: 'bold', color: '#059669' }}>
                                    S/ {(item.cantidad * (item.precio_venta || 0)).toFixed(2)}
                                </TableCell>
                                <TableCell align="center">
                                    <IconButton size="small" sx={{ color: '#ef4444' }} onClick={() => eliminarDelCarrito(item.id)}>
                                        <DeleteIcon fontSize="small" />
                                    </IconButton>
                                </TableCell>
                            </TableRow>
                        ))}
                        {carrito.length === 0 && (
                            <TableRow><TableCell colSpan={5} align="center" sx={{ py: 3, color: '#64748b' }}>Agregue productos</TableCell></TableRow>
                        )}
                    </TableBody>
                </Table>
            </TableContainer>

            <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 2 }}>
                <Typography variant="h6" sx={{ color: '#ffffff' }}>Total General:</Typography>
                <Typography variant="h5" sx={{ color: '#bef264', fontWeight: 'bold' }}>
                    S/ {calcularTotalGlobal()}
                </Typography>
            </Box>

        </DialogContent>
        <DialogActions sx={{ p: 2, borderTop: '1px solid rgba(255,255,255,0.2)', bgcolor: 'rgba(0,0,0,0.2)' }}>
            <Button onClick={handleCloseRequest} sx={{ color: 'white' }}>Cancelar</Button>
            <Button 
                variant="contained" 
                startIcon={<SaveIcon />}
                onClick={handleSubmit}
                disabled={carrito.length === 0}
                sx={{ 
                    bgcolor: '#0ea5e9', 
                    fontWeight: 'bold',
                    '&:hover': { bgcolor: '#0284c7' }
                }}
            >
                Guardar Entrada
            </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={openConfirmClose} onClose={() => setOpenConfirmClose(false)} PaperProps={{ className: 'ge-alert-paper' }}>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, color: '#f59e0b' }}>
            <WarningAmberIcon /> ¿Descartar Cambios?
        </DialogTitle>
        <DialogContent>
            <DialogContentText sx={{ color: '#475569' }}>
                Tiene una entrada en proceso. Si sale ahora, se perderán los datos ingresados.
            </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
            <Button onClick={() => setOpenConfirmClose(false)} sx={{ color: '#64748b' }}>Continuar Editando</Button>
            <Button onClick={confirmarCierre} variant="contained" color="error">
                Salir y Descartar
            </Button>
        </DialogActions>
      </Dialog>

    </Box>
  );
}

export default GestionEntradas;