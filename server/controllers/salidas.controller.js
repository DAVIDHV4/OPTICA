const pool = require('../config/db');

const obtenerSalidas = async (req, res) => {
    try {
        const { sede_id, tipo } = req.query;
        let query = `SELECT s.*, sed.nombre as nombre_sede, sed_dest.nombre as nombre_destino, u.usuario as nombre_usuario FROM guias_salida s JOIN sedes sed ON s.sede_id = sed.id JOIN usuarios u ON s.usuario_id = u.id LEFT JOIN sedes sed_dest ON s.sede_destino_id = sed_dest.id WHERE 1=1`;
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
        res.status(500).json({ error: "Error listando salidas" });
    }
};

const obtenerSerieSalida = async (req, res) => {
    try {
        const { sede_id } = req.params;
        const result = await pool.query("SELECT serie, ultimo_numero FROM series_sedes WHERE sede_id = $1 AND tipo_documento = 'GUIA_SALIDA'", [sede_id]);
        
        if (result.rows.length === 0) {
            return res.json({ serie: 'S000', numero: 1 });
        }

        const info = result.rows[0];
        res.json({ serie: info.serie, numero: info.ultimo_numero + 1 });
    } catch (error) {
        res.status(500).json({ error: "Error obteniendo serie salida" });
    }
};

const crearSalida = async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const { sede_id, usuario_id, tipo_salida, fecha, sede_destino_id, observacion, productos } = req.body;

        for (const prod of productos) {
            const stockCheck = await client.query('SELECT cantidad FROM inventario WHERE sede_id = $1 AND producto_id = $2', [sede_id, prod.id]);
            const stockActual = stockCheck.rows.length > 0 ? stockCheck.rows[0].cantidad : 0;
            
            if (stockActual < prod.cantidad) {
                throw new Error(`Stock insuficiente para el producto ${prod.codigo}. Disponible: ${stockActual}`);
            }
        }

        const serieData = await client.query("SELECT serie, ultimo_numero FROM series_sedes WHERE sede_id = $1 AND tipo_documento = 'GUIA_SALIDA' FOR UPDATE", [sede_id]);
        let serie = 'S000'; let numero = 1;

        if (serieData.rows.length > 0) {
            serie = serieData.rows[0].serie; numero = serieData.rows[0].ultimo_numero + 1;
            await client.query("UPDATE series_sedes SET ultimo_numero = $1 WHERE sede_id = $2 AND tipo_documento = 'GUIA_SALIDA'", [numero, sede_id]);
        } else {
            serie = `S00${sede_id}`;
            await client.query("INSERT INTO series_sedes (sede_id, serie, ultimo_numero, tipo_documento) VALUES ($1, $2, $3, 'GUIA_SALIDA')", [sede_id, serie, 1]);
        }

        const numeroStr = numero.toString().padStart(6, '0');
        const nro_comprobante = `${serie}-${numeroStr}`;
        const estado = tipo_salida === 'TRANSFERENCIA' ? 'PENDIENTE' : 'COMPLETADO';

        const nuevaGuia = await client.query(
            `INSERT INTO guias_salida (sede_id, usuario_id, tipo_salida, fecha, serie, numero, nro_comprobante, observacion, sede_destino_id, estado) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`,
            [sede_id, usuario_id, tipo_salida, fecha, serie, numeroStr, nro_comprobante, observacion, sede_destino_id || null, estado]
        );
        const guiaId = nuevaGuia.rows[0].id;

        for (const prod of productos) {
            await client.query(`INSERT INTO detalle_guia_salida (guia_salida_id, producto_id, cantidad, precio_referencial) VALUES ($1, $2, $3, $4)`, [guiaId, prod.id, prod.cantidad, prod.precio_venta]);
            
            await client.query('UPDATE inventario SET cantidad = cantidad - $1 WHERE sede_id = $2 AND producto_id = $3', [prod.cantidad, sede_id, prod.id]);
        }

        await client.query('COMMIT');
        res.json({ message: "Salida registrada correctamente", guia_id: guiaId, estado: estado });
    } catch (error) {
        await client.query('ROLLBACK');
        res.status(400).json({ error: error.message || "Error registrando salida" });
    } finally {
        client.release();
    }
};

const obtenerTransferenciasPendientes = async (req, res) => {
    try {
        const { sede_id } = req.params;
        const result = await pool.query(`SELECT gs.id as guia_salida_id, gs.serie, gs.numero, gs.fecha, s.nombre as sede_origen, json_agg(json_build_object('id', p.id, 'codigo', p.codigo, 'descripcion', p.descripcion, 'marca', p.marca, 'cantidad', dgs.cantidad, 'precio_venta', p.precio_venta, 'tipo_bien', p.tipo_bien)) as productos FROM guias_salida gs JOIN sedes s ON gs.sede_id = s.id JOIN detalle_guia_salida dgs ON gs.id = dgs.guia_salida_id JOIN productos p ON dgs.producto_id = p.id WHERE gs.sede_destino_id = $1 AND gs.estado = 'PENDIENTE' GROUP BY gs.id, gs.serie, gs.numero, gs.fecha, s.nombre`, [sede_id]);
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: "Error obteniendo transferencias pendientes" });
    }
};

const anularSalida = async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const { id } = req.params;

        const guiaRes = await client.query('SELECT * FROM guias_salida WHERE id = $1', [id]);
        if (guiaRes.rows.length === 0) throw new Error("Guía no encontrada");
        
        const guia = guiaRes.rows[0];
        if (guia.estado === 'ANULADO') throw new Error("La guía ya está anulada");

        const detalles = await client.query('SELECT * FROM detalle_guia_salida WHERE guia_salida_id = $1', [id]);

        for (const item of detalles.rows) {
            await client.query('UPDATE inventario SET cantidad = cantidad + $1 WHERE sede_id = $2 AND producto_id = $3', [item.cantidad, guia.sede_id, item.producto_id]);

            if (guia.tipo_salida === 'TRANSFERENCIA' && guia.estado === 'COMPLETADO') {
                await client.query('UPDATE inventario SET cantidad = cantidad - $1 WHERE sede_id = $2 AND producto_id = $3', [item.cantidad, guia.sede_destino_id, item.producto_id]);
            }
        }

        await client.query("UPDATE guias_salida SET estado = 'ANULADO' WHERE id = $1", [id]);

        if (guia.tipo_salida === 'TRANSFERENCIA') {
            await client.query("UPDATE guias_entrada SET estado = 'ANULADO' WHERE guia_salida_id = $1", [id]);
        }

        await client.query('COMMIT');
        res.json({ message: "Guía anulada y stock revertido correctamente" });
    } catch (error) {
        await client.query('ROLLBACK');
        res.status(400).json({ error: error.message || "Error al anular la guía" });
    } finally {
        client.release();
    }
};

module.exports = { obtenerSalidas, obtenerSerieSalida, crearSalida, obtenerTransferenciasPendientes, anularSalida };