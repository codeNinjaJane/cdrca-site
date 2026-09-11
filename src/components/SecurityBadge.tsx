import React from 'react';
import { ShieldAlert, Terminal, Eye, FileText, Cpu, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface SecurityBadgeProps {
  permissions: string[];
  uses: [string, string][];
  compact?: boolean;
}

const PERMISSION_EXPLANATIONS: Record<
  string,
  { label: string; plainText: string; level: 'high' | 'medium' | 'low'; icon: React.ComponentType<{ className?: string }> }
> = {
  trusted: {
    label: 'Trusted Core Access',
    plainText: 'Has direct access to CDRCA internal runtime context and memory.',
    level: 'high',
    icon: ShieldAlert,
  },
  trusted_sys: {
    label: 'System Privileges',
    plainText: 'Can invoke low-level system APIs and machine-level bindings.',
    level: 'high',
    icon: AlertTriangle,
  },
  spawnProcess: {
    label: 'Execute Programs',
    plainText: 'Can launch external executable files and command-line programs on your computer.',
    level: 'high',
    icon: Terminal,
  },
  fileWrite: {
    label: 'Write Files',
    plainText: 'Can create, edit, and overwrite files on your local hard drive.',
    level: 'medium',
    icon: FileText,
  },
  fileRead: {
    label: 'Read Files',
    plainText: 'Can read files and project assets stored on your computer.',
    level: 'medium',
    icon: Eye,
  },
  mpdWrite: {
    label: 'Write MPD Streams',
    plainText: 'Can export and serialize Motion Path Data trajectory streams.',
    level: 'low',
    icon: Cpu,
  },
  mpdRead: {
    label: 'Read MPD Streams',
    plainText: 'Can read Motion Path Data coordinate frames from memory buffers.',
    level: 'low',
    icon: Cpu,
  },
  embedded: {
    label: 'Embedded Mode',
    plainText: 'Runs within an embedded animation canvas sub-process.',
    level: 'low',
    icon: CheckCircle2,
  },
};

export const SecurityBadge: React.FC<SecurityBadgeProps> = ({ permissions = [], uses = [], compact = false }) => {
  const hasHighRisk = permissions.some((p) => PERMISSION_EXPLANATIONS[p]?.level === 'high');

  if (compact) {
    return (
      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-amber-50 text-amber-900 border border-amber-200">
        <ShieldAlert className="w-3.5 h-3.5 text-amber-700 shrink-0" />
        <span className="whitespace-nowrap">
          Plugin: {permissions.length} permission{permissions.length === 1 ? '' : 's'} • {uses.length} hook{uses.length === 1 ? '' : 's'}
        </span>
      </div>
    );
  }

  return (
    <div
      id="plugin-security-disclosure"
      className={`rounded-xl border p-5 transition-all ${
        hasHighRisk
          ? 'bg-amber-50/70 border-amber-200 text-stone-900'
          : 'bg-stone-50 border-stone-200 text-stone-900'
      }`}
    >
      <div className="flex items-start gap-3">
        <div className={`p-2 rounded-lg shrink-0 ${hasHighRisk ? 'bg-amber-100 text-amber-800' : 'bg-stone-200 text-stone-700'}`}>
          <ShieldAlert className="w-5 h-5" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold text-stone-900">
              Plugin Security &amp; Permissions Disclosure
            </h3>
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-amber-100 text-amber-900 border border-amber-300 whitespace-nowrap">
              Transpiler Extension
            </span>
          </div>
          <p className="mt-1 text-sm text-stone-600 leading-relaxed">
            This package is a <strong>transpiler plugin</strong> that runs code during CDRCA compilation. 
            Before installing, review the specific operating capabilities it declares below:
          </p>

          {/* Declared Permissions */}
          <div className="mt-4">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-stone-600 mb-2">
              Requested System Capabilities ({permissions.length})
            </h4>
            {permissions.length === 0 ? (
              <p className="text-xs text-stone-500 italic">No explicit system permissions declared by manifest.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {permissions.map((perm) => {
                  const info = PERMISSION_EXPLANATIONS[perm] || {
                    label: perm,
                    plainText: `Custom declared permission: "${perm}"`,
                    level: 'medium',
                    icon: AlertTriangle,
                  };
                  const Icon = info.icon;
                  const isHigh = info.level === 'high';
                  return (
                    <div
                      key={perm}
                      className={`p-3 rounded-lg border text-xs flex items-start gap-2.5 ${
                        isHigh
                          ? 'bg-white border-amber-300 text-amber-950 shadow-xs'
                          : 'bg-white border-stone-200 text-stone-800'
                      }`}
                    >
                      <Icon
                        className={`w-4 h-4 mt-0.5 shrink-0 ${
                          isHigh ? 'text-amber-700' : 'text-stone-500'
                        }`}
                      />
                      <div>
                        <div className="font-semibold flex items-center gap-1.5">
                          <span>{info.label}</span>
                          <code className="text-[11px] font-mono px-1 py-0.5 rounded bg-stone-100 text-stone-700 border border-stone-200">
                            {perm}
                          </code>
                        </div>
                        <p className="mt-0.5 text-stone-600 leading-normal">{info.plainText}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Declared Pipeline Hooks */}
          <div className="mt-4 pt-3 border-t border-stone-200/80">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-stone-600 mb-2">
              Transpiler Pipeline Hooks Declared ({uses.length})
            </h4>
            {uses.length === 0 ? (
              <p className="text-xs text-stone-500 italic">No pipeline hooks declared.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {uses.map(([hookTiming, hookStage], idx) => (
                  <div
                    key={`${hookTiming}-${hookStage}-${idx}`}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-stone-100 text-stone-800 border border-stone-200 text-xs font-mono"
                  >
                    <span className="font-semibold text-stone-900">{hookTiming}</span>
                    <span className="text-stone-400">→</span>
                    <span className="text-stone-700">{hookStage}</span>
                  </div>
                ))}
              </div>
            )}
            <p className="mt-2 text-xs text-stone-500 leading-normal">
              Hooks intercept the CDRCA transpiler lifecycle to transform syntax trees, compile shaders, or emit custom animation scripts.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
