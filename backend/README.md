# OmniMemSOC Backend

Autonomous Multi-Tenant Memory Engine for Security Operations Centers (SOC), powered by **FastAPI** and **FalkorDB**.

## Features

- **Multi-Tenant FalkorDB Graph Isolation**: Dedicated isolated graph spaces per tenant (`tenant_{tenant_id}`).
- **Tri-Layer Memory Engine**:
  - *Episodic Memory*: Security incident chronologies, alert chains, and past mitigation records.
  - *Procedural Memory*: Actionable incident response runbooks, step dependencies, and execution traces.
  - *Semantic Memory*: Knowledge graph relationships between IOCs, threat actors, CVEs, and internal assets.
- **Autonomous Agent Swarm**:
  - `TriageAgent`: Ingests alerts, assigns severity, queries episodic memory for historical recurrence.
  - `ContainmentAgent`: Proposes and tracks containment actions against compromised assets.
  - `ForensicAgent`: Constructs attack paths and deep root-cause graph traces.
- **OpenCypher Console**: Execute arbitrary Cypher queries directly against tenant graph spaces.

## Setup & Running

### 1. Install Dependencies
```bash
pip install -r requirements.txt
```

### 2. Configure Environment
Ensure `.env` contains valid credentials:
```env
FALKORDB_HOST=localhost
FALKORDB_PORT=6379
FALKORDB_PASSWORD=
CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
```

### 3. Start FalkorDB
Run FalkorDB via Docker if running locally:
```bash
docker run -p 6379:6379 -it --rm falkordb/falkordb:latest
```

### 4. Run FastAPI Server
```bash
uvicorn app.main:app --host 0.0.0.0 --port 9000 --reload
```
API Documentation will be available at [http://localhost:9000/docs](http://localhost:9000/docs).
