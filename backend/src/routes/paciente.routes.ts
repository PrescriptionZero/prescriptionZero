import { Router } from 'express';
import { PacienteController } from '../controllers/paciente.controller.js';

const router = Router();

// POST /api/paciente/generar-qr
router.post('/generar-qr', PacienteController.generarQr);

export default router;
import {
  generarQrController,
  misRecetasController,
  verRecetaController,
} from '../controllers/paciente.controller.js';

const router = Router();

// Se espera montado en index.ts como: app.use('/api/paciente', router)
router.get('/mis-recetas', misRecetasController);
router.post('/ver-receta/:id_corto', verRecetaController);
router.post('/generar-qr', generarQrController);

export default router;
