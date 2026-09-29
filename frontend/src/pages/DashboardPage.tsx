import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { dashboardApi, auditsApi, websitesApi, keywordsApi, optimizationsApi, recommendationsApi } from '../api/client';
import {
  StatCard, Card, CardHeader, CardTitle, CardContent, Badge,
  Skeleton, EmptyState, getScoreColor, getScoreBg, getSeverityVariant, getPriorityVariant
} from '../components/ui';
import {
  Globe, Search, Key, TrendingUp, Bot, Brain, AlertTriangle,
  CheckCircle, Activity, Plus, ArrowRight, Zap, Database
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area
} from 'recharts';
import { useAuth } from '../context/AuthContext';

export function DashboardPage() {
  const { user } = useAuth();

  const { data: metrics, isLoading: metricsLoading } = useQuery({
    queryKey: ['dashboard-metrics'],
    queryFn: dashboardApi.metrics,
    refetchInterval: 30000,
  });

  const { data: websites = [], isLoading: websitesLoading } = useQuery({
    queryKey: ['websites'],
    queryFn: websitesApi.list,
  });

  const latestWebsite = websites[0];

  const { data: recentAudits = [] } = useQuery({
    queryKey: ['recent-audits', latestWebsite?.id],
    queryFn: () => latestWebsite ? auditsApi.listForWebsite(latestWebsite.id) : Promise.resolve([]),
    enabled: !!latestWebsite,
  });

  const { data: recentRecs = [] } = useQuery({
    queryKey: ['recent-recommendations', latestWebsite?.id],
    queryFn: () => latestWebsite ? recommendationsApi.listForWebsite(latestWebsite.id) : Promise.resolve([]),
    enabled: !!latestWebsite,
  });

  const auditScoreHistory = recentAudits.slice(0, 10).reverse().map((a: any, i: number) => ({
    date: new Date(a.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    score: a.health_score,
  }));

  if (metricsLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-100">
            Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'}, {user?.full_name?.split(' ')[0] || 'there'} 👋
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Here's your SEO performance overview</p>
        </div>
        <div className="flex items-center gap-2">
          <div className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded-full ${metrics?.hindsight_online ? 'bg-emerald-500/10 text-emerald-400' : 'bg-gray-800 text-gray-500'}`}>
            <Brain className="w-3 h-3" />
            {metrics?.hindsight_online ? 'Memory Online' : 'Memory Offline'}
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Websites"
          value={metrics?.total_websites ?? 0}
          subtitle={metrics?.total_websites ? 'under management' : 'Add your first site'}
          icon={<Globe className="w-6 h-6" />}
        />
        <StatCard
          title="SEO Health Score"
          value={metrics?.latest_health_score ? `${metrics.latest_health_score}/100` : 'No audit'}
          subtitle="Latest audit score"
          icon={<Activity className="w-6 h-6" />}
          variant={metrics?.latest_health_score >= 80 ? 'success' : metrics?.latest_health_score >= 60 ? 'warning' : 'danger'}
        />
        <StatCard
          title="Critical Issues"
          value={metrics?.critical_issues ?? 0}
          subtitle={`${metrics?.total_issues ?? 0} total issues`}
          icon={<AlertTriangle className="w-6 h-6" />}
          variant={metrics?.critical_issues > 0 ? 'danger' : 'success'}
        />
        <StatCard
          title="Keywords Tracked"
          value={metrics?.tracked_keywords ?? 0}
          subtitle={`${metrics?.total_optimizations ?? 0} optimizations`}
          icon={<Key className="w-6 h-6" />}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* SEO Score Trend Chart */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>SEO Health Score Trend</CardTitle>
            {latestWebsite && (
              <Link to={`/websites/${latestWebsite.id}`} className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1">
                View details <ArrowRight className="w-3 h-3" />
              </Link>
            )}
          </CardHeader>
          <CardContent>
            {auditScoreHistory.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={auditScoreHistory}>
                  <defs>
                    <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                  <XAxis dataKey="date" stroke="#4b5563" tick={{ fontSize: 11 }} />
                  <YAxis domain={[0, 100]} stroke="#4b5563" tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#111827', border: '1px solid #1f2937', borderRadius: '8px', color: '#e5e7eb', fontSize: '12px' }}
                  />
                  <Area type="monotone" dataKey="score" stroke="#6366f1" strokeWidth={2} fill="url(#scoreGradient)" name="Health Score" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState
                icon={<Search className="w-8 h-8" />}
                title="No audit history yet"
                description="Run your first SEO audit to see health score trends"
                action={<Link to="/audits/new" className="text-sm text-indigo-400 hover:text-indigo-300">Run Audit →</Link>}
              />
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader><CardTitle>Quick Actions</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {[
              { to: '/websites', label: 'Add a website', icon: <Globe className="w-4 h-4" />, desc: 'Start tracking a new domain' },
              { to: '/audits/new', label: 'Run SEO Audit', icon: <Search className="w-4 h-4" />, desc: 'Analyze page health score' },
              { to: '/keywords', label: 'Track Keywords', icon: <Key className="w-4 h-4" />, desc: 'Monitor search positions' },
              { to: '/assistant', label: 'Ask AI Assistant', icon: <Bot className="w-4 h-4" />, desc: 'Get smart recommendations' },
              { to: '/memory-lab', label: 'Memory Lab Demo', icon: <Brain className="w-4 h-4" />, desc: 'See Hindsight in action', highlight: true },
            ].map(({ to, label, icon, desc, highlight }) => (
              <Link key={to} to={to} className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${highlight ? 'hover:bg-amber-500/5 border border-amber-500/20' : 'hover:bg-gray-800'}`}>
                <div className={`p-2 rounded-lg ${highlight ? 'bg-amber-500/10 text-amber-400' : 'bg-gray-800 text-gray-400'}`}>{icon}</div>
                <div className="min-w-0">
                  <p className={`text-sm font-medium ${highlight ? 'text-amber-400' : 'text-gray-300'}`}>{label}</p>
                  <p className="text-xs text-gray-500 truncate">{desc}</p>
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Issues */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent Audit Issues</CardTitle>
            {recentAudits[0] && (
              <Link to={`/audits/${recentAudits[0].id}`} className="text-xs text-indigo-400">
                Full report →
              </Link>
            )}
          </CardHeader>
          <CardContent className="space-y-2">
            {recentAudits[0]?.issues?.slice(0, 5).map((issue: any) => (
              <div key={issue.id} className="flex items-start gap-3 py-2 border-b border-gray-800 last:border-0">
                <Badge variant={getSeverityVariant(issue.severity)} className="mt-0.5 flex-shrink-0">
                  {issue.severity}
                </Badge>
                <div className="min-w-0">
                  <p className="text-sm text-gray-300 truncate">{issue.title}</p>
                  <p className="text-xs text-gray-500 truncate">{issue.description}</p>
                </div>
              </div>
            )) || (
              <EmptyState
                icon={<CheckCircle className="w-8 h-8 text-emerald-500" />}
                title="No issues yet"
                description="Run an SEO audit to see issues"
              />
            )}
          </CardContent>
        </Card>

        {/* Recent AI Recommendations */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent Recommendations</CardTitle>
            <Link to="/assistant" className="text-xs text-indigo-400">Generate new →</Link>
          </CardHeader>
          <CardContent className="space-y-2">
            {recentRecs.slice(0, 4).map((rec: any) => (
              <div key={rec.id} className="flex items-start gap-3 py-2 border-b border-gray-800 last:border-0">
                <Badge variant={getPriorityVariant(rec.priority)} className="mt-0.5 flex-shrink-0">
                  {rec.priority}
                </Badge>
                <div className="min-w-0">
                  <p className="text-sm text-gray-300 truncate">{rec.title}</p>
                  <p className="text-xs text-gray-500">{new Date(rec.created_at).toLocaleDateString()}</p>
                </div>
              </div>
            ))}
            {recentRecs.length === 0 && (
              <EmptyState
                icon={<Bot className="w-8 h-8" />}
                title="No recommendations yet"
                description="Ask the AI assistant for SEO recommendations"
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
