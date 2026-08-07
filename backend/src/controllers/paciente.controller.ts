import type { Request, Response } from 'express';
import { buscarRecetaPorIdCorto } from '../services/db.service.js';
import type { GenerarQrBody, GenerarQrResponse, RecetaPacienteResponse } from '../types/index.js';

export async function obtenerRecetaController(req: Request, res: Response): Promise<void> {
  const { id_corto } = req.params;

  try {
    const receta = await buscarRecetaPorIdCorto(id_corto);

    if (!receta) {
      res.status(404).json({ mensaje: 'Receta no encontrada' });
      return;
    }

    const response: RecetaPacienteResponse = {
      id_corto: receta.id_corto,
      codigo_medicamento: receta.codigo_medicamento,
      fecha_vigencia: receta.fecha_vigencia,
      usada: receta.usada,
    };
    res.status(200).json(response);
  } catch (error) {
    console.error('Error al buscar receta:', error);
    res.status(500).json({ mensaje: 'Error al buscar la receta' });
  }
}

export async function generarQrController(req: Request, res: Response): Promise<void> {
  const { id_corto } = req.body as GenerarQrBody;

  if (!id_corto) {
    res.status(400).json({ mensaje: 'Falta id_corto' });
    return;
  }

  // TODO: usar qr.service.ts cuando Dev-BE-2 lo suba (generar el dataURL real con la librería qrcode)
  // Respuesta simulada temporal: el id_corto sin la imagen QR real todavía.
  const response: GenerarQrResponse & { id_corto: string } = {
    id_corto,
    qr_data_url: '',
  };
  res.status(200).json(response);
}
