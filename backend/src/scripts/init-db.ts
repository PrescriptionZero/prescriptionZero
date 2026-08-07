import { pool } from '../config/db.js';

async function initDb() {
  console.log('🚀 Iniciando configuración de la Base de Datos...');

  try {
    // 1. Crear extensión para UUIDs
    await pool.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`);

    // 2. Crear Enum para Roles
    await pool.query(`
      DO $$ BEGIN
        CREATE TYPE rol_usuario AS ENUM ('medico', 'paciente', 'farmacia');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // 3. Crear Tabla: usuarios_prueba
    await pool.query(`
      CREATE TABLE IF NOT EXISTS usuarios_prueba (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        nombre VARCHAR(100) NOT NULL,
        rol rol_usuario NOT NULL,
        matricula VARCHAR(50) NULL,
        pais VARCHAR(50) NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 4. Crear Tabla: medicamentos_controlados
    await pool.query(`
      CREATE TABLE IF NOT EXISTS medicamentos_controlados (
        codigo VARCHAR(20) PRIMARY KEY,
        nombre VARCHAR(100) NOT NULL,
        requiere_receta BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 5. Crear Tabla: recetas
    await pool.query(`
      CREATE TABLE IF NOT EXISTS recetas (
        id_corto VARCHAR(20) PRIMARY KEY,
        commitment_hash TEXT NOT NULL,
        codigo_medicamento VARCHAR(20) NOT NULL REFERENCES medicamentos_controlados(codigo),
        fecha_vigencia DATE NOT NULL,
        medico_id UUID NOT NULL REFERENCES usuarios_prueba(id),
        usada BOOLEAN NOT NULL DEFAULT false,
        nullifier TEXT NULL UNIQUE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 6. Crear Índices
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_recetas_medico ON recetas(medico_id);
      CREATE INDEX IF NOT EXISTS idx_recetas_usada ON recetas(usada);
    `);

    console.log('✅ Tablas e índices creados con éxito.');

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