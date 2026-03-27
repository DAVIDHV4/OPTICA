const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api', require('./routes/auth.routes'));
app.use('/api/usuarios', require('./routes/usuarios.routes'));
app.use('/api/productos', require('./routes/productos.routes'));
app.use('/api', require('./routes/sedes.routes')); 
app.use('/api/entradas', require('./routes/entradas.routes'));
app.use('/api', require('./routes/salidas.routes')); 

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Servidor profesional corriendo en puerto ${PORT}`);
});