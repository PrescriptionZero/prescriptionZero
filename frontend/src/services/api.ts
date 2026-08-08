// api.ts
// Thin fetch wrapper for the real backend (../../backend). Shapes match
// ../../.claude/DIVISION-RESPONSABILIDADES.md section 4 and backend/README.md
// section 3 exactly — see those before changing a field name here, since
// the backend depends on these names too.

const API_BASE = 'http://localhost:3001/api';

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
  if (!response.ok) {
    // Farmacia/validar returns 200 with { valido: false, motivo } for
    // business-logic rejections — this only fires for actual HTTP errors
    // (400/403/404/500), where the body is { error } or { mensaje }.
    const body = await response.json().catch(() => ({}));
    throw new ApiError(body.error || body.mensaje || response.statusText, response.status);
  }
  return response.json() as Promise<T>;
}

// --- POST /api/medico/recetas ---

export interface CrearRecetaRequest {
  patientWalletAddress: string;
  drugCode: string;
  expiryDate: string; // "2026-08-20" — a date string, not a unix timestamp
  medicoId: string;
}

export interface CrearRecetaResponse {
  id_corto: string;
  nonce_paciente: string;
  commitment: string;
}

export function crearReceta(payload: CrearRecetaRequest): Promise<CrearRecetaResponse> {
  return request('/medico/recetas', { method: 'POST', body: JSON.stringify(payload) });
}

// --- GET /api/paciente/mis-recetas ---

export interface RecetaListItem {
  id_corto: string;
  drugCode: string;
  expiryDate: string;
}

export function listarMisRecetas(walletAddress: string): Promise<RecetaListItem[]> {
  return request(`/paciente/mis-recetas?wallet=${encodeURIComponent(walletAddress)}`);
}

// --- POST /api/paciente/ver-receta/:id_corto ---

export interface VerRecetaResponse {
  drugCode: string;
  expiryDate: string;
}

export function verReceta(
  idCorto: string,
  walletAddress: string,
  proof: string,
): Promise<VerRecetaResponse> {
  return request(`/paciente/ver-receta/${idCorto}`, {
    method: 'POST',
    body: JSON.stringify({ walletAddress, proof }),
  });
}

// --- POST /api/paciente/generar-qr ---

export function generarQr(idCorto: string): Promise<string> {
  return request<{ qr_data_url: string }>('/paciente/generar-qr', {
    method: 'POST',
    body: JSON.stringify({ id_corto: idCorto }),
  }).then((data) => data.qr_data_url);
}

// --- POST /api/farmacia/validar ---

export type ValidarRecetaResponse =
  | { valido: true; medicamento: string; vigente_hasta: string }
  | { valido: false; motivo: string };

export function validarReceta(idCortoEscaneado: string): Promise<ValidarRecetaResponse> {
  return request('/farmacia/validar', {
    method: 'POST',
    body: JSON.stringify({ id_corto_escaneado: idCortoEscaneado }),
  });
}
