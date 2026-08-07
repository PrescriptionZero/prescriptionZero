import { pool } from '../config/db.js';
import type { Medicamento, Receta, UsuarioPrueba } from '../types/index.js';

export interface CrearRecetaParams {
  id_corto: string;
  commitment_hash: string;
  codigo_medicamento: string;
  fecha_vigencia: string;
  medico_id: string;
}

export async function crearReceta(params: CrearRecetaParams): Promise<Receta> {
  const { id_corto, commitment_hash, codigo_medicamento, fecha_vigencia, medico_id } = params;
  const result = await pool.query<Receta>(
    `INSERT INTO recetas (id_corto, commitment_hash, codigo_medicamento, fecha_vigencia, medico_id)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [id_corto, commitment_hash, codigo_medicamento, fecha_vigencia, medico_id],
  );
  return result.rows[0];
}

export async function buscarRecetaPorIdCorto(id_corto: string): Promise<Receta | null> {
  const result = await pool.query<Receta>(
    `SELECT * FROM recetas WHERE id_corto = $1`,
    [id_corto],
  );
  return result.rows[0] ?? null;
}

export async function marcarRecetaComoUsada(
  id_corto: string,
  nullifier: string,
): Promise<Receta | null> {
  const result = await pool.query<Receta>(
    `UPDATE recetas
     SET usada = true, nullifier = $2
     WHERE id_corto = $1
     RETURNING *`,
    [id_corto, nullifier],
  );
  return result.rows[0] ?? null;
}

export async function buscarUsuarioPorId(id: string): Promise<UsuarioPrueba | null> {
  const result = await pool.query<UsuarioPrueba>(
    `SELECT * FROM usuarios_prueba WHERE id = $1`,
    [id],
  );
  return result.rows[0] ?? null;
}

export async function listarMedicamentos(): Promise<Medicamento[]> {
  const result = await pool.query<Medicamento>(
    `SELECT * FROM medicamentos_controlados`,
  );
  return result.rows;
}
