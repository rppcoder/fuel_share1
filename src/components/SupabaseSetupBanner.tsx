import React, { useState, useEffect, useCallback } from 'react';
import {
  AlertCircle,
  ArrowRight,
  Database,
  ExternalLink,
  Copy,
  Check,
  RefreshCw,
  CheckCircle2,
  X,
  Code2,
} from 'lucide-react';
import {
  getSupabaseConfig,
  getSupabaseProjectId,
  testSupabaseConnection,
  ConnectionTestResult,
} from '../lib/supabase';
import { SUPABASE_MIGRATION_SQL } from '../lib/supabaseMigrationSql';
import { SupabaseConfigModal } from './SupabaseConfigModal';

interface SupabaseSetupBannerProps {
  onRefreshState?: () => void;
}

export const SupabaseSetupBanner: React.FC<SupabaseSetupBannerProps> = ({
  onRefreshState,
}) => {
  const config = getSupabaseConfig();
  const projectId = getSupabaseProjectId(config.url);
  const [showModal, setShowModal] = useState(false);
  const [checking, setChecking] = useState(false);
  const [testResult, setTestResult] = useState<ConnectionTestResult | null>(null);
  const [copiedSql, setCopiedSql] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  const runCheck = useCallback(async () => {
    if (!config.isConfigured) {
      setTestResult(null);
      return;
    }
    setChecking(true);
    try {
      const result = await testSupabaseConnection();
      setTestResult(result);
      if (result.success && onRefreshState) {
        onRefreshState();
      }
    } catch {
      // testSupabaseConnection already handles exceptions
    } finally {
      setChecking(false);
    }
  }, [config.isConfigured, onRefreshState]);

  useEffect(() => {
    runCheck();
  }, [runCheck]);

  const handleCopySql = async () => {
    try {
      await navigator.clipboard.writeText(SUPABASE_MIGRATION_SQL);
      setCopiedSql(true);
      setTimeout(() => setCopiedSql(false), 3000);
    } catch {
      // Fallback
    }
  };

  const sqlEditorUrl = projectId
    ? `https://supabase.com/dashboard/project/${projectId}/sql/new`
    : 'https://supabase.com/dashboard/project/_/sql/new';

  return (
    <>
      {/* 1. Case: Supabase Not Configured */}
      {!config.isConfigured && (
        <div className="bg-gradient-to-r from-amber-600 to-amber-700 text-white px-4 py-2.5 shadow-md flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 text-amber-200 shrink-0" />
            <p>
              <strong className="font-bold">Supabase Cloud Not Connected:</strong> Real-time shared vehicle sync requires your Supabase URL & anon key.
            </p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-1.5 bg-white text-amber-900 font-bold px-3 py-1.5 rounded-lg shadow hover:bg-amber-50 active:scale-95 transition shrink-0"
          >
            <Database className="w-3.5 h-3.5" />
            <span>Connect Supabase</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* 2. Case: Connected to Supabase, but SQL schema tables not created yet */}
      {config.isConfigured && testResult && !testResult.success && testResult.missingTables && testResult.missingTables.length > 0 && (
        <div className="bg-gradient-to-r from-indigo-900 via-slate-900 to-indigo-950 text-white border-b border-indigo-700/50 px-4 py-3 shadow-lg">
          <div className="max-w-md mx-auto space-y-2.5 text-xs">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-start gap-2">
                <Database className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-white text-xs">Supabase Connected:</span>
                    <span className="font-mono text-[11px] bg-indigo-950 px-1.5 py-0.5 rounded border border-indigo-700 text-amber-300">
                      {projectId || config.url}
                    </span>
                  </div>
                  <p className="text-slate-300 text-[11px] mt-0.5">
                    Database tables (<span className="text-amber-200">{testResult.missingTables.join(', ')}</span>) need to be created via the SQL Editor.
                  </p>
                </div>
              </div>

              <button
                onClick={runCheck}
                disabled={checking}
                title="Re-check connection"
                className="p-1 rounded-lg hover:bg-white/10 text-slate-300 transition shrink-0"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${checking ? 'animate-spin' : ''}`} />
              </button>
            </div>

            <div className="flex items-center gap-2 flex-wrap pt-0.5">
              <a
                href={sqlEditorUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold px-3 py-1.5 rounded-lg shadow text-xs transition active:scale-95"
              >
                <Code2 className="w-3.5 h-3.5" />
                <span>Open SQL Editor</span>
                <ExternalLink className="w-3 h-3" />
              </a>

              <button
                onClick={handleCopySql}
                className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-medium px-3 py-1.5 rounded-lg text-xs transition active:scale-95"
              >
                {copiedSql ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-300" />}
                <span>{copiedSql ? 'SQL Copied!' : 'Copy Migration SQL'}</span>
              </button>

              <button
                onClick={() => setShowModal(true)}
                className="text-[11px] text-slate-400 hover:text-white underline ml-auto"
              >
                View Details
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Case: Successfully Connected & All Tables Verified */}
      {config.isConfigured && testResult && testResult.success && !isDismissed && (
        <div className="bg-emerald-900/90 text-white border-b border-emerald-700/60 px-4 py-2 text-xs flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              Connected to Supabase <span className="font-mono font-bold text-amber-300">({projectId})</span> • PostgreSQL live sync active
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowModal(true)}
              className="text-[11px] text-emerald-300 hover:text-white underline"
            >
              Config
            </button>
            <button
              onClick={() => setIsDismissed(true)}
              className="p-1 hover:bg-emerald-800 rounded text-emerald-300 hover:text-white transition"
              title="Dismiss banner"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Config Modal */}
      {showModal && (
        <SupabaseConfigModal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          onConfigUpdated={() => {
            runCheck();
            if (onRefreshState) onRefreshState();
          }}
        />
      )}
    </>
  );
};
