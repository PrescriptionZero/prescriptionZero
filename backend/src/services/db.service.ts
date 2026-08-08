import { pool } from '../config/db.js';
import type { Medicamento, Receta, UsuarioPrueba } from '../types/index.js';

// La columna real en schema.sql sigue siendo `commitment_hash`; se alias-ea a
// `commitment` en cada query para calzar con el tipo `Receta` de types/index.ts.
// Calificadas con `recetas.` porque buscarRecetaPorIdCorto hace LEFT JOIN con
// medicamentos_controlados, que también tiene columna `created_at` (ambigua sin calificar).
const RECETA_COLUMNS = `
  recetas.id_corto,
  recetas.commitment_hash AS commitment,
  recetas.codigo_medicamento,
  recetas.fecha_vigencia,
  recetas.medico_id,
  recetas.patient_wallet_address,
  recetas.usada,
  recetas.nullifier,
  recetas.prescription_nonce,
  recetas.created_at
`;

export interface CrearRecetaParams {
  id_corto: string;
  commitment: string;
  codigo_medicamento: string;
  fecha_vigencia: string;
  medico_id: string;
  patient_wallet_address: string;
  prescription_nonce: string;
}

export async function crearReceta(params: CrearRecetaParams): Promise<Receta> {
  const {
    id_corto,
    commitment,
    codigo_medicamento,
    fecha_vigencia,
    medico_id,
    patient_wallet_address,
    prescription_nonce,
  } = params;
  const result = await pool.query<Receta>(
    `INSERT INTO recetas (id_corto, commitment_hash, codigo_medicamento, fecha_vigencia, medico_id, patient_wallet_address, prescription_nonce)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING ${RECETA_COLUMNS}`,
    [id_corto, commitment, codigo_medicamento, fecha_vigencia, medico_id, patient_wallet_address, prescription_nonce],
  );
  return result.rows[0];
}

export async function buscarRecetaPorIdCorto(
  id_corto: string,
): Promise<(Receta & { nombre_medicamento?: string }) | null> {
  const result = await pool.query<Receta & { nombre_medicamento?: string }>(
    `SELECT ${RECETA_COLUMNS}, medicamentos_controlados.nombre AS nombre_medicamento
     FROM recetas
     LEFT JOIN medicamentos_controlados ON recetas.codigo_medicamento = medicamentos_controlados.codigo
     WHERE recetas.id_corto = $1`,
    [id_corto],
  );
  return result.rows[0] ?? null;
}

export async function buscarRecetaPorIdCortoConWallet(
  id_corto: string,
): Promise<(Receta & { nombre_medicamento?: string }) | null> {
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
  // Solo recetas vigentes (usada = false) — una vez dispensada por la
  // farmacia, deja de aparecer en la lista del paciente (feature/autorefresh-recetas).
  const result = await pool.query<RecetaListItem>(
    `SELECT id_corto, codigo_medicamento, fecha_vigencia, usada
     FROM recetas
     WHERE patient_wallet_address = $1 AND usada = false
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
