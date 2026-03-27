const pool = require('../config/db');

const obtenerEntradas = async (req, res) => {
    try {
        const { sede_id, tipo } = req.query;
        let query = `SELECT g.*, s.nombre as nombre_sede, u.usuario as nombre_encargado FROM guias_entrada g JOIN sedes s ON g.sede_id = s.id JOIN usuarios u ON g.usuario_id = u.id WHERE 1=1`;
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
        res.status(500).json({ error: "Error listando entradas" });
    }
};

const obtenerDetallesEntrada = async (req, res) => {
    try {
        const { id } = req.params;
        const query = `
            SELECT d.cantidad, d.costo_unitario, d.total_linea, p.codigo, p.descripcion, p.marca 
            FROM detalle_guia_entrada d 
            JOIN productos p ON d.producto_id = p.id 
            WHERE d.guia_id = $1
        `;
        const result = await pool.query(query, [id]);
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: "Error obteniendo detalles" });
    }
};

const obtenerSerieEntrada = async (req, res) => {
    try {
        const { sede_id } = req.params;
        const result = await pool.query("SELECT serie, ultimo_numero FROM series_sedes WHERE sede_id = $1 AND tipo_documento = 'GUIA_ENTRADA'", [sede_id]);
        
        if (result.rows.length === 0) {
            return res.json({ serie: 'GEN', numero: 1 });
        }

        const info = result.rows[0];
        res.json({ serie: info.serie, numero: info.ultimo_numero + 1 });
    } catch (error) {
        res.status(500).json({ error: "Error obteniendo serie" });
    }
};

const crearEntrada = async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const { sede_id, usuario_id, solicitante, tipo_entrada, fecha, nro_comprobante, productos, total_global, guia_salida_origen_id } = req.body;

        const serieData = await client.query("SELECT serie, ultimo_numero FROM series_sedes WHERE sede_id = $1 AND tipo_documento = 'GUIA_ENTRADA' FOR UPDATE", [sede_id]);
        let serie = 'E000'; let numero = 1;

        if (serieData.rows.length > 0) {
            serie = serieData.rows[0].serie; numero = serieData.rows[0].ultimo_numero + 1;
            await client.query("UPDATE series_sedes SET ultimo_numero = $1 WHERE sede_id = $2 AND tipo_documento = 'GUIA_ENTRADA'", [numero, sede_id]);
        } else {
            serie = `E00${sede_id}`;
            await client.query("INSERT INTO series_sedes (sede_id, serie, ultimo_numero, tipo_documento) VALUES ($1, $2, $3, 'GUIA_ENTRADA')", [sede_id, serie, 1]);
        }

        const numeroStr = numero.toString().padStart(6, '0');

        if (tipo_entrada === 'SALDO INICIAL') {
            await client.query('DELETE FROM inventario WHERE sede_id = $1', [sede_id]);
        }

        const nuevaGuia = await client.query(
            `INSERT INTO guias_entrada (sede_id, usuario_id, solicitante, tipo_entrada, fecha, serie, numero, nro_comprobante, total_monto, guia_salida_id, estado) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'COMPLETADO') RETURNING id`,
            [sede_id, usuario_id, solicitante, tipo_entrada, fecha, serie, numeroStr, nro_comprobante, total_global, guia_salida_origen_id || null]
        );
        const guiaId = nuevaGuia.rows[0].id;

        for (const prod of productos) {
            if (prod.tipo_bien !== 'SERVICIO') {
                const costo = prod.precio_venta || 0; 
                const totalLinea = prod.cantidad * costo;

                await client.query(
                    `INSERT INTO detalle_guia_entrada (guia_id, producto_id, cantidad, costo_unitario, total_linea) VALUES ($1, $2, $3, $4, $5)`,
                    [guiaId, prod.id, prod.cantidad, costo, totalLinea]
                );

                const existe = await client.query('SELECT cantidad FROM inventario WHERE sede_id = $1 AND producto_id = $2', [sede_id, prod.id]);

                if (existe.rows.length > 0) {
                    await client.query('UPDATE inventario SET cantidad = cantidad + $1 WHERE sede_id = $2 AND producto_id = $3', [prod.cantidad, sede_id, prod.id]);
                } else {
                    await client.query(`INSERT INTO inventario (sede_id, producto_id, cantidad, precio_venta) VALUES ($1, $2, $3, $4)`, [sede_id, prod.id, prod.cantidad, prod.precio_venta]);
                }
            }
        }

        if (tipo_entrada === 'TRANSFERENCIA' && guia_salida_origen_id) {
            await client.query("UPDATE guias_salida SET estado = 'COMPLETADO' WHERE id = $1", [guia_salida_origen_id]);
        }

        await client.query('COMMIT');
        res.json({ message: "Guía de entrada registrada correctamente", guia_id: guiaId });
    } catch (error) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: "Error registrando entrada" });
    } finally {
        client.release();
    }
};

const anularEntrada = async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const { id } = req.params;

        const guiaRes = await client.query('SELECT * FROM guias_entrada WHERE id = $1', [id]);
        if (guiaRes.rows.length === 0) throw new Error("Guía no encontrada");
        
        const guia = guiaRes.rows[0];
        if (guia.estado === 'ANULADO') throw new Error("La guía ya está anulada");

        const detalles = await client.query('SELECT * FROM detalle_guia_entrada WHERE guia_id = $1', [id]);

        for (const item of detalles.rows) {
            const prod = await client.query('SELECT tipo_bien FROM productos WHERE id = $1', [item.producto_id]);
            
            if (prod.rows.length > 0 && prod.rows[0].tipo_bien !== 'SERVICIO') {
                await client.query(
                    'UPDATE inventario SET cantidad = cantidad - $1 WHERE sede_id = $2 AND producto_id = $3',
                    [item.cantidad, guia.sede_id, item.producto_id]
                );
            }
        }

        await client.query("UPDATE guias_entrada SET estado = 'ANULADO' WHERE id = $1", [id]);

        if (guia.tipo_entrada === 'TRANSFERENCIA' && guia.guia_salida_id) {
            await client.query("UPDATE guias_salida SET estado = 'PENDIENTE' WHERE id = $1", [guia.guia_salida_id]);
        }

        await client.query('COMMIT');
        res.json({ message: "Guía anulada correctamente" });
    } catch (error) {
        await client.query('ROLLBACK');
        res.status(400).json({ error: error.message || "Error al anular la guía" });
    } finally {
        client.release();
    }
};

module.exports = { obtenerEntradas, obtenerDetallesEntrada, obtenerSerieEntrada, crearEntrada, anularEntrada };