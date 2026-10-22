import { createId } from './id';
import { supabase } from './supabaseClient';
import type { Memory } from './types';

const TABLE = 'memories';
const PHOTO_BUCKET = 'memory-photos';
const SIGNED_URL_LIFETIME_SECONDS = 60 * 60 * 24;

/** A row of the `memories` table. */
interface MemoryRow {
  id: string;
  text: string | null;
  image: string[] | null;
  created_at: string;
}

export interface SaveMemoryInput {
  userId: string;
  text: string;
  /** Existing photos (signed URLs) and newly added ones (data URLs), in display order. */
  photos: string[];
  /** The memory being edited. Omit to create a new one. */
  existing?: Memory;
  /** New moment time in ms. Only sent when the user changed it. */
  createdAt?: number;
}

/** Loads the signed-in user's memories, newest first, with signed photo URLs. */
export async function fetchMemories(): Promise<Memory[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;

  const rows = (data ?? []) as MemoryRow[];
  const urlByPath = await signPhotoPaths(rows.flatMap((row) => row.image ?? []));

  return rows.map((row) => {
    const photoPaths = (row.image ?? []).filter((path) => urlByPath.has(path));
    return {
      id: row.id,
      text: row.text ?? '',
      createdAt: Date.parse(row.created_at),
      photoPaths,
      photoUrls: photoPaths.map((path) => urlByPath.get(path) as string),
    };
  });
}

/** Creates a memory, or updates `input.existing`. Uploads new photos and removes dropped ones. */
export async function saveMemory(input: SaveMemoryInput): Promise<void> {
  const { userId, text, photos, existing, createdAt } = input;
  const id = existing?.id ?? createId();

  const photoPaths: string[] = [];
  for (const [index, photo] of photos.entries()) {
    if (photo.startsWith('data:')) {
      photoPaths.push(await uploadPhoto(userId, id, index, photo));
    } else {
      // An existing photo: keep its stored path.
      const path = existing?.photoPaths[existing.photoUrls.indexOf(photo)];
      if (path) photoPaths.push(path);
    }
  }

  const row = {
    text: text || null,
    image: photoPaths,
    ...(createdAt ? { created_at: new Date(createdAt).toISOString() } : {}),
  };
  const { error } = existing
    ? await supabase.from(TABLE).update(row).eq('id', id)
    : await supabase.from(TABLE).insert({ id, ...row });
  if (error) throw error;

  const removedPaths = (existing?.photoPaths ?? []).filter((path) => !photoPaths.includes(path));
  await removePhotos(removedPaths);
}

/** Deletes a memory together with its stored photos. */
export async function deleteMemory(memory: Memory): Promise<void> {
  const { error } = await supabase.from(TABLE).delete().eq('id', memory.id);
  if (error) throw error;
  await removePhotos(memory.photoPaths);
}

async function signPhotoPaths(paths: string[]): Promise<Map<string, string>> {
  const urlByPath = new Map<string, string>();
  if (paths.length === 0) return urlByPath;
  const { data } = await supabase.storage
    .from(PHOTO_BUCKET)
    .createSignedUrls(paths, SIGNED_URL_LIFETIME_SECONDS);
  for (const item of data ?? []) {
    if (item.path && item.signedUrl) urlByPath.set(item.path, item.signedUrl);
  }
  return urlByPath;
}

/** Uploads one data-URL photo to `<userId>/<memoryId>/…` and returns its storage path. */
async function uploadPhoto(userId: string, memoryId: string, index: number, dataUrl: string): Promise<string> {
  const path = `${userId}/${memoryId}/${Date.now()}-${index}.jpg`;
  const blob = await (await fetch(dataUrl)).blob();
  const { error } = await supabase.storage.from(PHOTO_BUCKET).upload(path, blob, { contentType: 'image/jpeg' });
  if (error) throw error;
  return path;
}

async function removePhotos(paths: string[]): Promise<void> {
  if (paths.length > 0) await supabase.storage.from(PHOTO_BUCKET).remove(paths);
}