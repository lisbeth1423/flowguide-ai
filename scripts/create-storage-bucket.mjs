// Script de un solo uso: crea el bucket privado de Supabase Storage donde se guardan
// los PDFs y capturas de pantalla que suben los admins al crear una guía.
// Se corre una sola vez (o cada vez que se recrea el proyecto de Supabase desde cero).
// Uso: node scripts/create-storage-bucket.mjs
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en el entorno.");
  process.exit(1);
}

const supabase = createClient(url, serviceKey);

const BUCKET = "knowledge-files";

const { data: existing } = await supabase.storage.getBucket(BUCKET);
if (existing) {
  console.log(`El bucket "${BUCKET}" ya existe, no hace falta crearlo de nuevo.`);
  process.exit(0);
}

const { error } = await supabase.storage.createBucket(BUCKET, {
  public: false,
  fileSizeLimit: "20MB",
  allowedMimeTypes: ["application/pdf", "image/png", "image/jpeg", "image/webp"],
});

if (error) {
  console.error("Error creando el bucket:", error.message);
  process.exit(1);
}

console.log(`Bucket "${BUCKET}" creado correctamente (privado, PDFs e imágenes, hasta 20MB).`);
