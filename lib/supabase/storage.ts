import { getSupabaseBrowserClient, SUPABASE_MEDIA_BUCKET } from "@/lib/supabase/client";

const ACCEPTED_IMAGE_TYPES = new Set(["image/jpeg", "image/png"]);
const MAX_IMAGE_SIZE_BYTES = 8 * 1024 * 1024;

function assertSupabaseClient() {
  const client = getSupabaseBrowserClient();

  if (!client) {
    throw new Error("Supabase no está configurado todavía en este entorno.");
  }

  return client;
}

function getFileExtension(file: File) {
  if (file.type === "image/png") return "png";
  return "jpg";
}

export function getPublicMediaUrl(path?: string) {
  if (!path) return null;

  const client = getSupabaseBrowserClient();
  if (!client) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!url) return null;

    const normalizedPath = path
      .split("/")
      .map((segment) => encodeURIComponent(segment))
      .join("/");

    return `${url}/storage/v1/object/public/${SUPABASE_MEDIA_BUCKET}/${normalizedPath}`;
  }

  const { data } = client.storage.from(SUPABASE_MEDIA_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

export async function uploadProjectCoverImage(file: File, projectId: string) {
  if (!ACCEPTED_IMAGE_TYPES.has(file.type)) {
    throw new Error("Solo se aceptan imágenes JPG o PNG para la portada.");
  }

  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    throw new Error("La portada excede el límite de 8 MB.");
  }

  const client = assertSupabaseClient();
  const extension = getFileExtension(file);
  const path = `projects/${projectId}/cover-${Date.now()}.${extension}`;

  const { error } = await client.storage
    .from(SUPABASE_MEDIA_BUCKET)
    .upload(path, file, {
      cacheControl: "3600",
      contentType: file.type,
      upsert: false,
    });

  if (error) {
    throw new Error(error.message);
  }

  return {
    path,
    publicUrl: getPublicMediaUrl(path),
  };
}

export async function uploadResourceImage(file: File, projectId: string) {
  if (!ACCEPTED_IMAGE_TYPES.has(file.type)) {
    throw new Error("Solo se aceptan imágenes JPG o PNG como recurso visual.");
  }

  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    throw new Error("La imagen excede el límite de 8 MB.");
  }

  const client = assertSupabaseClient();
  const extension = getFileExtension(file);
  const path = `projects/${projectId}/resources/${Date.now()}-${crypto.randomUUID()}.${extension}`;

  const { error } = await client.storage
    .from(SUPABASE_MEDIA_BUCKET)
    .upload(path, file, {
      cacheControl: "3600",
      contentType: file.type,
      upsert: false,
    });

  if (error) {
    throw new Error(error.message);
  }

  return {
    path,
    publicUrl: getPublicMediaUrl(path),
  };
}

export async function uploadChapterCoverImage(
  file: File,
  projectId: string,
  chapterId: string
) {
  if (!ACCEPTED_IMAGE_TYPES.has(file.type)) {
    throw new Error("Solo se aceptan imágenes JPG o PNG para la portada.");
  }

  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    throw new Error("La portada excede el límite de 8 MB.");
  }

  const client = assertSupabaseClient();
  const extension = getFileExtension(file);
  const path = `projects/${projectId}/chapters/${chapterId}/cover-${Date.now()}.${extension}`;

  const { error } = await client.storage
    .from(SUPABASE_MEDIA_BUCKET)
    .upload(path, file, {
      cacheControl: "3600",
      contentType: file.type,
      upsert: false,
    });

  if (error) {
    throw new Error(error.message);
  }

  return {
    path,
    publicUrl: getPublicMediaUrl(path),
  };
}

export async function uploadInlineEditorImage(
  file: File,
  projectId: string,
  chapterId: string
) {
  if (!ACCEPTED_IMAGE_TYPES.has(file.type)) {
    throw new Error("Solo se aceptan imágenes JPG o PNG dentro del editor.");
  }

  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    throw new Error("La imagen excede el límite de 8 MB.");
  }

  const client = assertSupabaseClient();
  const extension = getFileExtension(file);
  const path = `projects/${projectId}/chapters/${chapterId}/inline/${Date.now()}.${extension}`;

  const { error } = await client.storage
    .from(SUPABASE_MEDIA_BUCKET)
    .upload(path, file, {
      cacheControl: "3600",
      contentType: file.type,
      upsert: false,
    });

  if (error) {
    throw new Error(error.message);
  }

  const publicUrl = getPublicMediaUrl(path);
  if (!publicUrl) {
    throw new Error("No se pudo resolver la URL pública de la imagen subida.");
  }

  return {
    path,
    publicUrl,
  };
}

export async function removeMediaFile(path?: string) {
  if (!path) return;

  const client = assertSupabaseClient();
  const { error } = await client.storage.from(SUPABASE_MEDIA_BUCKET).remove([path]);

  if (error) {
    throw new Error(error.message);
  }
}
