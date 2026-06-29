import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import { Platform } from "react-native";
import { clearPhotoFiles, getPhotoFile, registerPhotoFile } from "./photoFileCache";
import { supabase } from "./supabase";

const BUCKET = "sighting-photos";

// Photos land in a PUBLIC bucket, so strip EXIF (which can include the exact GPS
// coordinates where the photo was taken) before upload. Re-encoding the image
// drops all metadata. Native only — the web path uploads a File the browser
// already produced; manipulate() there expects file/data URIs.
async function stripImageMetadata(
  uri: string,
  contentType: string,
): Promise<{ uri: string; contentType: string }> {
  if (Platform.OS === "web") return { uri, contentType };

  try {
    const format =
      contentType === "image/png" ? SaveFormat.PNG : SaveFormat.JPEG;
    const rendered = await ImageManipulator.manipulate(uri).renderAsync();
    const result = await rendered.saveAsync({ compress: 0.9, format });
    return {
      uri: result.uri,
      contentType: format === SaveFormat.PNG ? "image/png" : "image/jpeg",
    };
  } catch (error) {
    console.warn("EXIF strip failed; uploading original:", error);
    return { uri, contentType };
  }
}

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
    const safe = await stripImageMetadata(uris[i], inferMimeType(uris[i], ""));
    const resolved = await resolvePhotoBlob(safe.uri);
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
