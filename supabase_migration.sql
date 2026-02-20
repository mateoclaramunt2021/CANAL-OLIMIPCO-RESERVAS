-- ═══════════════════════════════════════════════════════════════════════════════
-- CANAL OLÍMPICO — Database Migration (OPCIONAL — mejoras)
-- ═══════════════════════════════════════════════════════════════════════════════
--
-- El código ya funciona con el esquema actual de la BD.
-- Esta migración AÑADE columnas y tablas extra para habilitar más features.
--
-- CÓMO EJECUTAR:
-- 1. Abre https://supabase.com/dashboard/project/kqdwocgeqkufdqdpamqw/sql
-- 2. Pega TODO este archivo
-- 3. Haz clic en "Run"
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─── 1. RESERVATIONS: columnas extra ────────────────────────────────────────

ALTER TABLE public.reservations
  ADD COLUMN IF NOT EXISTS drink_tickets integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cake_choice text,
  ADD COLUMN IF NOT EXISTS deposit_paid boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS deposit_paid_at timestamptz;

-- Marcar como pagadas las reservas ya confirmadas con stripe
UPDATE public.reservations
SET deposit_paid = true
WHERE status = 'CONFIRMED' AND stripe_session_id IS NOT NULL AND deposit_paid = false;

-- ─── 2. CALL_LOGS: columnas extra ──────────────────────────────────────────

ALTER TABLE public.call_logs
  ADD COLUMN IF NOT EXISTS provider text DEFAULT 'vapi',
  ADD COLUMN IF NOT EXISTS phone_number text,
  ADD COLUMN IF NOT EXISTS cost numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'completed',
  ADD COLUMN IF NOT EXISTS raw_payload jsonb;

-- ─── 3. MESSAGES: canal de comunicación ─────────────────────────────────────

ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS channel text DEFAULT 'whatsapp';

-- ─── 4. TABLA: menu_catalog ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.menu_catalog (
  code text PRIMARY KEY,
  name text NOT NULL,
  description text,
  price_per_person numeric NOT NULL,
  drinks text,
  event_types text[] NOT NULL DEFAULT '{}',
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

INSERT INTO public.menu_catalog (code, name, price_per_person, drinks, event_types) VALUES
  ('menu_grupo_34', 'Menú Grupo Premium', 34, '1 bebida + agua + café', '{GRUPO_SENTADO,NOCTURNA_EXCLUSIVA}'),
  ('menu_grupo_29', 'Menú Grupo', 29, '1 bebida + agua', '{GRUPO_SENTADO,NOCTURNA_EXCLUSIVA}'),
  ('menu_infantil', 'Menú Infantil', 14.50, '1 refresco/zumo/agua', '{INFANTIL_CUMPLE}'),
  ('menu_pica_34', 'Pica-Pica Premium', 34, '2 bebidas', '{GRUPO_PICA_PICA,NOCTURNA_EXCLUSIVA}'),
  ('menu_pica_30', 'Pica-Pica', 30, '2 bebidas', '{GRUPO_PICA_PICA,NOCTURNA_EXCLUSIVA}'),
  ('menu_padres_38', 'Menú Padres/Adultos', 38, '1 bebida + agua + café', '{INFANTIL_CUMPLE}')
ON CONFLICT (code) DO NOTHING;

-- ─── 5. ÍNDICES ─────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_res_fecha_status ON public.reservations (fecha, status);
CREATE INDEX IF NOT EXISTS idx_res_phone ON public.reservations (customer_phone);
CREATE INDEX IF NOT EXISTS idx_res_deadline ON public.reservations (payment_deadline) WHERE status = 'HOLD_BLOCKED';
CREATE INDEX IF NOT EXISTS idx_msg_reservation ON public.messages (reservation_id, created_at);
CREATE INDEX IF NOT EXISTS idx_calls_created ON public.call_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pay_reservation ON public.payments (reservation_id);

-- ─── 6. RLS ─────────────────────────────────────────────────────────────────

ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.call_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_catalog ENABLE ROW LEVEL SECURITY;

-- Menu catalog público
CREATE POLICY IF NOT EXISTS "anon_read_menu" ON public.menu_catalog
  FOR SELECT TO anon USING (true);

-- ─── 7. Realtime ────────────────────────────────────────────────────────────

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.reservations;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.call_logs;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- ¡Hecho! Recarga el dashboard para verificar.
-- ═══════════════════════════════════════════════════════════════════════════════
