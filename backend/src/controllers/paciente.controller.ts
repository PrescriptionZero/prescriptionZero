import { Request, Response } from 'express';
import { QrService } from '../services/qr.service.js';
import { GenerarQrBody, GenerarQrResponse } from '../types/index.js';

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
}