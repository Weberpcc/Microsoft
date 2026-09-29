import React, { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { websitesApi, keywordsApi } from '../api/client';
import { useToast } from '../context/ToastContext';
import {
  PageHeader, Card, CardHeader, CardTitle, CardContent, Button, Input, Select,
  EmptyState, Modal, Badge, Skeleton
} from '../components/ui';
import { Key, Plus, Upload, TrendingUp, TrendingDown, Minus, Target } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export function KeywordTrackingPage() {
  const [searchParams] = useSearchParams();
  const qc = useQueryClient();
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);

  const [selectedWebsite, setSelectedWebsite] = useState(searchParams.get('website') || '');
  const [showAdd, setShowAdd] = useState(false);
  const [showObserve, setShowObserve] = useState<any>(null);
  const [form, setForm] = useState({ keyword: '', target_page: '', search_volume: '', difficulty: '', current_position: '' });
  const [obsPosition, setObsPosition] = useState('');

  const { data: websites = [] } = useQuery({ queryKey: ['websites'], queryFn: websitesApi.list });

  const { data: keywords = [], isLoading } = useQuery({
    queryKey: ['keywords', selectedWebsite],
    queryFn: () => keywordsApi.listForWebsite(selectedWebsite),
    enabled: !!selectedWebsite,
  });

  const createMutation = useMutation({
    mutationFn: keywordsApi.create,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['keywords'] }); setShowAdd(false); toast.success('Keyword added!'); },
    onError: (e: any) => toast.error(e.message),
  });

  const observeMutation = useMutation({
    mutationFn: keywordsApi.recordObservation,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['keywords'] }); setShowObserve(null); toast.success('Position recorded!'); },
    onError: (e: any) => toast.error(e.message),
  });

  const importMutation = useMutation({
    mutationFn: ({ websiteId, file }: any) => keywordsApi.importCsv(websiteId, file),
    onSuccess: (data) => { qc.invalidateQueries({ queryKey: ['keywords'] }); toast.success(`Imported ${data.length} keywords`); },
    onError: (e: any) => toast.error(e.message),
  });

  const websiteOptions = [
    { value: '', label: '— Select website —' },
    ...websites.map((w: any) => ({ value: w.id, label: `${w.name} (${w.domain})` })),
  ];

  const improving = keywords.filter((k: any) => k.current_position && k.previous_position && k.current_position < k.previous_position);
  const declining = keywords.filter((k: any) => k.current_position && k.previous_position && k.current_position > k.previous_position);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Keyword Tracking"
        subtitle="Monitor keyword rankings and track position changes over time"
        action={
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => fileRef.current?.click()} disabled={!selectedWebsite}>
              <Upload className="w-3 h-3" /> Import CSV
            </Button>
            <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={e => {
              const f = e.target.files?.[0];
              if (f && selectedWebsite) importMutation.mutate({ websiteId: selectedWebsite, file: f });
              e.target.value = '';
            }} />
            <Button onClick={() => setShowAdd(true)} disabled={!selectedWebsite}>
              <Plus className="w-4 h-4" /> Add Keyword
            </Button>
          </div>
        }
      />

      {/* Website Selector */}
      <Select
        label="Select Website"
        options={websiteOptions}
        value={selectedWebsite}
        onChange={e => setSelectedWebsite(e.target.value)}
      />

      {selectedWebsite && (
        <>
          {/* Stats Bar */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Total Tracked', value: keywords.length, icon: <Key className="w-5 h-5" /> },
              { label: 'Improving', value: improving.length, icon: <TrendingUp className="w-5 h-5 text-emerald-400" />, color: 'text-emerald-400' },
              { label: 'Declining', value: declining.length, icon: <TrendingDown className="w-5 h-5 text-red-400" />, color: 'text-red-400' },
              { label: 'Top 10', value: keywords.filter((k: any) => k.current_position && k.current_position <= 10).length, icon: <Target className="w-5 h-5 text-amber-400" />, color: 'text-amber-400' },
            ].map(({ label, value, icon, color }) => (
              <Card key={label} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-500">{label}</p>
                    <p className={`text-2xl font-bold ${color || 'text-gray-100'} mt-0.5`}>{value}</p>
                  </div>
                  <div className="text-gray-600">{icon}</div>
                </div>
              </Card>
            ))}
          </div>

          {/* Keywords Table */}
          {isLoading ? (
            <div className="space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16" />)}</div>
          ) : keywords.length === 0 ? (
            <EmptyState
              icon={<Key className="w-10 h-10" />}
              title="No keywords tracked"
              description="Add keywords to monitor or import a CSV. CSV format: keyword, position, target_page, search_volume, difficulty"
              action={<Button onClick={() => setShowAdd(true)}><Plus className="w-4 h-4" /> Add first keyword</Button>}
            />
          ) : (
            <Card>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-800">
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Keyword</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Target Page</th>
                      <th className="text-center px-4 py-3 text-xs font-medium text-gray-500">Position</th>
                      <th className="text-center px-4 py-3 text-xs font-medium text-gray-500">Change</th>
                      <th className="text-center px-4 py-3 text-xs font-medium text-gray-500">Volume</th>
                      <th className="text-center px-4 py-3 text-xs font-medium text-gray-500">Difficulty</th>
                      <th className="text-center px-4 py-3 text-xs font-medium text-gray-500">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {keywords.map((kw: any) => {
                      const trend = kw.current_position && kw.previous_position
                        ? kw.current_position < kw.previous_position ? 'up' : kw.current_position > kw.previous_position ? 'down' : 'flat'
                        : null;
                      return (
                        <tr key={kw.id} className="border-b border-gray-800 hover:bg-gray-800/30 transition-colors">
                          <td className="px-4 py-3 font-medium text-gray-300">{kw.keyword}</td>
                          <td className="px-4 py-3 text-gray-500 text-xs truncate max-w-xs">{kw.target_page || '—'}</td>
                          <td className="px-4 py-3 text-center">
                            {kw.current_position
                              ? <span className="font-bold text-gray-200">#{kw.current_position}</span>
                              : <span className="text-gray-600 text-xs">–</span>}
                          </td>
                          <td className="px-4 py-3 text-center text-xs">
                            {trend === 'up' && <span className="text-emerald-400">↑ {kw.previous_position - kw.current_position}</span>}
                            {trend === 'down' && <span className="text-red-400">↓ {kw.current_position - kw.previous_position}</span>}
                            {trend === 'flat' && <span className="text-gray-600">–</span>}
                            {!trend && <span className="text-gray-600">–</span>}
                          </td>
                          <td className="px-4 py-3 text-center text-gray-500">{kw.search_volume?.toLocaleString() || '—'}</td>
                          <td className="px-4 py-3 text-center">
                            {kw.difficulty > 0 ? (
                              <div className="flex items-center justify-center">
                                <span className={`text-xs font-medium ${kw.difficulty >= 70 ? 'text-red-400' : kw.difficulty >= 40 ? 'text-amber-400' : 'text-emerald-400'}`}>{kw.difficulty}</span>
                              </div>
                            ) : <span className="text-gray-600">—</span>}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <Button size="sm" variant="ghost" onClick={() => setShowObserve(kw)}>Record Position</Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </>
      )}

      {!selectedWebsite && (
        <EmptyState icon={<Key className="w-10 h-10" />} title="Select a website" description="Choose a website to view and manage its tracked keywords." />
      )}

      {/* Add Keyword Modal */}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add Keyword">
        <form className="space-y-4" onSubmit={e => { e.preventDefault(); createMutation.mutate({ ...form, website_id: selectedWebsite, search_volume: Number(form.search_volume) || 0, difficulty: Number(form.difficulty) || 0, current_position: Number(form.current_position) || undefined }); }}>
          <Input label="Keyword" placeholder="e.g. best seo tools 2026" value={form.keyword} onChange={e => setForm(f => ({ ...f, keyword: e.target.value }))} required />
          <Input label="Target Page URL" placeholder="/products or https://..." value={form.target_page} onChange={e => setForm(f => ({ ...f, target_page: e.target.value }))} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Search Volume" type="number" placeholder="1200" value={form.search_volume} onChange={e => setForm(f => ({ ...f, search_volume: e.target.value }))} />
            <Input label="Difficulty (0-100)" type="number" min="0" max="100" placeholder="45" value={form.difficulty} onChange={e => setForm(f => ({ ...f, difficulty: e.target.value }))} />
          </div>
          <Input label="Current Position (optional)" type="number" placeholder="e.g. 12" value={form.current_position} onChange={e => setForm(f => ({ ...f, current_position: e.target.value }))} />
          <Button type="submit" loading={createMutation.isPending} className="w-full">Add Keyword</Button>
        </form>
      </Modal>

      {/* Record Observation Modal */}
      <Modal open={!!showObserve} onClose={() => setShowObserve(null)} title={`Record Position: ${showObserve?.keyword}`}>
        <div className="space-y-4">
          {showObserve?.current_position && (
            <div className="bg-gray-800 rounded-lg p-3 text-sm text-gray-400">
              Current recorded position: <strong className="text-gray-200">#{showObserve.current_position}</strong>
            </div>
          )}
          <Input label="New Position" type="number" min="1" placeholder="e.g. 8" value={obsPosition} onChange={e => setObsPosition(e.target.value)} autoFocus />
          <Button className="w-full" loading={observeMutation.isPending} onClick={() => observeMutation.mutate({ keyword_id: showObserve?.id, position: Number(obsPosition), source: 'manual' })}>
            Record Position
          </Button>
        </div>
      </Modal>
    </div>
  );
}
