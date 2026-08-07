import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pool } from '../config/db.js';

// Relativo a process.cwd(): igual que env.ts (dotenv.config()), asume que el
// script se corre desde backend/ (ej. `npm run db:init`).
const schemaPath = join(process.cwd(), 'db/schema.sql');

async function initDb() {
  console.log('🚀 Iniciando configuración de la Base de Datos...');

  try {
    // 1-6. Extensión, enum, tablas, migraciones e índices — leídos directo de schema.sql
    const schemaSql = readFileSync(schemaPath, 'utf-8');
    await pool.query(schemaSql);
    console.log('✅ Tablas e índices creados con éxito (desde schema.sql).');

    // 7. Insertar Datos Semilla (Seeders)
    console.log('🌱 Insertando datos iniciales...');

    // Limpiar o insertar usuarios de prueba de forma idempotente
    await pool.query(`
      INSERT INTO usuarios_prueba (id, nombre, rol, matricula, pais) VALUES
        ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Dr. García (Argentina)', 'medico', 'MP-45892', NULL),
        ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'Dra. Fernández (Brasil)', 'medico', 'MP-98123', NULL),
        ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33', 'Juan Pérez (Viajero)', 'paciente', NULL, NULL),
        ('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a44', 'Farmacia San Martín (Palermo, AR)', 'farmacia', NULL, 'Argentina'),
        ('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a55', 'Farmacia Cruz Verde (Madrid, ES)', 'farmacia', NULL, 'España')
      ON CONFLICT (id) DO NOTHING;
    `);

    // Insertar catálogo de medicamentos
    await pool.query(`
      INSERT INTO medicamentos_controlados (codigo, nombre, requiere_receta) VALUES
        ('IBU400', 'Ibuprofeno 400mg', false),
        ('IBU600', 'Ibuprofeno 600mg', true),
        ('AMX500', 'Amoxicilina 500mg (Antibiótico)', true),
        ('PAR500', 'Paracetamol 500mg', false),
        ('CLO05',  'Clonazepam 0.5mg', true),
        ('AZI500', 'Azitromicina 500mg', true)
      ON CONFLICT (codigo) DO NOTHING;
    `);

    console.log('✅ Datos semilla cargados correctamente.');

  } catch (error) {
    console.error('❌ Error al inicializar la base de datos:', error);
  } finally {
    await pool.end();
    console.log('🔌 Conexión a PostgreSQL cerrada.');
  }
}

initDb();
