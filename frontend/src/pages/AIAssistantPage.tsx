import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { websitesApi, recommendationsApi } from '../api/client';
import { useToast } from '../context/ToastContext';
import {
  PageHeader, Card, CardContent, Button, Select, Textarea, Badge,
  EmptyState, Modal, Input, getPriorityVariant
} from '../components/ui';
import { Bot, Brain, Send, ThumbsUp, ThumbsDown, Lightbulb, Star, List, AlertCircle } from 'lucide-react';

export function AIAssistantPage() {
  const [searchParams] = useSearchParams();
  const qc = useQueryClient();
  const toast = useToast();
  const [selectedWebsite, setSelectedWebsite] = useState(searchParams.get('website') || '');
  const [query, setQuery] = useState('');
  const [useMemory, setUseMemory] = useState(true);
  const [showFeedback, setShowFeedback] = useState<any>(null);
  const [feedbackRating, setFeedbackRating] = useState(5);
  const [feedbackText, setFeedbackText] = useState('');

  const { data: websites = [] } = useQuery({ queryKey: ['websites'], queryFn: websitesApi.list });
  const { data: recommendations = [] } = useQuery({
    queryKey: ['recommendations', selectedWebsite],
    queryFn: () => recommendationsApi.listForWebsite(selectedWebsite),
    enabled: !!selectedWebsite,
  });

  const generateMutation = useMutation({
    mutationFn: recommendationsApi.generate,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['recommendations'] }); toast.success('Recommendation generated!'); setQuery(''); },
    onError: (e: any) => toast.error(e.message),
  });

  const feedbackMutation = useMutation({
    mutationFn: recommendationsApi.submitFeedback,
    onSuccess: () => { setShowFeedback(null); toast.success('Feedback submitted! Hindsight memory updated.'); },
    onError: (e: any) => toast.error(e.message),
  });

  const wsOptions = [
    { value: '', label: '— Select website —' },
    ...websites.map((w: any) => ({ value: w.id, label: `${w.name} (${w.domain})` })),
  ];

  const suggestions = [
    'What are the highest priority SEO issues I should fix first?',
    'Recommend an optimization strategy for my homepage',
    'How can I improve my content to rank for long-tail keywords?',
    'What meta tag improvements should I prioritize?',
    'Analyze my internal linking structure and suggest improvements',
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="AI SEO Assistant"
        subtitle="Memory-aware AI that learns from your website's optimization history"
      />

      {/* Config Panel */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <Select
            label="Select Website"
            options={wsOptions}
            value={selectedWebsite}
            onChange={e => setSelectedWebsite(e.target.value)}
          />

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Your Question</label>
            <Textarea
              placeholder="Ask for SEO recommendations, strategy advice, or optimization help..."
              value={query}
              onChange={e => setQuery(e.target.value)}
              rows={3}
            />
            <div className="flex flex-wrap gap-2 mt-2">
              {suggestions.map(s => (
                <button
                  key={s}
                  onClick={() => setQuery(s)}
                  className="text-xs bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-gray-300 px-2 py-1 rounded transition-colors"
                >{s}</button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer group">
              <div className={`relative w-10 h-5 rounded-full transition-colors ${useMemory ? 'bg-indigo-600' : 'bg-gray-700'}`} onClick={() => setUseMemory(!useMemory)}>
                <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${useMemory ? 'translate-x-5' : ''}`} />
              </div>
              <span className="text-sm text-gray-400 flex items-center gap-1">
                <Brain className="w-3.5 h-3.5 text-indigo-400" />
                Use Hindsight Memory
              </span>
            </label>
            <Button
              onClick={() => generateMutation.mutate({ website_id: selectedWebsite, user_query: query, use_hindsight_memory: useMemory })}
              loading={generateMutation.isPending}
              disabled={!selectedWebsite}
            >
              <Send className="w-4 h-4" /> Generate Recommendation
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Generated Recommendations */}
      {!selectedWebsite ? (
        <EmptyState icon={<Bot className="w-10 h-10" />} title="Select a website to get started" description="Choose a website above and ask the AI assistant for personalized SEO recommendations." />
      ) : recommendations.length === 0 && !generateMutation.isPending ? (
        <EmptyState icon={<Lightbulb className="w-10 h-10" />} title="No recommendations yet" description="Ask the AI assistant your first question to get personalized, memory-informed SEO recommendations." />
      ) : (
        <div className="space-y-4">
          {generateMutation.isPending && (
            <Card>
              <CardContent className="py-8">
                <div className="flex flex-col items-center gap-3">
                  <div className="relative">
                    <div className="animate-spin rounded-full h-10 w-10 border-2 border-indigo-500 border-t-transparent" />
                    <Brain className="absolute inset-0 m-auto w-4 h-4 text-indigo-400" />
                  </div>
                  <p className="text-sm text-gray-400">Retrieving Hindsight memories and generating recommendation...</p>
                </div>
              </CardContent>
            </Card>
          )}

          {recommendations.map((rec: any) => (
            <RecommendationCard
              key={rec.id}
              rec={rec}
              onFeedback={r => setShowFeedback(r)}
            />
          ))}
        </div>
      )}

      {/* Feedback Modal */}
      <Modal open={!!showFeedback} onClose={() => setShowFeedback(null)} title="Rate this Recommendation">
        <div className="space-y-4">
          <p className="text-sm text-gray-400">"{showFeedback?.title}"</p>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Rating</label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map(star => (
                <button key={star} onClick={() => setFeedbackRating(star)} className={`text-2xl transition-transform hover:scale-110 ${feedbackRating >= star ? 'text-amber-400' : 'text-gray-700'}`}>★</button>
              ))}
            </div>
          </div>
          <Textarea label="Feedback (optional)" placeholder="Was this recommendation helpful? What worked or didn't work?" value={feedbackText} onChange={e => setFeedbackText(e.target.value)} rows={3} />
          <p className="text-xs text-indigo-400/70 flex items-center gap-1"><Brain className="w-3 h-3" /> Your feedback is stored in Hindsight to improve future recommendations</p>
          <Button className="w-full" loading={feedbackMutation.isPending}
            onClick={() => feedbackMutation.mutate({ recommendation_id: showFeedback?.id, rating: feedbackRating, feedback_text: feedbackText })}>
            Submit Feedback
          </Button>
        </div>
      </Modal>
    </div>
  );
}

function RecommendationCard({ rec, onFeedback }: { rec: any; onFeedback: (r: any) => void }) {
  const [expanded, setExpanded] = useState(true);
  const memories = rec.memory_ids || [];
  const hasMemories = memories.length > 0;

  return (
    <Card className="overflow-hidden">
      <div className="p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className="p-2 bg-indigo-500/10 rounded-lg flex-shrink-0"><Lightbulb className="w-4 h-4 text-indigo-400" /></div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-semibold text-gray-200">{rec.title}</h3>
                <Badge variant={getPriorityVariant(rec.priority)}>{rec.priority} priority</Badge>
                {hasMemories && (
                  <span className="inline-flex items-center gap-1 text-xs text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full">
                    <Brain className="w-2.5 h-2.5" /> {memories.length} memories used
                  </span>
                )}
              </div>
              {rec.affected_page && <p className="text-xs text-gray-500 mt-0.5">{rec.affected_page}</p>}
            </div>
          </div>
          <button onClick={() => onFeedback(rec)} className="flex-shrink-0 text-xs text-gray-500 hover:text-amber-400 transition-colors flex items-center gap-1">
            <Star className="w-3.5 h-3.5" /> Rate
          </button>
        </div>

        <p className="text-sm text-gray-400 mb-4">{rec.description}</p>

        {/* Reasoning */}
        <div className="bg-gray-800 rounded-lg p-3 mb-3">
          <p className="text-xs font-medium text-gray-400 mb-1 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" /> Reasoning
          </p>
          <p className="text-xs text-gray-400">{rec.reasoning}</p>
        </div>

        {/* Implementation Steps */}
        {rec.implementation_steps?.length > 0 && (
          <div className="mb-3">
            <p className="text-xs font-medium text-gray-400 mb-2 flex items-center gap-1">
              <List className="w-3 h-3" /> Implementation Steps
            </p>
            <ol className="space-y-1">
              {rec.implementation_steps.map((step: string, i: number) => (
                <li key={i} className="flex gap-2 text-xs text-gray-400">
                  <span className="flex-shrink-0 w-4 h-4 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-[10px] font-bold">{i + 1}</span>
                  {step}
                </li>
              ))}
            </ol>
          </div>
        )}

        {/* Memory Evidence */}
        {hasMemories && (
          <div className="border-t border-gray-800 pt-3 mt-3">
            <p className="text-xs font-medium text-indigo-400 mb-2 flex items-center gap-1">
              <Brain className="w-3 h-3" /> Hindsight Memory Evidence ({memories.length} retrieved)
            </p>
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {memories.slice(0, 5).map((m: any, i: number) => (
                <div key={i} className="text-xs bg-indigo-500/5 border border-indigo-500/10 rounded p-2">
                  <span className="text-indigo-400/60 uppercase text-[10px] font-medium">{m.event_type || 'memory'}</span>
                  <p className="text-gray-500 mt-0.5 line-clamp-2">{m.content}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <p className="text-xs text-gray-600 mt-3">{new Date(rec.created_at).toLocaleString()}</p>
      </div>
    </Card>
  );
}
