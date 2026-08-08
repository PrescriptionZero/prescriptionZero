import { Request, Response } from 'express';
import { listarMedicamentos } from '../services/db.service.js';
import { MedicamentosResponse } from '../types/index.js';

export class MedicamentosController {
  static async listar(_req: Request, res: Response<MedicamentosResponse | { error: string }>) {
    try {
      const medicamentos = await listarMedicamentos();
      const response: MedicamentosResponse = medicamentos.map((m) => ({
        codigo: m.codigo,
        nombre: m.nombre,
      }));
      return res.status(200).json(response);
    } catch (error) {
      console.error('❌ Error en MedicamentosController.listar:', error);
      return res.status(500).json({ error: 'Error al listar los medicamentos' });
    }
  }
}
