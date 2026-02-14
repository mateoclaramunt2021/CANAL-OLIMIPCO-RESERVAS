# Sistema de Reservas - Canal Olímpico

## Descripción
Sistema completo para automatizar reservas en el restaurante Canal Olímpico, con WhatsApp, llamadas y panel interno.

## Stack
- Next.js 14 + TypeScript
- Tailwind + Shadcn UI
- Supabase (DB + Auth)
- Stripe (pagos)
- WhatsApp Cloud API
- BAPI Voice API
- Make (opcional)

## Instalación
1. Clona el repo
2. `npm install`
3. Copia `.env.example` a `.env.local` y llena las variables
4. Ejecuta el SQL en Supabase
5. `npm run dev`

## Variables de Entorno
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY
- SUPABASE_SERVICE_ROLE_KEY
- STRIPE_SECRET_KEY
- STRIPE_WEBHOOK_SECRET
- WHATSAPP_TOKEN
- WHATSAPP_PHONE_NUMBER_ID
- WHATSAPP_VERIFY_TOKEN
- BAPI_API_KEY
- BAPI_BASE_URL
- BAPI_WEBHOOK_SECRET
- MAKE_WEBHOOK_URL (opcional)

## Despliegue
- Vercel para frontend/backend
- Configura webhooks en Stripe/WhatsApp/BAPI apuntando a tus URLs de producción
- Usa cron en Vercel para `/api/jobs/run`

## Suposiciones
- Zona horaria: Europe/Madrid
- Precios fijos: infantil 14.5€, padres 38€, ticket bebida 3€
- Bloques de 2h empezando en :00

## Testing
`npm test`
