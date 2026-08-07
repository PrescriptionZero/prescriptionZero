-- 1. Habilitar extensión para UUIDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Crear tipo enumerado para los roles del sistema
DO $$ BEGIN
    CREATE TYPE rol_usuario AS ENUM ('medico', 'paciente', 'farmacia');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 3. Tabla: usuarios_prueba
-- Almacena los usuarios para el selector/login simulado
CREATE TABLE IF NOT EXISTS usuarios_prueba (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre VARCHAR(100) NOT NULL,
    rol rol_usuario NOT NULL,
    matricula VARCHAR(50) NULL, -- Exclusivo para médicos
    pais VARCHAR(50) NULL,       -- Exclusivo para farmacias
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Tabla: medicamentos_controlados
-- Catálogo público de medicamentos
CREATE TABLE IF NOT EXISTS medicamentos_controlados (
    codigo VARCHAR(20) PRIMARY KEY, -- Ej: 'IBU400', 'AMX500'
    nombre VARCHAR(100) NOT NULL,
    requiere_receta BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Tabla: recetas
-- Metadata pública / no sensible de la receta (el diagnóstico e identidad del paciente NUNCA van acá)
CREATE TABLE IF NOT EXISTS recetas (
    id_corto VARCHAR(20) PRIMARY KEY, -- El que se codifica en el QR (ej: "receta_a8f3")
    commitment_hash TEXT NOT NULL,    -- Hash que se registra en el contrato Compact (tipo TS: `commitment`, mapear en la query)
    codigo_medicamento VARCHAR(20) NOT NULL REFERENCES medicamentos_controlados(codigo),
    fecha_vigencia DATE NOT NULL,
    medico_id UUID NOT NULL REFERENCES usuarios_prueba(id),
    usada BOOLEAN NOT NULL DEFAULT false,
    nullifier TEXT NULL UNIQUE,        -- Se completa al canjear en la blockchain
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    patient_wallet_address TEXT NOT NULL -- Wallet Lace del paciente (Holder Commitment); reemplaza login simulado
);

-- 5.1 Migración — Holder Commitment con Lace
-- Para bases ya creadas antes de este cambio (CREATE TABLE de arriba no las toca por el IF NOT EXISTS).
ALTER TABLE recetas
    ADD COLUMN IF NOT EXISTS patient_wallet_address TEXT NOT NULL;

-- 6. Índices para consultas rápidas del backend
CREATE INDEX IF NOT EXISTS idx_recetas_medico ON recetas(medico_id);
CREATE INDEX IF NOT EXISTS idx_recetas_usada ON recetas(usada);