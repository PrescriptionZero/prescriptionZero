import { Request, Response } from 'express';
import { buscarRecetaPorIdCorto, marcarRecetaComoUsada } from '../services/db.service.js';
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
      const receta = await buscarRecetaPorIdCorto(id_corto_escaneado);

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
      const checkBlockchain = await ContractService.validarReceta(receta.commitment);

      if (!checkBlockchain.valido) {
        return res.status(200).json({
          valido: false,
          motivo: checkBlockchain.motivo || 'Error de validación en la blockchain',
        });
      }

      // 3. Derivar el nullifier real (derivePrescriptionNullifier del
      //    contrato compilado) y marcar como usada ANTES de responder, para
      //    que un segundo escaneo del mismo id_corto encuentre usada = true
      //    en la Regla B de arriba.
      if (!receta.prescription_nonce) {
        console.error(`❌ Receta ${id_corto_escaneado} no tiene prescription_nonce — no se puede derivar el nullifier`);
        return res.status(500).json({
          valido: false,
          motivo: 'Error interno: receta sin nonce registrado',
        });
      }
      const nullifier = ContractService.derivePrescriptionNullifier(
        receta.commitment,
        receta.prescription_nonce,
      );
      await marcarRecetaComoUsada(id_corto_escaneado, nullifier);

      // 4. Respuesta Exitosa (Sin datos del paciente ni del médico)
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
