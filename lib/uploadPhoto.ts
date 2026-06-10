import { clearPhotoFiles, getPhotoFile, registerPhotoFile } from "./photoFileCache";
import { supabase } from "./supabase";

const BUCKET = "sighting-photos";

function extensionForMime(contentType: string): string {
  switch (contentType) {
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    case "image/heic":
      return "heic";
    case "image/heif":
      return "heif";
    case "image/gif":
      return "gif";
    default:
      return "jpg";
  }
}

function inferMimeType(uri: string, blobType: string): string {
  if (blobType.startsWith("image/")) return blobType;

  const lower = uri.toLowerCase();
  if (lower.includes(".png")) return "image/png";
  if (lower.includes(".webp")) return "image/webp";
  if (lower.includes(".heic")) return "image/heic";
  if (lower.includes(".heif")) return "image/heif";
  if (lower.includes(".gif")) return "image/gif";
  return "image/jpeg";
}

async function resolvePhotoBlob(
  uri: string,
): Promise<{ blob: Blob; contentType: string } | null> {
  const cached = getPhotoFile(uri);
  if (cached && cached.size > 0) {
    const contentType = inferMimeType(uri, cached.type || "");
    return { blob: cached, contentType };
  }

  try {
    const response = await fetch(uri);
    if (!response.ok) return null;

    const blob = await response.blob();
    if (!blob.size) return null;

    const contentType = inferMimeType(uri, blob.type || "");
    return { blob, contentType };
  } catch {
    return null;
  }
}

export async function cachePhotoAsset(
  uri: string,
  file?: File | null,
): Promise<void> {
  if (file && file.size > 0) {
    registerPhotoFile(uri, file);
    return;
  }

  const response = await fetch(uri);
  if (!response.ok) return;

  const blob = await response.blob();
  if (!blob.size) return;

  const contentType = inferMimeType(uri, blob.type || "");
  registerPhotoFile(
    uri,
    new File([blob], `photo.${extensionForMime(contentType)}`, {
      type: contentType,
    }),
  );
}

export async function uploadPhotos(
  uris: string[],
  userId: string,
): Promise<{ urls: string[]; error: string | null }> {
  const urls: string[] = [];
  const timestamp = Date.now();

  for (let i = 0; i < uris.length; i++) {
    const resolved = await resolvePhotoBlob(uris[i]);
    if (!resolved) {
      return {
        urls: [],
        error: `Could not read photo ${i + 1}. Please re-attach it and try again.`,
      };
    }

    const { blob, contentType } = resolved;
    const ext = extensionForMime(contentType);
    const path = `${userId}/${timestamp}-${i}.${ext}`;

    const { error } = await supabase.storage.from(BUCKET).upload(path, blob, {
      contentType,
      upsert: true,
      cacheControl: "3600",
    });

    if (error) {
      return {
        urls: [],
        error:
          error.message ||
          "Photo upload failed. Check that the sighting-photos storage bucket exists and allows uploads.",
      };
    }

    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
    urls.push(data.publicUrl);
  }

  clearPhotoFiles(uris);
  return { urls, error: null };
}
