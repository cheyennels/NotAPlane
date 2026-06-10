const cache = new Map<string, Blob>();

export function registerPhotoFile(uri: string, file: Blob) {
  cache.set(uri, file);
}

export function getPhotoFile(uri: string): Blob | undefined {
  return cache.get(uri);
}

export function clearPhotoFiles(uris: string[]) {
  for (const uri of uris) cache.delete(uri);
}
