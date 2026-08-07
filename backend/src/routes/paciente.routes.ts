import { Router } from 'express';
import { PacienteController } from '../controllers/paciente.controller.js';

const router = Router();

// POST /api/paciente/generar-qr
router.post('/generar-qr', PacienteController.generarQr);

export default router;