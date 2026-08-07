import { Router } from 'express';
import { generarQrController, obtenerRecetaController } from '../controllers/paciente.controller.js';

const router = Router();

// Se espera montado en index.ts como: app.use('/api/paciente', router)
router.get('/recetas/:id_corto', obtenerRecetaController);
router.post('/generar-qr', generarQrController);

export default router;
