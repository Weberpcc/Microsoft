import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { websitesApi, optimizationsApi } from '../api/client';
import { useToast } from '../context/ToastContext';
import {
  PageHeader, Card, CardHeader, CardTitle, CardContent, Button, Input,
  Textarea, Select, EmptyState, Modal, Badge
} from '../components/ui';
import { TrendingUp, Plus, Brain, ThumbsUp, ThumbsDown, CheckCircle } from 'lucide-react';

export function OptimizationsPage() {
  const qc = useQueryClient();
  const toast = useToast();
  const [selectedWebsite, setSelectedWebsite] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [showOutcome, setShowOutcome] = useState<any>(null);
  const [form, setForm] = useState({ page_url: '', action_taken: '', previous_state: '', new_state: '', notes: '' });
  const [outcomeForm, setOutcomeForm] = useState({ outcome_description: '', impact_score: 0 });

  const { data: websites = [] } = useQuery({ queryKey: ['websites'], queryFn: websitesApi.list });
  const { data: optimizations = [], isLoading } = useQuery({
    queryKey: ['optimizations', selectedWebsite],
    queryFn: () => optimizationsApi.listForWebsite(selectedWebsite),
    enabled: !!selectedWebsite,
  });

  const createMutation = useMutation({
    mutationFn: optimizationsApi.create,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['optimizations'] }); setShowAdd(false); setForm({ page_url: '', action_taken: '', previous_state: '', new_state: '', notes: '' }); toast.success('Optimization logged and retained in Hindsight memory!'); },
    onError: (e: any) => toast.error(e.message),
  });

  const outcomeMutation = useMutation({
    mutationFn: optimizationsApi.recordOutcome,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['optimizations'] }); setShowOutcome(null); toast.success('Outcome recorded! Hindsight memory updated with result.'); },
    onError: (e: any) => toast.error(e.message),
  });

  const wsOptions = [
    { value: '', label: '— Select website —' },
    ...websites.map((w: any) => ({ value: w.id, label: `${w.name} (${w.domain})` })),
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Optimization History"
        subtitle="Log and track SEO optimization activities and their outcomes"
        action={<Button onClick={() => setShowAdd(true)} disabled={!selectedWebsite}><Plus className="w-4 h-4" /> Log Optimization</Button>}
      />

      <Select label="Select Website" options={wsOptions} value={selectedWebsite} onChange={e => setSelectedWebsite(e.target.value)} />

      {/* Hindsight Learning Loop Banner */}
      <div className="bg-indigo-500/5 border border-indigo-500/20 rounded-xl p-4 flex items-start gap-3">
        <Brain className="w-4 h-4 text-indigo-400 mt-0.5 flex-shrink-0" />
        <div className="text-xs">
          <p className="text-indigo-300 font-medium">Hindsight Learning Loop</p>
          <p className="text-indigo-400/70 mt-0.5">Every optimization action is retained in Hindsight persistent memory. When you record outcomes, the AI learns which optimizations actually worked, improving future recommendations for your specific website.</p>
        </div>
      </div>

      {selectedWebsite && !isLoading && optimizations.length === 0 && (
        <EmptyState
          icon={<TrendingUp className="w-10 h-10" />}
          title="No optimizations logged yet"
          description="Record your SEO optimization activities. Outcomes are stored in Hindsight memory and inform AI recommendations."
          action={<Button onClick={() => setShowAdd(true)}><Plus className="w-4 h-4" /> Log your first optimization</Button>}
        />
      )}

      <div className="space-y-3">
        {optimizations.map((opt: any) => (
          <Card key={opt.id}>
            <div className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-medium text-gray-300">{opt.action_taken}</p>
                    {opt.hindsight_memory_id && (
                      <span className="inline-flex items-center gap-1 text-xs text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full">
                        <Brain className="w-2.5 h-2.5" /> In Memory
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500">{opt.page_url}</p>
                  {opt.notes && <p className="text-xs text-gray-500 mt-1 italic">{opt.notes}</p>}
                  <p className="text-xs text-gray-600 mt-2">{new Date(opt.created_at).toLocaleString()}</p>
                </div>
                <div className="flex-shrink-0">
                  {opt.outcomes?.length > 0 ? (
                    <div className="text-center">
                      <span className={`text-lg font-bold ${opt.outcomes[0].impact_score > 0 ? 'text-emerald-400' : opt.outcomes[0].impact_score < 0 ? 'text-red-400' : 'text-gray-400'}`}>
                        {opt.outcomes[0].impact_score > 0 ? '+' : ''}{opt.outcomes[0].impact_score}
                      </span>
                      <p className="text-xs text-gray-500">impact</p>
                    </div>
                  ) : (
                    <Button size="sm" variant="outline" onClick={() => setShowOutcome(opt)}>
                      <CheckCircle className="w-3 h-3" /> Record Outcome
                    </Button>
                  )}
                </div>
              </div>

              {opt.previous_state && opt.new_state && (
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <div className="bg-gray-800 rounded p-2">
                    <p className="text-xs text-gray-500 mb-0.5">Before</p>
                    <p className="text-xs text-gray-400">{opt.previous_state}</p>
                  </div>
                  <div className="bg-indigo-500/5 border border-indigo-500/20 rounded p-2">
                    <p className="text-xs text-indigo-400 mb-0.5">After</p>
                    <p className="text-xs text-gray-400">{opt.new_state}</p>
                  </div>
                </div>
              )}

              {opt.outcomes?.length > 0 && (
                <div className="mt-3 bg-gray-800 rounded p-2">
                  <p className="text-xs text-gray-500 mb-0.5">Recorded Outcome</p>
                  <p className="text-xs text-gray-400">{opt.outcomes[0].outcome_description}</p>
                </div>
              )}
            </div>
          </Card>
        ))}
      </div>

      {/* Add Optimization Modal */}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Log SEO Optimization">
        <form className="space-y-4" onSubmit={e => { e.preventDefault(); createMutation.mutate({ ...form, website_id: selectedWebsite }); }}>
          <Input label="Target Page URL" placeholder="https://yoursite.com/page or /" value={form.page_url} onChange={e => setForm(f => ({ ...f, page_url: e.target.value }))} required />
          <Textarea label="Optimization Action" placeholder="e.g. Changed H1 from 'Services' to 'Professional SEO Services in [City]'" value={form.action_taken} onChange={e => setForm(f => ({ ...f, action_taken: e.target.value }))} rows={2} required />
          <Input label="Previous State (optional)" placeholder="Old title/description/content" value={form.previous_state} onChange={e => setForm(f => ({ ...f, previous_state: e.target.value }))} />
          <Input label="New State (optional)" placeholder="Updated title/description/content" value={form.new_state} onChange={e => setForm(f => ({ ...f, new_state: e.target.value }))} />
          <Textarea label="Notes (optional)" placeholder="Context, rationale, or additional notes" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} />
          <p className="text-xs text-indigo-400/70 flex items-center gap-1"><Brain className="w-3 h-3" /> This will be retained in Hindsight persistent memory</p>
          <Button type="submit" loading={createMutation.isPending} className="w-full">Log Optimization</Button>
        </form>
      </Modal>

      {/* Record Outcome Modal */}
      <Modal open={!!showOutcome} onClose={() => setShowOutcome(null)} title="Record Optimization Outcome">
        <div className="space-y-4">
          <div className="bg-gray-800 rounded-lg p-3">
            <p className="text-xs text-gray-500 mb-1">Optimization</p>
            <p className="text-sm text-gray-300">{showOutcome?.action_taken}</p>
          </div>
          <Textarea label="What happened?" placeholder="Describe the observed outcome, e.g. 'Keyword moved from position 14 to position 7 within 3 weeks'" value={outcomeForm.outcome_description} onChange={e => setOutcomeForm(f => ({ ...f, outcome_description: e.target.value }))} rows={3} required />
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Impact Score ({outcomeForm.impact_score > 0 ? '+' : ''}{outcomeForm.impact_score})</label>
            <input type="range" min="-10" max="10" value={outcomeForm.impact_score} onChange={e => setOutcomeForm(f => ({ ...f, impact_score: Number(e.target.value) }))} className="w-full accent-indigo-500" />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>-10 (negative)</span><span>0 (neutral)</span><span>+10 (very positive)</span>
            </div>
          </div>
          <Button className="w-full" loading={outcomeMutation.isPending} onClick={() => outcomeMutation.mutate({ optimization_id: showOutcome?.id, ...outcomeForm })}>
            Record Outcome
          </Button>
        </div>
      </Modal>
    </div>
  );
}
