import { getSupabaseClient } from './supabase';

const BUCKET_NAME = 'fuelshare-receipts';

/**
 * Upload receipt image to private Supabase bucket
 */
export async function uploadReceipt({
  file,
  householdId,
  category,
}: {
  file: File;
  householdId: string;
  category: 'fuel' | 'expense';
}): Promise<{ path: string | null; error: string | null }> {
  const client = getSupabaseClient();
  if (!client) {
    return {
      path: null,
      error: 'Supabase client not configured. Receipt cannot be uploaded to cloud.',
    };
  }

  try {
    const fileExt = file.name.split('.').pop() || 'jpg';
    const fileName = `${householdId}/${category}_${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;

    const { data, error } = await client.storage
      .from(BUCKET_NAME)
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (error) {
      return { path: null, error: error.message };
    }

    return { path: data.path, error: null };
  } catch (err: unknown) {
    return {
      path: null,
      error: err instanceof Error ? err.message : 'Unknown upload error.',
    };
  }
}

/**
 * Generate a private signed URL to view a stored receipt (expires in 60 minutes)
 */
export async function getReceiptSignedUrl(path: string): Promise<string | null> {
  const client = getSupabaseClient();
  if (!client || !path) return null;

  try {
    const { data, error } = await client.storage
      .from(BUCKET_NAME)
      .createSignedUrl(path, 3600); // 1 hour expiration

    if (error || !data) {
      console.warn('Could not generate signed receipt URL:', error?.message);
      return null;
    }

    return data.signedUrl;
  } catch (err) {
    console.warn('Error fetching signed receipt URL:', err);
    return null;
  }
}
