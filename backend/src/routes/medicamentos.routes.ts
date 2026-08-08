import { Router } from 'express';
import { MedicamentosController } from '../controllers/medicamentos.controller.js';

const router = Router();

// GET /api/medicamentos
router.get('/', MedicamentosController.listar);

export default router;
