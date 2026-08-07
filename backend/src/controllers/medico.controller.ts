import { createHash } from 'node:crypto';
import type { Request, Response } from 'express';
import { crearReceta } from '../services/db.service.js';
import type { CrearRecetaBody, CrearRecetaResponse } from '../types/index.js';

function generarIdCorto(): string {
  // "receta_" (7) + 6 chars = 13, entra sin problema en id_corto VARCHAR(20)
  const sufijo = Math.random().toString(36).slice(2, 8).padEnd(6, '0');
  return `receta_${sufijo}`;
}

export async function crearRecetaController(req: Request, res: Response): Promise<void> {
  const { medico_id, codigo_medicamento, fecha_vigencia } = req.body as CrearRecetaBody;

  if (!medico_id || !codigo_medicamento || !fecha_vigencia) {
    res.status(400).json({
      mensaje: 'Faltan campos requeridos: medico_id, codigo_medicamento, fecha_vigencia',
    });
    return;
  }

  try {
    const idCorto = generarIdCorto();

    // TODO: reemplazar por contract.service.ts cuando Dev-BE-2 lo tenga listo
    // (generar el commitment real y llamar a registerPrescription en el contrato Compact)
    const commitmentSimulado = createHash('sha256').update(idCorto).digest('hex');

    await crearReceta({
      id_corto: idCorto,
      commitment_hash: commitmentSimulado,
      codigo_medicamento,
      fecha_vigencia,
      medico_id,
    });

    const response: CrearRecetaResponse = {
      id_corto: idCorto,
      mensaje: 'Receta emitida y registrada en blockchain',
    };
    res.status(201).json(response);
  } catch (error) {
    console.error('Error al crear receta:', error);
    res.status(500).json({ mensaje: 'Error al emitir la receta' });
  }
}
