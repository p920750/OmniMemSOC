"""Comprehensive OpenCypher query library and FalkorDB graph procedures for OmniMemSOC.

Covers:
1. Schema & Vector Indices
2. Episodic Memory Storage & Semantic Vector Retrieval
3. Inter-Agent State Handoffs (:AgentHandoff)
4. Procedural Runbook Storage & Multi-Hop Pattern Matching
5. Graph Analytics (Betweenness Centrality, PageRank, Blast Radius, Shortest Path)
"""

# ==============================================================================
# 1. SCHEMA & INDICES
# ==============================================================================

CREATE_SCHEMA_INDICES = """
CREATE INDEX FOR (i:Incident) ON (i.id);
CREATE INDEX FOR (a:Agent) ON (a.name);
CREATE INDEX FOR (e:Event) ON (e.id);
CREATE INDEX FOR (t:ThreatActor) ON (t.name);
CREATE INDEX FOR (i:IOC) ON (i.value);
CREATE INDEX FOR (h:AgentHandoff) ON (h.id);
CREATE INDEX FOR (r:Runbook) ON (r.id);
CREATE INDEX FOR (tech:AttackTechnique) ON (tech.id);
CREATE INDEX FOR (asset:Asset) ON (asset.id);
"""

# Fast index initialization backwards-compatibility alias
CREATE_INDICES_QUERY = CREATE_SCHEMA_INDICES

# Vector Index for Semantic Memory Embeddings in FalkorDB
CREATE_VECTOR_INDEX = """
CREATE VECTOR INDEX FOR (m:MemoryChunk) ON (m.embedding)
OPTIONS {dimension: $dimension, similarityFunction: 'cosine'};
"""

# ==============================================================================
# 2. EPISODIC MEMORY STORAGE & SEMANTIC VECTOR RETRIEVAL
# ==============================================================================

# Ingest or update a top-level Incident node
INGEST_INCIDENT = """
MERGE (inc:Incident {id: $incident_id})
ON CREATE SET
    inc.title = $title,
    inc.severity = $severity,
    inc.timestamp = $timestamp,
    inc.status = $status,
    inc.summary = $summary,
    inc.tags = $tags,
    inc.tenant_id = $tenant_id
ON MATCH SET
    inc.status = $status,
    inc.summary = $summary,
    inc.updated_at = $timestamp
RETURN inc;
"""

# Record an episodic timeline event linked to an incident
CREATE_EPISODIC_EVENT = """
MATCH (inc:Incident {id: $incident_id})
CREATE (evt:Event {
    id: $event_id,
    type: $event_type,
    description: $description,
    timestamp: $timestamp,
    agent: $agent_name
})
CREATE (inc)-[:HAS_EVENT]->(evt)
RETURN evt;
"""

# Store a text memory chunk with vector embedding attached to an incident
STORE_SEMANTIC_CHUNK = """
MATCH (inc:Incident {id: $incident_id})
CREATE (chunk:MemoryChunk {
    id: $chunk_id,
    content: $content,
    source: $source,
    timestamp: $timestamp
})
SET chunk.embedding = vecf32($embedding)
CREATE (inc)-[:HAS_SEMANTIC_MEMORY]->(chunk)
RETURN chunk;
"""

# Semantic Vector Retrieval using FalkorDB vector query procedure
QUERY_VECTOR_SIMILARITY = """
CALL db.idx.vector.queryNodes('MemoryChunk', 'embedding', $k, vecf32($query_vector))
YIELD node, score
MATCH (inc:Incident)-[:HAS_SEMANTIC_MEMORY]->(node)
RETURN inc.id AS incident_id,
       inc.title AS incident_title,
       inc.severity AS incident_severity,
       node.id AS chunk_id,
       node.content AS content,
       node.source AS source,
       score
ORDER BY score DESC;
"""

# Query episodic history with keyword and severity filters
QUERY_EPISODIC_HISTORY = """
MATCH (inc:Incident)-[:HAS_EVENT]->(evt:Event)
WHERE ($severity IS NULL OR inc.severity = $severity)
  AND ($search_term IS NULL OR evt.description CONTAINS $search_term OR inc.title CONTAINS $search_term)
RETURN inc.id AS incident_id,
       inc.title AS title,
       inc.severity AS severity,
       inc.status AS status,
       evt.description AS event_description,
       evt.timestamp AS timestamp,
       evt.agent AS agent
ORDER BY evt.timestamp DESC
LIMIT $limit;
"""

# Hybrid episodic recall combining severity filter and topological event traversal
HYBRID_EPISODIC_RECALL = """
MATCH (inc:Incident)-[:HAS_EVENT]->(evt:Event)
WHERE inc.severity IN $severities AND inc.status = $status
OPTIONAL MATCH (inc)-[:HAS_SEMANTIC_MEMORY]->(chunk:MemoryChunk)
RETURN inc.id AS incident_id,
       inc.title AS title,
       collect(DISTINCT evt.type) AS event_types,
       collect(DISTINCT chunk.content)[0..3] AS memory_excerpts
LIMIT $limit;
"""

# ==============================================================================
# 3. INTER-AGENT STATE HANDOFFS (:AgentHandoff)
# ==============================================================================

# Create an AgentHandoff node linking sender and receiver agents with context payload
CREATE_AGENT_HANDOFF = """
MERGE (sender:Agent {name: $from_agent})
MERGE (receiver:Agent {name: $to_agent})
WITH sender, receiver
MATCH (inc:Incident {id: $incident_id})
CREATE (h:AgentHandoff {
    id: $handoff_id,
    timestamp: $timestamp,
    reason: $reason,
    status: $status,
    context_payload: $payload
})
CREATE (sender)-[:INITIATED_HANDOFF]->(h)
CREATE (h)-[:ASSIGNED_TO]->(receiver)
CREATE (h)-[:ASSOCIATED_WITH]->(inc)
RETURN h;
"""

# Alias for backwards compatibility with earlier scaffold
RECORD_AGENT_HANDOFF = CREATE_AGENT_HANDOFF

# Retrieve chronological handoff chain for a specific incident
GET_AGENT_HANDOFF_CHAIN = """
MATCH (inc:Incident {id: $incident_id})<-[:ASSOCIATED_WITH]-(h:AgentHandoff)
MATCH (sender:Agent)-[:INITIATED_HANDOFF]->(h)-[:ASSIGNED_TO]->(receiver:Agent)
RETURN h.id AS handoff_id,
       sender.name AS from_agent,
       receiver.name AS to_agent,
       h.timestamp AS timestamp,
       h.reason AS reason,
       h.status AS status,
       h.context_payload AS context_payload
ORDER BY h.timestamp ASC;
"""

# Update lifecycle status of an agent handoff
UPDATE_HANDOFF_STATUS = """
MATCH (h:AgentHandoff {id: $handoff_id})
SET h.status = $status,
    h.updated_at = $timestamp
RETURN h;
"""

# Workload metrics: Count pending or in-flight handoffs grouped by agent
GET_AGENT_WORKLOAD_METRICS = """
MATCH (h:AgentHandoff)-[:ASSIGNED_TO]->(receiver:Agent)
WHERE h.status IN ['INITIATED', 'IN_PROGRESS']
RETURN receiver.name AS agent_name,
       count(h) AS pending_handoffs,
       collect(h.id) AS handoff_ids;
"""

# ==============================================================================
# 4. PROCEDURAL RUNBOOK STORAGE & MULTI-HOP PATTERN MATCHING
# ==============================================================================

# Store procedural runbook and unwind ordered steps
RECORD_PROCEDURAL_RUNBOOK = """
MERGE (rb:Runbook {id: $runbook_id})
ON CREATE SET
    rb.title = $title,
    rb.attack_pattern = $attack_pattern,
    rb.version = $version
WITH rb
UNWIND $steps AS step
CREATE (s:Step {
    order: step.order,
    action: step.action,
    description: step.description,
    target_type: step.target_type
})
CREATE (rb)-[:CONTAINS_STEP]->(s)
RETURN rb;
"""

# Multi-hop pattern matching: Incident -> AttackTechnique -> Runbook -> Sequential Steps
MATCH_RUNBOOK_BY_INCIDENT_PATTERN = """
MATCH (inc:Incident {id: $incident_id})-[:EXHIBITS_TECHNIQUE]->(tech:AttackTechnique)
MATCH (rb:Runbook)-[:MITIGATES]->(tech)
MATCH (rb)-[:CONTAINS_STEP]->(s:Step)
WITH rb, tech, s
ORDER BY s.order ASC
RETURN rb.id AS runbook_id,
       rb.title AS runbook_title,
       tech.id AS technique_id,
       tech.name AS technique_name,
       collect({order: s.order, action: s.action, target_type: s.target_type}) AS steps;
"""

# Multi-hop lateral movement traversal matching containment procedures
MATCH_LATERAL_MOVEMENT_PROCEDURES = """
MATCH path = (root:Asset {id: $root_asset})-[*1..3]-(target:Asset)
WHERE target.is_compromised = true OR target.id IN $compromised_assets
MATCH (rb:Runbook {attack_pattern: $attack_pattern})-[:CONTAINS_STEP]->(s:Step)
RETURN path,
       rb.title AS playbook,
       collect(s) AS containment_steps
LIMIT $limit;
"""

# ==============================================================================
# 5. GRAPH ANALYTICS & NETWORK PROCEDURES
# ==============================================================================

# PageRank procedure execution in FalkorDB
PAGE_RANK_PROCEDURE = """
CALL algo.pageRank($node_label, $relationship_type)
YIELD node, score
RETURN node, score
ORDER BY score DESC
LIMIT $limit;
"""

# Betweenness Centrality procedure execution in FalkorDB
BETWEENNESS_CENTRALITY_PROCEDURE = """
CALL algo.betweenness($node_label, $relationship_type)
YIELD node, score
RETURN node, score
ORDER BY score DESC
LIMIT $limit;
"""

# BFS Breadth-First Search traversal in FalkorDB
BFS_PROCEDURE = """
CALL algo.BFS($start_node, $max_depth, $relationship_type)
YIELD nodes, edges
RETURN nodes, edges;
"""

# Blast radius forensic traversal: Finds all connected entities up to 3 hops
BLAST_RADIUS_ANALYSIS = """
MATCH path = (asset:Asset {id: $asset_id})-[*1..3]-(compromised)
RETURN path
LIMIT $limit;
"""

# Shortest attack path calculation between two infrastructure assets
SHORTEST_ATTACK_PATH = """
MATCH (source:Asset {id: $source_id}), (target:Asset {id: $target_id})
RETURN shortestPath((source)-[*1..10]->(target)) AS attack_path;
"""

# High-level graph topology metrics
GET_GRAPH_METRICS = """
MATCH (n)
OPTIONAL MATCH ()-[r]->()
RETURN count(DISTINCT n) AS total_nodes,
       count(DISTINCT r) AS total_relationships;
"""
