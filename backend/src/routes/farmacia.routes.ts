import { Router } from 'express';
import { FarmaciaController } from '../controllers/farmacia.controller.js';

const router = Router();

// POST /api/farmacia/validar
router.post('/validar', FarmaciaController.validarReceta);

export default router;