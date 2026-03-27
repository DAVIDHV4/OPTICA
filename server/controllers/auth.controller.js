const pool = require('../config/db');
const bcrypt = require('bcrypt');

const login = async (req, res) => {
  try {
    const { usuario, password } = req.body;
    const usuarioUpper = usuario.toUpperCase();

    const resultado = await pool.query('SELECT * FROM usuarios WHERE usuario = $1', [usuarioUpper]);

    if (resultado.rows.length === 0) {
      return res.status(401).json({ error: "Usuario no encontrado" });
    }

    const usuarioEncontrado = resultado.rows[0];
    const esCorrecta = await bcrypt.compare(password, usuarioEncontrado.password);

    if (!esCorrecta) {
      return res.status(401).json({ error: "Contraseña incorrecta" });
    }

    const sedesResult = await pool.query(
      `SELECT s.id, s.nombre, s.codigo 
       FROM sedes s 
       JOIN usuarios_sedes us ON s.id = us.sede_id 
       WHERE us.usuario_id = $1 AND s.activo = true`,
      [usuarioEncontrado.id]
    );

    res.json({
      mensaje: "Bienvenido",
      usuario: {
        id: usuarioEncontrado.id,
        nombre: `${usuarioEncontrado.nombres} ${usuarioEncontrado.apellido_paterno}`, 
        rol: usuarioEncontrado.rol
      },
      sedes: sedesResult.rows 
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error en el servidor" });
  }
};

module.exports = {
  login
};