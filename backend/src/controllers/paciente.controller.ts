import type { Request, Response } from 'express';
import { buscarRecetaPorIdCortoConWallet, listarRecetasPorWallet } from '../services/db.service.js';
import type {
  GenerarQrBody,
  GenerarQrResponse,
  MisRecetasResponse,
  VerRecetaRequest,
  VerRecetaResponse,
} from '../types/index.js';

export async function misRecetasController(req: Request, res: Response): Promise<void> {
  const wallet = req.query.wallet;

  if (!wallet || typeof wallet !== 'string') {
    res.status(400).json({ mensaje: 'Falta el query param wallet' });
    return;
  }

  try {
    const recetas = await listarRecetasPorWallet(wallet);
    const response: MisRecetasResponse = recetas.map((receta) => ({
      id_corto: receta.id_corto,
      drugCode: receta.codigo_medicamento,
      expiryDate: receta.fecha_vigencia,
    }));
    res.status(200).json(response);
  } catch (error) {
    console.error('❌ Error al listar recetas por wallet:', error);
    res.status(500).json({ mensaje: 'Error al listar las recetas' });
  }
}

export async function verRecetaController(req: Request, res: Response): Promise<void> {
  const { id_corto } = req.params;
  const { walletAddress, proof } = req.body as VerRecetaRequest;

  if (!walletAddress || !proof) {
    res.status(400).json({ mensaje: 'Faltan campos requeridos: walletAddress, proof' });
    return;
  }

  try {
    const receta = await buscarRecetaPorIdCortoConWallet(id_corto);

    if (!receta) {
      res.status(404).json({ mensaje: 'Receta no encontrada' });
      return;
    }

    if (receta.patient_wallet_address !== walletAddress) {
      res.status(403).json({ error: 'Unauthorized' });
      return;
    }

    // TODO: usar contract.service.verificarProofPropiedad(receta.commitment, proof) cuando Dev-BE-2 lo suba
    const proofValido = true;

    if (!proofValido) {
      res.status(403).json({ error: 'Unauthorized' });
      return;
    }

    const response: VerRecetaResponse = {
      drugCode: receta.codigo_medicamento,
      expiryDate: receta.fecha_vigencia,
    };
    res.status(200).json(response);
  } catch (error) {
    console.error('❌ Error al verificar receta:', error);
    res.status(500).json({ mensaje: 'Error al verificar la receta' });
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
