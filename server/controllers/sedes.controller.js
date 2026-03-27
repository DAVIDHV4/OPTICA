const pool = require('../config/db');

const obtenerSedes = async (req, res) => {
  try {
    const sedes = await pool.query('SELECT id, nombre, codigo, activo FROM sedes ORDER BY id ASC');
    res.json(sedes.rows);
  } catch (error) {
    res.status(500).json({ error: "Error al obtener las sedes" });
  }
};

const crearSede = async (req, res) => {
  try {
    const { nombre, codigo } = req.body;
    
    const duplicado = await pool.query('SELECT * FROM sedes WHERE codigo = $1', [codigo]);
    if (duplicado.rows.length > 0) {
      return res.status(400).json({ error: "El código de sede ya existe." });
    }

    const result = await pool.query('INSERT INTO sedes (nombre, codigo) VALUES ($1, $2) RETURNING *', [nombre, codigo]);

    const nuevaSedeId = result.rows[0].id;
    await pool.query("INSERT INTO series_sedes (sede_id, tipo_documento, serie, ultimo_numero) VALUES ($1, 'GUIA_ENTRADA', $2, 0)", [nuevaSedeId, `E00${nuevaSedeId}`]);
    await pool.query("INSERT INTO series_sedes (sede_id, tipo_documento, serie, ultimo_numero) VALUES ($1, 'GUIA_SALIDA', $2, 0)", [nuevaSedeId, `S00${nuevaSedeId}`]);

    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: "Error al crear la sede" });
  }
};

const actualizarSede = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, activo } = req.body;
    
    await pool.query('UPDATE sedes SET nombre = $1, activo = $2 WHERE id = $3', [nombre, activo, id]);
    res.json({ message: "Sede actualizada correctamente" });
  } catch (error) {
    res.status(500).json({ error: "Error al actualizar la sede" });
  }
};

const obtenerInventarioSede = async (req, res) => {
  try {
    const { sede_id } = req.params;
    const query = `SELECT A.ID, A.CODIGO, A.DESCRIPCION, B.CANTIDAD, B.PRECIO_VENTA FROM PRODUCTOS A JOIN INVENTARIO B ON B.PRODUCTO_ID=A.ID WHERE B.SEDE_ID=$1`;
    const result = await pool.query(query, [sede_id]);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: "Error al obtener inventario" });
  }
};

module.exports = { obtenerSedes, crearSede, actualizarSede, obtenerInventarioSede };