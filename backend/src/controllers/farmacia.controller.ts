import { Request, Response } from 'express';
import { DbService } from '../services/db.service.js';
import { ContractService } from '../services/contract.service.js';
import { ValidarRecetaBody, ValidarRecetaResponse } from '../types/index.js';

export class FarmaciaController {
  static async validarReceta(
    req: Request<{}, {}, ValidarRecetaBody>,
    res: Response<ValidarRecetaResponse>
  ) {
    try {
      const { id_corto_escaneado } = req.body;

      if (!id_corto_escaneado) {
        return res.status(400).json({
          valido: false,
          motivo: 'El campo id_corto_escaneado es obligatorio',
        });
      }

      // 1. Buscar en Postgres
      const receta = await DbService.obtenerRecetaPorIdCorto(id_corto_escaneado);

      // Regla A: ¿Existe la receta en BD?
      if (!receta) {
        return res.status(200).json({
          valido: false,
          motivo: 'Receta no encontrada',
        });
      }

      // Regla B: ¿Ya fue dispensada / usada?
      if (receta.usada) {
        return res.status(200).json({
          valido: false,
          motivo: 'La receta ya fue utilizada',
        });
      }

      // Regla C: ¿Está vencida?
      const fechaVigencia = new Date(receta.fecha_vigencia);
      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);

      if (fechaVigencia < hoy) {
        return res.status(200).json({
          valido: false,
          motivo: 'La receta se encuentra vencida',
        });
      }

      // 2. Verificar estado en Blockchain (Midnight ZK Mock)
      const checkBlockchain = await ContractService.validarReceta(receta.commitment_hash);

      if (!checkBlockchain.valido) {
        return res.status(200).json({
          valido: false,
          motivo: checkBlockchain.motivo || 'Error de validación en la blockchain',
        });
      }

      // 3. Respuesta Exitosa (Sin datos del paciente ni del médico)
      return res.status(200).json({
        valido: true,
        medicamento: receta.nombre_medicamento || receta.codigo_medicamento,
        vigente_hasta: receta.fecha_vigencia,
      });

    } catch (error) {
      console.error('❌ Error en FarmaciaController.validarReceta:', error);
      return res.status(500).json({
        valido: false,
        motivo: 'Error interno del servidor al procesar la validación',
      });
    }
  }
}