import { pool } from '../config/db.js';
import { Receta } from '../types/index.js';

export class DbService {
  /**
   * Busca una receta en Postgres por su id_corto trayendo el nombre del medicamento.
   */
  static async obtenerRecetaPorIdCorto(idCorto: string): Promise<(Receta & { nombre_medicamento?: string }) | null> {
    const query = `
      SELECT 
        r.id_corto,
        r.commitment_hash,
        r.codigo_medicamento,
        r.fecha_vigencia,
        r.medico_id,
        r.usada,
        r.nullifier,
        r.created_at,
        m.nombre AS nombre_medicamento
      FROM recetas r
      LEFT JOIN medicamentos_controlados m ON r.codigo_medicamento = m.codigo
      WHERE r.id_corto = $1;
    `;
    const res = await pool.query(query, [idCorto]);

    if (res.rows.length === 0) {
      return null;
    }

    return res.rows[0];
  }
}