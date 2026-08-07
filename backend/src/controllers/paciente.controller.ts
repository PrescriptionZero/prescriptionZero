import { Request, Response } from 'express';
import { QrService } from '../services/qr.service.js';
import { buscarRecetaPorIdCortoConWallet, listarRecetasPorWallet } from '../services/db.service.js';
import { ContractService } from '../services/contract.service.js';
import {
  GenerarQrBody,
  GenerarQrResponse,
  MisRecetasResponse,
  VerRecetaRequest,
  VerRecetaResponse,
} from '../types/index.js';

export class PacienteController {
  static async generarQr(
    req: Request<{}, {}, GenerarQrBody>,
    res: Response<GenerarQrResponse | { error: string }>
  ) {
    try {
      const { id_corto } = req.body;

      if (!id_corto) {
        return res.status(400).json({ error: 'El parámetro id_corto es requerido' });
      }

      // Generación del DataURL de la imagen del QR
      const qr_data_url = await QrService.generarDataUrl(id_corto);

      return res.status(200).json({ qr_data_url });
    } catch (error) {
      console.error(' Error en PacienteController.generarQr:', error);
      return res.status(500).json({ error: 'Error al procesar la generación del QR' });
    }
  }

  static async misRecetas(
    req: Request<{}, {}, {}, { wallet?: string }>,
    res: Response<MisRecetasResponse | { error: string }>
  ) {
    try {
      const { wallet } = req.query;

      if (!wallet) {
        return res.status(400).json({ error: 'El query param wallet es requerido' });
      }

      const recetas = await listarRecetasPorWallet(wallet);
      const response: MisRecetasResponse = recetas.map((receta) => ({
        id_corto: receta.id_corto,
        drugCode: receta.codigo_medicamento,
        expiryDate: receta.fecha_vigencia,
      }));

      return res.status(200).json(response);
    } catch (error) {
      console.error('❌ Error en PacienteController.misRecetas:', error);
      return res.status(500).json({ error: 'Error al listar las recetas' });
    }
  }

  static async verReceta(
    req: Request<{ id_corto: string }, {}, VerRecetaRequest>,
    res: Response<VerRecetaResponse | { error: string }>
  ) {
    try {
      const { id_corto } = req.params;
      const { walletAddress, proof } = req.body;

      if (!walletAddress || !proof) {
        return res.status(400).json({ error: 'Faltan campos requeridos: walletAddress, proof' });
      }

      const receta = await buscarRecetaPorIdCortoConWallet(id_corto);

      if (!receta) {
        return res.status(404).json({ error: 'Receta no encontrada' });
      }

      if (receta.patient_wallet_address !== walletAddress) {
        return res.status(403).json({ error: 'Unauthorized' });
      }

      // Verifica el proof ZK de propiedad contra el commitment guardado
      const proofValido = await ContractService.verificarProofPropiedad(receta.commitment, proof);

      if (!proofValido) {
        return res.status(403).json({ error: 'Unauthorized' });
      }

      return res.status(200).json({
        drugCode: receta.codigo_medicamento,
        expiryDate: receta.fecha_vigencia,
      });
    } catch (error) {
      console.error('❌ Error en PacienteController.verReceta:', error);
      return res.status(500).json({ error: 'Error al verificar la receta' });
    }
  }
}
