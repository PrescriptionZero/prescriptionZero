// Tipos compartidos entre services, controllers y routes.
// Las tablas reflejan backend/db/schema.sql; los endpoints reflejan CONTEXTO.md sección 5.4.

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
  commitment_hash: string;
  codigo_medicamento: string;
  fecha_vigencia: string;
  medico_id: string;
  usada: boolean;
  nullifier: string | null;
  created_at: string;
}

// --- POST /api/medico/recetas ---

export interface CrearRecetaBody {
  medico_id: string;
  paciente_nombre_local: string;
  codigo_medicamento: string;
  fecha_vigencia: string;
}

export interface CrearRecetaResponse {
  id_corto: string;
  mensaje: string;
}

// --- GET /api/paciente/recetas/:id_corto ---

export interface RecetaPacienteResponse {
  id_corto: string;
  codigo_medicamento: string;
  fecha_vigencia: string;
  usada: boolean;
}

// --- POST /api/paciente/generar-qr ---

export interface GenerarQrBody {
  id_corto: string;
}

export interface GenerarQrResponse {
  qr_data_url: string;
}

// --- POST /api/farmacia/validar ---

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
