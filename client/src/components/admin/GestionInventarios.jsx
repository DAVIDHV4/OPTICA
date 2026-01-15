import React, { useState, useEffect } from 'react';
import { 
  Box, Typography, Paper, Table, TableBody, TableCell, 
  TableContainer, TableHead, TableRow, InputAdornment, 
  TextField, FormControl, InputLabel, Select, MenuItem, 
  CircularProgress, Button, Menu, ListItemIcon, ListItemText
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import StoreIcon from '@mui/icons-material/Store';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import TableViewIcon from '@mui/icons-material/TableView';
import axios from 'axios';

// --- LIBRERÍAS DE EXPORTACIÓN ---
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable'; 

import '../../styles/GestionInventarios.css'; 

function GestionInventarios() {
  const [sedes, setSedes] = useState([]);
  const [sedeSeleccionada, setSedeSeleccionada] = useState('');
  const [inventario, setInventario] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [cargando, setCargando] = useState(false);

  const [anchorEl, setAnchorEl] = useState(null);
  const openMenu = Boolean(anchorEl);

  useEffect(() => {
    cargarSedes();
  }, []);

  useEffect(() => {
    if (sedeSeleccionada) {
      cargarInventario(sedeSeleccionada);
    } else {
      setInventario([]);
    }
  }, [sedeSeleccionada]);

  const cargarSedes = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/sedes');
      setSedes(res.data);
      if (res.data.length > 0) {
        setSedeSeleccionada(res.data[0].id);
      }
    } catch (err) {
      console.error("Error cargando sedes", err);
    }
  };

  const cargarInventario = async (idSede) => {
    setCargando(true);
    try {
      const res = await axios.get(`http://localhost:5000/api/inventario/${idSede}`);
      setInventario(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setCargando(false);
    }
  };

  const inventarioFiltrado = inventario.filter((item) => {
    const codigo = item.codigo || '';
    const desc = item.descripcion || '';
    const textoBusqueda = busqueda.toLowerCase();
    return (
      codigo.toLowerCase().includes(textoBusqueda) ||
      desc.toLowerCase().includes(textoBusqueda)
    );
  });

  const obtenerDatosCabecera = () => {
    const sedeObj = sedes.find(s => s.id === sedeSeleccionada);
    // Limpiamos el nombre de la sede para que sea seguro en nombres de archivo (sin parentesis ni espacios raros)
    const nombreSede = sedeObj ? `${sedeObj.nombre} (${sedeObj.codigo})` : 'Sede Desconocida';
    
    // Fecha bonita para mostrar DENTRO del reporte
    const fecha = new Date().toLocaleDateString('es-PE', {
        year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });

    // Fecha abreviada para el NOMBRE DEL ARCHIVO (Ej: 040126_1530)
    const now = new Date();
    const dia = now.getDate().toString().padStart(2, '0');
    const mes = (now.getMonth() + 1).toString().padStart(2, '0');
    const anio = now.getFullYear().toString().slice(-2); // Solo los ultimos 2 digitos (26)
    const hora = now.getHours().toString().padStart(2, '0');
    const min = now.getMinutes().toString().padStart(2, '0');
    const fechaArchivo = `${dia}${mes}${anio}_${hora}${min}`;

    return { nombreSede, fecha, fechaArchivo };
  };

  // --- EXPORTAR A EXCEL ---
  const exportarExcel = async () => {
    const { nombreSede, fecha, fechaArchivo } = obtenerDatosCabecera();
    
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Inventario');

    worksheet.columns = [
      { width: 20 }, { width: 45 }, { width: 15 }, { width: 15 },
    ];

    worksheet.mergeCells('A1:D1');
    const titleCell = worksheet.getCell('A1');
    titleCell.value = 'REPORTE DE INVENTARIO';
    titleCell.font = { name: 'Arial', size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F4E78' } };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };

    worksheet.addRow([]);
    
    const infoRows = [
        ['SEDE:', nombreSede],
        ['FECHA:', fecha]
    ];

    infoRows.forEach((row) => {
        const r = worksheet.addRow(row);
        r.getCell(1).font = { bold: true };
    });

    worksheet.addRow([]);

    const headerRow = worksheet.addRow(['CÓDIGO', 'DESCRIPCIÓN', 'PRECIO (S/)', 'CANTIDAD']);
    
    headerRow.eachCell((cell) => {
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2E7D32' } };
        cell.alignment = { horizontal: 'center' };
        cell.border = {
            top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' }
        };
    });

    inventarioFiltrado.forEach(item => {
        const row = worksheet.addRow([
            item.codigo,
            item.descripcion,
            parseFloat(item.precio_venta || 0),
            parseInt(item.cantidad || 0)
        ]);

        row.getCell(3).numFmt = '"S/" #,##0.00'; 
        row.getCell(4).alignment = { horizontal: 'center' };

        row.eachCell((cell) => {
            cell.border = {
                top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' }
            };
        });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    // Limpiamos caracteres especiales del nombre de sede para el archivo
    const nombreSedeClean = nombreSede.replace(/[^a-zA-Z0-9]/g, '_'); 
    saveAs(new Blob([buffer]), `Inventario_${nombreSedeClean}_${fechaArchivo}.xlsx`);
    handleCloseMenu();
  };

  // --- EXPORTAR A PDF ---
  const exportarPDF = () => {
    try {
        const { nombreSede, fecha, fechaArchivo } = obtenerDatosCabecera();
        const doc = new jsPDF(); 

        // 1. TÍTULO CENTRADO
        doc.setFontSize(18);
        doc.setTextColor(40, 40, 40);
        const pageWidth = doc.internal.pageSize.getWidth();
        doc.text("REPORTE DE INVENTARIO", pageWidth / 2, 20, { align: 'center' });

        // 2. DATOS DE CABECERA
        doc.setFontSize(11);
        doc.setTextColor(100, 100, 100);
        doc.text(`Sede: ${nombreSede}`, 14, 30);
        doc.text(`Fecha: ${fecha}`, 14, 36);

        // Tabla
        const tableColumn = ["Código", "Descripción", "Precio (S/)", "Stock"];
        const tableRows = [];

        inventarioFiltrado.forEach(item => {
            const stockData = [
                item.codigo,
                item.descripcion,
                `S/ ${parseFloat(item.precio_venta || 0).toFixed(2)}`,
                item.cantidad
            ];
            tableRows.push(stockData);
        });

        autoTable(doc, {
            startY: 45,
            head: [tableColumn],
            body: tableRows,
            theme: 'grid',
            headStyles: { fillColor: [46, 125, 50], halign: 'center' },
            styles: { fontSize: 10 },
            columnStyles: {
                0: { cellWidth: 30 },
                2: { cellWidth: 30, halign: 'right' },
                3: { cellWidth: 20, halign: 'center' }
            },
            alternateRowStyles: { fillColor: [245, 245, 245] }
        });

        // Limpiamos caracteres especiales para el archivo
        const nombreSedeClean = nombreSede.replace(/[^a-zA-Z0-9]/g, '_');
        doc.save(`Inventario_${nombreSedeClean}_${fechaArchivo}.pdf`);
    } catch (error) {
        console.error("Error al generar PDF:", error);
        alert(`Error al generar PDF: ${error.message}`);
    }
    handleCloseMenu();
  };

  const handleClickMenu = (event) => setAnchorEl(event.currentTarget);
  const handleCloseMenu = () => setAnchorEl(null);

  return (
    <Box sx={{ width: '100%', maxWidth: '100%' }}>
      
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" className="gi-title">
          Gestión de Inventarios
        </Typography>

        <Box>
            <Button
                variant="contained"
                startIcon={<FileDownloadIcon />}
                onClick={handleClickMenu}
                sx={{ bgcolor: '#2e7d32', '&:hover': { bgcolor: '#1b5e20' }, fontWeight: 'bold' }}
            >
                EXPORTAR
            </Button>
            <Menu anchorEl={anchorEl} open={openMenu} onClose={handleCloseMenu}>
                <MenuItem onClick={exportarExcel}>
                    <ListItemIcon><TableViewIcon fontSize="small" sx={{ color: '#1d6f42' }} /></ListItemIcon>
                    <ListItemText>Exportar a Excel</ListItemText>
                </MenuItem>
                <MenuItem onClick={exportarPDF}>
                    <ListItemIcon><PictureAsPdfIcon fontSize="small" sx={{ color: '#d32f2f' }} /></ListItemIcon>
                    <ListItemText>Exportar a PDF</ListItemText>
                </MenuItem>
            </Menu>
        </Box>
      </Box>

      <Paper className="gi-card" sx={{ p: 2, display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
        <FormControl size="small" className="gi-input" sx={{ minWidth: '250px' }}>
          <InputLabel>Seleccionar Sede</InputLabel>
          <Select
            value={sedeSeleccionada}
            label="Seleccionar Sede"
            onChange={(e) => setSedeSeleccionada(e.target.value)}
            startAdornment={<StoreIcon sx={{ mr: 1, color: '#64748b' }} />}
          >
            {sedes.map((sede) => (
              <MenuItem key={sede.id} value={sede.id}>
                {sede.nombre} ({sede.codigo})
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <TextField
          className="gi-input"
          placeholder="Buscar por código o descripción..."
          variant="outlined"
          size="small"
          sx={{ flex: 1, minWidth: '200px' }}
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

      <TableContainer component={Paper} className="gi-card gi-table-container" sx={{ p: 0 }}>
        <Table sx={{ minWidth: 700 }} aria-label="tabla inventario">
          <TableHead className="gi-table-head">
            <TableRow>
              <TableCell className="gi-table-header-cell">Código</TableCell>
              <TableCell className="gi-table-header-cell">Descripción</TableCell>
              <TableCell className="gi-table-header-cell">Precio</TableCell>
              <TableCell className="gi-table-header-cell" align="center">Cantidad</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {cargando ? (
               <TableRow>
                 <TableCell colSpan={4} align="center" sx={{ py: 3 }}>
                   <CircularProgress size={24} /> Cargando datos...
                 </TableCell>
               </TableRow>
            ) : inventarioFiltrado.length > 0 ? (
              inventarioFiltrado.map((item, index) => (
                <TableRow key={index} className="gi-table-row">
                  <TableCell className="gi-table-cell" sx={{ fontWeight: 'bold' }}>{item.codigo}</TableCell>
                  <TableCell className="gi-table-cell">{item.descripcion}</TableCell>
                  <TableCell className="gi-table-cell">
                    S/ {item.precio_venta ? parseFloat(item.precio_venta).toFixed(2) : '0.00'}
                  </TableCell>
                  <TableCell className="gi-table-cell" align="center">
                    <span className={
                      parseInt(item.cantidad) === 0 ? 'stock-badge-zero' : 
                      parseInt(item.cantidad) < 5 ? 'stock-badge-low' : 'stock-badge-ok'
                    }>
                      {item.cantidad}
                    </span>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={4} align="center" sx={{ py: 3, color: '#64748b' }}>
                  {sedeSeleccionada ? 'No hay items en el inventario de esta sede.' : 'Selecciona una sede.'}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

    </Box>
  );
}

export default GestionInventarios;