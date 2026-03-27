const express = require('express');
const router = express.Router();
const sedesController = require('../controllers/sedes.controller');

router.get('/sedes', sedesController.obtenerSedes);
router.post('/sedes', sedesController.crearSede);
router.put('/sedes/:id', sedesController.actualizarSede);
router.get('/inventario/:sede_id', sedesController.obtenerInventarioSede);

module.exports = router;