import hashlib
import json
import logging
import math
import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple

from app.falkor_client import falkor_client
from app import cypher_queries

logger = logging.getLogger(__name__)

# ==============================================================================
# Vector Embedding & Similarity Helpers (1536-dimensional)
# ==============================================================================

STOP_WORDS = {
    "on", "over", "of", "the", "a", "an", "and", "in", "to", "for", "with",
    "via", "is", "at", "by", "from", "as", "into", "onto", "attack"
}

SECURITY_TOPICS: Dict[str, List[str]] = {
    "topic_kerberos": ["kerberoast", "kerberos", "ticket", "tgs", "tgt", "active directory", "domain controller", "spn", "kdc"],
    "topic_c2": ["beacon", "cobalt strike", "command and control", "exfiltration", "reverse shell", "egress", "c2"],
    "topic_credentials": ["password", "hash", "dump", "mimikatz", "dcsync", "spray", "brute force", "privilege escalation"],
    "topic_dos": ["denial of service", "ddos", "amplification", "syn flood", "volumetric", "udp flood"],
    "topic_endpoint": ["workstation", "server", "endpoint", "quarantine", "edr", "isolation", "host"]
}

def generate_embedding(text: str, dimension: int = 1536) -> List[float]:
    """Generate a deterministic, L2-normalized 1536-dimensional vector embedding.

    Incorporates subword n-grams, morphological roots, stopword filtering,
    and cybersecurity taxonomy feature projections compatible with FalkorDB's vecf32 type.
    """
    if not text:
        return [0.0] * dimension

    text_clean = text.lower()
    raw_words = [w.strip(".,!?:;\"'()[]{}") for w in text_clean.split()]
    words = [w for w in raw_words if w and w not in STOP_WORDS and len(w) > 2]
    vector = [0.0] * dimension

    for w in words:
        # Full word hash
        hw = int(hashlib.sha256(w.encode("utf-8")).hexdigest(), 16)
        vector[hw % dimension] += 3.0

        # Morphological root prefix hashing
        if len(w) >= 5:
            hr5 = int(hashlib.sha256(w[:5].encode("utf-8")).hexdigest(), 16)
            vector[hr5 % dimension] += 2.5
        if len(w) >= 6:
            hr6 = int(hashlib.sha256(w[:6].encode("utf-8")).hexdigest(), 16)
            vector[hr6 % dimension] += 2.5

        # Character 3-grams & 4-grams
        wrapped = f"<{w}>"
        for n in (3, 4):
            for i in range(len(wrapped) - n + 1):
                gram = wrapped[i : i + n]
                hg = int(hashlib.md5(gram.encode("utf-8")).hexdigest(), 16)
                vector[hg % dimension] += 0.8

    # Semantic topic feature projections
    for topic_id, terms in SECURITY_TOPICS.items():
        if any(term in text_clean for term in terms):
            ht = int(hashlib.sha256(topic_id.encode("utf-8")).hexdigest(), 16)
            vector[ht % dimension] += 4.5

    # L2 Normalization
    norm = math.sqrt(sum(x * x for x in vector))
    if norm > 0:
        vector = [round(x / norm, 6) for x in vector]
    else:
        vector = [0.0] * dimension

    return vector


def cosine_similarity(v1: List[float], v2: List[float]) -> float:
    """Calculate cosine similarity between two float vectors."""
    if not v1 or not v2 or len(v1) != len(v2):
        return 0.0
    dot = sum(a * b for a, b in zip(v1, v2))
    norm1 = math.sqrt(sum(a * a for a in v1))
    norm2 = math.sqrt(sum(b * b for b in v2))
    if norm1 == 0 or norm2 == 0:
        return 0.0
    return max(0.0, min(1.0, dot / (norm1 * norm2)))


# ==============================================================================
# Multi-Tenant Memory Engine
# ==============================================================================

class MemoryEngine:
    """Manages Episodic, Semantic, and Procedural memory operations across tenant-isolated graphs."""

    def __init__(self):
        # In-memory store for fallback/dev simulation when FalkorDB is offline
        self._local_episodic: Dict[str, List[Dict[str, Any]]] = {}
        self._local_events: Dict[str, List[Dict[str, Any]]] = {}
        self._local_semantic: Dict[str, List[Dict[str, Any]]] = {}
        self._local_procedural: Dict[str, List[Dict[str, Any]]] = {}
        self._seed_default_data()

    def _seed_default_data(self):
        tenant = "tenant-alpha"
        self._local_episodic[tenant] = [
            {
                "id": "inc-9481",
                "title": "Suspected Kerberoasting Activity on Domain Controller",
                "severity": "CRITICAL",
                "status": "CONTAINED",
                "timestamp": "2026-10-15T18:42:00Z",
                "summary": "TGS requests with RC4 encryption requested for high-privilege service accounts.",
                "tags": ["Kerberos", "Active Directory", "Privilege Escalation", "T1558.003"],
                "tenant_id": tenant
            },
            {
                "id": "inc-9482",
                "title": "Anomalous Outbound SSH Traffic to Known C2 IP",
                "severity": "HIGH",
                "status": "INVESTIGATING",
                "timestamp": "2026-10-15T18:15:00Z",
                "summary": "Workstation-04 outbound beaconing to 198.51.100.23 on TCP 2222.",
                "tags": ["C2", "Beaconing", "Data Exfiltration", "T1071.001"],
                "tenant_id": tenant
            }
        ]

        self._local_events[tenant] = [
            {
                "id": "evt-101",
                "incident_id": "inc-9481",
                "type": "ALERT_INGESTED",
                "description": "High volume of Kerberos ticket-granting service requests detected for SPN svc_backup.",
                "timestamp": "2026-10-15T18:42:05Z",
                "agent": "TriageAgent"
            },
            {
                "id": "evt-102",
                "incident_id": "inc-9481",
                "type": "CONTAINMENT_ENFORCED",
                "description": "Service account tickets revoked and host DC-01-AUTH quarantined.",
                "timestamp": "2026-10-15T18:43:12Z",
                "agent": "ContainmentAgent"
            }
        ]

        # Seed semantic memory chunks with vector embeddings
        self._local_semantic[tenant] = [
            {
                "id": "chunk-101",
                "incident_id": "inc-9481",
                "content": "Kerberoasting technique T1558.003 involves requesting RC4 encrypted Kerberos service tickets for offline password cracking.",
                "source": "MITRE_ATTACK_INTEL",
                "timestamp": "2026-10-15T18:42:10Z",
                "embedding": generate_embedding("Kerberoasting technique T1558.003 involves requesting RC4 encrypted Kerberos service tickets for offline password cracking.")
            },
            {
                "id": "chunk-102",
                "incident_id": "inc-9482",
                "content": "Command and control beaconing T1071.001 to external IP 198.51.100.23 indicates potential Cobalt Strike listener.",
                "source": "THREAT_INTEL",
                "timestamp": "2026-10-15T18:15:20Z",
                "embedding": generate_embedding("Command and control beaconing T1071.001 to external IP 198.51.100.23 indicates potential Cobalt Strike listener.")
            }
        ]

        self._local_procedural[tenant] = [
            {
                "id": "rb-ad-isolation",
                "title": "Compromised Service Account Containment Playbook",
                "attack_pattern": "T1558.003 - Kerberoasting",
                "version": "1.2",
                "steps": [
                    {"order": 1, "action": "REVOKE_KERBEROS_TICKETS", "target_type": "Kerberos KDC", "description": "Purge existing TGT and TGS tickets"},
                    {"order": 2, "action": "FORCE_PASSWORD_RESET", "target_type": "Active Directory SPN Account", "description": "Reset SPN user password with 32+ character entropy"},
                    {"order": 3, "action": "ISOLATE_HOST", "target_type": "Originating Host", "description": "Isolate DC-01-AUTH via EDR API"}
                ]
            },
            {
                "id": "rb-c2-block",
                "title": "C2 Beacon Quarantine & Egress Null-Route",
                "attack_pattern": "T1071.001 - Web Protocols",
                "version": "1.0",
                "steps": [
                    {"order": 1, "action": "PUSH_EDR_NETWORK_ISOLATION", "target_type": "Endpoint", "description": "Quarantine endpoint from subnet"},
                    {"order": 2, "action": "BLOCK_IP_AT_PERIMETER", "target_type": "Palo Alto Firewall", "description": "Add IP to dynamic blocklist"},
                    {"order": 3, "action": "CAPTURE_MEMORY_DUMP", "target_type": "Forensics Pipeline", "description": "Acquire volatile RAM image"}
                ]
            }
        ]

    # ==========================================================================
    # 1. Episodic Memory Operations
    # ==========================================================================

    def record_incident(self, tenant_id: str, incident_data: Dict[str, Any]) -> Dict[str, Any]:
        """Upsert a top-level security Incident node into tenant FalkorDB graph."""
        incident_id = incident_data.get("id", f"inc-{uuid.uuid4().hex[:6]}")
        data = {
            "id": incident_id,
            "title": incident_data.get("title", "Untitled Incident"),
            "severity": incident_data.get("severity", "MEDIUM").upper(),
            "status": incident_data.get("status", "NEW").upper(),
            "timestamp": incident_data.get("timestamp", datetime.utcnow().isoformat()),
            "summary": incident_data.get("summary", ""),
            "tags": incident_data.get("tags", []),
            "tenant_id": tenant_id
        }

        # Sync to tenant-isolated graph namespace in FalkorDB
        falkor_client.execute_query(
            tenant_id,
            cypher_queries.INGEST_INCIDENT,
            {
                "incident_id": incident_id,
                "title": data["title"],
                "severity": data["severity"],
                "status": data["status"],
                "timestamp": data["timestamp"],
                "summary": data["summary"],
                "tags": data["tags"],
                "tenant_id": tenant_id
            }
        )

        # Update local cache
        records = self._local_episodic.setdefault(tenant_id, [])
        # Remove existing if updating
        self._local_episodic[tenant_id] = [r for r in records if r["id"] != incident_id]
        self._local_episodic[tenant_id].insert(0, data)
        return data

    def record_episodic_event(self, tenant_id: str, incident_id: str, event_data: Dict[str, Any]) -> Dict[str, Any]:
        """Record a discrete chronological event linked to an incident."""
        event_id = event_data.get("id", f"evt-{uuid.uuid4().hex[:6]}")
        event = {
            "id": event_id,
            "incident_id": incident_id,
            "type": event_data.get("type", "SYSTEM_LOG"),
            "description": event_data.get("description", ""),
            "timestamp": event_data.get("timestamp", datetime.utcnow().isoformat()),
            "agent": event_data.get("agent", "OmniMemSystem")
        }

        # Sync to FalkorDB
        falkor_client.execute_query(
            tenant_id,
            cypher_queries.CREATE_EPISODIC_EVENT,
            {
                "incident_id": incident_id,
                "event_id": event_id,
                "event_type": event["type"],
                "description": event["description"],
                "timestamp": event["timestamp"],
                "agent_name": event["agent"]
            }
        )

        self._local_events.setdefault(tenant_id, []).append(event)
        return event

    @staticmethod
    def _rows_to_dicts(header: List[Any], data: List[Any]) -> List[Dict[str, Any]]:
        """Safely convert FalkorDB header descriptors and result rows into dicts."""
        results = []
        for row in data:
            row_dict = {}
            for col, val in zip(header, row):
                key = col if isinstance(col, str) else (col[1] if isinstance(col, (list, tuple)) and len(col) > 1 else str(col))
                row_dict[key] = val
            results.append(row_dict)
        return results

    def search_episodic_memory(
        self,
        tenant_id: str,
        query: str = "",
        severity: Optional[str] = None,
        limit: int = 10
    ) -> List[Dict[str, Any]]:
        """Query episodic incident history with keyword and severity filters."""
        # Attempt query via FalkorDB first
        cypher_res = falkor_client.execute_query(
            tenant_id,
            cypher_queries.QUERY_EPISODIC_HISTORY,
            {
                "severity": severity.upper() if severity and severity != "ALL" else None,
                "search_term": query.strip() if query else None,
                "limit": limit
            }
        )

        if cypher_res.get("status") == "success" and cypher_res.get("data"):
            header = cypher_res.get("header", [])
            return self._rows_to_dicts(header, cypher_res["data"])

        # Fallback to local episodic cache
        records = self._local_episodic.get(tenant_id, self._local_episodic.get("tenant-alpha", []))
        filtered = []
        for r in records:
            if severity and severity != "ALL" and r.get("severity", "").upper() != severity.upper():
                continue
            if query:
                q = query.lower()
                text_match = (
                    q in r.get("title", "").lower() or
                    q in r.get("summary", "").lower() or
                    any(q in tag.lower() for tag in r.get("tags", []))
                )
                if not text_match:
                    continue
            filtered.append(r)
        return filtered[:limit]

    def get_incident_timeline(self, tenant_id: str, incident_id: str) -> Dict[str, Any]:
        """Reconstruct the complete chronological timeline of an incident."""
        incident = next((i for i in self._local_episodic.get(tenant_id, []) if i["id"] == incident_id), None)
        events = [e for e in self._local_events.get(tenant_id, []) if e.get("incident_id") == incident_id]
        events.sort(key=lambda x: x.get("timestamp", ""))

        return {
            "incident_id": incident_id,
            "incident": incident or {"id": incident_id, "status": "UNKNOWN"},
            "total_events": len(events),
            "timeline": events
        }

    # ==========================================================================
    # 2. Semantic Memory & Vector Search Operations
    # ==========================================================================

    def ensure_vector_index(self, tenant_id: str, dimension: int = 1536) -> bool:
        """Create vector index on MemoryChunk(embedding) in tenant FalkorDB graph."""
        res = falkor_client.execute_query(
            tenant_id,
            cypher_queries.CREATE_VECTOR_INDEX,
            {"dimension": dimension}
        )
        err = str(res.get("error", "")).lower()
        if "already indexed" in err:
            return True
        return res.get("status") in ("success", "offline_preview")

    def store_semantic_memory(
        self,
        tenant_id: str,
        incident_id: str,
        content: str,
        source: str = "THREAT_INTEL",
        embedding: Optional[List[float]] = None
    ) -> Dict[str, Any]:
        """Store a text chunk with dense vector embedding linked to an incident."""
        chunk_id = f"chunk-{uuid.uuid4().hex[:6]}"
        vector = embedding or generate_embedding(content)

        chunk = {
            "id": chunk_id,
            "incident_id": incident_id,
            "content": content,
            "source": source,
            "timestamp": datetime.utcnow().isoformat(),
            "embedding": vector
        }

        # Sync to FalkorDB
        falkor_client.execute_query(
            tenant_id,
            cypher_queries.STORE_SEMANTIC_CHUNK,
            {
                "incident_id": incident_id,
                "chunk_id": chunk_id,
                "content": content,
                "embedding": vector,
                "source": source,
                "timestamp": chunk["timestamp"]
            }
        )

        self._local_semantic.setdefault(tenant_id, []).append(chunk)
        return {
            "id": chunk_id,
            "incident_id": incident_id,
            "content": content,
            "source": source,
            "timestamp": chunk["timestamp"],
            "embedding_dimensions": len(vector)
        }

    def search_semantic_memory(
        self,
        tenant_id: str,
        query: str,
        k: int = 5,
        threshold: float = 0.0
    ) -> List[Dict[str, Any]]:
        """Vector similarity search wrapper utilizing FalkorDB vector indices.

        Executes `CALL db.idx.vector.queryNodes` on FalkorDB, with seamless
        cosine similarity fallback when operating in offline preview mode.
        """
        query_vector = generate_embedding(query)

        # 1. Attempt FalkorDB vector procedure execution
        cypher_res = falkor_client.execute_query(
            tenant_id,
            cypher_queries.QUERY_VECTOR_SIMILARITY,
            {
                "k": k,
                "query_vector": query_vector
            }
        )

        if cypher_res.get("status") == "success" and cypher_res.get("data"):
            header = cypher_res.get("header", [])
            all_rows = self._rows_to_dicts(header, cypher_res["data"])
            return [r for r in all_rows if r.get("score", 1.0) >= threshold]

        # 2. Resilient local fallback using cosine similarity
        candidates = self._local_semantic.get(tenant_id, self._local_semantic.get("tenant-alpha", []))
        scored = []
        for c in candidates:
            score = cosine_similarity(query_vector, c.get("embedding", []))
            if score >= threshold:
                scored.append({
                    "incident_id": c.get("incident_id"),
                    "incident_title": "Associated Incident",
                    "incident_severity": "HIGH",
                    "chunk_id": c.get("id"),
                    "content": c.get("content"),
                    "source": c.get("source"),
                    "score": round(score, 4)
                })

        scored.sort(key=lambda x: x["score"], reverse=True)
        return scored[:k]

    def hybrid_search(
        self,
        tenant_id: str,
        query: str,
        severity: Optional[str] = None,
        k: int = 5
    ) -> Dict[str, Any]:
        """Combine semantic vector search with episodic incident filtering."""
        vector_matches = self.search_semantic_memory(tenant_id, query, k=k)
        episodic_matches = self.search_episodic_memory(tenant_id, query=query, severity=severity, limit=k)

        return {
            "query": query,
            "tenant_id": tenant_id,
            "semantic_vector_matches": vector_matches,
            "episodic_incident_matches": episodic_matches,
            "total_matches": len(vector_matches) + len(episodic_matches)
        }

    # ==========================================================================
    # 3. Procedural Memory Operations
    # ==========================================================================

    def record_procedural_runbook(self, tenant_id: str, runbook: Dict[str, Any]) -> Dict[str, Any]:
        """Store a structured procedural runbook with sequential steps in FalkorDB."""
        rb_id = runbook.get("id", f"rb-{uuid.uuid4().hex[:6]}")
        data = {
            "id": rb_id,
            "title": runbook.get("title", "Untitled Playbook"),
            "attack_pattern": runbook.get("attack_pattern", "Unknown Pattern"),
            "version": runbook.get("version", "1.0"),
            "steps": runbook.get("steps", [])
        }

        # Sync to FalkorDB
        falkor_client.execute_query(
            tenant_id,
            cypher_queries.RECORD_PROCEDURAL_RUNBOOK,
            {
                "runbook_id": rb_id,
                "title": data["title"],
                "attack_pattern": data["attack_pattern"],
                "version": data["version"],
                "steps": data["steps"]
            }
        )

        self._local_procedural.setdefault(tenant_id, []).append(data)
        return data

    def get_procedural_runbooks(self, tenant_id: str) -> List[Dict[str, Any]]:
        """Retrieve procedural runbooks and steps available for a tenant."""
        return self._local_procedural.get(tenant_id, self._local_procedural.get("tenant-alpha", []))

    def find_runbooks_for_incident(self, tenant_id: str, incident_id: str) -> List[Dict[str, Any]]:
        """Multi-hop pattern match: incident -> attack technique -> runbook -> sequential steps."""
        cypher_res = falkor_client.execute_query(
            tenant_id,
            cypher_queries.MATCH_RUNBOOK_BY_INCIDENT_PATTERN,
            {"incident_id": incident_id}
        )

        if cypher_res.get("status") == "success" and cypher_res.get("data"):
            header = cypher_res.get("header", [])
            return self._rows_to_dicts(header, cypher_res["data"])

        # Fallback: match incident tags against attack_pattern in procedural store
        incidents = self._local_episodic.get(tenant_id, self._local_episodic.get("tenant-alpha", []))
        inc = next((i for i in incidents if i["id"] == incident_id), None)
        runbooks = self.get_procedural_runbooks(tenant_id)

        matched = []
        if inc:
            tags = [t.lower() for t in inc.get("tags", [])]
            for rb in runbooks:
                pattern = rb.get("attack_pattern", "").lower()
                title = rb.get("title", "").lower()
                if any(t in pattern or t in title for t in tags):
                    matched.append(rb)

        return matched or runbooks[:1]


memory_engine = MemoryEngine()
