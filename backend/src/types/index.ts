// Tipos compartidos entre services, controllers y routes.
// Las tablas base reflejan backend/db/schema.sql. Receta/CrearReceta reflejan el
// modelo "Holder Commitment" (wallet Lace del paciente) de CONTEXTO.md — el
// paciente ya no depende de usuarios_prueba, medico_id sigue viniendo de ahí.

// --- Enum de roles (schema.sql: TYPE rol_usuario) ---

export type RolUsuario = 'medico' | 'paciente' | 'farmacia';

// --- Tablas (schema.sql) ---

export interface UsuarioPrueba {
  id: string;
  nombre: string;
  rol: RolUsuario;
  matricula: string | null; // exclusivo para médicos
  pais: string | null; // exclusivo para farmacias
  created_at: string;
}

export interface Medicamento {
  codigo: string;
  nombre: string;
  requiere_receta: boolean;
  created_at: string;
}

export interface Receta {
  id_corto: string;
  commitment: string; // columna real en schema.sql sigue siendo `commitment_hash`, mapear en la query
  codigo_medicamento: string;
  fecha_vigencia: string;
  medico_id: string;
  patient_wallet_address: string; // wallet Lace del paciente
  usada: boolean;
  nullifier: string | null;
  created_at: string;
}

// --- POST /api/medico/recetas ---

export interface CrearRecetaRequest {
  patientWalletAddress: string;
  drugCode: string;
  expiryDate: string;
  medicoId: string; // no está en CONTEXTO.md Paso 2, pero crearReceta() lo necesita (NOT NULL, FK)
}

export interface CrearRecetaResponse {
  id_corto: string;
  nonce_paciente: string;
  commitment: string;
}

// --- GET /api/paciente/mis-recetas?wallet={walletAddress} ---

export type MisRecetasResponse = {
  id_corto: string;
  drugCode: string;
  expiryDate: string;
}[];

// --- POST /api/paciente/ver-receta/:id_corto ---

export interface VerRecetaRequest {
  walletAddress: string;
  proof: string; // placeholder hasta que ZK entregue la forma real de la prueba
}

export interface VerRecetaResponse {
  drugCode: string;
  expiryDate: string;
}

// --- POST /api/paciente/generar-qr (Camino B, sin cambios) ---

export interface GenerarQrBody {
  id_corto: string;
}

export interface GenerarQrResponse {
  qr_data_url: string;
}

// --- POST /api/farmacia/validar (sin cambios) ---

export interface ValidarRecetaBody {
  id_corto_escaneado: string;
}

export interface ValidarRecetaValidaResponse {
  valido: true;
  medicamento: string;
  vigente_hasta: string;
}

export interface ValidarRecetaInvalidaResponse {
  valido: false;
  motivo: string;
}

export type ValidarRecetaResponse =
  | ValidarRecetaValidaResponse
  | ValidarRecetaInvalidaResponse;
