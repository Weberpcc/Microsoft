import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { websitesApi, auditsApi, keywordsApi, optimizationsApi, competitorsApi } from '../api/client';
import {
  Card, CardHeader, CardTitle, CardContent, Badge, Button, Skeleton,
  PageHeader, EmptyState, getScoreColor, getScoreBg, getSeverityVariant
} from '../components/ui';
import { Globe, Search, Key, TrendingUp, Users2, AlertTriangle, ChevronRight, Activity, Plus } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

function ScoreRing({ score }: { score: number }) {
  const r = 40;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  const color = score >= 80 ? '#10b981' : score >= 60 ? '#f59e0b' : '#ef4444';
  return (
    <div className="relative w-24 h-24">
      <svg className="transform -rotate-90" width="96" height="96">
        <circle cx="48" cy="48" r={r} fill="none" stroke="#1f2937" strokeWidth="8" />
        <circle cx="48" cy="48" r={r} fill="none" stroke={color} strokeWidth="8"
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`text-xl font-bold ${getScoreColor(score)}`}>{score}</span>
        <span className="text-xs text-gray-500">/100</span>
      </div>
    </div>
  );
}

export function WebsiteDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState<'audits' | 'keywords' | 'optimizations' | 'competitors'>('audits');

  const { data: website, isLoading } = useQuery({
    queryKey: ['website', id],
    queryFn: () => websitesApi.get(id!),
    enabled: !!id,
  });

  const { data: audits = [] } = useQuery({
    queryKey: ['audits', id],
    queryFn: () => auditsApi.listForWebsite(id!),
    enabled: !!id,
  });

  const { data: keywords = [] } = useQuery({
    queryKey: ['keywords', id],
    queryFn: () => keywordsApi.listForWebsite(id!),
    enabled: !!id,
  });

  const { data: optimizations = [] } = useQuery({
    queryKey: ['optimizations', id],
    queryFn: () => optimizationsApi.listForWebsite(id!),
    enabled: !!id,
  });

  const { data: competitors = [] } = useQuery({
    queryKey: ['competitors', id],
    queryFn: () => competitorsApi.listForWebsite(id!),
    enabled: !!id,
  });

  const latestAudit = audits[0];
  const auditHistory = audits.slice(0, 10).reverse().map((a: any) => ({
    date: new Date(a.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    score: a.health_score,
  }));

  // Keyword trend stats
  const improving = keywords.filter((k: any) => k.current_position && k.previous_position && k.current_position < k.previous_position).length;
  const declining = keywords.filter((k: any) => k.current_position && k.previous_position && k.current_position > k.previous_position).length;

  if (isLoading) return <div className="space-y-6"><Skeleton className="h-8 w-64" /><Skeleton className="h-48" /></div>;
  if (!website) return <div className="text-gray-400">Website not found</div>;

  const tabs = [
    { key: 'audits', label: 'SEO Audits', count: audits.length },
    { key: 'keywords', label: 'Keywords', count: keywords.length },
    { key: 'optimizations', label: 'Optimizations', count: optimizations.length },
    { key: 'competitors', label: 'Competitors', count: competitors.length },
  ] as const;

  return (
    <div className="space-y-6">
      <PageHeader
        title={website.name}
        subtitle={website.domain}
        action={
          <div className="flex gap-2">
            <Link to={`/audits/new?website=${id}`}>
              <Button size="sm"><Search className="w-3 h-3" /> Run Audit</Button>
            </Link>
            <Link to={`/assistant?website=${id}`}>
              <Button size="sm" variant="secondary">AI Advice</Button>
            </Link>
          </div>
        }
      />

      {/* Overview strip */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <Card className="lg:col-span-1 p-5 flex flex-col items-center justify-center">
          {latestAudit ? (
            <>
              <ScoreRing score={latestAudit.health_score} />
              <p className="text-xs text-gray-500 mt-2">SEO Health Score</p>
              <p className="text-xs text-gray-600">{new Date(latestAudit.created_at).toLocaleDateString()}</p>
            </>
          ) : (
            <EmptyState icon={<Activity className="w-8 h-8" />} title="No audit yet" description="Run your first audit" />
          )}
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader><CardTitle>Score History</CardTitle></CardHeader>
          <CardContent>
            {auditHistory.length > 1 ? (
              <ResponsiveContainer width="100%" height={150}>
                <LineChart data={auditHistory}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                  <XAxis dataKey="date" stroke="#4b5563" tick={{ fontSize: 10 }} />
                  <YAxis domain={[0, 100]} stroke="#4b5563" tick={{ fontSize: 10 }} />
                  <Tooltip contentStyle={{ backgroundColor: '#111827', border: '1px solid #1f2937', fontSize: '12px', color: '#e5e7eb' }} />
                  <Line type="monotone" dataKey="score" stroke="#6366f1" strokeWidth={2} dot={{ fill: '#6366f1', r: 3 }} name="Health Score" />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState title="Need 2+ audits for trend" description="Run more audits to see a trend" />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Issue Summary */}
      {latestAudit && (
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Critical', count: latestAudit.critical_count, variant: 'danger' as const, color: 'text-red-400' },
            { label: 'Warnings', count: latestAudit.warning_count, variant: 'warning' as const, color: 'text-amber-400' },
            { label: 'Info', count: latestAudit.info_count, variant: 'info' as const, color: 'text-indigo-400' },
          ].map(({ label, count, variant, color }) => (
            <Card key={label} className="p-4 text-center">
              <p className={`text-2xl font-bold ${color}`}>{count}</p>
              <p className="text-xs text-gray-500">{label} Issues</p>
            </Card>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div>
        <div className="flex gap-1 border-b border-gray-800 mb-4">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
                activeTab === tab.key
                  ? 'border-indigo-500 text-indigo-400'
                  : 'border-transparent text-gray-500 hover:text-gray-300'
              }`}
            >
              {tab.label}
              <span className="ml-1.5 text-xs bg-gray-800 text-gray-400 px-1.5 py-0.5 rounded">{tab.count}</span>
            </button>
          ))}
        </div>

        {/* Audits Tab */}
        {activeTab === 'audits' && (
          <div className="space-y-2">
            {audits.length === 0 ? (
              <EmptyState icon={<Search className="w-8 h-8" />} title="No audits yet"
                action={<Link to={`/audits/new?website=${id}`}><Button size="sm"><Plus className="w-3 h-3" /> Run Audit</Button></Link>} />
            ) : audits.map((a: any) => (
              <Link key={a.id} to={`/audits/${a.id}`}>
                <Card className="hover:border-gray-700 transition-colors">
                  <div className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <span className={`text-lg font-bold ${getScoreColor(a.health_score)}`}>{a.health_score}</span>
                      <div>
                        <p className="text-sm text-gray-300">Audit Report</p>
                        <p className="text-xs text-gray-500">{new Date(a.created_at).toLocaleString()}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      <span className="text-red-400">{a.critical_count} critical</span>
                      <span className="text-amber-400">{a.warning_count} warnings</span>
                      <ChevronRight className="w-4 h-4 text-gray-600" />
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}

        {/* Keywords Tab */}
        {activeTab === 'keywords' && (
          <div>
            {keywords.length === 0 ? (
              <EmptyState icon={<Key className="w-8 h-8" />} title="No keywords tracked"
                action={<Link to={`/keywords?website=${id}`}><Button size="sm"><Plus className="w-3 h-3" /> Add Keywords</Button></Link>} />
            ) : (
              <>
                <div className="flex gap-4 mb-4 text-xs">
                  <span className="text-emerald-400">↑ {improving} improving</span>
                  <span className="text-red-400">↓ {declining} declining</span>
                  <span className="text-gray-500">{keywords.length - improving - declining} unchanged</span>
                </div>
                <div className="space-y-2">
                  {keywords.map((k: any) => (
                    <Card key={k.id} className="p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-300">{k.keyword}</p>
                          {k.target_page && <p className="text-xs text-gray-500">{k.target_page}</p>}
                        </div>
                        <div className="flex items-center gap-3 text-sm">
                          {k.current_position && (
                            <span className="font-bold text-gray-200">#{k.current_position}</span>
                          )}
                          {k.current_position && k.previous_position && (
                            <span className={k.current_position < k.previous_position ? 'text-emerald-400 text-xs' : 'text-red-400 text-xs'}>
                              {k.current_position < k.previous_position ? `↑${k.previous_position - k.current_position}` : `↓${k.current_position - k.previous_position}`}
                            </span>
                          )}
                          {!k.current_position && <span className="text-xs text-gray-600">No position</span>}
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* Optimizations Tab */}
        {activeTab === 'optimizations' && (
          <div className="space-y-2">
            {optimizations.length === 0 ? (
              <EmptyState icon={<TrendingUp className="w-8 h-8" />} title="No optimization history"
                action={<Link to="/optimizations"><Button size="sm"><Plus className="w-3 h-3" /> Log Optimization</Button></Link>} />
            ) : optimizations.map((o: any) => (
              <Card key={o.id} className="p-4">
                <p className="text-sm font-medium text-gray-300">{o.action_taken}</p>
                <p className="text-xs text-gray-500 mt-1">{o.page_url} · {new Date(o.created_at).toLocaleDateString()}</p>
                {o.hindsight_memory_id && (
                  <span className="inline-flex items-center gap-1 text-xs text-indigo-400 mt-1">
                    <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full" /> Retained in Hindsight
                  </span>
                )}
              </Card>
            ))}
          </div>
        )}

        {/* Competitors Tab */}
        {activeTab === 'competitors' && (
          <div className="space-y-2">
            {competitors.length === 0 ? (
              <EmptyState icon={<Users2 className="w-8 h-8" />} title="No competitors tracked"
                action={<Link to={`/competitors?website=${id}`}><Button size="sm"><Plus className="w-3 h-3" /> Add Competitor</Button></Link>} />
            ) : competitors.map((c: any) => (
              <Card key={c.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-300">{c.name}</p>
                    <p className="text-xs text-gray-500">{c.domain_url}</p>
                  </div>
                  <span className="text-xs text-gray-500">{c.observations?.length || 0} observations</span>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
