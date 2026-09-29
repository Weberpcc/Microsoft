import logging
import json
import httpx
from typing import Dict, Any, Optional, Type, TypeVar
from pydantic import BaseModel
from app.core.config import settings

logger = logging.getLogger("seomind.groq")

T = TypeVar("T", bound=BaseModel)

class GroqService:
    """
    Service wrapper for Groq LLM inference with structured JSON output parsing.
    """

    @property
    def api_key(self) -> str:
        return settings.GROQ_API_KEY

    @property
    def model(self) -> str:
        return settings.GROQ_MODEL

    async def generate_completion(self, system_prompt: str, user_prompt: str, json_mode: bool = False) -> str:
        """Call Groq API endpoint for text generation."""
        if not self.api_key:
            logger.warning("GROQ_API_KEY is not set. Returning fallback structured message.")
            return json.dumps({
                "title": "SEO Optimization Recommendation (Fallback)",
                "description": "Groq API key not provided in environment. Please set GROQ_API_KEY in .env.",
                "priority": "medium",
                "affected_page": "/",
                "related_keyword": "seo",
                "reasoning": "Baseline deterministic analysis performed without LLM API key.",
                "implementation_steps": ["Configure GROQ_API_KEY in backend .env"],
                "memory_ids": []
            }) if json_mode else "Groq API Key missing. Please configure GROQ_API_KEY."

        url = "https://api.groq.com/openai/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ]

        payload: Dict[str, Any] = {
            "model": self.model,
            "messages": messages,
            "temperature": 0.3,
            "max_tokens": 1500
        }

        if json_mode:
            payload["response_format"] = {"type": "json_object"}

        fallback_models = [self.model, "openai/gpt-oss-20b", "qwen/qwen3.8-27b", "openai/gpt-oss-120b"]
        # De-duplicate while preserving order
        models_to_try = list(dict.fromkeys(fallback_models))

        for model_name in models_to_try:
            payload["model"] = model_name
            try:
                async with httpx.AsyncClient(timeout=30.0) as client:
                    resp = await client.post(url, json=payload, headers=headers)
                    if resp.status_code == 200:
                        data = resp.json()
                        return data["choices"][0]["message"]["content"]
                    elif resp.status_code == 404:
                        logger.warning(f"Groq model {model_name} returned 404. Trying next fallback model...")
                        continue
                    else:
                        logger.error(f"Groq API error {resp.status_code}: {resp.text}")
                        return f"Error from Groq API ({resp.status_code})"
            except Exception as e:
                logger.error(f"Groq completion request failed for model {model_name}: {e}")
                return f"Groq request exception: {str(e)}"

        return "Error from Groq API (All models unavailable)"

    async def generate_structured(self, system_prompt: str, user_prompt: str, schema_cls: Type[T]) -> Optional[T]:
        """Generate LLM completion and validate against a Pydantic schema."""
        raw_json = await self.generate_completion(system_prompt, user_prompt, json_mode=True)
        try:
            parsed = json.loads(raw_json)
            return schema_cls.model_validate(parsed)
        except Exception as e:
            logger.error(f"Failed to parse structured response from Groq: {e}\nRaw output: {raw_json}")
            return None

groq_service = GroqService()
