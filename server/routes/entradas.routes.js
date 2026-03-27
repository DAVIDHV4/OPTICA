const express = require('express');
const router = express.Router();
const entradasController = require('../controllers/entradas.controller');

router.get('/', entradasController.obtenerEntradas);
router.get('/:id/detalles', entradasController.obtenerDetallesEntrada);
router.get('/serie/:sede_id', entradasController.obtenerSerieEntrada);
router.post('/', entradasController.crearEntrada);
router.put('/:id/anular', entradasController.anularEntrada);

module.exports = router;