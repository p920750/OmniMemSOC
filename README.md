# OmniMemSOC — Multi-Tenant Autonomous Memory Engine for SOC

> **Track 2: Agent Memory and Coordination — PS5 with GTA VI Hackathon**  
> An autonomous multi-agent cyber-defense orchestration platform powered by **FalkorDB**'s GraphBLAS engine, tri-layer episodic/semantic/procedural memory architecture, and inter-agent state handoffs.

---

## Architecture Overview

```
                      +---------------------------------------+
                      |       Next.js 14 SOC Dashboard        |
                      |  Executive Overview • Handoff Studio  |
                      |  Memory Explorer • Cypher Console     |
                      +-------------------+-------------------+
                                          |
                              REST API (Port 9000)
                                          |
                      +-------------------+-------------------+
                      |      FastAPI Orchestration Core       |
                      |     app/main.py • app/config.py       |
                      +---------+-------------------+---------+
                                |                   |
               +----------------+                   +----------------+
               |                                                     |
+--------------v---------------+                     +---------------v--------------+
|   Autonomous Agent Swarm     |                     |    Tri-Layer Memory Engine   |
|   (app/agent_swarm.py)       |                     |    (app/memory_engine.py)    |
|                              |                     |                              |
|  * TriageAgent               |                     |  1. Episodic Memory          |
|    - Severity Correlation    |  Serialized Handoff |     (:Incident)-[:HAS_EVENT] |
|  * ContainmentAgent          |  (:AgentHandoff)    |  2. Semantic Memory          |
|    - Playbook Enforcement    |  State Protocol     |     1536-dim FalkorDB Vector |
|  * ForensicAgent             |                     |  3. Procedural Memory        |
|    - Blast Radius Traversal  |                     |     MITRE ATT&CK Runbooks    |
+--------------+---------------+                     +---------------+--------------+
               |                                                     |
               +-----------------------+-----------------------------+
                                       |
                         Authenticated Connection Pool
                                       |
                      +----------------v----------------------+
                      |      FalkorDB Graph Engine            |
                      |  * Multi-Tenant Partition Separation  |
                      |    (graph_tenant_alpha, etc.)         |
                      |  * HNSW Vector Indices (vecf32)       |
                      |  * Native Graph Algorithms            |
                      |    (pageRank, betweenness, BFS)       |
                      +---------------------------------------+
```

---

## Key Capabilities Delivered

### 1. Tri-Layer Memory Engine
- **Episodic Memory**: Chronological event logs, incident timelines, and `(:HAS_EVENT)` graph relations.
- **Semantic Memory**: Dense 1536-dimensional vector embedding generation, FalkorDB native vector index creation (`CREATE VECTOR INDEX`), and similarity query procedure calls (`CALL db.idx.vector.queryNodes`).
- **Procedural Memory**: Multi-hop pattern matching connecting incidents to MITRE ATT&CK techniques and mitigation runbooks (`MATCH_RUNBOOK_BY_INCIDENT_PATTERN`).

### 2. Autonomous Agent Swarm & Coordination Protocol
- **TriageAgent**: Validates alerts, determines threat severity, extracts MITRE ATT&CK techniques, and formulates handoff decisions.
- **ContainmentAgent**: Queries procedural memory for matching mitigation playbooks and enforces isolation actions.
- **ForensicAgent**: Traverses the attack graph in FalkorDB, calculates the asset blast radius, isolates lateral hops, and synthesizes root-cause findings into a persistent semantic memory vector chunk.
- **Serialized State Handoffs**: Audit-ready `(:AgentHandoff)` graph nodes linking agents with context payloads via `[:INITIATED_HANDOFF]`, `[:ASSIGNED_TO]`, and `[:ASSOCIATED_WITH]`.

### 3. FalkorDB Graph Analytics & Cypher Console
- **Multi-Tenant Partitions**: Clean logical isolation (`graph_{tenant_id}`) with zero data leakage.
- **Graph Algorithms**:
  - `algo.pageRank`: Threat propagation likelihood and topological centrality.
  - `algo.betweenness`: Lateral movement bridge and choke-point detection.
  - `algo.BFS`: High-speed breadth-first attack path traversal.
  - `shortestPath()`: Minimal lateral traversal route between patient zero and target host.

---

## Repository Structure

```
OmniMemSOC/
├── backend/                  # FastAPI & FalkorDB Backend Core
│   ├── app/
│   │   ├── agent_swarm.py    # Autonomous Swarm & (:AgentHandoff) Protocol
│   │   ├── config.py         # App & Database Settings
│   │   ├── cypher_queries.py # OpenCypher Query & Procedure Library
│   │   ├── falkor_client.py  # Multi-Tenant FalkorDB Driver & Pooling
│   │   ├── main.py           # REST API Endpoints
│   │   └── memory_engine.py  # Tri-Layer Memory Architecture
│   ├── requirements.txt      # Python Dependencies
│   └── test_audit.py         # Track 2 Integration Audit Test Suite
├── frontend/                 # Next.js 14 SOC Dashboard
│   ├── app/
│   │   ├── page.tsx          # Page 1: Executive Overview
│   │   ├── coordination/     # Page 2: Agent Swarm Coordination & Handoff Studio
│   │   ├── memory/           # Page 3: Episodic & Procedural Memory Explorer
│   │   └── analytics/        # Page 4: FalkorDB Graph Analytics & Cypher Console
│   ├── components/
│   │   ├── AgentHandoffVisualizer.tsx
│   │   ├── GraphCanvas.tsx
│   │   ├── MemorySearch.tsx
│   │   ├── Navbar.tsx
│   │   └── TenantSelector.tsx
│   └── package.json
└── README.md
```

---

## Getting Started

### 1. Prerequisites
- Python 3.10+
- Node.js 18+ & npm
- FalkorDB instance (local or FalkorDB Cloud)

### 2. Backend Setup
```bash
cd backend
python -m venv venv
# Windows:
.\venv\Scripts\activate
# Linux/macOS:
source venv/bin/activate

pip install -r requirements.txt
cp .env.example .env
# Edit .env with your FalkorDB credentials

uvicorn app.main:app --host 0.0.0.0 --port 9000 --reload
```

### 3. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view the OmniMemSOC Dashboard.

### 4. Running the Track 2 Audit Verification Suite
```bash
cd backend
python test_audit.py
```

---

## License
MIT License.
