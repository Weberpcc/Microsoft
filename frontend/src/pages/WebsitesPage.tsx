import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { websitesApi } from '../api/client';
import { useToast } from '../context/ToastContext';
import {
  PageHeader, Card, Button, Badge, Modal, Input, Textarea, Select,
  EmptyState, ConfirmDialog, Skeleton, getScoreColor
} from '../components/ui';
import { Globe, Plus, ExternalLink, Trash2, Edit, ChevronRight, Activity } from 'lucide-react';

const COUNTRIES = [
  { value: 'US', label: 'United States' },
  { value: 'GB', label: 'United Kingdom' },
  { value: 'IN', label: 'India' },
  { value: 'CA', label: 'Canada' },
  { value: 'AU', label: 'Australia' },
  { value: 'DE', label: 'Germany' },
  { value: 'FR', label: 'France' },
];

function WebsiteForm({ onSubmit, loading, initial }: {
  onSubmit: (data: any) => void;
  loading: boolean;
  initial?: any;
}) {
  const [form, setForm] = useState({
    domain: initial?.domain || '',
    name: initial?.name || '',
    target_country: initial?.target_country || 'US',
    description: initial?.description || '',
  });

  return (
    <form className="space-y-4" onSubmit={e => { e.preventDefault(); onSubmit(form); }}>
      <Input
        label="Website URL or Domain"
        placeholder="https://yoursite.com or yoursite.com"
        value={form.domain}
        onChange={e => setForm(f => ({ ...f, domain: e.target.value }))}
        required
        disabled={!!initial}
      />
      <Input
        label="Website Name"
        placeholder="My Company Website"
        value={form.name}
        onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
        required
      />
      <Select
        label="Target Country"
        options={COUNTRIES}
        value={form.target_country}
        onChange={e => setForm(f => ({ ...f, target_country: e.target.value }))}
      />
      <Textarea
        label="Description (optional)"
        placeholder="Brief description of this website..."
        value={form.description}
        onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
        rows={3}
      />
      <Button type="submit" loading={loading} className="w-full">
        {initial ? 'Update Website' : 'Add Website'}
      </Button>
    </form>
  );
}

export function WebsitesPage() {
  const qc = useQueryClient();
  const toast = useToast();
  const [showAdd, setShowAdd] = useState(false);
  const [editSite, setEditSite] = useState<any>(null);
  const [deleteSite, setDeleteSite] = useState<any>(null);

  const { data: websites = [], isLoading } = useQuery({
    queryKey: ['websites'],
    queryFn: websitesApi.list,
  });

  const createMutation = useMutation({
    mutationFn: websitesApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['websites'] });
      setShowAdd(false);
      toast.success('Website added and Hindsight memory bank initialized!');
    },
    onError: (e: any) => toast.error(e.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: any) => websitesApi.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['websites'] });
      setEditSite(null);
      toast.success('Website updated');
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: websitesApi.delete,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['websites'] });
      setDeleteSite(null);
      toast.success('Website removed');
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div>
      <PageHeader
        title="Website Management"
        subtitle="Manage the websites you're optimizing with SEO-Mind"
        action={
          <Button onClick={() => setShowAdd(true)}>
            <Plus className="w-4 h-4" /> Add Website
          </Button>
        }
      />

      {isLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-40" />)}
        </div>
      ) : websites.length === 0 ? (
        <EmptyState
          icon={<Globe className="w-12 h-12" />}
          title="No websites yet"
          description="Add your first website to start tracking its SEO performance and create a Hindsight memory bank."
          action={<Button onClick={() => setShowAdd(true)}><Plus className="w-4 h-4" /> Add your first website</Button>}
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {websites.map((site: any) => (
            <Card key={site.id} className="hover:border-gray-700 transition-colors">
              <div className="p-5">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-lg bg-indigo-500/10 flex items-center justify-center flex-shrink-0">
                      <Globe className="w-4 h-4 text-indigo-400" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-gray-200 truncate">{site.name}</h3>
                      <p className="text-xs text-gray-500 truncate">{site.domain}</p>
                    </div>
                  </div>
                  {site.latest_health_score != null && (
                    <div className="text-right flex-shrink-0">
                      <p className={`text-lg font-bold ${getScoreColor(site.latest_health_score)}`}>
                        {site.latest_health_score}
                      </p>
                      <p className="text-xs text-gray-500">health</p>
                    </div>
                  )}
                </div>

                {site.description && (
                  <p className="text-xs text-gray-500 mb-3 line-clamp-2">{site.description}</p>
                )}

                <div className="flex items-center gap-4 text-xs text-gray-500 mb-4">
                  <span className="flex items-center gap-1"><Activity className="w-3 h-3" /> {site.total_audits || 0} audits</span>
                  <span className="flex items-center gap-1"><Globe className="w-3 h-3" /> {site.total_keywords || 0} keywords</span>
                  <Badge variant="default">{site.target_country}</Badge>
                </div>

                <div className="flex items-center gap-2">
                  <Link to={`/websites/${site.id}`} className="flex-1">
                    <Button variant="secondary" size="sm" className="w-full">
                      View Details <ChevronRight className="w-3 h-3" />
                    </Button>
                  </Link>
                  <Button variant="ghost" size="sm" onClick={() => setEditSite(site)}>
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setDeleteSite(site)}>
                    <Trash2 className="w-4 h-4 text-red-400" />
                  </Button>
                  <a href={`https://${site.domain}`} target="_blank" rel="noopener noreferrer">
                    <Button variant="ghost" size="sm">
                      <ExternalLink className="w-4 h-4" />
                    </Button>
                  </a>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Add Modal */}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add Website">
        <WebsiteForm onSubmit={data => createMutation.mutate(data)} loading={createMutation.isPending} />
      </Modal>

      {/* Edit Modal */}
      <Modal open={!!editSite} onClose={() => setEditSite(null)} title="Edit Website">
        {editSite && (
          <WebsiteForm
            initial={editSite}
            onSubmit={data => updateMutation.mutate({ id: editSite.id, data })}
            loading={updateMutation.isPending}
          />
        )}
      </Modal>

      {/* Confirm Delete */}
      <ConfirmDialog
        open={!!deleteSite}
        onClose={() => setDeleteSite(null)}
        onConfirm={() => deleteSite && deleteMutation.mutate(deleteSite.id)}
        title="Remove Website"
        message={`Are you sure you want to remove "${deleteSite?.name}"? This will delete all associated audits, keywords, and optimization history.`}
        confirmLabel="Remove Website"
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
