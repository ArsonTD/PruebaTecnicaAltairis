-- ============================================================
-- Altairis Backoffice — Paso 1: Crear usuario y base de datos
-- Ejecutar como superusuario (postgres) en la DB "postgres"
-- ============================================================

-- Crear el rol si no existe
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM pg_catalog.pg_roles WHERE rolname = 'altairis'
    ) THEN
        CREATE ROLE altairis LOGIN PASSWORD 'altairis';
    END IF;
END
$$;

-- Crear la base de datos
CREATE DATABASE altairis
    OWNER = altairis
    ENCODING = 'UTF8'
    LC_COLLATE = 'en_US.UTF-8'
    LC_CTYPE = 'en_US.UTF-8'
    TEMPLATE = template0;

-- Comentario de la base de datos
COMMENT ON DATABASE altairis IS 'Altairis Backoffice — Hotel Distribution MVP';
