import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { websitesApi, agentApi } from '../api/client';
import { useToast } from '../context/ToastContext';
import {
  PageHeader, Card, CardHeader, CardTitle, CardContent, Button, Select, Textarea,
  Badge, EmptyState, Skeleton
} from '../components/ui';
import {
  FlaskConical, Brain, Zap, AlertCircle, CheckCircle, ArrowRight,
  Lightbulb, List, Info, Play
} from 'lucide-react';

export function MemoryLabPage() {
  const toast = useToast();
  const [selectedWebsite, setSelectedWebsite] = useState('');
  const [query, setQuery] = useState('What are the most important SEO improvements I should make based on my history?');
  const [result, setResult] = useState<any>(null);

  const { data: websites = [] } = useQuery({ queryKey: ['websites'], queryFn: websitesApi.list });

  const compareMutation = useMutation({
    mutationFn: ({ websiteId, query }: any) => agentApi.memoryLabComparison(websiteId, query),
    onSuccess: (data) => { setResult(data); },
    onError: (e: any) => toast.error(e.message || 'Memory Lab comparison failed'),
  });

  const wsOptions = [
    { value: '', label: '— Select website —' },
    ...websites.map((w: any) => ({ value: w.id, label: `${w.name} (${w.domain})` })),
  ];

  const suggestions = [
    'What are the most important SEO improvements I should make based on my history?',
    'Which page optimizations have worked best for this site?',
    'What patterns do you see in my SEO audit history?',
    'What should I focus on next based on past outcomes?',
    'How has my SEO performance trended and what explains it?',
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Memory Lab"
        subtitle="Hackathon showcase: compare AI responses with and without Hindsight persistent memory"
      />

      {/* Explanation Banner */}
      <div className="bg-gradient-to-r from-indigo-900/30 via-purple-900/20 to-indigo-900/30 border border-indigo-500/30 rounded-xl p-5">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-indigo-600/30 flex items-center justify-center flex-shrink-0">
            <FlaskConical className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-indigo-300 mb-2">How Memory Lab Works</h2>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 text-xs text-indigo-300/70">
              <div className="flex items-start gap-2">
                <div className="w-5 h-5 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400 font-bold flex-shrink-0 mt-0.5">A</div>
                <div>
                  <p className="font-medium text-indigo-300">Without Memory</p>
                  <p>Standard AI reasoning using only current audit data and general SEO knowledge. No historical context.</p>
                </div>
              </div>
              <div className="flex items-center justify-center text-indigo-500">
                <ArrowRight className="w-4 h-4" />
              </div>
              <div className="flex items-start gap-2">
                <div className="w-5 h-5 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-400 font-bold flex-shrink-0 mt-0.5">B</div>
                <div>
                  <p className="font-medium text-amber-300">With Hindsight Memory</p>
                  <p>Same model, same current data — but with Hindsight recall of past audits, optimizations, and outcomes.</p>
                </div>
              </div>
            </div>
            <p className="text-xs text-indigo-400/60 mt-3 flex items-center gap-1">
              <Info className="w-3 h-3 flex-shrink-0" />
              Both scenarios use the same Groq model and current website data. The only difference is historical memory context.
            </p>
          </div>
        </div>
      </div>

      {/* Configuration */}
      <Card>
        <CardHeader><CardTitle>Configure Comparison</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <Select
            label="Select Website"
            options={wsOptions}
            value={selectedWebsite}
            onChange={e => setSelectedWebsite(e.target.value)}
          />
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Your Query</label>
            <Textarea
              value={query}
              onChange={e => setQuery(e.target.value)}
              rows={3}
              placeholder="Ask a question that benefits from historical context..."
            />
            <div className="flex flex-wrap gap-2 mt-2">
              {suggestions.map(s => (
                <button key={s} onClick={() => setQuery(s)} className="text-xs bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-gray-300 px-2 py-1 rounded transition-colors max-w-xs truncate">
                  {s}
                </button>
              ))}
            </div>
          </div>
          <Button
            size="lg"
            onClick={() => compareMutation.mutate({ websiteId: selectedWebsite, query })}
            loading={compareMutation.isPending}
            disabled={!selectedWebsite || !query}
            className="w-full"
          >
            <Play className="w-4 h-4" />
            {compareMutation.isPending ? 'Running both scenarios...' : 'Run Memory Lab Comparison'}
          </Button>
        </CardContent>
      </Card>

      {/* Loading State */}
      {compareMutation.isPending && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {['A — Without Memory', 'B — With Hindsight'].map(label => (
            <Card key={label}>
              <CardHeader><CardTitle>{label}</CardTitle></CardHeader>
              <CardContent className="space-y-3 py-6">
                <div className="flex items-center gap-3">
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-indigo-500 border-t-transparent" />
                  <p className="text-sm text-gray-400">Generating response...</p>
                </div>
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
                <Skeleton className="h-4 w-4/6" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Results */}
      {result && !compareMutation.isPending && (
        <div className="space-y-4">
          {/* Memory Status */}
          <div className={`flex items-center gap-2 text-sm px-4 py-2.5 rounded-lg border ${
            result.memory_available
              ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-400'
              : 'bg-amber-500/5 border-amber-500/20 text-amber-400'
          }`}>
            {result.memory_available
              ? <><CheckCircle className="w-4 h-4" /> Hindsight memory was available — {result.scenario_b?.memories_retrieved || 0} memories retrieved</>
              : <><AlertCircle className="w-4 h-4" /> Hindsight was offline — Scenario B used the same reasoning as Scenario A (degraded mode)</>
            }
          </div>

          {/* Side-by-side comparison */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ScenarioPanel
              label="A"
              title="Without Memory"
              subtitle="Standard AI reasoning"
              accent="indigo"
              scenario={result.scenario_a}
              query={result.query}
            />
            <ScenarioPanel
              label="B"
              title="With Hindsight Memory"
              subtitle={`${result.scenario_b?.memories_retrieved || 0} historical memories retrieved`}
              accent="amber"
              scenario={result.scenario_b}
              query={result.query}
              memoryAvailable={result.memory_available}
            />
          </div>

          {/* Comparison Summary */}
          {result.comparison_summary && (
            <Card className="border-indigo-500/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-indigo-400" /> Memory Lab Analysis
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-400">{result.comparison_summary}</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {!result && !compareMutation.isPending && (
        <EmptyState
          icon={<FlaskConical className="w-12 h-12 text-indigo-400" />}
          title="Ready to compare"
          description="Select a website, enter your query, and run the Memory Lab comparison to see how Hindsight persistent memory changes AI recommendations."
        />
      )}
    </div>
  );
}

interface ScenarioPanelProps {
  label: string;
  title: string;
  subtitle: string;
  accent: 'indigo' | 'amber';
  scenario: any;
  query: string;
  memoryAvailable?: boolean;
}

function ScenarioPanel({ label, title, subtitle, accent, scenario, query, memoryAvailable }: ScenarioPanelProps) {
  if (!scenario) return null;

  const accentClasses = accent === 'amber'
    ? { border: 'border-amber-500/30', bg: 'bg-amber-500/10', text: 'text-amber-400', badge: 'bg-amber-500/20 text-amber-400' }
    : { border: 'border-indigo-500/30', bg: 'bg-indigo-500/10', text: 'text-indigo-400', badge: 'bg-indigo-500/20 text-indigo-400' };

  return (
    <Card className={`border ${accentClasses.border}`}>
      <CardHeader className={`border-b border-gray-800 ${accentClasses.bg}`}>
        <div className="flex items-center gap-3">
          <div className={`w-7 h-7 rounded-lg ${accentClasses.bg} border ${accentClasses.border} flex items-center justify-center`}>
            <span className={`text-xs font-bold ${accentClasses.text}`}>{label}</span>
          </div>
          <div>
            <CardTitle className={accentClasses.text}>{title}</CardTitle>
            <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>
          </div>
          {accent === 'amber' && memoryAvailable && (
            <Brain className={`w-4 h-4 ${accentClasses.text} ml-auto`} />
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4 py-4">
        {/* Summary */}
        {scenario.summary && (
          <div>
            <p className="text-xs font-medium text-gray-500 mb-1">Summary</p>
            <p className="text-sm text-gray-300">{scenario.summary}</p>
          </div>
        )}

        {/* Recommendations */}
        {scenario.recommendations?.length > 0 && (
          <div>
            <p className="text-xs font-medium text-gray-500 mb-2">Recommendations</p>
            <div className="space-y-2">
              {scenario.recommendations.map((rec: string, i: number) => (
                <div key={i} className="flex gap-2 text-xs text-gray-400">
                  <span className={`flex-shrink-0 w-4 h-4 rounded-full ${accentClasses.bg} ${accentClasses.text} flex items-center justify-center text-[10px] font-bold`}>{i + 1}</span>
                  {rec}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Historical Context — only for Scenario B */}
        {accent === 'amber' && scenario.historical_context && (
          <div>
            <p className={`text-xs font-medium ${accentClasses.text} mb-1 flex items-center gap-1`}>
              <Brain className="w-3 h-3" /> Historical Context from Hindsight
            </p>
            <div className={`bg-amber-500/5 border border-amber-500/20 rounded p-2 text-xs text-gray-400`}>
              {scenario.historical_context}
            </div>
          </div>
        )}

        {/* Memory IDs */}
        {accent === 'amber' && scenario.memory_ids?.length > 0 && (
          <div>
            <p className={`text-xs font-medium ${accentClasses.text} mb-1`}>Memory Evidence ({scenario.memory_ids.length})</p>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {scenario.memory_ids.map((m: any, i: number) => (
                <div key={i} className={`text-xs bg-amber-500/5 border border-amber-500/10 rounded p-2`}>
                  <span className={`${accentClasses.text} uppercase text-[10px] font-medium`}>{m.event_type || 'memory'}</span>
                  <p className="text-gray-500 mt-0.5 line-clamp-2">{m.content || m.text}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Degraded mode notice */}
        {accent === 'amber' && !memoryAvailable && (
          <div className="bg-amber-500/5 border border-amber-500/20 rounded p-3 text-xs text-amber-400">
            <AlertCircle className="w-3 h-3 inline mr-1" />
            Hindsight was offline — this response mirrors Scenario A without historical memory enhancement
          </div>
        )}
      </CardContent>
    </Card>
  );
}
