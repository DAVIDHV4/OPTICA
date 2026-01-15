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

// --- RUTA: LOGIN (AHORA BUSCA SIEMPRE EN MAYÚSCULA) ---
app.post('/api/login', async (req, res) => {
  try {
    const { usuario, password } = req.body;

    // 1. FORZAMOS MAYÚSCULAS para buscar el usuario
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

// --- RUTA: CREAR USUARIO (GUARDA TODO EN MAYÚSCULAS) ---
app.post('/api/usuarios', async (req, res) => {
  const client = await pool.connect(); 
  try {
    await client.query('BEGIN'); 

    const { nombres, apellido_paterno, apellido_materno, dni, fecha_nacimiento, usuario, password, rol, sedesIds } = req.body;

    // 1. CONVERSIÓN A MAYÚSCULAS (Regla de negocio)
    // El apellido materno puede venir vacío, así que usamos un ternario
    const nombresUp = nombres.toUpperCase();
    const patUp = apellido_paterno.toUpperCase();
    const matUp = apellido_materno ? apellido_materno.toUpperCase() : '';
    const usuarioUp = usuario.toUpperCase();
    const dniUp = dni.toUpperCase();

    // 2. Validar si existe (Usamos las variables en mayúscula)
    const userExist = await client.query('SELECT * FROM usuarios WHERE usuario = $1 OR dni = $2', [usuarioUp, dniUp]);
    if (userExist.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: "El nombre de usuario o DNI ya está en uso." });
    }

    // 3. Hashear contraseña
    const salt = await bcrypt.genSalt(10);
    const hashPassword = await bcrypt.hash(password, salt);

    // 4. Insertar Usuario (Usamos variables Up)
    const nuevoUsuario = await client.query(
      `INSERT INTO usuarios 
       (nombres, apellido_paterno, apellido_materno, dni, fecha_nacimiento, usuario, password, rol) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
       RETURNING id, nombres, apellido_paterno, usuario, rol, activo`,
      [nombresUp, patUp, matUp, dniUp, fecha_nacimiento, usuarioUp, hashPassword, rol]
    );
    
    const usuarioId = nuevoUsuario.rows[0].id;

    // 5. Asignar Sedes
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

// --- RUTA: LISTAR USUARIOS ---
app.get('/api/usuarios', async (req, res) => {
  try {
    const todos = await pool.query('SELECT * FROM usuarios ORDER BY id DESC');
    res.json(todos.rows);
  } catch (error) {
    res.status(500).json({ error: "Error al obtener usuarios" });
  }
});

// --- RUTA: EDITAR USUARIO (ACTUALIZA EN MAYÚSCULAS) ---
app.put('/api/usuarios/:id', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { id } = req.params;
    const { nombres, apellido_paterno, apellido_materno, dni, fecha_nacimiento, usuario, password, rol, sedesIds } = req.body;

    // 1. CONVERSIÓN A MAYÚSCULAS
    const nombresUp = nombres.toUpperCase();
    const patUp = apellido_paterno.toUpperCase();
    const matUp = apellido_materno ? apellido_materno.toUpperCase() : '';
    const usuarioUp = usuario.toUpperCase();
    const dniUp = dni.toUpperCase();

    // 2. Actualizar datos básicos
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

    // 3. Actualizar Sedes
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

// --- RUTA: OBTENER SEDES DE UN USUARIO ESPECÍFICO ---
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

// --- RUTAS DE PRODUCTOS ---
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
    const { codigo, descripcion, categoria, marca, color, tipo, modelo, precio_venta } = req.body;

    const duplicado = await pool.query('SELECT * FROM productos WHERE codigo = $1', [codigo]);
    if (duplicado.rows.length > 0) {
      return res.status(400).json({ error: "El código ya existe." });
    }

    const marcaFinal = categoria === 'LUNA' ? null : marca;

    const nuevoProducto = await pool.query(
      `INSERT INTO productos 
      (codigo, descripcion, categoria, marca, color, tipo, modelo, precio_venta) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
      RETURNING *`,
      [codigo, descripcion, categoria, marcaFinal, color, tipo, modelo, precio_venta]
    );

    res.json(nuevoProducto.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al crear producto" });
  }
});

// --- RUTA: LISTAR SEDES ---
app.get('/api/sedes', async (req, res) => {
  try {
    const sedes = await pool.query('SELECT id, nombre, codigo FROM sedes WHERE activo = true ORDER BY id ASC');
    res.json(sedes.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al obtener las sedes" });
  }
});

// --- RUTA: INVENTARIO POR SEDE ---
app.get('/api/inventario/:sede_id', async (req, res) => {
  try {
    const { sede_id } = req.params;

    const query = `
      SELECT A.CODIGO, A.DESCRIPCION, B.CANTIDAD, B.PRECIO_VENTA
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

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Servidor actualizado corriendo en puerto ${PORT}`);
});

// ==========================================
//  NUEVO MÓDULO: GUÍAS DE ENTRADA
// ==========================================

// 1. LISTAR ENTRADAS (CON FILTROS)
app.get('/api/entradas', async (req, res) => {
    try {
        const { sede_id, tipo, fecha_inicio, fecha_fin } = req.query;
        
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
        // Puedes agregar lógica de fechas aquí si lo necesitas

        query += ` ORDER BY g.created_at DESC`;

        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error listando entradas" });
    }
});

// 2. OBTENER SERIE PARA UNA SEDE
app.get('/api/entradas/serie/:sede_id', async (req, res) => {
    try {
        const { sede_id } = req.params;
        // Buscar la serie configurada para entradas en esa sede
        const result = await pool.query(
            "SELECT serie, ultimo_numero FROM series_sedes WHERE sede_id = $1 AND tipo_documento = 'GUIA_ENTRADA'", 
            [sede_id]
        );
        
        if (result.rows.length === 0) {
            // Si no existe configuración, devolvemos un genérico (O podrías crearla al vuelo)
            return res.json({ serie: 'GEN', numero: 1 });
        }

        const info = result.rows[0];
        res.json({ serie: info.serie, numero: info.ultimo_numero + 1 });
    } catch (error) {
        res.status(500).json({ error: "Error obteniendo serie" });
    }
});

// 3. CREAR NUEVA GUÍA DE ENTRADA (TRANSACCIÓN COMPLETA)
app.post('/api/entradas', async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const { 
            sede_id, usuario_id, solicitante, tipo_entrada, 
            fecha, nro_comprobante, productos, total_global 
        } = req.body;

        // A. OBTENER Y ACTUALIZAR CORRELATIVO
        const serieData = await client.query(
            "SELECT serie, ultimo_numero FROM series_sedes WHERE sede_id = $1 AND tipo_documento = 'GUIA_ENTRADA' FOR UPDATE",
            [sede_id]
        );
        
        let serie = 'E000';
        let numero = 1;

        if (serieData.rows.length > 0) {
            serie = serieData.rows[0].serie;
            numero = serieData.rows[0].ultimo_numero + 1;
            // Actualizamos el último número usado
            await client.query(
                "UPDATE series_sedes SET ultimo_numero = $1 WHERE sede_id = $2 AND tipo_documento = 'GUIA_ENTRADA'",
                [numero, sede_id]
            );
        } else {
            // Si no existe la serie, creamos una por defecto E00{sede_id}
            serie = `E00${sede_id}`;
            await client.query(
                "INSERT INTO series_sedes (sede_id, serie, ultimo_numero, tipo_documento) VALUES ($1, $2, $3, 'GUIA_ENTRADA')",
                [sede_id, serie, 1]
            );
        }

        // Formatear número a 6 dígitos (ej: 000001)
        const numeroStr = numero.toString().padStart(6, '0');

        // B. SI ES "SALDO INICIAL", BORRAMOS EL STOCK PREVIO DE ESA SEDE
        if (tipo_entrada === 'SALDO INICIAL') {
            await client.query('DELETE FROM inventario WHERE sede_id = $1', [sede_id]);
        }

        // C. INSERTAR CABECERA (GUÍA)
        const nuevaGuia = await client.query(
            `INSERT INTO guias_entrada 
            (sede_id, usuario_id, solicitante, tipo_entrada, fecha, serie, numero, nro_comprobante, total_monto)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING id`,
            [sede_id, usuario_id, solicitante, tipo_entrada, fecha, serie, numeroStr, nro_comprobante, total_global]
        );
        const guiaId = nuevaGuia.rows[0].id;

        // D. PROCESAR PRODUCTOS (Detalle + Stock)
        for (const prod of productos) {
            // 1. Insertar Detalle
            // Asumimos precio_venta como referencia de costo si no hay costo real, o 0.
            // OJO: Idealmente 'prod.costo' debería venir del frontend. Usaremos el precio como valor referencial del movimiento.
            const costo = prod.precio_venta || 0; 
            const totalLinea = prod.cantidad * costo;

            await client.query(
                `INSERT INTO detalle_guia_entrada (guia_id, producto_id, cantidad, costo_unitario, total_linea)
                 VALUES ($1, $2, $3, $4, $5)`,
                [guiaId, prod.id, prod.cantidad, costo, totalLinea]
            );

            // 2. Actualizar Stock (Upsert)
            // Si fue SALDO INICIAL, ya borramos todo, así que solo será INSERT.
            // Si es AJUSTE o TRANSFERENCIA, puede ser UPDATE o INSERT.
            
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