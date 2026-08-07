import { createHash, randomBytes } from 'node:crypto';
import type { Request, Response } from 'express';
import { crearReceta } from '../services/db.service.js';
import type { CrearRecetaRequest, CrearRecetaResponse } from '../types/index.js';

function generarIdCorto(): string {
  // "receta_" (7) + 6 chars = 13, entra sin problema en id_corto VARCHAR(20)
  const sufijo = Math.random().toString(36).slice(2, 8).padEnd(6, '0');
  return `receta_${sufijo}`;
}

export async function crearRecetaController(req: Request, res: Response): Promise<void> {
  const { patientWalletAddress, drugCode, expiryDate, medicoId } = req.body as CrearRecetaRequest;

  if (!patientWalletAddress || !drugCode || !expiryDate || !medicoId) {
    res.status(400).json({
      mensaje: 'Faltan campos requeridos: patientWalletAddress, drugCode, expiryDate, medicoId',
    });
    return;
  }

  try {
    const idCorto = generarIdCorto();
    const noncePaciente = randomBytes(32).toString('hex');

    // TODO: usar contract.service.deriveHolderCommitment cuando Dev-BE-2 lo suba
    const commitment = createHash('sha256').update(noncePaciente).digest('hex');

    await crearReceta({
      id_corto: idCorto,
      commitment,
      codigo_medicamento: drugCode,
      fecha_vigencia: expiryDate,
      medico_id: medicoId,
      patient_wallet_address: patientWalletAddress,
    });

    // El nonce se devuelve UNA vez, acá, y nunca se persiste en la base.
    const response: CrearRecetaResponse = {
      id_corto: idCorto,
      nonce_paciente: noncePaciente,
      commitment,
    };
    res.status(201).json(response);
  } catch (error) {
    console.error('❌ Error al crear receta:', error);
    res.status(500).json({ mensaje: 'Error al emitir la receta' });
  }
}
