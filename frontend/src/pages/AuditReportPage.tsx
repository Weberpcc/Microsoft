import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { auditsApi } from '../api/client';
import { Card, CardHeader, CardTitle, CardContent, Badge, Button, Skeleton, EmptyState, PageHeader, getSeverityVariant, getScoreColor } from '../components/ui';
import { AlertTriangle, Info, CheckCircle, Brain, Globe, Clock, ExternalLink } from 'lucide-react';

function ScoreBar({ score }: { score: number }) {
  const color = score >= 80 ? 'bg-emerald-500' : score >= 60 ? 'bg-amber-500' : 'bg-red-500';
  return (
    <div className="w-full bg-gray-800 rounded-full h-2 mt-2">
      <div className={`${color} h-2 rounded-full transition-all duration-700`} style={{ width: `${score}%` }} />
    </div>
  );
}

export function AuditReportPage() {
  const { id } = useParams<{ id: string }>();
  const { data: audit, isLoading } = useQuery({
    queryKey: ['audit', id],
    queryFn: () => auditsApi.get(id!),
    enabled: !!id,
  });

  if (isLoading) return <div className="space-y-4"><Skeleton className="h-8 w-64" /><Skeleton className="h-48" /></div>;
  if (!audit) return <div className="text-gray-400">Audit report not found</div>;

  const criticals = audit.issues?.filter((i: any) => i.severity === 'critical') || [];
  const warnings = audit.issues?.filter((i: any) => i.severity === 'warning') || [];
  const infos = audit.issues?.filter((i: any) => i.severity === 'info') || [];
  const pageDetails = audit.audit_data?.page_details || {};

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit Report"
        subtitle={`Generated ${new Date(audit.created_at).toLocaleString()}`}
        action={<Link to="/audits/new"><Button size="sm">Run New Audit</Button></Link>}
      />

      {/* Score Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="p-6">
          <div className="text-center">
            <p className={`text-6xl font-bold ${getScoreColor(audit.health_score)}`}>{audit.health_score}</p>
            <p className="text-gray-500 text-sm mt-1">/ 100 SEO Health</p>
            <ScoreBar score={audit.health_score} />
            <p className="text-xs text-gray-500 mt-3">
              {audit.health_score >= 80 ? '🟢 Excellent' : audit.health_score >= 60 ? '🟡 Needs Improvement' : '🔴 Poor – Action Required'}
            </p>
          </div>
        </Card>

        <Card className="lg:col-span-2 p-6">
          <h3 className="text-sm font-semibold text-gray-300 mb-4">Issue Breakdown</h3>
          <div className="space-y-3">
            {[
              { label: 'Critical Issues', count: audit.critical_count, color: 'bg-red-500', textColor: 'text-red-400', desc: 'Must fix immediately' },
              { label: 'Warnings', count: audit.warning_count, color: 'bg-amber-500', textColor: 'text-amber-400', desc: 'Should fix soon' },
              { label: 'Informational', count: audit.info_count, color: 'bg-indigo-500', textColor: 'text-indigo-400', desc: 'Consider improving' },
            ].map(({ label, count, color, textColor, desc }) => (
              <div key={label}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-gray-400">{label}</span>
                  <span className={`font-medium ${textColor}`}>{count} — {desc}</span>
                </div>
                <div className="w-full bg-gray-800 rounded-full h-1.5">
                  <div className={`${color} h-1.5 rounded-full`} style={{ width: `${Math.min(100, (count / (audit.total_issues || 1)) * 100)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Page Details Summary */}
      {pageDetails.url && (
        <Card>
          <CardHeader><CardTitle>Page Analysis Details</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
              {[
                { label: 'Target URL', value: pageDetails.url, full: true },
                { label: 'Title', value: pageDetails.title || '(missing)', warn: !pageDetails.title },
                { label: 'Meta Description', value: pageDetails.meta_description ? `${pageDetails.meta_description.length} chars` : '(missing)', warn: !pageDetails.meta_description },
                { label: 'Primary H1', value: pageDetails.primary_h1 || '(missing)', warn: !pageDetails.primary_h1 },
                { label: 'H1 Count', value: pageDetails.h1_count ?? 'N/A', warn: pageDetails.h1_count !== 1 },
                { label: 'Images', value: pageDetails.total_images ?? 0 },
                { label: 'Missing Alt Text', value: pageDetails.missing_alt_count ?? 0, warn: pageDetails.missing_alt_count > 0 },
                { label: 'Word Count', value: pageDetails.word_count ?? 0, warn: pageDetails.word_count < 250 },
                { label: 'Internal Links', value: pageDetails.internal_links_count ?? 0 },
                { label: 'HTTPS', value: pageDetails.is_https ? '✓ Secure' : '✕ Insecure', warn: !pageDetails.is_https },
                { label: 'Canonical', value: pageDetails.canonical ? '✓ Present' : '✕ Missing', warn: !pageDetails.canonical },
                { label: 'Robots Meta', value: pageDetails.robots_meta || 'None' },
              ].map(({ label, value, warn, full }) => (
                <div key={label} className={full ? 'lg:col-span-4' : ''}>
                  <p className="text-gray-500 mb-0.5">{label}</p>
                  <p className={`font-medium truncate ${warn ? 'text-amber-400' : 'text-gray-300'}`}>{String(value)}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Hindsight Memory Banner */}
      <div className="flex items-center gap-3 bg-indigo-500/5 border border-indigo-500/20 rounded-xl p-4">
        <Brain className="w-5 h-5 text-indigo-400 flex-shrink-0" />
        <div>
          <p className="text-sm font-medium text-indigo-300">Retained in Hindsight Persistent Memory</p>
          <p className="text-xs text-indigo-400/70 mt-0.5">This audit summary has been stored in your website's memory bank and will inform future AI recommendations.</p>
        </div>
      </div>

      {/* Summary */}
      {audit.summary && (
        <Card>
          <CardHeader><CardTitle>AI-Generated Summary</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm text-gray-400">{audit.summary}</p>
          </CardContent>
        </Card>
      )}

      {/* Issues by Severity */}
      {[
        { list: criticals, label: 'Critical Issues', color: 'text-red-400', icon: <AlertTriangle className="w-4 h-4 text-red-400" /> },
        { list: warnings, label: 'Warnings', color: 'text-amber-400', icon: <AlertTriangle className="w-4 h-4 text-amber-400" /> },
        { list: infos, label: 'Informational', color: 'text-indigo-400', icon: <Info className="w-4 h-4 text-indigo-400" /> },
      ].filter(g => g.list.length > 0).map(({ list, label, color, icon }) => (
        <Card key={label}>
          <CardHeader>
            <div className="flex items-center gap-2">
              {icon}
              <CardTitle className={color}>{label} ({list.length})</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {list.map((issue: any) => (
              <div key={issue.id} className="border-l-2 border-gray-700 pl-3 py-1">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium text-gray-300">{issue.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{issue.description}</p>
                    {issue.recommendation && (
                      <p className="text-xs text-indigo-400 mt-1">→ {issue.recommendation}</p>
                    )}
                    {issue.affected_url && (
                      <p className="text-xs text-gray-600 mt-0.5 truncate">{issue.affected_url}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ))}

      {audit.issues?.length === 0 && (
        <EmptyState
          icon={<CheckCircle className="w-12 h-12 text-emerald-500" />}
          title="No issues found"
          description="Excellent! Your page passes all technical SEO checks."
        />
      )}
    </div>
  );
}
