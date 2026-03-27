const pool = require('../config/db');
const bcrypt = require('bcrypt');

const crearUsuario = async (req, res) => {
  const client = await pool.connect(); 
  try {
    await client.query('BEGIN'); 
    const { nombres, apellido_paterno, apellido_materno, dni, fecha_nacimiento, usuario, password, rol, sedesIds } = req.body;

    const nombresUp = nombres.toUpperCase();
    const patUp = apellido_paterno.toUpperCase();
    const matUp = apellido_materno ? apellido_materno.toUpperCase() : '';
    const usuarioUp = usuario.toUpperCase();
    const dniUp = dni.toUpperCase();

    const userExist = await client.query('SELECT * FROM usuarios WHERE usuario = $1 OR dni = $2', [usuarioUp, dniUp]);
    if (userExist.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: "El nombre de usuario o DNI ya está en uso." });
    }

    const salt = await bcrypt.genSalt(10);
    const hashPassword = await bcrypt.hash(password, salt);

    const nuevoUsuario = await client.query(
      `INSERT INTO usuarios (nombres, apellido_paterno, apellido_materno, dni, fecha_nacimiento, usuario, password, rol) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id, nombres, apellido_paterno, usuario, rol, activo`,
      [nombresUp, patUp, matUp, dniUp, fecha_nacimiento, usuarioUp, hashPassword, rol]
    );
    
    const usuarioId = nuevoUsuario.rows[0].id;

    if ((rol === 'Vendedor' || rol === 'Almacenero') && sedesIds && sedesIds.length > 0) {
      for (const sedeId of sedesIds) {
        const idLimpio = parseInt(sedeId);
        if (!isNaN(idLimpio)) {
          await client.query('INSERT INTO usuarios_sedes (usuario_id, sede_id) VALUES ($1, $2)', [usuarioId, idLimpio]);
        }
      }
    }

    await client.query('COMMIT'); 
    res.json(nuevoUsuario.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK'); 
    res.status(500).json({ error: "Error al crear usuario" });
  } finally {
    client.release();
  }
};

const obtenerUsuarios = async (req, res) => {
  try {
    const todos = await pool.query('SELECT * FROM usuarios ORDER BY id DESC');
    res.json(todos.rows);
  } catch (error) {
    res.status(500).json({ error: "Error al obtener usuarios" });
  }
};

const actualizarUsuario = async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { id } = req.params;
    const { nombres, apellido_paterno, apellido_materno, dni, fecha_nacimiento, usuario, password, rol, sedesIds } = req.body;

    const nombresUp = nombres.toUpperCase();
    const patUp = apellido_paterno.toUpperCase();
    const matUp = apellido_materno ? apellido_materno.toUpperCase() : '';
    const usuarioUp = usuario.toUpperCase();
    const dniUp = dni.toUpperCase();

    if (password && password.trim() !== "") {
        const salt = await bcrypt.genSalt(10);
        const hashPassword = await bcrypt.hash(password, salt);
        await client.query(
            `UPDATE usuarios SET nombres=$1, apellido_paterno=$2, apellido_materno=$3, dni=$4, fecha_nacimiento=$5, usuario=$6, password=$7, rol=$8 WHERE id=$9`,
            [nombresUp, patUp, matUp, dniUp, fecha_nacimiento, usuarioUp, hashPassword, rol, id]
        );
    } else {
        await client.query(
            `UPDATE usuarios SET nombres=$1, apellido_paterno=$2, apellido_materno=$3, dni=$4, fecha_nacimiento=$5, usuario=$6, rol=$7 WHERE id=$8`,
            [nombresUp, patUp, matUp, dniUp, fecha_nacimiento, usuarioUp, rol, id]
        );
    }

    if (rol === 'Vendedor' || rol === 'Almacenero') {
        await client.query('DELETE FROM usuarios_sedes WHERE usuario_id = $1', [id]);
        if (sedesIds && sedesIds.length > 0) {
            for (const sedeId of sedesIds) {
                await client.query('INSERT INTO usuarios_sedes (usuario_id, sede_id) VALUES ($1, $2)', [id, parseInt(sedeId)]);
            }
        }
    }

    await client.query('COMMIT');
    res.json({ message: "Usuario actualizado correctamente" });
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: "Error al actualizar usuario" });
  } finally {
    client.release();
  }
};

const obtenerSedesDeUsuario = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT sede_id FROM usuarios_sedes WHERE usuario_id = $1', [id]);
    const ids = result.rows.map(row => row.sede_id);
    res.json(ids);
  } catch (error) {
    res.status(500).json({ error: "Error al obtener sedes del usuario" });
  }
};

module.exports = { crearUsuario, obtenerUsuarios, actualizarUsuario, obtenerSedesDeUsuario };