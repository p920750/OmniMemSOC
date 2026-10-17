from typing import Any, Dict, List, Optional
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from app.config import settings
from app.falkor_client import falkor_client
from app.memory_engine import memory_engine
from app.agent_swarm import agent_swarm, AgentRole
from app.routers.memory import router as memory_router

app = FastAPI(
    title=settings.APP_NAME,
    version="0.2.0",
    description="Multi-Tenant Autonomous Memory Engine for Security Operations Centers (SOC) powered by FalkorDB"
)

# Mount Routers
app.include_router(memory_router)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list or ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup_event():
    falkor_client.connect()

# ==============================================================================
# Pydantic Schemas
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
    query: str
    k: int = Field(default=5, ge=1, le=50)
    threshold: float = Field(default=0.0, ge=0.0, le=1.0)

class ProceduralCreate(BaseModel):
    title: str
    attack_pattern: str
    version: str = "1.0"
    steps: List[Dict[str, Any]]

class HandoffCreate(BaseModel):
    from_agent: str
    to_agent: str
    incident_id: str
    reason: str
    status: str = "INITIATED"
    payload: Optional[Dict[str, Any]] = None

class SwarmPipelineRequest(BaseModel):
    title: str
    severity: str = "HIGH"
    target_host: str = "DC-01-AUTH"
    indicators: List[str] = []
    technique: Optional[str] = None
    tags: List[str] = []

class CypherQueryRequest(BaseModel):
    query: str
    params: Optional[Dict[str, Any]] = None

# ==============================================================================
# Health & Tenant Routes
# ==============================================================================

@app.get("/health")
def health():
    return {
        "status": "healthy",
        "app": settings.APP_NAME,
        "falkordb_connected": falkor_client.is_connected,
        "falkordb_host": f"{settings.FALKORDB_HOST}:{settings.FALKORDB_PORT}"
    }

@app.get("/api/tenants")
def get_tenants():
    return [
        {
            "id": "tenant-alpha",
            "name": "Global Corp Alpha",
            "industry": "Financial Services",
            "graph_namespace": falkor_client.get_tenant_namespace("tenant-alpha"),
            "incidents_count": 12
        },
        {
            "id": "tenant-beta",
            "name": "Nexus Defense Beta",
            "industry": "Defense & Aerospace",
            "graph_namespace": falkor_client.get_tenant_namespace("tenant-beta"),
            "incidents_count": 8
        },
        {
            "id": "tenant-soc-global",
            "name": "Shared Global Intel Hub",
            "industry": "Cross-Tenant Threat Exchange",
            "graph_namespace": falkor_client.get_tenant_namespace("tenant-soc-global"),
            "incidents_count": 34
        }
    ]

# ==============================================================================
# Agent Swarm & Coordination Routes
# ==============================================================================

@app.get("/api/swarm/status")
def get_swarm_status():
    return agent_swarm.get_swarm_status()

@app.get("/api/swarm/handoffs")
def get_handoffs(
    tenant_id: str = Query(default="tenant-alpha"),
    incident_id: Optional[str] = Query(default=None)
):
    return agent_swarm.get_handoffs(tenant_id=tenant_id, incident_id=incident_id)

@app.post("/api/swarm/handoff")
def create_handoff(tenant_id: str, handoff: HandoffCreate):
    return agent_swarm.execute_handoff(
        tenant_id=tenant_id,
        from_agent=handoff.from_agent,
        to_agent=handoff.to_agent,
        incident_id=handoff.incident_id,
        reason=handoff.reason,
        status=handoff.status,
        payload=handoff.payload
    )

@app.post("/api/swarm/pipeline")
def run_autonomous_swarm_pipeline(
    tenant_id: str = Query(default="tenant-alpha"),
    req: SwarmPipelineRequest = None
):
    """Trigger the complete autonomous agent swarm workflow:

    TriageAgent -> (:AgentHandoff) -> ContainmentAgent -> (:AgentHandoff) -> ForensicAgent
    """
    if not req:
        raise HTTPException(status_code=400, detail="Alert payload required")

    return agent_swarm.process_incident_pipeline(
        tenant_id=tenant_id,
        alert_data=req.dict()
    )

# ==============================================================================
# FalkorDB Graph Analytics & Cypher Console
# ==============================================================================

@app.post("/api/analytics/query")
def execute_cypher(tenant_id: str = Query(default="tenant-alpha"), req: CypherQueryRequest = None):
    if not req or not req.query:
        raise HTTPException(status_code=400, detail="Cypher query string required")
    return falkor_client.execute_query(
        tenant_id=tenant_id,
        cypher_query=req.query,
        params=req.params
    )
