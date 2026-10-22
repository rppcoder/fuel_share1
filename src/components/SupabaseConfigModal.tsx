import React, { useState, useEffect } from 'react';
import {
  Database,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  Copy,
  Check,
  RefreshCw,
  X,
  KeyRound,
  ShieldCheck,
  Code2,
} from 'lucide-react';
import {
  getSupabaseConfig,
  getSupabaseProjectId,
  saveCustomSupabaseConfig,
  clearCustomSupabaseConfig,
  testSupabaseConnection,
  ConnectionTestResult,
} from '../lib/supabase';
import { SUPABASE_MIGRATION_SQL } from '../lib/supabaseMigrationSql';

interface SupabaseConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfigUpdated: () => void;
}

export const SupabaseConfigModal: React.FC<SupabaseConfigModalProps> = ({
  isOpen,
  onClose,
  onConfigUpdated,
}) => {
  const currentConfig = getSupabaseConfig();
  const [url, setUrl] = useState(currentConfig.url || '');
  const [anonKey, setAnonKey] = useState(currentConfig.anonKey || '');
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<ConnectionTestResult | null>(null);
  const [sqlCopied, setSqlCopied] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const projectId = getSupabaseProjectId(url || currentConfig.url);

  // Auto-run test on open if configured
  useEffect(() => {
    if (isOpen && currentConfig.isConfigured && !testResult) {
      handleTest();
    }
  }, [isOpen, currentConfig.isConfigured]);

  if (!isOpen) return null;

  const handleTest = async () => {
    setIsTesting(true);
    setTestResult(null);

    try {
      if (url && anonKey && (url !== currentConfig.url || anonKey !== currentConfig.anonKey)) {
        saveCustomSupabaseConfig(url, anonKey);
      }
      const result = await testSupabaseConnection();
      setTestResult(result);
      if (result.success) {
        onConfigUpdated();
      }
    } catch (err: unknown) {
      setTestResult({
        success: false,
        message: err instanceof Error ? err.message : 'Error validating configuration',
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = () => {
    try {
      saveCustomSupabaseConfig(url, anonKey);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      onConfigUpdated();
      handleTest();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to save configuration');
    }
  };

  const handleClear = () => {
    if (confirm('Clear custom Supabase configuration?')) {
      clearCustomSupabaseConfig();
      setUrl('');
      setAnonKey('');
      setTestResult(null);
      onConfigUpdated();
    }
  };

  const copySqlMigration = () => {
    navigator.clipboard.writeText(SUPABASE_MIGRATION_SQL);
    setSqlCopied(true);
    setTimeout(() => setSqlCopied(false), 3000);
  };

  const sqlEditorUrl = projectId
    ? `https://supabase.com/dashboard/project/${projectId}/sql/new`
    : 'https://supabase.com/dashboard/project/_/sql/new';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="w-full max-w-xl rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden my-6">
        {/* Header */}
        <div className="bg-emerald-800 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-700 flex items-center justify-center">
              <Database className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Supabase PostgreSQL Connection</h2>
              <p className="text-xs text-emerald-200">Authoritative Cloud Database & Auth</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-emerald-200 hover:text-white hover:bg-emerald-700 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto text-slate-800 text-sm">
          {/* Status Badge */}
          <div className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="text-xs font-semibold uppercase text-slate-500">Connection:</span>
              {currentConfig.isConfigured ? (
                <div className="flex items-center gap-1.5">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    Connected via {currentConfig.source === 'env' ? 'Environment (.env)' : 'Custom Config'}
                  </span>
                  {projectId && (
                    <span className="font-mono text-xs text-slate-600 bg-slate-200/80 px-2 py-0.5 rounded">
                      ID: {projectId}
                    </span>
                  )}
                </div>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-bold">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                  Not Configured
                </span>
              )}
            </div>
            {currentConfig.source === 'custom' && (
              <button
                onClick={handleClear}
                className="text-xs text-red-600 hover:underline font-medium"
              >
                Reset Custom
              </button>
            )}
          </div>

          {/* Quick Setup Instructions & Migration Runner */}
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-100 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-emerald-950 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-700" />
                Database Schema Migration
              </h4>
              <a
                href={sqlEditorUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:text-emerald-900 hover:underline"
              >
                <span>Direct SQL Editor</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <p className="text-xs text-emerald-900 leading-relaxed">
              Your Supabase credentials are authenticated. To initialize tables (<code className="bg-emerald-100 px-1 rounded">vehicles</code>, <code className="bg-emerald-100 px-1 rounded">trips</code>, <code className="bg-emerald-100 px-1 rounded">drivers</code>, etc.), copy the SQL migration script and run it in your Supabase SQL Editor.
            </p>
            <div className="flex items-center gap-2 pt-1 flex-wrap">
              <button
                onClick={copySqlMigration}
                className="flex items-center gap-2 px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 active:scale-95 text-white rounded-lg text-xs font-semibold shadow transition"
              >
                {sqlCopied ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
                <span>{sqlCopied ? 'Full Schema Copied to Clipboard!' : '1-Click Copy Master SQL'}</span>
              </button>

              <a
                href={sqlEditorUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 active:scale-95 text-white rounded-lg text-xs font-semibold shadow transition"
              >
                <Code2 className="w-4 h-4 text-amber-300" />
                <span>Open Project SQL Editor</span>
                <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
              </a>
            </div>
          </div>

          {/* Inputs */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Project URL (VITE_SUPABASE_URL)
              </label>
              <input
                type="text"
                placeholder="https://vhketobtkxrogwgqeyvg.supabase.co"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono text-xs text-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                <span>Publishable / Anon Key (VITE_SUPABASE_PUBLISHABLE_KEY)</span>
                <span className="text-[10px] text-slate-400 font-normal">Never use service-role key</span>
              </label>
              <div className="relative">
                <input
                  type="password"
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                  value={anonKey}
                  onChange={(e) => setAnonKey(e.target.value)}
                  className="w-full px-3.5 py-2.5 pr-10 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono text-xs text-slate-900"
                />
                <KeyRound className="w-4 h-4 text-slate-400 absolute right-3.5 top-3" />
              </div>
            </div>
          </div>

          {/* Test Feedback */}
          {testResult && (
            <div
              className={`p-4 rounded-xl border text-xs leading-relaxed ${
                testResult.success
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : 'bg-rose-50 border-rose-200 text-rose-900'
              }`}
            >
              <div className="flex items-start gap-2">
                {testResult.success ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                )}
                <div className="space-y-1">
                  <p className="font-semibold">{testResult.message}</p>
                  {testResult.missingTables && testResult.missingTables.length > 0 && (
                    <div className="pt-1 text-[11px] text-rose-800">
                      <p className="font-medium">Missing database tables:</p>
                      <ul className="list-disc list-inside mt-0.5 font-mono text-[10px]">
                        {testResult.missingTables.map((t) => (
                          <li key={t}>{t}</li>
                        ))}
                      </ul>
                      <p className="mt-1">
                        Click the &quot;1-Click Copy Master SQL&quot; button above, then paste and click &quot;Run&quot; in the SQL Editor.
                      </p>
                    </div>
                  )}
                  {testResult.tablesVerified && testResult.tablesVerified.length > 0 && (
                    <p className="text-[11px] text-emerald-700">
                      Verified tables: {testResult.tablesVerified.join(', ')}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {saveSuccess && (
            <div className="p-3 bg-emerald-100 text-emerald-900 text-xs rounded-xl flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-700" />
              <span>Configuration saved!</span>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              onClick={handleTest}
              disabled={isTesting || !url || !anonKey}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 font-semibold text-xs transition disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin' : ''}`} />
              <span>{isTesting ? 'Testing...' : 'Test Connection'}</span>
            </button>

            <button
              onClick={handleSave}
              disabled={!url || !anonKey}
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 active:scale-98 text-white font-semibold text-xs shadow transition disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              <span>Save & Connect</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
