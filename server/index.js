const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
require('dotenv').config();

const app = express();

app.use(cors());
app.use(express.json());

// Configuración de la Base de Datos
const pool = new Pool({
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME
});

// --- LOGIN ---
app.post('/api/login', async (req, res) => {
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
    console.error("Error:", error.message);
    res.status(500).json({ error: "Error en el servidor" });
  }
});

// --- USUARIOS ---
app.post('/api/usuarios', async (req, res) => {
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
      `INSERT INTO usuarios 
       (nombres, apellido_paterno, apellido_materno, dni, fecha_nacimiento, usuario, password, rol) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
       RETURNING id, nombres, apellido_paterno, usuario, rol, activo`,
      [nombresUp, patUp, matUp, dniUp, fecha_nacimiento, usuarioUp, hashPassword, rol]
    );
    
    const usuarioId = nuevoUsuario.rows[0].id;

    if ((rol === 'Vendedor' || rol === 'Almacenero') && sedesIds && sedesIds.length > 0) {
      for (const sedeId of sedesIds) {
        const idLimpio = parseInt(sedeId);
        if (!isNaN(idLimpio)) {
          await client.query(
            'INSERT INTO usuarios_sedes (usuario_id, sede_id) VALUES ($1, $2)',
            [usuarioId, idLimpio]
          );
        }
      }
    }

    await client.query('COMMIT'); 
    res.json(nuevoUsuario.rows[0]);

  } catch (error) {
    await client.query('ROLLBACK'); 
    console.error(error);
    res.status(500).json({ error: "Error al crear usuario" });
  } finally {
    client.release();
  }
});

app.get('/api/usuarios', async (req, res) => {
  try {
    const todos = await pool.query('SELECT * FROM usuarios ORDER BY id DESC');
    res.json(todos.rows);
  } catch (error) {
    res.status(500).json({ error: "Error al obtener usuarios" });
  }
});

app.put('/api/usuarios/:id', async (req, res) => {
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
            `UPDATE usuarios SET 
             nombres=$1, apellido_paterno=$2, apellido_materno=$3, dni=$4, fecha_nacimiento=$5, 
             usuario=$6, password=$7, rol=$8 
             WHERE id=$9`,
            [nombresUp, patUp, matUp, dniUp, fecha_nacimiento, usuarioUp, hashPassword, rol, id]
        );
    } else {
        await client.query(
            `UPDATE usuarios SET 
             nombres=$1, apellido_paterno=$2, apellido_materno=$3, dni=$4, fecha_nacimiento=$5, 
             usuario=$6, rol=$7 
             WHERE id=$8`,
            [nombresUp, patUp, matUp, dniUp, fecha_nacimiento, usuarioUp, rol, id]
        );
    }

    if (rol === 'Vendedor' || rol === 'Almacenero') {
        await client.query('DELETE FROM usuarios_sedes WHERE usuario_id = $1', [id]);
        if (sedesIds && sedesIds.length > 0) {
            for (const sedeId of sedesIds) {
                await client.query(
                    'INSERT INTO usuarios_sedes (usuario_id, sede_id) VALUES ($1, $2)',
                    [id, parseInt(sedeId)]
                );
            }
        }
    }

    await client.query('COMMIT');
    res.json({ message: "Usuario actualizado correctamente" });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error(error);
    res.status(500).json({ error: "Error al actualizar usuario" });
  } finally {
    client.release();
  }
});

app.get('/api/usuarios/:id/sedes', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'SELECT sede_id FROM usuarios_sedes WHERE usuario_id = $1',
      [id]
    );
    const ids = result.rows.map(row => row.sede_id);
    res.json(ids);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al obtener sedes del usuario" });
  }
});

// --- PRODUCTOS ---
app.get('/api/productos', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM productos ORDER BY id DESC');
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: "Error al listar productos" });
  }
});

app.post('/api/productos', async (req, res) => {
  try {
    const { 
        codigo, codigo_p, descripcion, categoria, 
        marca, color, material, modelo, precio_venta, tipo_bien 
    } = req.body;

    const duplicado = await pool.query('SELECT * FROM productos WHERE codigo = $1', [codigo]);
    if (duplicado.rows.length > 0) {
      return res.status(400).json({ error: "El código ya existe." });
    }

    const marcaFinal = categoria === 'LUNA' ? null : marca;
    const tipoBienFinal = tipo_bien || 'PRODUCTO';

    const nuevoProducto = await pool.query(
      `INSERT INTO productos 
      (codigo, codigo_p, descripcion, categoria, marca, color, material, modelo, precio_venta, tipo_bien, stock) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 0) 
      RETURNING *`,
      [codigo, codigo_p, descripcion, categoria, marcaFinal, color, material, modelo, precio_venta, tipoBienFinal]
    );

    res.json(nuevoProducto.rows[0]);
  } catch (error) {
    console.error("Error backend creando producto:", error);
    res.status(500).json({ error: "Error al crear producto" });
  }
});

app.get('/api/sedes', async (req, res) => {
  try {
    const sedes = await pool.query('SELECT id, nombre, codigo FROM sedes WHERE activo = true ORDER BY id ASC');
    res.json(sedes.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al obtener las sedes" });
  }
});

app.get('/api/inventario/:sede_id', async (req, res) => {
  try {
    const { sede_id } = req.params;
    const query = `
      SELECT A.ID, A.CODIGO, A.DESCRIPCION, B.CANTIDAD, B.PRECIO_VENTA
      FROM PRODUCTOS A JOIN INVENTARIO B ON B.PRODUCTO_ID=A.ID
      WHERE B.SEDE_ID=$1
    `;
    const result = await pool.query(query, [sede_id]);
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al obtener inventario" });
  }
});

// --- ENTRADAS ---
app.get('/api/entradas', async (req, res) => {
    try {
        const { sede_id, tipo } = req.query;
        let query = `
            SELECT g.*, s.nombre as nombre_sede, u.usuario as nombre_encargado 
            FROM guias_entrada g
            JOIN sedes s ON g.sede_id = s.id
            JOIN usuarios u ON g.usuario_id = u.id
            WHERE 1=1
        `;
        const params = [];
        let counter = 1;

        if (sede_id && sede_id !== 'todas') {
            query += ` AND g.sede_id = $${counter++}`;
            params.push(sede_id);
        }
        if (tipo && tipo !== 'todos') {
            query += ` AND g.tipo_entrada = $${counter++}`;
            params.push(tipo);
        }

        query += ` ORDER BY g.created_at DESC`;

        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error listando entradas" });
    }
});

app.get('/api/entradas/serie/:sede_id', async (req, res) => {
    try {
        const { sede_id } = req.params;
        const result = await pool.query(
            "SELECT serie, ultimo_numero FROM series_sedes WHERE sede_id = $1 AND tipo_documento = 'GUIA_ENTRADA'", 
            [sede_id]
        );
        
        if (result.rows.length === 0) {
            return res.json({ serie: 'GEN', numero: 1 });
        }

        const info = result.rows[0];
        res.json({ serie: info.serie, numero: info.ultimo_numero + 1 });
    } catch (error) {
        res.status(500).json({ error: "Error obteniendo serie" });
    }
});

app.post('/api/entradas', async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const { 
            sede_id, usuario_id, solicitante, tipo_entrada, 
            fecha, nro_comprobante, productos, total_global 
        } = req.body;

        const serieData = await client.query(
            "SELECT serie, ultimo_numero FROM series_sedes WHERE sede_id = $1 AND tipo_documento = 'GUIA_ENTRADA' FOR UPDATE",
            [sede_id]
        );
        
        let serie = 'E000';
        let numero = 1;

        if (serieData.rows.length > 0) {
            serie = serieData.rows[0].serie;
            numero = serieData.rows[0].ultimo_numero + 1;
            await client.query(
                "UPDATE series_sedes SET ultimo_numero = $1 WHERE sede_id = $2 AND tipo_documento = 'GUIA_ENTRADA'",
                [numero, sede_id]
            );
        } else {
            serie = `E00${sede_id}`;
            await client.query(
                "INSERT INTO series_sedes (sede_id, serie, ultimo_numero, tipo_documento) VALUES ($1, $2, $3, 'GUIA_ENTRADA')",
                [sede_id, serie, 1]
            );
        }

        const numeroStr = numero.toString().padStart(6, '0');

        if (tipo_entrada === 'SALDO INICIAL') {
            await client.query('DELETE FROM inventario WHERE sede_id = $1', [sede_id]);
        }

        const nuevaGuia = await client.query(
            `INSERT INTO guias_entrada 
            (sede_id, usuario_id, solicitante, tipo_entrada, fecha, serie, numero, nro_comprobante, total_monto)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING id`,
            [sede_id, usuario_id, solicitante, tipo_entrada, fecha, serie, numeroStr, nro_comprobante, total_global]
        );
        const guiaId = nuevaGuia.rows[0].id;

        for (const prod of productos) {
            if (prod.tipo_bien !== 'SERVICIO') {
                const costo = prod.precio_venta || 0; 
                const totalLinea = prod.cantidad * costo;

                await client.query(
                    `INSERT INTO detalle_guia_entrada (guia_id, producto_id, cantidad, costo_unitario, total_linea)
                     VALUES ($1, $2, $3, $4, $5)`,
                    [guiaId, prod.id, prod.cantidad, costo, totalLinea]
                );

                const existe = await client.query(
                    'SELECT cantidad FROM inventario WHERE sede_id = $1 AND producto_id = $2',
                    [sede_id, prod.id]
                );

                if (existe.rows.length > 0) {
                    await client.query(
                        'UPDATE inventario SET cantidad = cantidad + $1 WHERE sede_id = $2 AND producto_id = $3',
                        [prod.cantidad, sede_id, prod.id]
                    );
                } else {
                    await client.query(
                        `INSERT INTO inventario (sede_id, producto_id, cantidad, precio_venta) 
                         VALUES ($1, $2, $3, $4)`,
                        [sede_id, prod.id, prod.cantidad, prod.precio_venta]
                    );
                }
            }
        }

        await client.query('COMMIT');
        res.json({ message: "Guía de entrada registrada correctamente", guia_id: guiaId });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error(error);
        res.status(500).json({ error: "Error registrando entrada" });
    } finally {
        client.release();
    }
});

// --- SALIDAS (CORREGIDO: SE AGREGÓ LA RUTA GET QUE FALTABA) ---

// 1. LISTAR SALIDAS (ESTA ERA LA QUE FALTABA)
app.get('/api/salidas', async (req, res) => {
    try {
        const { sede_id, tipo } = req.query;
        let query = `
            SELECT s.*, 
                   sed.nombre as nombre_sede, 
                   sed_dest.nombre as nombre_destino,
                   u.usuario as nombre_usuario
            FROM guias_salida s
            JOIN sedes sed ON s.sede_id = sed.id
            JOIN usuarios u ON s.usuario_id = u.id
            LEFT JOIN sedes sed_dest ON s.sede_destino_id = sed_dest.id
            WHERE 1=1
        `;
        const params = [];
        let counter = 1;

        if (sede_id && sede_id !== 'todas') {
            query += ` AND s.sede_id = $${counter++}`;
            params.push(sede_id);
        }
        if (tipo && tipo !== 'todos') {
            query += ` AND s.tipo_salida = $${counter++}`;
            params.push(tipo);
        }

        query += ` ORDER BY s.created_at DESC`;

        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error listando salidas" });
    }
});

app.get('/api/salidas/serie/:sede_id', async (req, res) => {
    try {
        const { sede_id } = req.params;
        const result = await pool.query(
            "SELECT serie, ultimo_numero FROM series_sedes WHERE sede_id = $1 AND tipo_documento = 'GUIA_SALIDA'", 
            [sede_id]
        );
        
        if (result.rows.length === 0) {
            return res.json({ serie: 'S000', numero: 1 });
        }

        const info = result.rows[0];
        res.json({ serie: info.serie, numero: info.ultimo_numero + 1 });
    } catch (error) {
        res.status(500).json({ error: "Error obteniendo serie salida" });
    }
});

app.post('/api/salidas', async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const { 
            sede_id, usuario_id, tipo_salida, fecha, 
            sede_destino_id, observacion, productos 
        } = req.body;

        for (const prod of productos) {
            const stockCheck = await client.query(
                'SELECT cantidad FROM inventario WHERE sede_id = $1 AND producto_id = $2',
                [sede_id, prod.id]
            );
            const stockActual = stockCheck.rows.length > 0 ? stockCheck.rows[0].cantidad : 0;
            
            if (stockActual < prod.cantidad) {
                throw new Error(`Stock insuficiente para el producto ${prod.codigo}. Disponible: ${stockActual}, Solicitado: ${prod.cantidad}`);
            }
        }

        const serieData = await client.query(
            "SELECT serie, ultimo_numero FROM series_sedes WHERE sede_id = $1 AND tipo_documento = 'GUIA_SALIDA' FOR UPDATE",
            [sede_id]
        );
        
        let serie = 'S000';
        let numero = 1;

        if (serieData.rows.length > 0) {
            serie = serieData.rows[0].serie;
            numero = serieData.rows[0].ultimo_numero + 1;
            await client.query(
                "UPDATE series_sedes SET ultimo_numero = $1 WHERE sede_id = $2 AND tipo_documento = 'GUIA_SALIDA'",
                [numero, sede_id]
            );
        } else {
            serie = `S00${sede_id}`;
            await client.query(
                "INSERT INTO series_sedes (sede_id, serie, ultimo_numero, tipo_documento) VALUES ($1, $2, $3, 'GUIA_SALIDA')",
                [sede_id, serie, 1]
            );
        }

        const numeroStr = numero.toString().padStart(6, '0');
        const nro_comprobante = `${serie}-${numeroStr}`;

        const estado = tipo_salida === 'TRANSFERENCIA' ? 'PENDIENTE' : 'COMPLETADO';

        const nuevaGuia = await client.query(
            `INSERT INTO guias_salida 
            (sede_id, usuario_id, tipo_salida, fecha, serie, numero, nro_comprobante, observacion, sede_destino_id, estado)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            RETURNING id`,
            [sede_id, usuario_id, tipo_salida, fecha, serie, numeroStr, nro_comprobante, observacion, sede_destino_id || null, estado]
        );
        const guiaId = nuevaGuia.rows[0].id;

        for (const prod of productos) {
            await client.query(
                `INSERT INTO detalle_guia_salida (guia_salida_id, producto_id, cantidad, precio_referencial)
                 VALUES ($1, $2, $3, $4)`,
                [guiaId, prod.id, prod.cantidad, prod.precio_venta]
            );

            if (tipo_salida === 'AJUSTE') {
                await client.query(
                    'UPDATE inventario SET cantidad = cantidad - $1 WHERE sede_id = $2 AND producto_id = $3',
                    [prod.cantidad, sede_id, prod.id]
                );
            }
        }

        await client.query('COMMIT');
        res.json({ message: "Salida registrada correctamente", guia_id: guiaId, estado: estado });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error(error);
        res.status(400).json({ error: error.message || "Error registrando salida" });
    } finally {
        client.release();
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Servidor actualizado corriendo en puerto ${PORT}`);
});