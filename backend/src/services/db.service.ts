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
import type { Medicamento, Receta, UsuarioPrueba } from '../types/index.js';

// La columna real en schema.sql sigue siendo `commitment_hash`; se alias-ea a
// `commitment` en cada query para calzar con el tipo `Receta` de types/index.ts.
const RECETA_COLUMNS = `
  id_corto,
  commitment_hash AS commitment,
  codigo_medicamento,
  fecha_vigencia,
  medico_id,
  patient_wallet_address,
  usada,
  nullifier,
  created_at
`;

export interface CrearRecetaParams {
  id_corto: string;
  commitment: string;
  codigo_medicamento: string;
  fecha_vigencia: string;
  medico_id: string;
  patient_wallet_address: string;
}

export async function crearReceta(params: CrearRecetaParams): Promise<Receta> {
  const { id_corto, commitment, codigo_medicamento, fecha_vigencia, medico_id, patient_wallet_address } =
    params;
  const result = await pool.query<Receta>(
    `INSERT INTO recetas (id_corto, commitment_hash, codigo_medicamento, fecha_vigencia, medico_id, patient_wallet_address)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING ${RECETA_COLUMNS}`,
    [id_corto, commitment, codigo_medicamento, fecha_vigencia, medico_id, patient_wallet_address],
  );
  return result.rows[0];
}

export async function buscarRecetaPorIdCorto(id_corto: string): Promise<Receta | null> {
  const result = await pool.query<Receta>(
    `SELECT ${RECETA_COLUMNS} FROM recetas WHERE id_corto = $1`,
    [id_corto],
  );
  return result.rows[0] ?? null;
}

export async function buscarRecetaPorIdCortoConWallet(id_corto: string): Promise<Receta | null> {
  // Mismo query que buscarRecetaPorIdCorto por ahora. Nombre separado a pedido del
  // plan (CONTEXTO.md, Camino A) para que el flujo de ver-receta (paciente, necesita
  // patient_wallet_address + commitment completos) y el de farmacia puedan divergir
  // más adelante sin pisarse si alguno necesita exponer menos campos.
  return buscarRecetaPorIdCorto(id_corto);
}

export interface RecetaListItem {
  id_corto: string;
  codigo_medicamento: string;
  fecha_vigencia: string;
  usada: boolean;
}

export async function listarRecetasPorWallet(walletAddress: string): Promise<RecetaListItem[]> {
  const result = await pool.query<RecetaListItem>(
    `SELECT id_corto, codigo_medicamento, fecha_vigencia, usada
     FROM recetas
     WHERE patient_wallet_address = $1
     ORDER BY created_at DESC`,
    [walletAddress],
  );
  return result.rows;
}

export async function marcarRecetaComoUsada(
  id_corto: string,
  nullifier: string,
): Promise<Receta | null> {
  const result = await pool.query<Receta>(
    `UPDATE recetas
     SET usada = true, nullifier = $2
     WHERE id_corto = $1
     RETURNING ${RECETA_COLUMNS}`,
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
