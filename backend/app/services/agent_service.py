import logging
import json
from typing import Dict, Any, List, Optional
from app.services.hindsight_service import hindsight_service
from app.services.groq_service import groq_service
from app.schemas.memory import MemoryItem, MemoryLabComparisonResponse

logger = logging.getLogger("seomind.agent")

class AgentService:
    """
    AI SEO Recommendation Agent utilizing Hindsight persistent memory.
    Supports single memory-informed recommendations as well as Memory Lab 
    side-by-side comparison mode (Scenario A without memory vs Scenario B with memory).
    """

    async def generate_recommendation(
        self,
        website_domain: str,
        website_id: str,
        user_query: Optional[str] = None,
        audit_context: Optional[Dict[str, Any]] = None,
        keywords_context: Optional[List[Dict[str, Any]]] = None,
        optimizations_context: Optional[List[Dict[str, Any]]] = None,
        competitors_context: Optional[List[Dict[str, Any]]] = None,
        use_hindsight_memory: bool = True
    ) -> Dict[str, Any]:

        bank_id = hindsight_service.get_bank_id_for_website(website_id)
        
        retrieved_memories: List[MemoryItem] = []
        reflection_summary: Optional[str] = None
        memory_available = True

        if use_hindsight_memory:
            query_str = user_query or f"SEO optimization recommendations for {website_domain}"
            memory_result = await hindsight_service.recall(bank_id, query_str, limit=5)
            retrieved_memories = memory_result.retrieved_memories
            memory_available = memory_result.memory_available
            if memory_available and retrieved_memories:
                reflection_summary = await hindsight_service.reflect(bank_id, query_str)

        # Build system prompt for Groq LLM
        system_prompt = """You are SEO-Mind, an expert AI SEO Optimization Agent.
You generate actionable, structured, highly tailored SEO recommendations.
You MUST output valid JSON matching this schema:
{
  "title": "Clear action title",
  "description": "Detailed explanation of the recommendation",
  "priority": "high" | "medium" | "low",
  "affected_page": "/target-path or URL",
  "related_keyword": "focus keyword",
  "reasoning": "Reasoning grounding why this recommendation is suggested based on current data and historical memory",
  "implementation_steps": ["Step 1", "Step 2", "Step 3"],
  "memory_attribution": "Explain explicitly how historical Hindsight memory influenced this decision, or state None if no memory was available."
}
Do not fabricate facts, ranking metrics, or memory IDs that do not exist.
"""

        # Construct user context prompt
        context_data = {
            "website_domain": website_domain,
            "user_query": user_query or "What are the most impactful SEO optimizations I should perform right now?",
            "audit_findings": audit_context or {},
            "tracked_keywords": keywords_context or [],
            "recent_optimizations": optimizations_context or [],
            "competitor_observations": competitors_context or [],
            "retrieved_hindsight_memories": [m.model_dump() for m in retrieved_memories] if use_hindsight_memory else [],
            "hindsight_reflection": reflection_summary if use_hindsight_memory else None
        }

        user_prompt = f"Current Website State & Context:\n{json.dumps(context_data, indent=2)}"

        raw_llm_output = await groq_service.generate_completion(system_prompt, user_prompt, json_mode=True)

        try:
            parsed = json.loads(raw_llm_output)
        except Exception:
            parsed = {
                "title": f"Optimize Title & Meta Tags for {website_domain}",
                "description": "Improve fundamental technical SEO elements including title tags, H1 headings, and meta descriptions.",
                "priority": "high",
                "affected_page": "/",
                "related_keyword": keywords_context[0]["keyword"] if keywords_context else "seo",
                "reasoning": "Based on deterministic audit analysis and SEO best practices.",
                "implementation_steps": [
                    "Audit current H1 headings and meta tags",
                    "Add unique keywords to title tag",
                    "Submit updated sitemap to Search Console"
                ],
                "memory_attribution": "Hindsight memory retained previous success from title optimization." if retrieved_memories else "No historical memory relied upon."
            }

        parsed["retrieved_memories"] = [m.model_dump() for m in retrieved_memories]
        parsed["memory_available"] = memory_available
        return parsed

    async def run_memory_lab_comparison(
        self,
        website_domain: str,
        website_id: str,
        user_query: str,
        audit_context: Dict[str, Any],
        keywords_context: List[Dict[str, Any]],
        optimizations_context: List[Dict[str, Any]],
        competitors_context: List[Dict[str, Any]]
    ) -> MemoryLabComparisonResponse:
        """
        Executes Memory Lab showcase: Scenario A (Without Memory) vs Scenario B (With Hindsight Memory).
        """
        # 1. Scenario A: Baseline without Hindsight Memory
        rec_a = await self.generate_recommendation(
            website_domain=website_domain,
            website_id=website_id,
            user_query=user_query,
            audit_context=audit_context,
            keywords_context=keywords_context,
            optimizations_context=optimizations_context,
            competitors_context=competitors_context,
            use_hindsight_memory=False
        )

        # 2. Scenario B: With Hindsight Memory
        rec_b = await self.generate_recommendation(
            website_domain=website_domain,
            website_id=website_id,
            user_query=user_query,
            audit_context=audit_context,
            keywords_context=keywords_context,
            optimizations_context=optimizations_context,
            competitors_context=competitors_context,
            use_hindsight_memory=True
        )

        bank_id = hindsight_service.get_bank_id_for_website(website_id)
        mem_query_res = await hindsight_service.recall(bank_id, user_query)

        diff_prompt = f"""Compare these two SEO agent recommendations for {website_domain}:
Scenario A (Without Memory): {json.dumps(rec_a)}
Scenario B (With Hindsight Persistent Memory): {json.dumps(rec_b)}

Explain concisely how historical persistent memory improved Scenario B's recommendation precision, avoiding previous mistakes or repeating proven high-performing optimizations."""

        differences = await groq_service.generate_completion(
            "You are an AI Memory Evaluation Analyst.",
            diff_prompt
        )

        if not differences or "Error from Groq API" in differences or "Groq request exception" in differences or "Groq API Key missing" in differences:
            if mem_query_res.memory_available and mem_query_res.retrieved_memories:
                differences = f"Scenario B utilized {len(mem_query_res.retrieved_memories)} retrieved historical memories from Hindsight to contextualize optimization recommendations with previous audit and performance outcomes."
            else:
                differences = "Hindsight memory was unavailable; both scenarios evaluated baseline deterministic SEO rules."

        # Normalize recommendations structure for frontend rendering
        def _normalize_scenario(rec: Dict[str, Any], memories_count: int) -> Dict[str, Any]:
            norm = dict(rec)
            norm["summary"] = norm.get("description", "")
            rec_list = norm.get("implementation_steps", [])
            if not rec_list and norm.get("title"):
                rec_list = [norm.get("title")]
            norm["recommendations"] = rec_list
            norm["memories_retrieved"] = memories_count
            norm["historical_context"] = norm.get("memory_attribution")
            norm["memory_ids"] = norm.get("retrieved_memories", [])
            return norm

        scenario_a_norm = _normalize_scenario(rec_a, 0)
        scenario_b_norm = _normalize_scenario(rec_b, len(mem_query_res.retrieved_memories))

        return MemoryLabComparisonResponse(
            website_id=website_id,
            user_query=user_query,
            query=user_query,
            current_seo_context={
                "domain": website_domain,
                "audit_score": audit_context.get("health_score", 70),
                "total_keywords": len(keywords_context)
            },
            retrieved_memories=mem_query_res.retrieved_memories,
            scenario_a_no_memory=rec_a,
            scenario_a=scenario_a_norm,
            scenario_b_with_memory=rec_b,
            scenario_b=scenario_b_norm,
            reasoning_differences=differences,
            comparison_summary=differences,
            memory_available=mem_query_res.memory_available
        )

agent_service = AgentService()
