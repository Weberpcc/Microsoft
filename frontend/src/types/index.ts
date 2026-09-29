export interface User {
  id: string;
  email: string;
  full_name?: string;
  is_active: boolean;
  is_superuser: boolean;
  created_at: string;
}

export interface Website {
  id: string;
  user_id: string;
  domain: string;
  name: string;
  target_country: string;
  description?: string;
  created_at: string;
  updated_at: string;
  latest_health_score?: number;
  total_audits?: number;
  total_keywords?: number;
}

export interface SEOIssue {
  id: string;
  audit_id: string;
  issue_type: string;
  severity: 'critical' | 'warning' | 'info';
  title: string;
  description: string;
  recommendation?: string;
  affected_url?: string;
  created_at: string;
}

export interface SEOAudit {
  id: string;
  website_id: string;
  health_score: number;
  total_issues: number;
  critical_count: number;
  warning_count: number;
  info_count: number;
  summary?: string;
  audit_data?: any;
  issues: SEOIssue[];
  created_at: string;
}

export interface KeywordObservation {
  id: string;
  keyword_id: string;
  position: number;
  source: string;
  observed_at: string;
}

export interface Keyword {
  id: string;
  website_id: string;
  keyword: string;
  target_page?: string;
  search_volume: number;
  difficulty: number;
  current_position?: number;
  previous_position?: number;
  created_at: string;
  observations: KeywordObservation[];
}

export interface OptimizationOutcome {
  id: string;
  optimization_id: string;
  outcome_description: string;
  impact_score: number;
  recorded_at: string;
}

export interface OptimizationEvent {
  id: string;
  website_id: string;
  page_url: string;
  keyword_id?: string;
  action_taken: string;
  previous_state?: string;
  new_state?: string;
  notes?: string;
  hindsight_memory_id?: string;
  created_at: string;
  outcomes: OptimizationOutcome[];
}

export interface CompetitorObservation {
  id: string;
  competitor_id: string;
  page_url: string;
  title?: string;
  h1?: string;
  meta_description?: string;
  heading_structure?: any;
  observed_changes?: string;
  observed_at: string;
}

export interface Competitor {
  id: string;
  website_id: string;
  name: string;
  domain_url: string;
  notes?: string;
  created_at: string;
  observations: CompetitorObservation[];
}

export interface RecommendationFeedback {
  id: string;
  recommendation_id: string;
  rating: number;
  feedback_text?: string;
  created_at: string;
}

export interface AIRecommendation {
  id: string;
  website_id: string;
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  affected_page?: string;
  related_keyword?: string;
  reasoning: string;
  implementation_steps?: string[];
  memory_ids?: any[];
  created_at: string;
  feedback: RecommendationFeedback[];
}

export interface MemoryItem {
  id?: string;
  bank_id: string;
  content: string;
  event_type: string;
  entity_name?: string;
  created_at?: string;
  score?: number;
  metadata?: Record<string, any>;
}

export interface MemoryLabComparison {
  website_id: string;
  user_query: string;
  current_seo_context: {
    domain: string;
    audit_score: number;
    total_keywords: number;
  };
  retrieved_memories: MemoryItem[];
  scenario_a_no_memory: {
    title: string;
    description: string;
    priority: string;
    affected_page?: string;
    related_keyword?: string;
    reasoning: string;
    implementation_steps?: string[];
    memory_attribution?: string;
  };
  scenario_b_with_memory: {
    title: string;
    description: string;
    priority: string;
    affected_page?: string;
    related_keyword?: string;
    reasoning: string;
    implementation_steps?: string[];
    memory_attribution?: string;
  };
  reasoning_differences: string;
  memory_available: boolean;
}

export interface DashboardMetrics {
  total_websites: number;
  latest_health_score: number;
  total_issues: number;
  critical_issues: number;
  tracked_keywords: number;
  total_optimizations: number;
  total_recommendations: number;
  hindsight_online: boolean;
}
