/**
 * Storage upload helpers for Piyupair.
 * All three buckets are defined in the 0003_storage_policies migration.
 */
import { supabase } from "./supabaseClient";

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────
export interface UploadResult {
  url: string;
  path: string;
}

// ─────────────────────────────────────────────
// Internal: build a deterministic storage path
// ─────────────────────────────────────────────
const uniqueSuffix = () =>
  `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

// ─────────────────────────────────────────────
// AVATARS (public bucket)
// Path: {userId}/{timestamp}-{random}.{ext}
// ─────────────────────────────────────────────
export async function uploadAvatar(
  file: File,
  userId: string
): Promise<UploadResult> {
  const ext = file.name.split(".").pop();
  const path = `${userId}/${uniqueSuffix()}.${ext}`;

  const { error } = await supabase.storage
    .from("avatars")
    .upload(path, file, { upsert: true });

  if (error) throw new Error(`Avatar upload failed: ${error.message}`);

  const { data } = supabase.storage.from("avatars").getPublicUrl(path);
  return { url: data.publicUrl, path };
}

// ─────────────────────────────────────────────
// CREDENTIALS (private bucket)
// Path: {tutorId}/{timestamp}-{random}.{ext}
// ─────────────────────────────────────────────
export async function uploadCredential(
  file: File,
  tutorId: string
): Promise<UploadResult> {
  const ext = file.name.split(".").pop();
  const path = `${tutorId}/${uniqueSuffix()}.${ext}`;

  const { error } = await supabase.storage
    .from("credentials")
    .upload(path, file);

  if (error) throw new Error(`Credential upload failed: ${error.message}`);

  // Generate 1-hour signed URL for private review
  const { data: signed, error: signedError } = await supabase.storage
    .from("credentials")
    .createSignedUrl(path, 3600);

  if (signedError) throw new Error(`Signing URL failed: ${signedError.message}`);

  return { url: signed.signedUrl, path };
}

// ─────────────────────────────────────────────
// MATERIALS (private bucket)
// Path: {tutorId}/{uniqueSuffix}-{originalName}
// ─────────────────────────────────────────────
export async function uploadMaterial(
  file: File,
  tutorId: string
): Promise<UploadResult> {
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `${tutorId}/${uniqueSuffix()}-${safeName}`;

  const { error } = await supabase.storage
    .from("materials")
    .upload(path, file);

  if (error) throw new Error(`Material upload failed: ${error.message}`);

  // Org admin and students get short-lived signed URLs when they load the page
  const { data: signed, error: signedError } = await supabase.storage
    .from("materials")
    .createSignedUrl(path, 3600);

  if (signedError) throw new Error(`Signing URL failed: ${signedError.message}`);

  return { url: signed.signedUrl, path };
}

// ─────────────────────────────────────────────
// Helper: refresh a signed URL for existing materials
// ─────────────────────────────────────────────
export async function getMaterialSignedUrl(
  path: string,
  expiresIn = 3600
): Promise<string> {
  const { data, error } = await supabase.storage
    .from("materials")
    .createSignedUrl(path, expiresIn);

  if (error) throw new Error(`Could not generate signed URL: ${error.message}`);
  return data.signedUrl;
}
