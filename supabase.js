/*
  ═══════════════════════════════════════════
  SUPABASE CONFIGURATION
  ═══════════════════════════════════════════

  INSTRUCCIONES:

  1. Crea una cuenta gratis en https://supabase.com (sin tarjeta)
  2. Crea un nuevo proyecto
  3. En el dashboard, ve a Project Settings → API
  4. Copia tu "Project URL" y "anon public key"
  5. Pega los valores abajo

  6. Crea la tabla products:
     - Ve a SQL Editor
     - Pega y ejecuta esto:

      CREATE TABLE products (
       id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
       name text NOT NULL,
       images jsonb[] NOT NULL DEFAULT '{}',
       category text DEFAULT '',
       in_stock boolean DEFAULT true,
       sort_order integer DEFAULT 0,
       created_at timestamptz DEFAULT now()
     );

     ALTER TABLE products ENABLE ROW LEVEL SECURITY;

     CREATE POLICY "Public read access" ON products
       FOR SELECT USING (true);

     CREATE POLICY "Admin write access" ON products
       FOR ALL USING (auth.role() = 'authenticated');

  7.  Si ya tienes datos con images como text[], migra así:
      - Ve a SQL Editor y ejecuta:

      ALTER TABLE products ADD COLUMN images_new jsonb[] DEFAULT '{}';

      UPDATE products SET images_new = (
        SELECT array_agg(jsonb_build_object('url', u, 'description', ''))
        FROM unnest(images) AS u
      );

      ALTER TABLE products DROP COLUMN images;

      ALTER TABLE products RENAME COLUMN images_new TO images;

  8.  Crea un bucket de storage:
     - Ve a Storage → Create a new bucket
     - Nombre: product-images
     - Marcar "Public bucket"

  9.  Políticas de seguridad para storage:
     - Ve a SQL Editor y ejecuta esto:

     CREATE POLICY "Public read storage" ON storage.objects
       FOR SELECT USING (bucket_id = 'product-images');

     CREATE POLICY "Admin upload storage" ON storage.objects
       FOR INSERT WITH CHECK (
       bucket_id = 'product-images' AND auth.role() = 'authenticated'
     );

     CREATE POLICY "Admin delete storage" ON storage.objects
       FOR DELETE USING (
         bucket_id = 'product-images' AND auth.role() = 'authenticated'
       );

  10. Crea un usuario admin:
      - Ve a Authentication → Users → Add User
      - Pon tu email y una contraseña

  ¡Listo! Tu catálogo está configurado.
*/

const SUPABASE_URL = 'https://ksjurgcuklxqatzzrjki.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtzanVyZ2N1a2x4cWF0enpyamtpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM0NDk1NTUsImV4cCI6MjA5OTAyNTU1NX0.zwLL8kLYdVwHhLQA6TPB8f4FSOSzNGRYDYOjaY535ho';

if (!SUPABASE_URL || SUPABASE_URL === 'https://tu-proyecto.supabase.co') {
  console.warn(
    '%c⚠️ Supabase no configurado',
    'font-size:16px;font-weight:bold;color:#c4813d;'
  );
  console.warn(
    'Edita supabase.js con tus credenciales de https://supabase.com'
  );
}

const { createClient } = supabase;
window.SUPABASE = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
