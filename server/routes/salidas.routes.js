const express = require('express');
const router = express.Router();
const salidasController = require('../controllers/salidas.controller');

router.get('/salidas', salidasController.obtenerSalidas);
router.get('/salidas/serie/:sede_id', salidasController.obtenerSerieSalida);
router.post('/salidas', salidasController.crearSalida);
router.get('/transferencias/pendientes/:sede_id', salidasController.obtenerTransferenciasPendientes);
router.put('/salidas/:id/anular', salidasController.anularSalida);

module.exports = router;