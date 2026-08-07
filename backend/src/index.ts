import express from 'express';
import farmaciaRoutes from './routes/farmacia.routes.js';
import healthRoutes from './routes/health.routes.js';

const app = express();

// Middleware para entender JSON en las peticiones
app.use(express.json());

// Registramos las rutas de salud
app.use('/api/health', healthRoutes);

// Registramos las rutas de la farmacia
app.use('/api/farmacia', farmaciaRoutes);

const PORT = Number(process.env.PORT) || 3001;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Servidor backend escuchando en http://localhost:${PORT}`);
});