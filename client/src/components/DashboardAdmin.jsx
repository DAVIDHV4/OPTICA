import React, { useState } from 'react';
import { 
  Box, Typography, Button, Paper, List, ListItem, 
  ListItemIcon, ListItemText, Collapse, IconButton, Tooltip, Divider, useMediaQuery 
} from '@mui/material';
import { useTheme } from '@mui/material/styles';

import MenuIcon from '@mui/icons-material/Menu';
import DashboardIcon from '@mui/icons-material/Dashboard';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import InventoryIcon from '@mui/icons-material/Inventory';
import GroupIcon from '@mui/icons-material/Group';
import ExpandLess from '@mui/icons-material/ExpandLess';
import ExpandMore from '@mui/icons-material/ExpandMore';
import LogoutIcon from '@mui/icons-material/Logout';
import StoreIcon from '@mui/icons-material/Store'; 
import CategoryIcon from '@mui/icons-material/Category'; 
import AddCircleIcon from '@mui/icons-material/AddCircle'; 
import RemoveCircleIcon from '@mui/icons-material/RemoveCircle'; 
import SwapHorizIcon from '@mui/icons-material/SwapHoriz'; 
import ListAltIcon from '@mui/icons-material/ListAlt'; 
import CloseIcon from '@mui/icons-material/Close';

import '../styles/DashboardAdmin.css'; 
import GestionUsuarios from './admin/GestionUsuarios';
import GestionProductos from './admin/GestionProductos';
import GestionInventarios from './admin/GestionInventarios';
import GestionEntradas from './admin/GestionEntradas'; 
import GestionSalidas from './admin/GestionSalidas';
import GestionSedes from './admin/GestionSedes';

function DashboardAdmin({ usuario, cerrarSesion }) {
  const [vistaActual, setVistaActual] = useState('Resumen');
  const [menuAbierto, setMenuAbierto] = useState(true);
  const [openAdmin, setOpenAdmin] = useState(false);
  const [openInventario, setOpenInventario] = useState(false);

  const theme = useTheme();
  const esMovil = useMediaQuery(theme.breakpoints.down('md'));

  const toggleSidebar = () => setMenuAbierto(!menuAbierto);
  const closeSidebarMobile = () => {
    if (esMovil) setMenuAbierto(false);
  };

  const handleAdminClick = () => {
    if (!menuAbierto) setMenuAbierto(true);
    setOpenAdmin(!openAdmin);
  };
  
  const handleInventarioClick = () => {
    if (!menuAbierto) setMenuAbierto(true);
    setOpenInventario(!openInventario);
  };

  const menuItemStyle = {
    mb: 0.5,
    borderRadius: '8px',
    cursor: 'pointer',
    color: '#e2e8f0',
    transition: 'all 0.2s ease',
    '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.08)' },
    justifyContent: menuAbierto ? 'initial' : 'center',
    px: 2,
    py: 1
  };

  const subMenuItemStyle = (activo) => ({
    pl: 4, 
    mb: 0.5,
    borderRadius: '8px',
    cursor: 'pointer',
    backgroundColor: activo ? 'rgba(255, 255, 255, 0.08)' : 'transparent', 
    color: activo ? '#ffffff' : '#94a3b8',
    '&:hover': { color: '#ffffff', backgroundColor: 'rgba(255, 255, 255, 0.04)' }
  });

  const iconColor = "#00e5ff"; 

  return (
    <div className="dashboard-container">
      
      {esMovil && menuAbierto && (
        <div className="mobile-overlay" onClick={toggleSidebar}></div>
      )}

      <Box className={`dashboard-sidebar ${menuAbierto ? 'sidebar-open' : 'sidebar-closed'}`}>
        
        <Box className="sidebar-header-fixed" sx={{ justifyContent: menuAbierto ? 'space-between' : 'center' }}>
          {menuAbierto && (
            <Typography variant="h6" className="sidebar-title">
              ÓPTICA
            </Typography>
          )}
          
          <IconButton onClick={toggleSidebar} size="small" sx={{ color: '#ffffff' }}>
            {esMovil && menuAbierto ? <CloseIcon fontSize="small" /> : <MenuIcon fontSize="small" />}
          </IconButton>
        </Box>

        <Box className="sidebar-scroll-area">
          <List component="nav" sx={{ px: 1 }}>
            
            <Tooltip title={!menuAbierto ? "Resumen" : ""} placement="right">
              <ListItem sx={menuItemStyle} onClick={() => { setVistaActual('Resumen'); closeSidebarMobile(); }}>
                <ListItemIcon sx={{ minWidth: 0, mr: menuAbierto ? 2 : 'auto', justifyContent: 'center' }}>
                  <DashboardIcon sx={{ color: iconColor, fontSize: 20 }} />
                </ListItemIcon>
                {menuAbierto && <ListItemText primary="Resumen" primaryTypographyProps={{fontSize: '0.9rem'}} />}
              </ListItem>
            </Tooltip>

            <Tooltip title={!menuAbierto ? "Admin" : ""} placement="right">
              <ListItem sx={menuItemStyle} onClick={handleAdminClick}>
                <ListItemIcon sx={{ minWidth: 0, mr: menuAbierto ? 2 : 'auto', justifyContent: 'center' }}>
                  <AdminPanelSettingsIcon sx={{ color: iconColor, fontSize: 20 }} />
                </ListItemIcon>
                {menuAbierto && (
                  <>
                    <ListItemText primary="Administracion" primaryTypographyProps={{fontSize: '0.9rem'}} />
                    {openAdmin ? <ExpandLess sx={{fontSize: 18, color: '#ffffff'}} /> : <ExpandMore sx={{fontSize: 18, color: '#ffffff'}} />}
                  </>
                )}
              </ListItem>
            </Tooltip>

            <Collapse in={openAdmin && menuAbierto} timeout="auto" unmountOnExit>
              <List component="div" disablePadding>
                <ListItem sx={subMenuItemStyle(vistaActual === 'Usuarios')} onClick={() => { setVistaActual('Usuarios'); closeSidebarMobile(); }}>
                  <ListItemIcon sx={{ minWidth: 28 }}><GroupIcon sx={{ color: iconColor, fontSize: 18 }} /></ListItemIcon>
                  <ListItemText primary="Usuarios" primaryTypographyProps={{fontSize: '0.85rem'}} />
                </ListItem>
                <ListItem sx={subMenuItemStyle(vistaActual === 'Productos')} onClick={() => { setVistaActual('Productos'); closeSidebarMobile(); }}>
                  <ListItemIcon sx={{ minWidth: 28 }}><CategoryIcon sx={{ color: iconColor, fontSize: 18 }} /></ListItemIcon>
                  <ListItemText primary="Productos" primaryTypographyProps={{fontSize: '0.85rem'}} />
                </ListItem>
              </List>
            </Collapse>

            <Tooltip title={!menuAbierto ? "Inventario" : ""} placement="right">
              <ListItem sx={menuItemStyle} onClick={handleInventarioClick}>
                <ListItemIcon sx={{ minWidth: 0, mr: menuAbierto ? 2 : 'auto', justifyContent: 'center' }}>
                  <InventoryIcon sx={{ color: iconColor, fontSize: 20 }} />
                </ListItemIcon>
                {menuAbierto && (
                  <>
                    <ListItemText primary="Inventario" primaryTypographyProps={{fontSize: '0.9rem'}} />
                    {openInventario ? <ExpandLess sx={{fontSize: 18, color: '#ffffff'}} /> : <ExpandMore sx={{fontSize: 18, color: '#ffffff'}} />}
                  </>
                )}
              </ListItem>
            </Tooltip>

            <Collapse in={openInventario && menuAbierto} timeout="auto" unmountOnExit>
              <List component="div" disablePadding>
                <ListItem sx={subMenuItemStyle(vistaActual === 'Sedes')} onClick={() => { setVistaActual('Sedes'); closeSidebarMobile(); }}>
                  <ListItemIcon sx={{ minWidth: 28 }}><StoreIcon sx={{ color: iconColor, fontSize: 18 }} /></ListItemIcon>
                  <ListItemText primary="Sedes" primaryTypographyProps={{fontSize: '0.85rem'}} />
                </ListItem>
                <ListItem sx={subMenuItemStyle(vistaActual === 'ListaInventarios')} onClick={() => { setVistaActual('ListaInventarios'); closeSidebarMobile(); }}>
                  <ListItemIcon sx={{ minWidth: 28 }}><ListAltIcon sx={{ color: iconColor, fontSize: 18 }} /></ListItemIcon>
                  <ListItemText primary="Stock" primaryTypographyProps={{fontSize: '0.85rem'}} />
                </ListItem>
                <ListItem sx={subMenuItemStyle(vistaActual === 'Entradas')} onClick={() => { setVistaActual('Entradas'); closeSidebarMobile(); }}>
                  <ListItemIcon sx={{ minWidth: 28 }}><AddCircleIcon sx={{ color: iconColor, fontSize: 18 }} /></ListItemIcon>
                  <ListItemText primary="Entradas" primaryTypographyProps={{fontSize: '0.85rem'}} />
                </ListItem>
                <ListItem sx={subMenuItemStyle(vistaActual === 'Salidas')} onClick={() => { setVistaActual('Salidas'); closeSidebarMobile(); }}>
                  <ListItemIcon sx={{ minWidth: 28 }}><RemoveCircleIcon sx={{ color: iconColor, fontSize: 18 }} /></ListItemIcon>
                  <ListItemText primary="Salidas" primaryTypographyProps={{fontSize: '0.85rem'}} />
                </ListItem>
                <ListItem sx={subMenuItemStyle(vistaActual === 'Transferencias')} onClick={() => { setVistaActual('Transferencias'); closeSidebarMobile(); }}>
                  <ListItemIcon sx={{ minWidth: 28 }}><SwapHorizIcon sx={{ color: iconColor, fontSize: 18 }} /></ListItemIcon>
                  <ListItemText primary="Transferencias" primaryTypographyProps={{fontSize: '0.85rem'}} />
                </ListItem>
              </List>
            </Collapse>
          </List>
        </Box>
      </Box>

      <Box className="dashboard-content">
        
        <Box className="dashboard-header-fixed">
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {esMovil && !menuAbierto && (
               <IconButton onClick={toggleSidebar} size="small" sx={{ color: '#ffffff' }}>
                  <MenuIcon />
               </IconButton>
            )}
            <Typography variant="h6" className="header-title">
              {vistaActual === 'Resumen' ? 'Panel General' : vistaActual}
            </Typography>
          </Box>
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <div className="user-badge">
              <span>
                {usuario.nombre ? usuario.nombre.split(' ')[0] : (usuario.usuario || 'Usuario')}
              </span>
            </div>
            <Tooltip title="Cerrar Sesión">
              <IconButton 
                onClick={cerrarSesion} 
                size="small"
                sx={{ 
                  color: '#f87171', 
                  border: '1px solid rgba(248, 113, 113, 0.2)',
                  '&:hover': { backgroundColor: 'rgba(248, 113, 113, 0.1)' }
                }}
              >
                <LogoutIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        <Box className="dashboard-main-scroll">
            
            {vistaActual === 'Resumen' && (
              <Paper className="dashboard-card">
                <Box>
                  <Typography variant="h6" gutterBottom sx={{ borderBottom: '1px solid rgba(255,255,255,0.08)', pb: 2, fontWeight: 500 }}>
                    Bienvenido al Sistema
                  </Typography>
                  <Typography paragraph sx={{color: '#cbd5e1', fontSize: '0.9rem'}}>
                    Selecciona una opción del menú.
                  </Typography>
                </Box>
              </Paper>
            )}

            {vistaActual === 'Usuarios' && <GestionUsuarios />}

            {vistaActual === 'Productos' && <GestionProductos />}
            
            {vistaActual === 'Sedes' && <GestionSedes />}
            
            {vistaActual === 'Entradas' && <GestionEntradas usuario={usuario} />}

            {vistaActual === 'ListaInventarios' && <GestionInventarios />}

            {vistaActual === 'Salidas' && <GestionSalidas usuario={usuario} />}

            {vistaActual === 'Transferencias' && (
              <Paper className="dashboard-card">
                <Typography variant="h6">Transferencias</Typography>
              </Paper>
            )}

        </Box>

      </Box>

    </div>
  );
}

export default DashboardAdmin;