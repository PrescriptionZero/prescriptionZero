import { Router } from 'express';
import { crearRecetaController } from '../controllers/medico.controller.js';

const router = Router();

// Se espera montado en index.ts como: app.use('/api/medico', router)
router.post('/recetas', crearRecetaController);

export default router;
