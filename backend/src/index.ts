import cors from 'cors';
import express from 'express';
import { env } from './config/env.js';
import farmaciaRoutes from './routes/farmacia.routes.js';
import healthRoutes from './routes/health.routes.js';
import medicoRoutes from './routes/medico.routes.js';
import pacienteRoutes from './routes/paciente.routes.js';

const app = express();

app.use(cors());

// Middleware para entender JSON en las peticiones
app.use(express.json());

// Registramos las rutas de salud
app.use('/api/health', healthRoutes);

// Registramos las rutas del médico
app.use('/api/medico', medicoRoutes);

// Registramos las rutas del paciente
app.use('/api/paciente', pacienteRoutes);

// Registramos las rutas de la farmacia
app.use('/api/farmacia', farmaciaRoutes);

const PORT = Number(env.PORT);

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Servidor backend escuchando en http://localhost:${PORT}`);
});