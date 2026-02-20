-- ═══════════════════════════════════════════════════════════════════════════
-- Canal Olímpico — Employees, Shifts & Clock Records
-- Ejecutar en: https://supabase.com/dashboard/project/kqdwocgeqkufdqdpamqw/sql
-- ═══════════════════════════════════════════════════════════════════════════

-- 1) Tabla de empleados
CREATE TABLE IF NOT EXISTS employees (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name        TEXT NOT NULL,
  role        TEXT NOT NULL DEFAULT 'camarero',
  phone       TEXT,
  email       TEXT,
  pin         TEXT,                           -- PIN de 4 dígitos para fichar
  active      BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- 2) Tabla de turnos semanales
CREATE TABLE IF NOT EXISTS shifts (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id  UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  week_start   DATE NOT NULL,                -- Lunes de la semana (YYYY-MM-DD)
  day_of_week  INT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Lun, 6=Dom
  start_time   TIME NOT NULL,
  end_time     TIME NOT NULL,
  notes        TEXT,
  created_at   TIMESTAMPTZ DEFAULT now(),
  UNIQUE(employee_id, week_start, day_of_week)
);

-- 3) Tabla de fichajes (clock in/out)
CREATE TABLE IF NOT EXISTS clock_records (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id  UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  clock_in     TIMESTAMPTZ NOT NULL DEFAULT now(),
  clock_out    TIMESTAMPTZ,
  notes        TEXT,
  created_at   TIMESTAMPTZ DEFAULT now()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_shifts_employee   ON shifts(employee_id);
CREATE INDEX IF NOT EXISTS idx_shifts_week       ON shifts(week_start);
CREATE INDEX IF NOT EXISTS idx_clock_employee    ON clock_records(employee_id);
CREATE INDEX IF NOT EXISTS idx_clock_date        ON clock_records(clock_in);

-- RLS
ALTER TABLE employees     ENABLE ROW LEVEL SECURITY;
ALTER TABLE shifts        ENABLE ROW LEVEL SECURITY;
ALTER TABLE clock_records ENABLE ROW LEVEL SECURITY;

-- Policies: service_role bypasses RLS, authenticated users can read
CREATE POLICY "employees_read"      ON employees     FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "employees_admin"     ON employees     FOR ALL    USING (auth.role() = 'service_role');
CREATE POLICY "shifts_read"         ON shifts        FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "shifts_admin"        ON shifts        FOR ALL    USING (auth.role() = 'service_role');
CREATE POLICY "clock_records_read"  ON clock_records FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "clock_records_admin" ON clock_records FOR ALL    USING (auth.role() = 'service_role');

-- Habilitar Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE employees;
ALTER PUBLICATION supabase_realtime ADD TABLE shifts;
ALTER PUBLICATION supabase_realtime ADD TABLE clock_records;
