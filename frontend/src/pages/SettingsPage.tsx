import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { memoryApi, healthApi } from '../api/client';
import { PageHeader, Card, CardHeader, CardTitle, CardContent, Badge } from '../components/ui';
import { Settings, Brain, Server, Database, Globe, CheckCircle, AlertCircle } from 'lucide-react';

export function SettingsPage() {
  const { data: memStatus } = useQuery({ queryKey: ['memory-status'], queryFn: memoryApi.status, refetchInterval: 15000 });
  const { data: health } = useQuery({ queryKey: ['health'], queryFn: healthApi.check, refetchInterval: 15000 });

  const StatusIcon = ({ ok }: { ok: boolean }) => ok
    ? <CheckCircle className="w-4 h-4 text-emerald-400" />
    : <AlertCircle className="w-4 h-4 text-red-400" />;

  return (
    <div className="max-w-2xl space-y-6">
      <PageHeader title="Settings & System Status" subtitle="Configuration overview and service health" />

      {/* System Health */}
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Server className="w-4 h-4" /> Service Health</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {[
            { label: 'Backend API', ok: !!health, detail: health?.status === 'ok' ? 'Healthy' : 'Unavailable', icon: <Server className="w-4 h-4 text-gray-500" /> },
            { label: 'Database', ok: health?.database === 'ok', detail: health?.database || 'Unknown', icon: <Database className="w-4 h-4 text-gray-500" /> },
            { label: 'Hindsight Memory', ok: memStatus?.hindsight_online, detail: memStatus?.hindsight_online ? 'Online' : 'Offline', icon: <Brain className="w-4 h-4 text-gray-500" /> },
          ].map(({ label, ok, detail, icon }) => (
            <div key={label} className="flex items-center justify-between py-2 border-b border-gray-800 last:border-0">
              <div className="flex items-center gap-3">
                {icon}
                <span className="text-sm text-gray-300">{label}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">{detail}</span>
                <StatusIcon ok={!!ok} />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Integration Details */}
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Brain className="w-4 h-4" /> Hindsight Integration</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="bg-gray-800 rounded-lg p-4 text-xs space-y-2 text-gray-400">
            <div className="flex justify-between">
              <span>Status</span>
              <span className={memStatus?.hindsight_online ? 'text-emerald-400' : 'text-red-400'}>
                {memStatus?.hindsight_online ? '✓ Online' : '✕ Offline'}
              </span>
            </div>
            {memStatus?.hindsight_url && (
              <div className="flex justify-between">
                <span>URL</span>
                <span className="font-mono text-gray-500">{memStatus.hindsight_url}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span>Memory banks</span>
              <span>{memStatus?.bank_count ?? 'N/A'}</span>
            </div>
          </div>
          <div className="bg-indigo-500/5 border border-indigo-500/20 rounded-lg p-3 text-xs text-indigo-300/70">
            <p className="font-medium text-indigo-300 mb-1">Events Stored in Hindsight</p>
            <ul className="space-y-0.5">
              <li>• audit_summary — on every SEO audit completion</li>
              <li>• optimization_action — on every optimization logged</li>
              <li>• ranking_outcome — when outcomes are recorded</li>
              <li>• competitor_change — on competitor page observations</li>
              <li>• user_feedback — on recommendation ratings</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Configuration Guidance */}
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Settings className="w-4 h-4" /> Environment Configuration</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500 mb-4">Configure these environment variables in your <code className="text-indigo-400 bg-gray-800 px-1 rounded">.env</code> file:</p>
          <div className="bg-gray-800 rounded-lg p-4 text-xs font-mono text-gray-400 space-y-1">
            {[
              ['GROQ_API_KEY', 'Your Groq API key from console.groq.com'],
              ['HINDSIGHT_API_KEY', 'Your Hindsight/Vectorize API key'],
              ['HINDSIGHT_BASE_URL', 'Hindsight server URL (default: localhost:7400)'],
              ['SECRET_KEY', 'JWT secret key (use a random 32-char string)'],
              ['DATABASE_URL', 'PostgreSQL connection string (optional, SQLite is default)'],
            ].map(([key, desc]) => (
              <div key={key}>
                <span className="text-indigo-400">{key}</span>
                <span className="text-gray-600"> # {desc}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
