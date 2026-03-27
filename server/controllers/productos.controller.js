const pool = require('../config/db');

const obtenerProductos = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM productos ORDER BY id DESC');
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: "Error al listar productos" });
  }
};

const crearProducto = async (req, res) => {
  try {
    const { codigo, codigo_p, descripcion, categoria, marca, color, material, modelo, precio_venta, tipo_bien } = req.body;

    const duplicado = await pool.query('SELECT * FROM productos WHERE codigo = $1', [codigo]);
    if (duplicado.rows.length > 0) {
      return res.status(400).json({ error: "El código ya existe." });
    }

    const marcaFinal = categoria === 'LUNA' ? null : marca;
    const tipoBienFinal = tipo_bien || 'PRODUCTO';

    const nuevoProducto = await pool.query(
      `INSERT INTO productos (codigo, codigo_p, descripcion, categoria, marca, color, material, modelo, precio_venta, tipo_bien, stock) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 0) RETURNING *`,
      [codigo, codigo_p, descripcion, categoria, marcaFinal, color, material, modelo, precio_venta, tipoBienFinal]
    );

    res.json(nuevoProducto.rows[0]);
  } catch (error) {
    res.status(500).json({ error: "Error al crear producto" });
  }
};

module.exports = { obtenerProductos, crearProducto };