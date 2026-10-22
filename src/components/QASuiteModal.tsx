import React, { useState } from 'react';
import {
  FlaskConical,
  CheckCircle2,
  XCircle,
  RefreshCw,
  X,
  ShieldCheck,
} from 'lucide-react';
import { runFullQASuite, QATestResult } from '../lib/qaSuite';

interface QASuiteModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const QASuiteModal: React.FC<QASuiteModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [results, setResults] = useState<QATestResult[]>(() => runFullQASuite());
  const [isRunning, setIsRunning] = useState(false);
  const [filter, setFilter] = useState<string>('all');

  if (!isOpen) return null;

  const handleRerun = () => {
    setIsRunning(true);
    setTimeout(() => {
      setResults(runFullQASuite());
      setIsRunning(false);
    }, 400);
  };

  const passedCount = results.filter((r) => r.passed).length;
  const filteredResults =
    filter === 'all'
      ? results
      : results.filter((r) => r.category === filter);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-6">
        {/* Header */}
        <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white">
              <FlaskConical className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold">QA & Security Verification Suite</h2>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-semibold">
                  17 Automated Specs
                </span>
              </div>
              <p className="text-xs text-slate-400">Verifying FuelShare calculations, RLS, and constraints</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Score Card */}
        <div className="p-5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
              <span className="font-extrabold text-xl text-slate-900">
                {passedCount}/{results.length}
              </span>
              <span className="text-xs text-slate-500 font-medium">Tests Passing</span>
            </div>
            {passedCount === results.length && (
              <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-full text-xs font-bold">
                100% Verified
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <div className="flex rounded-lg bg-slate-200 p-0.5 text-xs font-semibold">
              <button
                onClick={() => setFilter('all')}
                className={`px-2.5 py-1 rounded-md transition ${filter === 'all' ? 'bg-white shadow text-slate-900' : 'text-slate-600'}`}
              >
                All
              </button>
              <button
                onClick={() => setFilter('accounting')}
                className={`px-2.5 py-1 rounded-md transition ${filter === 'accounting' ? 'bg-white shadow text-slate-900' : 'text-slate-600'}`}
              >
                Accounting
              </button>
              <button
                onClick={() => setFilter('security')}
                className={`px-2.5 py-1 rounded-md transition ${filter === 'security' ? 'bg-white shadow text-slate-900' : 'text-slate-600'}`}
              >
                Security
              </button>
            </div>

            <button
              onClick={handleRerun}
              disabled={isRunning}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold shadow transition active:scale-95"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRunning ? 'animate-spin' : ''}`} />
              <span>Re-run</span>
            </button>
          </div>
        </div>

        {/* Tests List */}
        <div className="p-5 space-y-3 max-h-[60vh] overflow-y-auto">
          {filteredResults.map((test) => (
            <div
              key={test.id}
              className={`p-3.5 rounded-2xl border transition ${
                test.passed
                  ? 'bg-white border-slate-200 hover:border-emerald-300'
                  : 'bg-rose-50 border-rose-200'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2.5">
                  <div className="mt-0.5">
                    {test.passed ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : (
                      <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold text-slate-400">#{test.id}</span>
                      <h4 className="text-xs font-bold text-slate-900">{test.title}</h4>
                      <span className="text-[10px] uppercase font-semibold px-1.5 py-0.2 rounded-md bg-slate-100 text-slate-600">
                        {test.category}
                      </span>
                    </div>
                    {test.details && (
                      <p className="text-[11px] text-slate-500 mt-0.5">{test.details}</p>
                    )}
                  </div>
                </div>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                    test.passed
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-rose-100 text-rose-800'
                  }`}
                >
                  {test.passed ? 'PASSED' : 'FAILED'}
                </span>
              </div>

              <div className="mt-2.5 pt-2 border-t border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px]">
                <div className="bg-slate-50 p-2 rounded-lg font-mono text-slate-700">
                  <span className="text-slate-400 text-[10px] block font-sans">EXPECTED:</span>
                  {test.expected}
                </div>
                <div className="bg-slate-50 p-2 rounded-lg font-mono text-slate-700">
                  <span className="text-slate-400 text-[10px] block font-sans">ACTUAL:</span>
                  {test.actual}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
