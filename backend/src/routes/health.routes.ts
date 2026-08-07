import { Router, Request, Response } from 'express';
import { pool } from '../config/db.js';

const router = Router();

// GET /api/health
router.get('/', async (_req: Request, res: Response) => {
  try {
    // Consulta rápida para verificar que Postgres responde
    await pool.query('SELECT 1');

    return res.status(200).json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      database: 'connected',
    });
  } catch (error) {
    console.error('❌ Healthcheck error - Fallo en base de datos:', error);
    return res.status(500).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      database: 'disconnected',
      message: 'No se pudo conectar con la base de datos',
    });
  }
});

export default router;