import { createClient, SupabaseClient } from '@supabase/supabase-js';

const STORAGE_KEY_URL = 'fuelshare_supabase_url';
const STORAGE_KEY_ANON = 'fuelshare_supabase_anon_key';

export interface SupabaseConfigInfo {
  url: string;
  anonKey: string;
  isConfigured: boolean;
  source: 'env' | 'custom' | 'none';
}

export function normalizeSupabaseUrl(url: string): string {
  if (!url) return '';
  let cleaned = url.trim();
  cleaned = cleaned.replace(/\/+$/, '');
  cleaned = cleaned.replace(/\/rest\/v1\/?$/, '');
  cleaned = cleaned.replace(/\/+$/, '');
  return cleaned;
}

export function getSupabaseProjectId(url: string): string {
  const match = url.match(/https:\/\/([a-z0-9_-]+)\.supabase\.co/i);
  return match ? match[1] : '';
}

export function getSupabaseConfig(): SupabaseConfigInfo {
  const rawEnvUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
  const envKey = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY)?.trim();
  const envUrl = normalizeSupabaseUrl(rawEnvUrl || '');

  if (envUrl && envKey && !envUrl.includes('your-project-id')) {
    return {
      url: envUrl,
      anonKey: envKey,
      isConfigured: true,
      source: 'env',
    };
  }

  // Fallback to custom user-configured credentials stored locally
  if (typeof window !== 'undefined') {
    const rawCustomUrl = localStorage.getItem(STORAGE_KEY_URL)?.trim();
    const customUrl = normalizeSupabaseUrl(rawCustomUrl || '');
    const customKey = localStorage.getItem(STORAGE_KEY_ANON)?.trim();
    if (customUrl && customKey) {
      return {
        url: customUrl,
        anonKey: customKey,
        isConfigured: true,
        source: 'custom',
      };
    }
  }

  return {
    url: '',
    anonKey: '',
    isConfigured: false,
    source: 'none',
  };
}

let cachedClient: SupabaseClient | null = null;
let lastUsedUrl = '';
let lastUsedKey = '';

export function getSupabaseClient(): SupabaseClient | null {
  const config = getSupabaseConfig();
  if (!config.isConfigured || !config.url || !config.anonKey) {
    return null;
  }

  if (cachedClient && lastUsedUrl === config.url && lastUsedKey === config.anonKey) {
    return cachedClient;
  }

  try {
    cachedClient = createClient(config.url, config.anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: 'fuelshare_auth_session',
      },
    });
    lastUsedUrl = config.url;
    lastUsedKey = config.anonKey;
    return cachedClient;
  } catch (err) {
    console.error('Failed to initialize Supabase client:', err);
    return null;
  }
}

export function saveCustomSupabaseConfig(url: string, key: string) {
  const cleanedUrl = url.trim().replace(/\/$/, '');
  const cleanedKey = key.trim();

  if (!cleanedUrl.startsWith('https://')) {
    throw new Error('Supabase URL must start with https://');
  }
  if (cleanedKey.length < 20) {
    throw new Error('Invalid Anon/Publishable Key length.');
  }

  localStorage.setItem(STORAGE_KEY_URL, cleanedUrl);
  localStorage.setItem(STORAGE_KEY_ANON, cleanedKey);
  cachedClient = null;
  lastUsedUrl = '';
  lastUsedKey = '';
}

export function clearCustomSupabaseConfig() {
  localStorage.removeItem(STORAGE_KEY_URL);
  localStorage.removeItem(STORAGE_KEY_ANON);
  cachedClient = null;
  lastUsedUrl = '';
  lastUsedKey = '';
}

export interface ConnectionTestResult {
  success: boolean;
  message: string;
  latencyMs?: number;
  tablesVerified?: string[];
  missingTables?: string[];
}

export async function testSupabaseConnection(): Promise<ConnectionTestResult> {
  const client = getSupabaseClient();
  if (!client) {
    return {
      success: false,
      message: 'Supabase credentials are not configured yet. Please provide your Project URL and Anon Key.',
    };
  }

  const startTime = Date.now();
  try {
    // 1. Basic ping using auth.getSession()
    const { error: authError } = await client.auth.getSession();
    if (authError) {
      return {
        success: false,
        message: `Supabase Auth error: ${authError.message}`,
      };
    }

    // 2. Check essential tables exist in PostgreSQL
    const tablesToCheck = ['vehicles', 'trips', 'drivers', 'households', 'payments', 'settlements'];
    const tablesVerified: string[] = [];
    const missingTables: string[] = [];

    for (const table of tablesToCheck) {
      const { error } = await client.from(table).select('id').limit(1);
      if (error) {
        // code 42P01 or PGRST205 means table does not exist in database / schema cache
        if (
          error.code === '42P01' ||
          error.code === 'PGRST205' ||
          error.message.includes('does not exist') ||
          error.message.includes('schema cache') ||
          error.message.includes('Could not find the table')
        ) {
          missingTables.push(table);
        } else {
          // Table exists even if 401/403 or RLS blocks select
          tablesVerified.push(table);
        }
      } else {
        tablesVerified.push(table);
      }
    }

    const latency = Date.now() - startTime;

    if (missingTables.length > 0) {
      return {
        success: false,
        message: `Connected to Supabase, but missing required tables: ${missingTables.join(', ')}. Please execute the SQL migration in your Supabase SQL Editor.`,
        latencyMs: latency,
        tablesVerified,
        missingTables,
      };
    }

    return {
      success: true,
      message: `Successfully connected to Supabase! Latency: ${latency}ms. All required tables detected.`,
      latencyMs: latency,
      tablesVerified,
    };
  } catch (err: unknown) {
    return {
      success: false,
      message: err instanceof Error ? err.message : 'Unknown network error connecting to Supabase.',
    };
  }
}
