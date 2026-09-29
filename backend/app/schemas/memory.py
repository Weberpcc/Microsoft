from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel

class MemoryItem(BaseModel):
    id: Optional[str] = None
    bank_id: str
    content: str
    event_type: str # audit_summary, optimization_action, ranking_outcome, competitor_change
    entity_name: Optional[str] = None
    created_at: Optional[str] = None
    score: Optional[float] = None
    metadata: Optional[Dict[str, Any]] = None

class MemoryQueryResult(BaseModel):
    query: str
    bank_id: str
    retrieved_memories: List[MemoryItem] = []
    synthesized_reflection: Optional[str] = None
    memory_available: bool = True

class MemoryLabComparisonResponse(BaseModel):
    website_id: str
    user_query: str
    current_seo_context: Dict[str, Any]
    retrieved_memories: List[MemoryItem] = []
    
    # Scenario A: Baseline response without memory
    scenario_a_no_memory: Dict[str, Any]
    scenario_a: Optional[Dict[str, Any]] = None
    
    # Scenario B: Memory-enhanced response using Hindsight
    scenario_b_with_memory: Dict[str, Any]
    scenario_b: Optional[Dict[str, Any]] = None
    
    reasoning_differences: str
    comparison_summary: Optional[str] = None
    query: Optional[str] = None
    memory_available: bool = True
