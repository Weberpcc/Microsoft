import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { websitesApi, memoryApi } from '../api/client';
import { useToast } from '../context/ToastContext';
import { PageHeader, Card, CardHeader, CardTitle, CardContent, Button, Select, Input, EmptyState, Badge, Skeleton } from '../components/ui';
import { Brain, Search, AlertCircle, CheckCircle, Database } from 'lucide-react';

export function MemoryExplorerPage() {
  const toast = useToast();
  const [selectedWebsite, setSelectedWebsite] = useState('');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  const { data: websites = [] } = useQuery({ queryKey: ['websites'], queryFn: websitesApi.list });
  const { data: memStatus } = useQuery({ queryKey: ['memory-status'], queryFn: memoryApi.status, refetchInterval: 10000 });

  const wsOptions = [
    { value: '', label: '— Select website —' },
    ...websites.map((w: any) => ({ value: w.id, label: `${w.name} (${w.domain})` })),
  ];

  const handleExplore = async () => {
    if (!selectedWebsite) return;
    setIsLoading(true);
    try {
      const data = await memoryApi.explore(selectedWebsite, query || 'SEO history optimizations', 10);
      setResults(data);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setIsLoading(false);
    }
  };

  const eventTypeColors: Record<string, string> = {
    audit_summary: 'text-indigo-400 bg-indigo-500/10',
    optimization_action: 'text-emerald-400 bg-emerald-500/10',
    ranking_outcome: 'text-amber-400 bg-amber-500/10',
    competitor_change: 'text-purple-400 bg-purple-500/10',
    user_feedback: 'text-pink-400 bg-pink-500/10',
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Memory Explorer"
        subtitle="Inspect and query your website's Hindsight persistent memory bank"
      />

      {/* Status Banner */}
      <div className={`flex items-center gap-3 px-4 py-3 rounded-lg border ${
        memStatus?.hindsight_online
          ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-400'
          : 'bg-red-500/5 border-red-500/20 text-red-400'
      }`}>
        {memStatus?.hindsight_online
          ? <CheckCircle className="w-4 h-4" />
          : <AlertCircle className="w-4 h-4" />}
        <span className="text-sm font-medium">
          Hindsight Status: {memStatus?.hindsight_online ? 'Online' : 'Offline'}
        </span>
        {memStatus?.hindsight_url && (
          <span className="text-xs opacity-70 ml-auto">{memStatus.hindsight_url}</span>
        )}
      </div>

      {/* Explorer Controls */}
      <Card>
        <CardHeader><CardTitle>Search Memory Bank</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Select label="Select Website Memory Bank" options={wsOptions} value={selectedWebsite} onChange={e => setSelectedWebsite(e.target.value)} />
          <Input label="Semantic Search Query" placeholder="e.g. title tag optimization outcomes" value={query} onChange={e => setQuery(e.target.value)} />
          <div className="flex flex-wrap gap-2">
            {['recent audits', 'optimization actions that worked', 'competitor observations', 'keyword ranking changes', 'user feedback'].map(q => (
              <button key={q} onClick={() => setQuery(q)} className="text-xs bg-gray-800 hover:bg-gray-700 text-gray-400 px-2 py-1 rounded transition-colors">{q}</button>
            ))}
          </div>
          <Button onClick={handleExplore} loading={isLoading} disabled={!selectedWebsite}>
            <Search className="w-4 h-4" /> Query Memory Bank
          </Button>
        </CardContent>
      </Card>

      {/* Results */}
      {isLoading && (
        <div className="space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-24" />)}</div>
      )}

      {results && !isLoading && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-300">
              {results.items?.length || 0} memories retrieved
              {results.query && <span className="text-gray-500 font-normal"> — "{results.query}"</span>}
            </h3>
            {results.memory_available === false && (
              <Badge variant="warning">Memory Unavailable</Badge>
            )}
          </div>

          {results.items?.length === 0 && (
            <EmptyState
              icon={<Database className="w-10 h-10" />}
              title="No memories found"
              description="This memory bank is empty. Run audits, log optimizations, and generate recommendations to populate it."
            />
          )}

          <div className="space-y-3">
            {results.items?.map((mem: any, i: number) => {
              const colorClass = eventTypeColors[mem.event_type] || 'text-gray-400 bg-gray-800';
              return (
                <Card key={i}>
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${colorClass}`}>
                        {mem.event_type?.replace(/_/g, ' ') || 'memory'}
                      </span>
                      {mem.score != null && (
                        <span className="text-xs text-gray-500">relevance: {(mem.score * 100).toFixed(0)}%</span>
                      )}
                    </div>
                    <p className="text-sm text-gray-400 leading-relaxed">{mem.content || mem.text}</p>
                    {mem.created_at && (
                      <p className="text-xs text-gray-600 mt-2">{new Date(mem.created_at).toLocaleString()}</p>
                    )}
                    {mem.id && (
                      <p className="text-xs text-gray-700 mt-0.5 font-mono">ID: {mem.id}</p>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {!results && !isLoading && (
        <EmptyState
          icon={<Brain className="w-12 h-12 text-indigo-400" />}
          title="Select a website and search"
          description="Query your Hindsight memory bank to inspect audit summaries, optimization actions, outcomes, and competitor observations stored over time."
        />
      )}
    </div>
  );
}
