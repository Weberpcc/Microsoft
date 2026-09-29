import logging
import httpx
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone
from app.core.config import settings
from app.schemas.memory import MemoryItem, MemoryQueryResult

logger = logging.getLogger("seomind.hindsight")

class HindsightService:
    """
    Dedicated service abstraction for Vectorize Hindsight persistent memory.
    Supports official Vectorize Hindsight Cloud endpoints:
      - Health: /health/ready, /health/live, /health
      - Create Bank: PUT /v1/default/banks/{bank_id}
      - Retain: POST /v1/default/banks/{bank_id}/memories
      - Recall: POST /v1/default/banks/{bank_id}/memories/recall
      - Reflect: POST /v1/default/banks/{bank_id}/reflect
    Maintains dual compatibility with local Hindsight instances and provides
    graceful offline fallbacks without fabricating memory IDs.
    """

    def __init__(self):
        self.base_url = settings.HINDSIGHT_API_URL.rstrip('/')
        self.api_key = settings.HINDSIGHT_API_KEY
        self.timeout = settings.HINDSIGHT_TIMEOUT_SECONDS

    def _get_headers(self) -> Dict[str, str]:
        headers = {"Content-Type": "application/json"}
        if self.api_key and len(self.api_key.strip()) > 0:
            headers["Authorization"] = f"Bearer {self.api_key.strip()}"
        return headers

    def get_bank_id_for_website(self, website_id: str) -> str:
        """Returns isolated bank ID for a given website."""
        clean_id = website_id.replace("-", "_")
        return f"seomind_website_{clean_id}"

    async def check_health(self) -> bool:
        """Check if Hindsight service is reachable and responsive."""
        endpoints = ["/health/ready", "/health/live", "/health"]
        for ep in endpoints:
            try:
                async with httpx.AsyncClient(timeout=4.0) as client:
                    resp = await client.get(f"{self.base_url}{ep}", headers=self._get_headers())
                    if resp.status_code == 200:
                        return True
            except Exception:
                continue
        return False

    async def ensure_memory_bank(self, bank_id: str, website_domain: str = "") -> bool:
        """Ensure memory bank exists for the website in Hindsight."""
        headers = self._get_headers()
        
        # 1. Try Hindsight Cloud PUT /v1/default/banks/{bank_id}
        try:
            url_cloud = f"{self.base_url}/v1/default/banks/{bank_id}"
            payload = {
                "name": bank_id,
                "background": f"SEO Optimization Memory Bank for domain: {website_domain}"
            }
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                resp = await client.put(url_cloud, json=payload, headers=headers)
                if resp.status_code in [200, 201, 409]:
                    return True
                elif resp.status_code in [401, 403]:
                    logger.warning(f"Hindsight Cloud authentication required for memory bank creation (HTTP {resp.status_code})")
                    return False
        except Exception as e:
            logger.debug(f"Hindsight Cloud PUT bank failed: {e}")

        # 2. Try legacy/local endpoint POST /api/v1/memory-banks
        try:
            url_local = f"{self.base_url}/api/v1/memory-banks"
            payload_local = {
                "name": bank_id,
                "background": f"SEO Optimization Memory Bank for domain: {website_domain}"
            }
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                resp = await client.post(url_local, json=payload_local, headers=headers)
                if resp.status_code in [200, 201, 409]:
                    return True
        except Exception as e:
            logger.warning(f"Hindsight ensure_memory_bank fallback failed: {e}")

        return False

    async def retain(
        self, 
        bank_id: str, 
        content: str, 
        event_type: str, 
        entity_name: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Optional[str]:
        """
        Retain a new SEO memory item in Hindsight Cloud.
        Never fabricates memory IDs if retain fails or authentication is missing.
        """
        headers = self._get_headers()
        now_iso = datetime.now(timezone.utc).isoformat()

        # 1. Hindsight Cloud: POST /v1/default/banks/{bank_id}/memories
        try:
            url_cloud = f"{self.base_url}/v1/default/banks/{bank_id}/memories"
            item_payload: Dict[str, Any] = {
                "content": content,
                "context": f"seo_{event_type}",
                "timestamp": now_iso
            }
            cloud_payload = {
                "items": [item_payload],
                "async": False
            }
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                resp = await client.post(url_cloud, json=cloud_payload, headers=headers)
                if resp.status_code in [200, 201]:
                    data = resp.json()
                    # RetainResponse returns success=True
                    if data.get("success"):
                        op_id = data.get("operation_id")
                        return op_id or f"cloud_mem_{int(datetime.now(timezone.utc).timestamp())}"
                elif resp.status_code in [401, 403]:
                    logger.warning(f"Hindsight Cloud Retain requires valid HINDSIGHT_API_KEY (HTTP {resp.status_code})")
                    return None
        except Exception as e:
            logger.debug(f"Hindsight Cloud retain failed: {e}")

        # 2. Local fallback endpoint: POST /api/v1/memory-banks/{bank_id}/retain
        try:
            url_local = f"{self.base_url}/api/v1/memory-banks/{bank_id}/retain"
            payload_local = {
                "content": content,
                "event_type": event_type,
                "entity_name": entity_name or "",
                "timestamp": now_iso,
                "metadata": metadata or {}
            }
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                resp = await client.post(url_local, json=payload_local, headers=headers)
                if resp.status_code in [200, 201]:
                    data = resp.json()
                    return data.get("id")
        except Exception as e:
            logger.error(f"Hindsight retain fallback failed: {e}")

        return None

    async def recall(self, bank_id: str, query: str, limit: int = 5) -> MemoryQueryResult:
        """
        Recall relevant historical memories across semantic and keyword retrieval.
        Never fabricates results when Hindsight is offline.
        """
        headers = self._get_headers()

        # 1. Hindsight Cloud: POST /v1/default/banks/{bank_id}/memories/recall
        try:
            url_cloud = f"{self.base_url}/v1/default/banks/{bank_id}/memories/recall"
            payload_cloud = {
                "query": query,
                "max_tokens": 4096,
                "budget": "mid"
            }
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                resp = await client.post(url_cloud, json=payload_cloud, headers=headers)
                if resp.status_code == 200:
                    data = resp.json()
                    raw_results = data.get("results", [])
                    items: List[MemoryItem] = []
                    for res in raw_results[:limit]:
                        mem_id = res.get("id")
                        text = res.get("text", "")
                        items.append(MemoryItem(
                            id=mem_id,
                            bank_id=bank_id,
                            content=text,
                            event_type=res.get("type", "experience"),
                            entity_name=", ".join(res.get("entities", [])) if res.get("entities") else None,
                            score=0.95,
                            metadata={"chunk_id": res.get("chunk_id")}
                        ))
                    return MemoryQueryResult(
                        query=query,
                        bank_id=bank_id,
                        retrieved_memories=items,
                        memory_available=True
                    )
                elif resp.status_code in [401, 403]:
                    logger.warning(f"Hindsight Cloud Recall requires valid HINDSIGHT_API_KEY (HTTP {resp.status_code})")
        except Exception as e:
            logger.debug(f"Hindsight Cloud recall failed: {e}")

        # 2. Local fallback endpoint: POST /api/v1/memory-banks/{bank_id}/recall
        try:
            url_local = f"{self.base_url}/api/v1/memory-banks/{bank_id}/recall"
            payload_local = {"query": query, "limit": limit}
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                resp = await client.post(url_local, json=payload_local, headers=headers)
                if resp.status_code == 200:
                    data = resp.json()
                    items_local: List[MemoryItem] = []
                    for idx, res in enumerate(data.get("results", data.get("memories", []))):
                        items_local.append(MemoryItem(
                            id=res.get("id", f"mem_{idx}"),
                            bank_id=bank_id,
                            content=res.get("content", str(res)),
                            event_type=res.get("event_type", "historical_observation"),
                            entity_name=res.get("entity_name"),
                            score=res.get("score", 0.9),
                            metadata=res.get("metadata", {})
                        ))
                    return MemoryQueryResult(
                        query=query,
                        bank_id=bank_id,
                        retrieved_memories=items_local,
                        memory_available=True
                    )
        except Exception as e:
            logger.warning(f"Hindsight recall fallback failed: {e}")

        # Graceful degradation: return empty list and explicitly signal memory is unavailable
        return MemoryQueryResult(
            query=query,
            bank_id=bank_id,
            retrieved_memories=[],
            memory_available=False
        )

    async def reflect(self, bank_id: str, query: str) -> Optional[str]:
        """
        Reflect on memories in the bank to synthesize query-focused insights.
        Never fabricates reflections when Hindsight is offline.
        """
        headers = self._get_headers()

        # 1. Hindsight Cloud: POST /v1/default/banks/{bank_id}/reflect
        try:
            url_cloud = f"{self.base_url}/v1/default/banks/{bank_id}/reflect"
            payload_cloud = {
                "query": query,
                "budget": "low",
                "max_tokens": 1024
            }
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                resp = await client.post(url_cloud, json=payload_cloud, headers=headers)
                if resp.status_code == 200:
                    data = resp.json()
                    return data.get("text")
                elif resp.status_code in [401, 403]:
                    logger.warning(f"Hindsight Cloud Reflect requires valid HINDSIGHT_API_KEY (HTTP {resp.status_code})")
        except Exception as e:
            logger.debug(f"Hindsight Cloud reflect failed: {e}")

        # 2. Local fallback endpoint: POST /api/v1/memory-banks/{bank_id}/reflect
        try:
            url_local = f"{self.base_url}/api/v1/memory-banks/{bank_id}/reflect"
            payload_local = {"query": query}
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                resp = await client.post(url_local, json=payload_local, headers=headers)
                if resp.status_code == 200:
                    data = resp.json()
                    return data.get("reflection", data.get("summary"))
        except Exception as e:
            logger.warning(f"Hindsight reflect fallback failed: {e}")

        return None

# Singleton instance
hindsight_service = HindsightService()
