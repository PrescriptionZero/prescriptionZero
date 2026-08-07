import { Router } from 'express';
import { PacienteController } from '../controllers/paciente.controller.js';

const router = Router();

router.get('/mis-recetas', PacienteController.misRecetas);
router.post('/ver-receta/:id_corto', PacienteController.verReceta);
router.post('/generar-qr', PacienteController.generarQr);

export default router;
