import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams, Link } from 'react-router-dom';
import { websitesApi, auditsApi } from '../api/client';
import { useToast } from '../context/ToastContext';
import {
  PageHeader, Card, CardHeader, CardTitle, CardContent, Button, Select,
  Input, Badge, EmptyState, Skeleton, getSeverityVariant
} from '../components/ui';
import { Search, Play, AlertTriangle, CheckCircle, Info, Globe, Brain } from 'lucide-react';

export function SEOAuditPage() {
  const [searchParams] = useSearchParams();
  const qc = useQueryClient();
  const toast = useToast();
  const [selectedWebsite, setSelectedWebsite] = useState(searchParams.get('website') || '');
  const [customUrl, setCustomUrl] = useState('');
  const [latestAudit, setLatestAudit] = useState<any>(null);

  const { data: websites = [] } = useQuery({
    queryKey: ['websites'],
    queryFn: websitesApi.list,
  });

  const runMutation = useMutation({
    mutationFn: auditsApi.run,
    onSuccess: (data) => {
      setLatestAudit(data);
      qc.invalidateQueries({ queryKey: ['audits'] });
      toast.success(`Audit complete! Score: ${data.health_score}/100. Memory retained in Hindsight.`);
    },
    onError: (e: any) => toast.error(e.message || 'Audit failed'),
  });

  const handleRun = () => {
    if (!selectedWebsite) {
      toast.error('Please select a website first');
      return;
    }
    runMutation.mutate({
      website_id: selectedWebsite,
      url: customUrl || undefined,
    });
  };

  const websiteOptions = [
    { value: '', label: '— Select a website —' },
    ...websites.map((w: any) => ({ value: w.id, label: `${w.name} (${w.domain})` })),
  ];

  const selectedSite = websites.find((w: any) => w.id === selectedWebsite);

  return (
    <div className="space-y-6">
      <PageHeader
        title="SEO Audit"
        subtitle="Analyze your website's technical SEO health and get actionable insights"
      />

      {/* Audit Configuration Card */}
      <Card>
        <CardHeader><CardTitle>Configure Audit</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <Select
            label="Select Website"
            options={websiteOptions}
            value={selectedWebsite}
            onChange={e => setSelectedWebsite(e.target.value)}
          />
          <Input
            label="Custom URL to audit (optional)"
            placeholder={selectedSite ? `https://${selectedSite.domain}/page` : 'https://yoursite.com/specific-page'}
            value={customUrl}
            onChange={e => setCustomUrl(e.target.value)}
          />

          <div className="bg-indigo-500/5 border border-indigo-500/20 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Brain className="w-4 h-4 text-indigo-400 mt-0.5 flex-shrink-0" />
              <div className="text-xs text-indigo-300">
                <p className="font-medium">Hindsight Learning Loop Active</p>
                <p className="text-indigo-400/70 mt-0.5">Audit results will be automatically retained in your website's Hindsight memory bank and used to inform future AI recommendations.</p>
              </div>
            </div>
          </div>

          <Button
            onClick={handleRun}
            loading={runMutation.isPending}
            disabled={!selectedWebsite}
            size="lg"
          >
            <Play className="w-4 h-4" />
            {runMutation.isPending ? 'Auditing...' : 'Run SEO Audit'}
          </Button>
        </CardContent>
      </Card>

      {/* Audit Results */}
      {runMutation.isPending && (
        <Card>
          <CardContent className="py-8">
            <div className="flex flex-col items-center gap-4">
              <div className="animate-spin rounded-full h-10 w-10 border-2 border-indigo-500 border-t-transparent" />
              <div className="text-center">
                <p className="text-sm font-medium text-gray-300">Analyzing website...</p>
                <p className="text-xs text-gray-500 mt-1">Checking titles, meta tags, headings, canonicals, links, and more</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {latestAudit && !runMutation.isPending && (
        <AuditResults audit={latestAudit} />
      )}

      {/* Previous audits */}
      {selectedWebsite && !latestAudit && (
        <PreviousAudits websiteId={selectedWebsite} />
      )}
    </div>
  );
}

function AuditResults({ audit }: { audit: any }) {
  const score = audit.health_score;
  const scoreColor = score >= 80 ? 'text-emerald-400' : score >= 60 ? 'text-amber-400' : 'text-red-400';
  const criticals = audit.issues?.filter((i: any) => i.severity === 'critical') || [];
  const warnings = audit.issues?.filter((i: any) => i.severity === 'warning') || [];
  const infos = audit.issues?.filter((i: any) => i.severity === 'info') || [];

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="py-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-6">
              <div className="text-center">
                <p className={`text-5xl font-bold ${scoreColor}`}>{score}</p>
                <p className="text-xs text-gray-500 mt-1">/ 100 SEO Score</p>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-red-400" />
                  <span className="text-xs text-gray-400">{criticals.length} critical issues</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-400" />
                  <span className="text-xs text-gray-400">{warnings.length} warnings</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-indigo-400" />
                  <span className="text-xs text-gray-400">{infos.length} informational</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/20 rounded-lg px-3 py-2">
              <Brain className="w-4 h-4 text-indigo-400" />
              <span className="text-xs text-indigo-300">Retained in Hindsight memory</span>
            </div>
          </div>
          {audit.summary && (
            <div className="mt-4 p-3 bg-gray-800 rounded-lg">
              <p className="text-xs text-gray-400">{audit.summary}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="space-y-2">
        {audit.issues?.map((issue: any) => (
          <IssueRow key={issue.id} issue={issue} />
        ))}
      </div>

      <div className="flex justify-end">
        <Link to={`/audits/${audit.id}`}>
          <Button variant="outline" size="sm">View Full Report →</Button>
        </Link>
      </div>
    </div>
  );
}

function IssueRow({ issue }: { issue: any }) {
  const [expanded, setExpanded] = useState(false);
  const icons: Record<string, React.ReactNode> = {
    critical: <AlertTriangle className="w-4 h-4 text-red-400" />,
    warning: <AlertTriangle className="w-4 h-4 text-amber-400" />,
    info: <Info className="w-4 h-4 text-indigo-400" />,
  };

  return (
    <Card className="cursor-pointer hover:border-gray-700 transition-colors">
      <div className="p-4" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-center gap-3">
          {icons[issue.severity]}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-300">{issue.title}</p>
            {issue.affected_url && <p className="text-xs text-gray-500 truncate mt-0.5">{issue.affected_url}</p>}
          </div>
          <Badge variant={getSeverityVariant(issue.severity)}>{issue.severity}</Badge>
        </div>
        {expanded && (
          <div className="mt-3 pt-3 border-t border-gray-800 space-y-2">
            <p className="text-xs text-gray-400">{issue.description}</p>
            {issue.recommendation && (
              <div className="bg-gray-800 rounded p-2">
                <p className="text-xs font-medium text-indigo-400 mb-1">Recommendation</p>
                <p className="text-xs text-gray-400">{issue.recommendation}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}

function PreviousAudits({ websiteId }: { websiteId: string }) {
  const { data: audits = [], isLoading } = useQuery({
    queryKey: ['audits', websiteId],
    queryFn: () => auditsApi.listForWebsite(websiteId),
  });

  if (isLoading) return <Skeleton className="h-32" />;
  if (audits.length === 0) return null;

  return (
    <Card>
      <CardHeader><CardTitle>Previous Audit Reports</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        {audits.slice(0, 5).map((a: any) => (
          <Link key={a.id} to={`/audits/${a.id}`}>
            <div className="flex items-center justify-between py-2 border-b border-gray-800 last:border-0 hover:opacity-80 transition-opacity">
              <div className="flex items-center gap-3">
                <span className={`font-bold ${a.health_score >= 80 ? 'text-emerald-400' : a.health_score >= 60 ? 'text-amber-400' : 'text-red-400'}`}>{a.health_score}</span>
                <span className="text-xs text-gray-500">{new Date(a.created_at).toLocaleString()}</span>
              </div>
              <span className="text-xs text-gray-600">{a.critical_count} critical · {a.warning_count} warnings →</span>
            </div>
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}
