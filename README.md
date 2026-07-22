# Jersey Store SC — Catálogo de Camisetas Deportivas

Catálogo web estático para mostrar y vender camisetas deportivas. Construido con HTML, CSS y JavaScript vanilla, con Supabase como backend (base de datos, storage y autenticación).

## Stack

| Capa | Tecnología |
|---|---|
| Frontend | HTML5, CSS3, JavaScript (ES6+) |
| Backend | Supabase (PostgreSQL + Storage + Auth) |
| Storage | Supabase Storage (bucket `product-images`) |
| Auth | Supabase Auth (email/contraseña) |
| Fuentes | DM Sans + DM Serif Display (Google Fonts) |

## Estructura

```
├── index.html       # Catálogo público
├── public.js        # Lógica del catálogo (grid + lightbox + búsqueda)
├── admin.html       # Panel de administración
├── admin.js         # CRUD + auth + drag & drop
├── supabase.js      # Configuración del cliente Supabase
├── style.css        # Todos los estilos
└── README.md
```

## Funcionalidades

### Público
- Grid de productos con imágenes, nombres, tallas y stock
- Búsqueda por nombre
- Filtros por categoría
- Lightbox con navegación entre imágenes
- Descripción superpuesta en cada imagen del lightbox
- Botón flotante y enlace a WhatsApp para consultas

### Admin
- Login con email/contraseña (Supabase Auth)
- Añadir productos con imágenes y descripciones por imagen
- Editar productos (nombre, categoría, tallas, stock, imágenes)
- Reordenar imágenes por drag & drop
- Reordenar productos por drag & drop
- Eliminar productos (con borrado de imágenes del storage)

## Configuración

### 1. Supabase

1. Crea un proyecto en [supabase.com](https://supabase.com)
2. Ve a *Project Settings → API* y copia tu **Project URL** y **anon public key**
3. Pégalos en `supabase.js`

### 2. Base de datos

En el SQL Editor de Supabase, ejecuta:

```sql
CREATE TABLE products (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  images jsonb[] NOT NULL DEFAULT '{}',
  category text DEFAULT '',
  sizes text[] DEFAULT '{}',
  in_stock boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read access" ON products
  FOR SELECT USING (true);

CREATE POLICY "Admin write access" ON products
  FOR ALL USING (auth.role() = 'authenticated');
```

### 3. Storage

Crea un bucket público llamado `product-images` desde el dashboard de Supabase. Luego ejecuta las políticas:

```sql
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
```

### 4. Auth

Crea un usuario admin en *Authentication → Users → Add User*.

### 5. Migración (si ya tenías datos)

Si ya tenías productos con el formato anterior (`text[]`), migra las imágenes:

```sql
ALTER TABLE products ADD COLUMN images_new jsonb[] DEFAULT '{}';

UPDATE products SET images_new = (
  SELECT array_agg(jsonb_build_object('url', u, 'description', ''))
  FROM unnest(images) AS u
);

ALTER TABLE products DROP COLUMN images;

ALTER TABLE products RENAME COLUMN images_new TO images;
```

## Desarrollo

No requiere build steps ni bundlers. Abre los archivos directamente en el navegador:

```bash
# Servir localmente (opcional)
python3 -m http.server 8000
# Abrir http://localhost:8000
```

## Despliegue

Sube los archivos a cualquier hosting estático: Netlify, Vercel, Cloudflare Pages, etc. No necesita servidor.
