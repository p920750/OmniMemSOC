from typing import Any, Dict, List, Optional
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

from app.memory_engine import memory_engine

router = APIRouter(prefix="/api/memory", tags=["memory"])

# ==============================================================================
# Pydantic Schemas for Memory Engine
# ==============================================================================

class IncidentCreate(BaseModel):
    id: Optional[str] = None
    title: str
    severity: str = "MEDIUM"
    status: str = "NEW"
    summary: str = ""
    tags: List[str] = []

class EpisodicEventCreate(BaseModel):
    type: str
    description: str
    agent: Optional[str] = "ManualAnalyst"

class SemanticMemoryCreate(BaseModel):
    incident_id: str
    content: str
    source: str = "THREAT_INTEL"
    embedding: Optional[List[float]] = None

class SemanticSearchRequest(BaseModel):
    query: Optional[str] = Field(default="security incident", description="Natural language search query")
    k: int = Field(default=5, ge=1, le=50)
    threshold: float = Field(default=0.0, ge=0.0, le=1.0)

class ProceduralCreate(BaseModel):
    title: str
    attack_pattern: str
    version: str = "1.0"
    steps: List[Dict[str, Any]]

# ==============================================================================
# Episodic Memory Endpoints
# ==============================================================================

@router.get("/episodic")
def get_episodic_memory(
    tenant_id: str = Query(default="tenant-alpha"),
    query: str = Query(default=""),
    severity: Optional[str] = Query(default=None),
    limit: int = Query(default=10, ge=1, le=100)
):
    return memory_engine.search_episodic_memory(
        tenant_id=tenant_id,
        query=query,
        severity=severity,
        limit=limit
    )

@router.post("/episodic")
def create_episodic_incident(tenant_id: str, incident: IncidentCreate):
    return memory_engine.record_incident(tenant_id=tenant_id, incident_data=incident.dict())

@router.post("/episodic/{incident_id}/events")
def create_episodic_event(tenant_id: str, incident_id: str, event: EpisodicEventCreate):
    return memory_engine.record_episodic_event(
        tenant_id=tenant_id,
        incident_id=incident_id,
        event_data=event.dict()
    )

@router.get("/incident/{incident_id}/timeline")
def get_incident_timeline(tenant_id: str = Query(default="tenant-alpha"), incident_id: str = ""):
    return memory_engine.get_incident_timeline(tenant_id=tenant_id, incident_id=incident_id)

# ==============================================================================
# Semantic Memory & Vector Search Endpoints
# ==============================================================================

@router.post("/semantic")
def store_semantic_memory(tenant_id: str, chunk: SemanticMemoryCreate):
    return memory_engine.store_semantic_memory(
        tenant_id=tenant_id,
        incident_id=chunk.incident_id,
        content=chunk.content,
        source=chunk.source,
        embedding=chunk.embedding
    )

@router.post("/semantic/search")
def search_semantic_memory_post(
    tenant_id: str = Query(default="tenant-alpha"),
    req: Optional[SemanticSearchRequest] = None
):
    """Vector similarity search against FalkorDB embeddings with safe empty query fallback."""
    query_str = (req.query.strip() if req and req.query else "") or "security incident"
    k = req.k if req and req.k else 5
    threshold = req.threshold if req and req.threshold is not None else 0.0

    return memory_engine.search_semantic_memory(
        tenant_id=tenant_id,
        query=query_str,
        k=k,
        threshold=threshold
    )

@router.get("/semantic/search")
def search_semantic_memory_get(
    tenant_id: str = Query(default="tenant-alpha"),
    query: Optional[str] = Query(default=None),
    q: Optional[str] = Query(default=None),
    k: int = Query(default=5, ge=1, le=50),
    threshold: float = Query(default=0.0, ge=0.0, le=1.0)
):
    """Flexible GET endpoint for semantic search supporting query or q parameter."""
    raw_query = query or q or ""
    query_str = raw_query.strip() or "security incident"

    return memory_engine.search_semantic_memory(
        tenant_id=tenant_id,
        query=query_str,
        k=k,
        threshold=threshold
    )

@router.get("/hybrid")
def hybrid_memory_search(
    tenant_id: str = Query(default="tenant-alpha"),
    query: str = Query(default=""),
    severity: Optional[str] = Query(default=None),
    k: int = Query(default=5, ge=1, le=20)
):
    return memory_engine.hybrid_search(
        tenant_id=tenant_id,
        query=query,
        severity=severity,
        k=k
    )

# ==============================================================================
# Procedural Memory Endpoints
# ==============================================================================

@router.get("/procedural")
def get_procedural_memory(tenant_id: str = Query(default="tenant-alpha")):
    return memory_engine.get_procedural_runbooks(tenant_id=tenant_id)

@router.post("/procedural")
def create_procedural_runbook(tenant_id: str, runbook: ProceduralCreate):
    return memory_engine.record_procedural_runbook(tenant_id=tenant_id, runbook=runbook.dict())

@router.get("/incident/{incident_id}/playbooks")
def get_matching_playbooks(tenant_id: str = Query(default="tenant-alpha"), incident_id: str = ""):
    return memory_engine.find_runbooks_for_incident(tenant_id=tenant_id, incident_id=incident_id)
