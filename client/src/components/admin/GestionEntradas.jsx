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
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import LocalShippingIcon from '@mui/icons-material/LocalShipping'; 
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import InfoIcon from '@mui/icons-material/Info';
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
  const [openModalProducto, setOpenModalProducto] = useState(false); 
  const [openConfirmAnular, setOpenConfirmAnular] = useState(false);
  const [guiaAAnular, setGuiaAAnular] = useState(null);
  
  const [openModalDetalles, setOpenModalDetalles] = useState(false);
  const [detallesGuia, setDetallesGuia] = useState([]);
  const [guiaSeleccionada, setGuiaSeleccionada] = useState(null);

  const [productosCatalogo, setProductosCatalogo] = useState([]);
  const [busquedaProd, setBusquedaProd] = useState('');
  
  const [transferenciasPendientes, setTransferenciasPendientes] = useState([]);
  const [guiaOrigenId, setGuiaOrigenId] = useState(null);

  const [nuevaEntrada, setNuevaEntrada] = useState({
    sede_id: '',
    tipo_entrada: 'AJUSTE',
    fecha: new Date().toISOString().split('T')[0],
    solicitante: '',
    serie: '---', 
    numero: '---',
    nro_comprobante: '' 
  });

  const [nuevoProductoRapido, setNuevoProductoRapido] = useState({
    codigo: '', codigo_p: '', descripcion: '', categoria: 'MONTURA',
    marca: '', modelo: '', color: '', material: '', precio_venta: ''
  });
  
  const [carrito, setCarrito] = useState([]);
  const [mensaje, setMensaje] = useState(null);
  const [mensajeGeneral, setMensajeGeneral] = useState(null);
  const [mensajeProducto, setMensajeProducto] = useState(null);
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
        if (nuevaEntrada.tipo_entrada === 'TRANSFERENCIA') {
            buscarTransferenciasPendientes(nuevaEntrada.sede_id);
        }
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

  const buscarTransferenciasPendientes = async (idSede) => {
      setMensaje({ tipo: 'info', texto: '🔄 Buscando transferencias entrantes para esta sede...' });
      setCarrito([]);
      setGuiaOrigenId(null);
      
      try {
          const res = await axios.get(`http://localhost:5000/api/transferencias/pendientes/${idSede}`);
          if (res.data.length > 0) {
              setTransferenciasPendientes(res.data);
              setMensaje({ tipo: 'success', texto: `🔔 Tienes ${res.data.length} transferencias pendientes de recepción.` });
          } else {
              setTransferenciasPendientes([]);
              setMensaje({ tipo: 'info', texto: '✅ No hay transferencias pendientes para esta sede.' });
          }
      } catch (error) {
          console.error(error);
          setMensaje({ tipo: 'error', texto: 'Error al buscar transferencias.' });
      }
  };

  const verDetalles = async (guia) => {
      try {
          const res = await axios.get(`http://localhost:5000/api/entradas/${guia.id}/detalles`);
          setDetallesGuia(res.data);
          setGuiaSeleccionada(guia);
          setOpenModalDetalles(true);
      } catch (error) {
          console.error(error);
          setMensajeGeneral({ tipo: 'error', texto: 'Error al cargar los detalles de la guía.' });
      }
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
    setTransferenciasPendientes([]);
    setGuiaOrigenId(null);
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

  const confirmarAnulacion = (guia) => {
    setGuiaAAnular(guia);
    setOpenConfirmAnular(true);
  };

  const ejecutarAnulacion = async () => {
    try {
        await axios.put(`http://localhost:5000/api/entradas/${guiaAAnular.id}/anular`);
        setMensajeGeneral({ tipo: 'success', texto: 'Guía anulada correctamente.' });
        setOpenConfirmAnular(false);
        cargarEntradas();
        setTimeout(() => setMensajeGeneral(null), 4000);
    } catch (err) {
        console.error(err);
        setMensajeGeneral({ tipo: 'error', texto: err.response?.data?.error || 'Error al anular la guía.' });
        setOpenConfirmAnular(false);
    }
  };

  const handleChangeTipo = (e) => {
    const tipoSeleccionado = e.target.value;
    
    if (tipoSeleccionado === 'TRANSFERENCIA') {
        if (!nuevaEntrada.sede_id) {
            setMensaje({ tipo: 'warning', texto: '⚠️ Primero seleccione la SEDE para verificar sus transferencias.' });
            return; 
        }
        buscarTransferenciasPendientes(nuevaEntrada.sede_id);
    } else {
        setTransferenciasPendientes([]);
        setGuiaOrigenId(null);
        setCarrito([]); 
        setMensaje(null);
    }
    setNuevaEntrada({ ...nuevaEntrada, tipo_entrada: tipoSeleccionado });
  };

  const cargarProductosDeTransferencia = (transferencia) => {
      const productosTransformados = transferencia.productos.map(p => ({
          ...p,
          esNuevo: false 
      }));
      
      setCarrito(productosTransformados);
      setGuiaOrigenId(transferencia.guia_salida_id); 
      setNuevaEntrada(prev => ({...prev, solicitante: `TRANSFERENCIA DESDE ${transferencia.sede_origen}`}));
      setMensaje({ tipo: 'success', texto: `✅ Productos de la Guía ${transferencia.serie}-${transferencia.numero} cargados correctamente. Presione "Guardar Entrada" para finalizar.` });
  };

  const agregarProducto = (prod) => {
    if (prod.tipo_bien === 'SERVICIO') {
        setMensaje({ tipo: 'warning', texto: 'Los servicios no se agregan por Guía de Entrada.' });
        return;
    }
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

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);

        let itemsParaCarrito = [];
        let existentes = 0; let nuevos = 0; let serviciosOmitidos = 0;

        data.forEach((row, index) => {
            const codigoExcel = String(row.CODIGO || row.codigo || '').trim().toUpperCase();
            const cantidadExcel = parseInt(row.CANTIDAD || row.cantidad || 1);
            
            const nuevoProd = {
                id: `TEMP-${index}-${Date.now()}`, 
                esNuevo: true, 
                codigo: codigoExcel,
                codigo_p: String(row.CODIGO_P || row.codigo_p || '').trim().toUpperCase(),
                descripcion: String(row.DESCRIPCION || row.descripcion || 'SIN DESCRIPCION').toUpperCase(),
                categoria: 'MONTURA',
                marca: String(row.MARCA || row.marca || 'GENERICO').toUpperCase(),
                modelo: String(row.MODELO || row.modelo || '').toUpperCase(),
                color: String(row.COLOR || row.color || '').toUpperCase(),
                material: String(row.MATERIAL || row.material || row.tipo || '').toUpperCase(),
                precio_venta: parseFloat(row.PRECIO || row.precio || 0),
                tipo_bien: 'PRODUCTO',
                stock: 0,
                cantidad: cantidadExcel 
            };

            if (codigoExcel) {
                const productoExistente = productosCatalogo.find(p => p.codigo === codigoExcel);
                if (productoExistente) {
                    if (productoExistente.tipo_bien === 'SERVICIO') {
                        serviciosOmitidos++;
                    } else {
                        const yaEnCarrito = carrito.find(c => c.id === productoExistente.id) || itemsParaCarrito.find(i => i.id === productoExistente.id);
                        if (!yaEnCarrito) {
                            itemsParaCarrito.push({
                                ...productoExistente,
                                cantidad: cantidadExcel > 0 ? cantidadExcel : 1,
                                esNuevo: false 
                            });
                            existentes++;
                        }
                    }
                } else {
                    itemsParaCarrito.push(nuevoProd);
                    nuevos++;
                }
            }
        });

        if (itemsParaCarrito.length > 0) {
            setCarrito(prev => [...prev, ...itemsParaCarrito]);
            let msg = `Listos para cargar: ${existentes} existentes y ${nuevos} nuevos.`;
            if (serviciosOmitidos > 0) msg += ` (Se omitieron ${serviciosOmitidos} servicios).`;
            setMensaje({ tipo: 'success', texto: msg });
        } else {
            setMensaje({ tipo: 'warning', texto: 'No se encontraron productos válidos en el archivo.' });
        }

      } catch (error) {
        setMensaje({ tipo: 'error', texto: 'Error al leer el archivo.' });
      }
      if(fileInputRef.current) fileInputRef.current.value = "";
    };
    reader.readAsBinaryString(file);
  };

  const abrirModalCrear = () => {
      setNuevoProductoRapido({
          codigo: busquedaProd.toUpperCase(), codigo_p: '', descripcion: '', categoria: 'MONTURA', 
          marca: '', modelo: '', color: '', material: '', precio_venta: ''
      });
      setMensajeProducto(null);
      setOpenModalProducto(true);
  };

  const guardarProductoRapido = async () => {
      if (!nuevoProductoRapido.codigo || !nuevoProductoRapido.descripcion || !nuevoProductoRapido.marca) {
          setMensajeProducto({ tipo: 'error', texto: 'Código, Descripción y Marca son obligatorios.' });
          return;
      }
      try {
          const res = await axios.post('http://localhost:5000/api/productos', {
              ...nuevoProductoRapido, tipo_bien: 'PRODUCTO'
          });
          const prodCreado = res.data;
          setProductosCatalogo(prev => [...prev, prodCreado]);
          agregarProducto(prodCreado);
          setOpenModalProducto(false);
          setMensaje({ tipo: 'success', texto: 'Producto creado y agregado.' });
      } catch (err) {
          setMensajeProducto({ tipo: 'error', texto: 'Error al crear (posible código duplicado).' });
      }
  };

  const handleSubmit = async () => {
    if (!nuevaEntrada.sede_id || !nuevaEntrada.solicitante || carrito.length === 0) {
        setMensaje({ tipo: 'error', texto: 'Faltan datos o productos.' });
        return;
    }

    try {
        const productosFinales = [];

        for (const item of carrito) {
            if (item.esNuevo) {
                try {
                    const resProd = await axios.post('http://localhost:5000/api/productos', {
                        codigo: item.codigo, codigo_p: item.codigo_p, descripcion: item.descripcion,
                        categoria: item.categoria, marca: item.marca, modelo: item.modelo,
                        color: item.color, material: item.material, precio_venta: item.precio_venta,
                        tipo_bien: 'PRODUCTO'
                    });
                    
                    const productoCreado = resProd.data;
                    productosFinales.push({ ...productoCreado, cantidad: item.cantidad });
                    setProductosCatalogo(prev => [...prev, productoCreado]);
                } catch (err) {
                    setMensaje({ tipo: 'error', texto: `Error crítico al crear producto ${item.codigo}. Detenido.` });
                    return; 
                }
            } else {
                productosFinales.push(item);
            }
        }

        await axios.post('http://localhost:5000/api/entradas', {
            ...nuevaEntrada,
            usuario_id: usuario.id,
            productos: productosFinales, 
            total_global: calcularTotalGlobal(),
            nro_comprobante: `${nuevaEntrada.serie}-${nuevaEntrada.numero}`,
            guia_salida_origen_id: guiaOrigenId 
        });

        setOpenModal(false);
        setMensajeGeneral({ tipo: 'success', texto: 'Guía de entrada generada correctamente.' });
        cargarEntradas(); 
        setTimeout(() => setMensajeGeneral(null), 4000);
        
    } catch (err) {
        console.error(err);
        setMensaje({ tipo: 'error', texto: err.response?.data?.error || 'Error al procesar la entrada.' });
    }
  };

  const productosFiltrados = busquedaProd ? productosCatalogo.filter(p => 
    (p.codigo.includes(busquedaProd.toUpperCase()) || p.descripcion.includes(busquedaProd.toUpperCase())) &&
    p.tipo_bien !== 'SERVICIO' 
  ).slice(0, 5) : [];

  return (
    <Box className="ge-container">
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" className="ge-title">Registro de Entradas</Typography>
        <Button 
            variant="contained" startIcon={<AddIcon />} onClick={handleOpen}
            sx={{ bgcolor: '#0ea5e9', fontWeight: 'bold' }}
        >
            Nueva Entrada
        </Button>
      </Box>

      {mensajeGeneral && <Alert severity={mensajeGeneral.tipo} sx={{ mb: 3 }}>{mensajeGeneral.texto}</Alert>}

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
                    <TableCell className="ge-table-header-cell" align="center">Acciones</TableCell>
                </TableRow>
            </TableHead>
            <TableBody>
                {entradas.map((row) => (
                    <TableRow 
                        key={row.id} 
                        className="ge-table-row" 
                        sx={{ 
                            opacity: row.estado === 'ANULADO' ? 0.6 : 1,
                            cursor: 'pointer',
                            '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.05)' }
                        }}
                        onClick={() => verDetalles(row)}
                    >
                        <TableCell className="ge-table-cell">{new Date(row.fecha).toLocaleDateString()}</TableCell>
                        <TableCell className="ge-table-cell" sx={{ fontWeight: 'bold', textDecoration: row.estado === 'ANULADO' ? 'line-through' : 'none' }}>{row.serie}-{row.numero}</TableCell>
                        <TableCell className="ge-table-cell">{row.nombre_sede}</TableCell>
                        <TableCell className="ge-table-cell">
                            <Chip 
                                label={row.tipo_entrada} size="small"
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
                            <Chip 
                                label={row.estado || 'COMPLETADO'} size="small" 
                                sx={{ 
                                    fontWeight: 'bold', 
                                    bgcolor: row.estado === 'ANULADO' ? '#f1f5f9' : '#dcfce7', 
                                    color: row.estado === 'ANULADO' ? '#64748b' : '#16a34a' 
                                }} 
                            />
                        </TableCell>
                        <TableCell className="ge-table-cell" align="center">
                            {row.estado !== 'ANULADO' ? (
                                <IconButton 
                                    size="small" 
                                    sx={{ color: '#ef4444' }} 
                                    onClick={(e) => { e.stopPropagation(); confirmarAnulacion(row); }}
                                >
                                    <DeleteIcon fontSize="small" />
                                </IconButton>
                            ) : (
                                <span style={{ color: '#94a3b8', fontSize: '0.8rem', fontWeight: 'bold' }}>---</span>
                            )}
                        </TableCell>
                    </TableRow>
                ))}
                {entradas.length === 0 && (
                    <TableRow><TableCell colSpan={8} align="center" className="ge-table-cell">No hay registros.</TableCell></TableRow>
                )}
            </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={openModal} onClose={handleCloseRequest} maxWidth="md" fullWidth PaperProps={{ className: 'ge-modal-paper' }}>
        <DialogTitle className="ge-modal-title" sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><ReceiptLongIcon /> Nueva Guía de Entrada</Box>
            <IconButton onClick={handleCloseRequest} sx={{ color: 'white' }}><CloseIcon /></IconButton>
        </DialogTitle>
        <DialogContent>
            {mensaje && <Alert severity={mensaje.tipo} sx={{ mb: 2, mt: 2 }}>{mensaje.texto}</Alert>}
            
            <Box sx={{ mt: 3, width: '100%' }}>
                <Grid container spacing={2}>
                    <Grid item xs={12} md={8}>
                        <FormControl fullWidth size="small" className="ge-modal-input">
                            <Select displayEmpty value={nuevaEntrada.sede_id} onChange={(e) => setNuevaEntrada({...nuevaEntrada, sede_id: e.target.value})} renderValue={(selected) => { if (selected === '') return <span style={{ color: '#475569' }}>Seleccione una Sede</span>; const sede = sedes.find(s => s.id === selected); return sede ? sede.nombre : selected; }}>
                                <MenuItem disabled value=""><em>Seleccione una Sede</em></MenuItem>
                                {sedes.map(s => <MenuItem key={s.id} value={s.id}>{s.nombre}</MenuItem>)}
                            </Select>
                        </FormControl>
                    </Grid>
                    <Grid item xs={12} md={4}>
                        <TextField className="ge-modal-input" label="Fecha" type="date" value={nuevaEntrada.fecha} onChange={(e) => setNuevaEntrada({...nuevaEntrada, fecha: e.target.value})} fullWidth size="small" />
                    </Grid>
                    <Grid item xs={12} md={4}>
                        <FormControl fullWidth size="small" className="ge-modal-input">
                            <InputLabel>Concepto *</InputLabel>
                            <Select 
                                value={nuevaEntrada.tipo_entrada} 
                                label="Concepto *" 
                                onChange={handleChangeTipo}
                            >
                                <MenuItem value="AJUSTE">Ajuste de Stock</MenuItem>
                                <MenuItem value="SALDO INICIAL">Saldo Inicial</MenuItem>
                                <MenuItem value="TRANSFERENCIA">Transferencia</MenuItem>
                            </Select>
                        </FormControl>
                    </Grid>
                    <Grid item xs={12} md={4}>
                        <TextField className="ge-modal-input" label="Nro Comprobante" value={`${nuevaEntrada.serie} - ${nuevaEntrada.numero}`} disabled fullWidth size="small" />
                    </Grid>
                    <Grid item xs={12} md={4}>
                        <TextField className="ge-modal-input" label="Solicitado Por *" value={nuevaEntrada.solicitante} disabled={nuevaEntrada.tipo_entrada === 'TRANSFERENCIA'} onChange={(e) => setNuevaEntrada({...nuevaEntrada, solicitante: e.target.value.toUpperCase()})} fullWidth size="small" />
                    </Grid>
                    <Grid item xs={12}>
                        <TextField className="ge-modal-input" label="Encargado" value={usuario.nombre} disabled fullWidth size="small" />
                    </Grid>
                </Grid>
            </Box>

            <Divider sx={{ my: 3, borderColor: '#e2e8f0' }}>
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                    <Chip label="DETALLE DE PRODUCTOS" sx={{ bgcolor: '#f1f5f9', color: '#1e293b', fontWeight: 'bold' }} />
                    {(nuevaEntrada.tipo_entrada === 'SALDO INICIAL' || nuevaEntrada.tipo_entrada === 'AJUSTE') && (
                        <>
                            <input type="file" accept=".xlsx, .xls" style={{ display: 'none' }} ref={fileInputRef} onChange={handleFileUpload} />
                            <Button size="small" variant="outlined" startIcon={<UploadFileIcon />} onClick={() => fileInputRef.current.click()} sx={{ color: '#fff', borderColor: '#fff', fontWeight: 'bold', '&:hover': { borderColor: '#bef264', color: '#bef264' } }}>Cargar Excel</Button>
                        </>
                    )}
                </Box>
            </Divider>

            {nuevaEntrada.tipo_entrada === 'TRANSFERENCIA' ? (
                <Box sx={{ display: 'flex', py: 2, flexDirection: 'column', color: '#ffffff' }}>
                    {transferenciasPendientes.length > 0 ? (
                        <Grid container spacing={2}>
                            {transferenciasPendientes.map(trans => (
                                <Grid item xs={12} sm={6} key={trans.guia_salida_id}>
                                    <Paper sx={{ p: 2, bgcolor: guiaOrigenId === trans.guia_salida_id ? '#dcfce7' : '#f8fafc', color: '#1e293b', border: guiaOrigenId === trans.guia_salida_id ? '2px solid #16a34a' : '1px solid #cbd5e1' }}>
                                        <Typography variant="subtitle2" fontWeight="bold">Desde: {trans.sede_origen}</Typography>
                                        <Typography variant="caption" display="block">Doc: {trans.serie}-{trans.numero}</Typography>
                                        <Typography variant="caption" display="block">Fecha: {new Date(trans.fecha).toLocaleDateString()}</Typography>
                                        <Button 
                                            size="small" variant="contained" fullWidth sx={{ mt: 1, bgcolor: '#0ea5e9' }}
                                            onClick={() => cargarProductosDeTransferencia(trans)}
                                            disabled={guiaOrigenId === trans.guia_salida_id}
                                        >
                                            {guiaOrigenId === trans.guia_salida_id ? 'Cargado al Carrito' : 'Cargar Productos'}
                                        </Button>
                                    </Paper>
                                </Grid>
                            ))}
                        </Grid>
                    ) : (
                        <Box sx={{ textAlign: 'center', py: 4 }}>
                            <CheckCircleIcon sx={{ fontSize: 50, color: '#4ade80', mb: 1 }} />
                            <Typography variant="h6">Todo al día</Typography>
                            <Typography variant="body2">No tienes transferencias pendientes de recibir.</Typography>
                        </Box>
                    )}
                </Box>
            ) : (
                <Box sx={{ position: 'relative', mb: 2 }}>
                    <TextField 
                        className="ge-modal-input" fullWidth size="small"
                        placeholder="Escriba código o nombre del producto..."
                        value={busquedaProd}
                        onChange={(e) => setBusquedaProd(e.target.value.toUpperCase())}
                        InputProps={{ startAdornment: <SearchIcon sx={{ color: '#475569', mr: 1 }} /> }}
                    />
                    {busquedaProd && (
                        <Paper className="ge-product-list">
                            {productosFiltrados.length > 0 ? (
                                productosFiltrados.map(p => (
                                    <Box key={p.id} className="ge-product-item" onClick={() => agregarProducto(p)}>
                                        <Typography variant="subtitle2" fontWeight="bold">{p.codigo}</Typography>
                                        <Typography variant="caption">{p.descripcion} {p.marca}</Typography>
                                    </Box>
                                ))
                            ) : (
                                <Box className="ge-product-item" sx={{ justifyContent: 'center', bgcolor: '#f0fdf4 !important', color: '#166534' }} onClick={abrirModalCrear}>
                                    <AddCircleOutlineIcon sx={{ mr: 1 }} />
                                    <Typography variant="subtitle2" fontWeight="bold">¿No existe? Registrar "{busquedaProd}"</Typography>
                                </Box>
                            )}
                        </Paper>
                    )}
                </Box>
            )}

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
                                <TableCell sx={{ color: '#1e293b' }}>{item.codigo} {item.esNuevo && <Chip label="NUEVO" size="small" color="primary" sx={{height:20, fontSize:'0.6rem'}}/>}</TableCell>
                                <TableCell sx={{ color: '#1e293b' }}>{item.descripcion}</TableCell>
                                <TableCell align="center">
                                    <TextField 
                                        type="number" size="small" variant="standard" 
                                        value={item.cantidad} 
                                        disabled={nuevaEntrada.tipo_entrada === 'TRANSFERENCIA'}
                                        onChange={(e) => cambiarCantidad(item.id, e.target.value)} 
                                        className="ge-qty-input" InputProps={{ style: { color: '#1e293b', fontWeight: 'bold' } }} 
                                    />
                                </TableCell>
                                <TableCell align="right" sx={{ fontWeight: 'bold', color: '#059669' }}>S/ {(item.cantidad * (item.precio_venta || 0)).toFixed(2)}</TableCell>
                                <TableCell align="center">
                                    <IconButton 
                                        size="small" sx={{ color: '#ef4444' }} 
                                        disabled={nuevaEntrada.tipo_entrada === 'TRANSFERENCIA'}
                                        onClick={() => eliminarDelCarrito(item.id)}
                                    >
                                        <DeleteIcon fontSize="small" />
                                    </IconButton>
                                </TableCell>
                            </TableRow>
                        ))}
                        {carrito.length === 0 && <TableRow><TableCell colSpan={5} align="center" sx={{ py: 3, color: '#64748b' }}>
                            {nuevaEntrada.tipo_entrada === 'TRANSFERENCIA' ? 'Seleccione una transferencia arriba.' : 'Agregue productos'}
                        </TableCell></TableRow>}
                    </TableBody>
                </Table>
            </TableContainer>

            <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 2 }}>
                <Typography variant="h6" sx={{ color: '#ffffff' }}>Total General:</Typography>
                <Typography variant="h5" sx={{ color: '#bef264', fontWeight: 'bold' }}>S/ {calcularTotalGlobal()}</Typography>
            </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2, borderTop: '1px solid rgba(255,255,255,0.2)', bgcolor: 'rgba(0,0,0,0.2)' }}>
            <Button onClick={handleCloseRequest} sx={{ color: 'white' }}>Cancelar</Button>
            <Button variant="contained" startIcon={<SaveIcon />} onClick={handleSubmit} disabled={carrito.length === 0} sx={{ bgcolor: '#0ea5e9', fontWeight: 'bold', '&:hover': { bgcolor: '#0284c7' } }}>Guardar Entrada</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={openModalProducto} onClose={() => setOpenModalProducto(false)} maxWidth="sm" fullWidth PaperProps={{ className: 'ge-modal-paper' }}>
          <DialogTitle className="ge-modal-title" sx={{ bgcolor: '#1e293b' }}>Registrar Nueva Montura</DialogTitle>
          <DialogContent>
              {mensajeProducto && <Alert severity={mensajeProducto.tipo} sx={{ my: 2 }}>{mensajeProducto.texto}</Alert>}
              <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <Grid container spacing={2}>
                      <Grid item xs={6}>
                        <TextField className="ge-modal-input" label="Código" fullWidth value={nuevoProductoRapido.codigo} onChange={(e) => setNuevoProductoRapido({...nuevoProductoRapido, codigo: e.target.value.toUpperCase()})} />
                      </Grid>
                      <Grid item xs={6}>
                        <TextField className="ge-modal-input" label="Cód. Proveedor" fullWidth value={nuevoProductoRapido.codigo_p} onChange={(e) => setNuevoProductoRapido({...nuevoProductoRapido, codigo_p: e.target.value.toUpperCase()})} />
                      </Grid>
                  </Grid>
                  <TextField className="ge-modal-input" label="Descripción" fullWidth value={nuevoProductoRapido.descripcion} onChange={(e) => setNuevoProductoRapido({...nuevoProductoRapido, descripcion: e.target.value.toUpperCase()})} />
                  <Grid container spacing={2}>
                      <Grid item xs={6}><TextField className="ge-modal-input" label="Marca" fullWidth value={nuevoProductoRapido.marca} onChange={(e) => setNuevoProductoRapido({...nuevoProductoRapido, marca: e.target.value.toUpperCase()})} /></Grid>
                      <Grid item xs={6}><TextField className="ge-modal-input" label="Modelo" fullWidth value={nuevoProductoRapido.modelo} onChange={(e) => setNuevoProductoRapido({...nuevoProductoRapido, modelo: e.target.value.toUpperCase()})} /></Grid>
                  </Grid>
                  <Grid container spacing={2}>
                      <Grid item xs={6}><TextField className="ge-modal-input" label="Color" fullWidth value={nuevoProductoRapido.color} onChange={(e) => setNuevoProductoRapido({...nuevoProductoRapido, color: e.target.value.toUpperCase()})} /></Grid>
                      <Grid item xs={6}><TextField className="ge-modal-input" label="Material" fullWidth value={nuevoProductoRapido.material} onChange={(e) => setNuevoProductoRapido({...nuevoProductoRapido, material: e.target.value.toUpperCase()})} /></Grid>
                  </Grid>
                  <TextField className="ge-modal-input" label="Precio Venta" type="number" fullWidth value={nuevoProductoRapido.precio_venta} onChange={(e) => setNuevoProductoRapido({...nuevoProductoRapido, precio_venta: e.target.value})} />
              </Box>
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
              <Button onClick={() => setOpenModalProducto(false)} sx={{ color: 'white' }}>Cancelar</Button>
              <Button variant="contained" onClick={guardarProductoRapido} sx={{ bgcolor: '#16a34a', fontWeight: 'bold' }}>Guardar y Agregar</Button>
          </DialogActions>
      </Dialog>

      <Dialog open={openConfirmClose} onClose={() => setOpenConfirmClose(false)} PaperProps={{ className: 'ge-alert-paper' }}>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, color: '#f59e0b' }}><WarningAmberIcon /> ¿Descartar Cambios?</DialogTitle>
        <DialogContent><DialogContentText sx={{ color: '#475569' }}>Tiene una entrada en proceso. Si sale ahora, se perderán los datos ingresados.</DialogContentText></DialogContent>
        <DialogActions sx={{ p: 2 }}>
            <Button onClick={() => setOpenConfirmClose(false)} sx={{ color: '#64748b' }}>Continuar Editando</Button>
            <Button onClick={confirmarCierre} variant="contained" color="error">Salir y Descartar</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={openConfirmAnular} onClose={() => setOpenConfirmAnular(false)} PaperProps={{ className: 'ge-alert-paper' }}>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, color: '#ef4444' }}><WarningAmberIcon /> Confirmar Anulación</DialogTitle>
        <DialogContent>
            <DialogContentText sx={{ color: '#475569' }}>
                ¿Está seguro que desea anular la guía <b>{guiaAAnular?.serie}-{guiaAAnular?.numero}</b>?
                <br/><br/>
                El stock ingresado será descontado de esta sede. {guiaAAnular?.tipo_entrada === 'TRANSFERENCIA' && 'La transferencia original volverá a estar PENDIENTE.'} Esta acción no se puede deshacer.
            </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
            <Button onClick={() => setOpenConfirmAnular(false)} sx={{ color: '#64748b' }}>Cancelar</Button>
            <Button onClick={ejecutarAnulacion} variant="contained" color="error">Sí, Anular Guía</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={openModalDetalles} onClose={() => setOpenModalDetalles(false)} maxWidth="md" fullWidth PaperProps={{ className: 'ge-modal-paper' }}>
        <DialogTitle className="ge-modal-title" sx={{ display: 'flex', justifyContent: 'space-between', bgcolor: '#0f172a' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <InfoIcon /> Detalles de Guía {guiaSeleccionada?.serie}-{guiaSeleccionada?.numero}
            </Box>
            <IconButton onClick={() => setOpenModalDetalles(false)} sx={{ color: 'white' }}><CloseIcon /></IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: 3, bgcolor: '#f8fafc' }}>
            <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={6} md={4}>
                    <Typography variant="caption" sx={{ color: '#64748b' }}>Sede</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 'bold', color: '#0f172a' }}>{guiaSeleccionada?.nombre_sede}</Typography>
                </Grid>
                <Grid item xs={6} md={4}>
                    <Typography variant="caption" sx={{ color: '#64748b' }}>Concepto</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 'bold', color: '#0f172a' }}>{guiaSeleccionada?.tipo_entrada}</Typography>
                </Grid>
                <Grid item xs={6} md={4}>
                    <Typography variant="caption" sx={{ color: '#64748b' }}>Fecha</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 'bold', color: '#0f172a' }}>{guiaSeleccionada ? new Date(guiaSeleccionada.fecha).toLocaleDateString() : ''}</Typography>
                </Grid>
                <Grid item xs={6} md={4}>
                    <Typography variant="caption" sx={{ color: '#64748b' }}>Solicitado Por</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 'bold', color: '#0f172a' }}>{guiaSeleccionada?.solicitante}</Typography>
                </Grid>
                <Grid item xs={6} md={4}>
                    <Typography variant="caption" sx={{ color: '#64748b' }}>Encargado</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 'bold', color: '#0f172a' }}>{guiaSeleccionada?.nombre_encargado}</Typography>
                </Grid>
                <Grid item xs={6} md={4}>
                    <Typography variant="caption" sx={{ color: '#64748b' }}>Estado</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 'bold', color: guiaSeleccionada?.estado === 'ANULADO' ? '#ef4444' : '#16a34a' }}>{guiaSeleccionada?.estado || 'COMPLETADO'}</Typography>
                </Grid>
            </Grid>

            <Divider sx={{ mb: 2 }}>
                <Chip label="PRODUCTOS INGRESADOS" size="small" sx={{ fontWeight: 'bold', bgcolor: '#e2e8f0', color: '#475569' }} />
            </Divider>

            <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #e2e8f0' }}>
                <Table size="small">
                    <TableHead sx={{ bgcolor: '#f1f5f9' }}>
                        <TableRow>
                            <TableCell sx={{ fontWeight: 'bold', color: '#1e293b' }}>Código</TableCell>
                            <TableCell sx={{ fontWeight: 'bold', color: '#1e293b' }}>Descripción</TableCell>
                            <TableCell sx={{ fontWeight: 'bold', color: '#1e293b' }}>Marca</TableCell>
                            <TableCell align="center" sx={{ fontWeight: 'bold', color: '#1e293b' }}>Cantidad</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 'bold', color: '#1e293b' }}>Subtotal</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {detallesGuia.map((item, idx) => (
                            <TableRow key={idx}>
                                <TableCell sx={{ color: '#334155' }}>{item.codigo}</TableCell>
                                <TableCell sx={{ color: '#334155' }}>{item.descripcion}</TableCell>
                                <TableCell sx={{ color: '#334155' }}>{item.marca || '-'}</TableCell>
                                <TableCell align="center" sx={{ color: '#334155', fontWeight: 'bold' }}>{item.cantidad}</TableCell>
                                <TableCell align="right" sx={{ color: '#334155' }}>S/ {item.total_linea}</TableCell>
                            </TableRow>
                        ))}
                        {detallesGuia.length === 0 && (
                            <TableRow><TableCell colSpan={5} align="center" sx={{ py: 3, color: '#64748b' }}>No hay detalles para mostrar.</TableCell></TableRow>
                        )}
                        <TableRow sx={{ bgcolor: '#f8fafc' }}>
                            <TableCell colSpan={4} align="right" sx={{ fontWeight: 'bold', color: '#0f172a' }}>TOTAL GENERAL:</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 'bold', color: '#059669' }}>S/ {guiaSeleccionada?.total_monto}</TableCell>
                        </TableRow>
                    </TableBody>
                </Table>
            </TableContainer>
        </DialogContent>
        <DialogActions sx={{ p: 2, bgcolor: '#f8fafc', borderTop: '1px solid #e2e8f0' }}>
            <Button onClick={() => setOpenModalDetalles(false)} variant="contained" sx={{ bgcolor: '#64748b', '&:hover': { bgcolor: '#475569' } }}>Cerrar</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default GestionEntradas;