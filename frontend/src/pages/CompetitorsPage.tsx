import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { websitesApi, competitorsApi } from '../api/client';
import { useToast } from '../context/ToastContext';
import { PageHeader, Card, Button, Input, Select, EmptyState, Modal, Badge } from '../components/ui';
import { Users2, Plus, Globe, Eye, Brain } from 'lucide-react';

export function CompetitorsPage() {
  const [searchParams] = useSearchParams();
  const qc = useQueryClient();
  const toast = useToast();
  const [selectedWebsite, setSelectedWebsite] = useState(searchParams.get('website') || '');
  const [showAdd, setShowAdd] = useState(false);
  const [showObserve, setShowObserve] = useState<any>(null);
  const [form, setForm] = useState({ name: '', domain_url: '', notes: '' });
  const [observeUrl, setObserveUrl] = useState('');

  const { data: websites = [] } = useQuery({ queryKey: ['websites'], queryFn: websitesApi.list });
  const { data: competitors = [], isLoading } = useQuery({
    queryKey: ['competitors', selectedWebsite],
    queryFn: () => competitorsApi.listForWebsite(selectedWebsite),
    enabled: !!selectedWebsite,
  });

  const createMutation = useMutation({
    mutationFn: competitorsApi.create,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['competitors'] }); setShowAdd(false); setForm({ name: '', domain_url: '', notes: '' }); toast.success('Competitor added!'); },
    onError: (e: any) => toast.error(e.message),
  });

  const observeMutation = useMutation({
    mutationFn: ({ competitorId, pageUrl }: any) => competitorsApi.observe(competitorId, pageUrl),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['competitors'] }); setShowObserve(null); toast.success('Competitor page analyzed and retained in Hindsight!'); },
    onError: (e: any) => toast.error(e.message),
  });

  const wsOptions = [
    { value: '', label: '— Select website —' },
    ...websites.map((w: any) => ({ value: w.id, label: `${w.name} (${w.domain})` })),
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Competitor Intelligence"
        subtitle="Track and analyze your competitors' SEO strategies"
        action={<Button onClick={() => setShowAdd(true)} disabled={!selectedWebsite}><Plus className="w-4 h-4" /> Add Competitor</Button>}
      />

      <Select label="Select Website" options={wsOptions} value={selectedWebsite} onChange={e => setSelectedWebsite(e.target.value)} />

      {selectedWebsite && !isLoading && competitors.length === 0 && (
        <EmptyState
          icon={<Users2 className="w-10 h-10" />}
          title="No competitors tracked"
          description="Add your competitors to observe their SEO strategies. Competitor observations are retained in Hindsight memory."
          action={<Button onClick={() => setShowAdd(true)}><Plus className="w-4 h-4" /> Add first competitor</Button>}
        />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {competitors.map((c: any) => (
          <Card key={c.id}>
            <div className="p-5">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-gray-800 flex items-center justify-center">
                    <Globe className="w-4 h-4 text-gray-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-200">{c.name}</h3>
                    <p className="text-xs text-gray-500">{c.domain_url}</p>
                  </div>
                </div>
                <Button size="sm" variant="secondary" onClick={() => { setShowObserve(c); setObserveUrl(`https://${c.domain_url}`); }}>
                  <Eye className="w-3 h-3" /> Observe
                </Button>
              </div>
              {c.notes && <p className="text-xs text-gray-500 mb-3">{c.notes}</p>}
              {c.observations?.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-gray-500">{c.observations.length} page observations</p>
                  {c.observations.slice(0, 2).map((obs: any) => (
                    <div key={obs.id} className="bg-gray-800 rounded p-2 text-xs">
                      <p className="text-gray-400 truncate">{obs.page_url}</p>
                      <p className="text-gray-600">{new Date(obs.created_at).toLocaleDateString()}</p>
                      {obs.hindsight_memory_id && (
                        <span className="text-indigo-400/70 flex items-center gap-1 mt-0.5"><Brain className="w-2.5 h-2.5" /> In Hindsight</span>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-600">No observations yet — click Observe to analyze a page</p>
              )}
            </div>
          </Card>
        ))}
      </div>

      {/* Add Competitor Modal */}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add Competitor">
        <form className="space-y-4" onSubmit={e => { e.preventDefault(); createMutation.mutate({ ...form, website_id: selectedWebsite }); }}>
          <Input label="Competitor Name" placeholder="Competitor Inc." value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
          <Input label="Domain URL" placeholder="competitor.com" value={form.domain_url} onChange={e => setForm(f => ({ ...f, domain_url: e.target.value }))} required />
          <Input label="Notes (optional)" placeholder="Why are they a competitor?" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
          <Button type="submit" loading={createMutation.isPending} className="w-full">Add Competitor</Button>
        </form>
      </Modal>

      {/* Observe Page Modal */}
      <Modal open={!!showObserve} onClose={() => setShowObserve(null)} title={`Observe: ${showObserve?.name}`}>
        <div className="space-y-4">
          <p className="text-sm text-gray-400">Enter a competitor page URL to analyze its SEO. The results will be retained in Hindsight memory for AI analysis.</p>
          <Input label="Page URL to Analyze" placeholder="https://competitor.com/key-page" value={observeUrl} onChange={e => setObserveUrl(e.target.value)} />
          <p className="text-xs text-indigo-400/70 flex items-center gap-1"><Brain className="w-3 h-3" /> Observation will be retained in Hindsight persistent memory</p>
          <Button className="w-full" loading={observeMutation.isPending}
            onClick={() => observeMutation.mutate({ competitorId: showObserve?.id, pageUrl: observeUrl })}>
            <Eye className="w-4 h-4" /> Analyze Page
          </Button>
        </div>
      </Modal>
    </div>
  );
}
