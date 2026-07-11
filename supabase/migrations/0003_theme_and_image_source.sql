-- FlowGuide — tema visual por empresa + nuevo tipo de fuente de conocimiento "image".
--
-- theme: guarda los colores de marca de ESA empresa cliente en particular (para cuando
-- un partner quiera que la app se vea con los colores de su cliente). Si es null, la
-- app usa la paleta default de FlowGuide (ver src/app/globals.css). La forma esperada
-- del JSON es: {"primary": "#17324D", "accent": "#18A999", "accentSoft": "#DDF7F3",
-- "background": "#F7F9FB", "text": "#1F2933", "mutedText": "#64748B"} — todos los
-- campos son opcionales, los que falten usan el default.
alter table client_companies
  add column theme jsonb;

-- "image": para cuando un admin sube una captura de pantalla suelta (no extraída de
-- un PDF) como referencia adicional al generar una guía. Claude la puede "ver"
-- directamente (es una IA multimodal), no hace falta describirla en texto.
alter table knowledge_sources
  drop constraint knowledge_sources_type_check,
  add constraint knowledge_sources_type_check
    check (type in ('text', 'url', 'document', 'image', 'video'));

-- Dónde vive el archivo subido (PDF o imagen) en Supabase Storage, cuando aplica.
-- Para type='text' o 'url' generado automáticamente, queda en null.
alter table knowledge_sources
  add column storage_path text;
