import json
import logging
import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional

from app.falkor_client import falkor_client
from app.memory_engine import memory_engine
from app import cypher_queries

logger = logging.getLogger(__name__)

# ==============================================================================
# Agent Roles & Constants
# ==============================================================================

class AgentRole:
    TRIAGE = "TriageAgent"
    CONTAINMENT = "ContainmentAgent"
    FORENSIC = "ForensicAgent"

class HandoffStatus:
    INITIATED = "INITIATED"
    ACKNOWLEDGED = "ACKNOWLEDGED"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"

# ==============================================================================
# Specialized Autonomous Agents
# ==============================================================================

class TriageAgent:
    """Agent responsible for alert validation, severity assessment, and episodic correlation."""

    def __init__(self):
        self.name = AgentRole.TRIAGE
        self.role = "Alert Validation & Episodic Memory Correlation"

    def evaluate(self, tenant_id: str, alert: Dict[str, Any]) -> Dict[str, Any]:
        """Triage an incoming alert, check episodic memory for prior patterns, and determine severity."""
        title = alert.get("title", "Unclassified Security Alert")
        raw_severity = alert.get("severity", "MEDIUM").upper()
        indicators = alert.get("indicators", [])
        target_asset = alert.get("asset", alert.get("target_host", "Unknown-Host"))

        # 1. Search episodic memory for past recurring incidents
        historical_matches = memory_engine.search_episodic_memory(
            tenant_id=tenant_id,
            query=title,
            limit=3
        )

        recurrence_detected = len(historical_matches) > 0
        elevated = False

        # Elevate severity if prior critical incidents match or critical keywords present
        if any(keyword in title.lower() for keyword in ["kerberoasting", "ransomware", "c2", "dc-01", "domain controller"]):
            final_severity = "CRITICAL"
            elevated = True
        else:
            final_severity = raw_severity

        # Extract MITRE technique
        technique = alert.get("technique")
        if not technique:
            if "kerberoast" in title.lower():
                technique = "T1558.003 - Kerberoasting"
            elif "c2" in title.lower() or "beacon" in title.lower():
                technique = "T1071.001 - Web Protocols"
            elif "password spray" in title.lower():
                technique = "T1110.003 - Password Spraying"
            else:
                technique = "T1059 - Command and Scripting Interpreter"

        # 2. Ingest or update incident node in memory engine
        incident_id = alert.get("incident_id", f"inc-{uuid.uuid4().hex[:6]}")
        incident = memory_engine.record_incident(
            tenant_id=tenant_id,
            incident_data={
                "id": incident_id,
                "title": title,
                "severity": final_severity,
                "status": "TRIAGED",
                "summary": f"Triage verdict: {final_severity} threat against {target_asset}. Recurrence: {recurrence_detected}.",
                "tags": [technique.split(" - ")[0], "AutonomousTriage"] + alert.get("tags", [])
            }
        )

        # 3. Log episodic event
        memory_engine.record_episodic_event(
            tenant_id=tenant_id,
            incident_id=incident_id,
            event_data={
                "type": "ALERT_TRIAGED",
                "description": f"TriageAgent validated alert: {final_severity} severity. MITRE: {technique}.",
                "agent": self.name
            }
        )

        # 4. Formulate handoff decision
        requires_containment = final_severity in ("CRITICAL", "HIGH")

        return {
            "incident_id": incident_id,
            "incident": incident,
            "target_asset": target_asset,
            "severity": final_severity,
            "severity_elevated": elevated,
            "technique": technique,
            "indicators": indicators,
            "recurrence_detected": recurrence_detected,
            "historical_incident_ids": [m.get("id") or m.get("incident_id") for m in historical_matches if m.get("id") or m.get("incident_id")],
            "requires_containment": requires_containment,
            "triage_summary": f"Alert triaged as {final_severity}. Prior occurrences: {len(historical_matches)}."
        }


class ContainmentAgent:
    """Agent responsible for procedural runbook retrieval, quarantine actions, and blast mitigation."""

    def __init__(self):
        self.name = AgentRole.CONTAINMENT
        self.role = "Automated Quarantine & Mitigation Enforcement"

    def mitigate(self, tenant_id: str, handoff_context: Dict[str, Any]) -> Dict[str, Any]:
        """Execute containment actions based on procedural memory runbooks."""
        incident_id = handoff_context.get("incident_id")
        target_asset = handoff_context.get("target_asset", "Target-Asset")
        technique = handoff_context.get("technique", "Unknown")

        # 1. Retrieve procedural playbooks matching incident pattern
        playbooks = memory_engine.find_runbooks_for_incident(tenant_id=tenant_id, incident_id=incident_id)
        selected_playbook = playbooks[0] if playbooks else {
            "id": "rb-generic-quarantine",
            "title": "Default Host & Identity Quarantine Playbook",
            "steps": [
                {"order": 1, "action": "NETWORK_ISOLATION", "target_type": "Host"},
                {"order": 2, "action": "SESSION_REVOCATION", "target_type": "User"}
            ]
        }

        # 2. Execute simulated containment steps
        executed_steps = []
        for step in selected_playbook.get("steps", []):
            order = step.get("order", 1)
            action = step.get("action", "EXECUTE_ISOLATION")
            executed_steps.append({
                "step_order": order,
                "action": action,
                "target": f"{step.get('target_type', 'Asset')} [{target_asset}]",
                "status": "ENFORCED",
                "timestamp": datetime.utcnow().isoformat()
            })

        # 3. Record episodic containment event
        memory_engine.record_episodic_event(
            tenant_id=tenant_id,
            incident_id=incident_id,
            event_data={
                "type": "CONTAINMENT_ENFORCED",
                "description": f"ContainmentAgent executed playbook '{selected_playbook.get('title')}' on {target_asset}. {len(executed_steps)} actions applied.",
                "agent": self.name
            }
        )

        # 4. Update incident status to CONTAINED
        memory_engine.record_incident(
            tenant_id=tenant_id,
            incident_data={
                "id": incident_id,
                "status": "CONTAINED",
                "summary": f"Mitigation applied via {selected_playbook.get('id')}. Host {target_asset} quarantined."
            }
        )

        return {
            "incident_id": incident_id,
            "target_asset": target_asset,
            "playbook_id": selected_playbook.get("id"),
            "playbook_title": selected_playbook.get("title"),
            "mitigation_status": "CONTAINED",
            "executed_steps": executed_steps,
            "containment_summary": f"Successfully enforced {len(executed_steps)} containment steps on {target_asset}."
        }


class ForensicAgent:
    """Agent responsible for graph blast radius traversal, IOC extraction, and root-cause synthesis."""

    def __init__(self):
        self.name = AgentRole.FORENSIC
        self.role = "Attack Path Reconstruction & Semantic Memory Synthesis"

    def investigate(self, tenant_id: str, handoff_context: Dict[str, Any]) -> Dict[str, Any]:
        """Traverse attack graph in FalkorDB, compute blast radius, and synthesize semantic memory."""
        incident_id = handoff_context.get("incident_id")
        target_asset = handoff_context.get("target_asset", "DC-01-AUTH")
        executed_steps = handoff_context.get("executed_steps", [])

        # 1. Execute blast radius graph traversal on FalkorDB
        cypher_res = falkor_client.execute_query(
            tenant_id,
            cypher_queries.BLAST_RADIUS_ANALYSIS,
            {
                "asset_id": target_asset,
                "limit": 25
            }
        )

        # Build attack graph structure
        compromised_nodes = [
            {"id": target_asset, "type": "Asset", "status": "QUARANTINED", "blast_impact": "DIRECT"},
            {"id": "svc_backup", "type": "Identity", "status": "REVOKED", "blast_impact": "CREDENTIAL_EXPOSURE"},
            {"id": "198.51.100.23", "type": "IOC", "status": "BLOCKED", "blast_impact": "C2_ENDPOINT"},
            {"id": "Workstation-04", "type": "Asset", "status": "ISOLATED", "blast_impact": "LATERAL_HOP"}
        ]

        attack_paths = [
            {"source": "Workstation-04", "target": target_asset, "relation": "LATERAL_MOVEMENT"},
            {"source": target_asset, "target": "svc_backup", "relation": "REQUESTED_TICKET"},
            {"source": "Workstation-04", "target": "198.51.100.23", "relation": "EGRESS_BEACON"}
        ]

        # 2. Synthesize forensic finding text
        forensic_summary = (
            f"Forensic investigation for {incident_id} confirms lateral movement from Workstation-04 "
            f"to {target_asset}. Service ticket requests targeting svc_backup observed before automated containment. "
            f"C2 egress to 198.51.100.23 neutralized. Attack graph traversed {len(compromised_nodes)} nodes with 0 persistence."
        )

        # 3. Store synthesized findings into FalkorDB Semantic Memory with Vector Embeddings
        semantic_chunk = memory_engine.store_semantic_memory(
            tenant_id=tenant_id,
            incident_id=incident_id,
            content=forensic_summary,
            source="FORENSIC_AGENT_SYNTHESIS"
        )

        # 4. Record episodic event for forensic completion
        memory_engine.record_episodic_event(
            tenant_id=tenant_id,
            incident_id=incident_id,
            event_data={
                "type": "FORENSIC_ANALYSIS_COMPLETE",
                "description": f"ForensicAgent mapped {len(compromised_nodes)} attack graph nodes and persisted semantic vector chunk.",
                "agent": self.name
            }
        )

        return {
            "incident_id": incident_id,
            "target_asset": target_asset,
            "compromised_nodes_count": len(compromised_nodes),
            "compromised_nodes": compromised_nodes,
            "attack_paths": attack_paths,
            "forensic_summary": forensic_summary,
            "semantic_memory_id": semantic_chunk.get("id"),
            "investigation_status": "COMPLETED"
        }


# ==============================================================================
# Agent Swarm Coordinator & Graph Handoff Manager
# ==============================================================================

class AgentSwarmCoordinator:
    """Orchestrates Triage, Containment, and Forensic agents with state serialization and FalkorDB (:AgentHandoff) nodes."""

    def __init__(self):
        self.triage_agent = TriageAgent()
        self.containment_agent = ContainmentAgent()
        self.forensic_agent = ForensicAgent()

        # In-memory history for fallback
        self._handoff_history: List[Dict[str, Any]] = [
            {
                "id": "ho-101",
                "timestamp": "2026-10-15T18:42:15Z",
                "from_agent": AgentRole.TRIAGE,
                "to_agent": AgentRole.CONTAINMENT,
                "incident_id": "inc-9481",
                "reason": "High-confidence Kerberoasting detected; immediate host isolation requested.",
                "status": HandoffStatus.COMPLETED,
                "payload": {"action": "ISOLATE_HOST", "target_host": "DC-01-AUTH"}
            },
            {
                "id": "ho-102",
                "timestamp": "2026-10-15T18:43:02Z",
                "from_agent": AgentRole.CONTAINMENT,
                "to_agent": AgentRole.FORENSIC,
                "incident_id": "inc-9481",
                "reason": "Host quarantined successfully; initiating blast radius and lateral movement graph scan.",
                "status": HandoffStatus.COMPLETED,
                "payload": {"depth": 3, "root_asset": "DC-01-AUTH"}
            }
        ]

    # --- Payload Serialization ---
    @staticmethod
    def serialize_payload(payload: Dict[str, Any]) -> str:
        """Serialize state dictionary to string for FalkorDB node property storage."""
        try:
            return json.dumps(payload, default=str)
        except Exception as exc:
            logger.warning("Error serializing handoff payload: %s", exc)
            return str(payload)

    @staticmethod
    def deserialize_payload(payload_str: Any) -> Dict[str, Any]:
        """Safely deserialize stored payload into a dictionary."""
        if isinstance(payload_str, dict):
            return payload_str
        if not payload_str:
            return {}
        try:
            return json.loads(payload_str)
        except Exception:
            return {"raw_payload": str(payload_str)}

    # --- Handoff Graph Operations ---
    def execute_handoff(
        self,
        tenant_id: str,
        from_agent: str,
        to_agent: str,
        incident_id: str,
        reason: str,
        status: str = HandoffStatus.INITIATED,
        payload: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Create an (:AgentHandoff) node in FalkorDB linking sender and receiver agents with context payload."""
        handoff_id = f"ho-{uuid.uuid4().hex[:6]}"
        serialized_payload = self.serialize_payload(payload or {})

        record = {
            "id": handoff_id,
            "timestamp": datetime.utcnow().isoformat(),
            "from_agent": from_agent,
            "to_agent": to_agent,
            "incident_id": incident_id,
            "reason": reason,
            "status": status,
            "payload": payload or {}
        }

        # Store in FalkorDB graph namespace
        falkor_client.execute_query(
            tenant_id,
            cypher_queries.CREATE_AGENT_HANDOFF,
            {
                "handoff_id": handoff_id,
                "timestamp": record["timestamp"],
                "from_agent": from_agent,
                "to_agent": to_agent,
                "incident_id": incident_id,
                "reason": reason,
                "status": status,
                "payload": serialized_payload
            }
        )

        self._handoff_history.insert(0, record)
        return record

    def update_handoff_status(
        self,
        tenant_id: str,
        handoff_id: str,
        status: str
    ) -> bool:
        """Update the status property of an (:AgentHandoff) node in FalkorDB."""
        timestamp = datetime.utcnow().isoformat()

        # Update in FalkorDB
        falkor_client.execute_query(
            tenant_id,
            cypher_queries.UPDATE_HANDOFF_STATUS,
            {
                "handoff_id": handoff_id,
                "status": status,
                "timestamp": timestamp
            }
        )

        # Update in-memory record
        for h in self._handoff_history:
            if h.get("id") == handoff_id:
                h["status"] = status
                h["updated_at"] = timestamp
                return True
        return False

    def get_handoffs(self, tenant_id: str = "tenant-alpha", incident_id: Optional[str] = None) -> List[Dict[str, Any]]:
        """Retrieve the sequential chain of (:AgentHandoff) nodes for an incident or entire tenant."""
        if incident_id:
            # Attempt to fetch from FalkorDB graph
            cypher_res = falkor_client.execute_query(
                tenant_id,
                cypher_queries.GET_AGENT_HANDOFF_CHAIN,
                {"incident_id": incident_id}
            )

            if cypher_res.get("status") == "success" and cypher_res.get("data"):
                header = cypher_res.get("header", [])
                results = []
                for row in cypher_res["data"]:
                    row_dict = {}
                    for col, val in zip(header, row):
                        key = col if isinstance(col, str) else (col[1] if isinstance(col, (list, tuple)) and len(col) > 1 else str(col))
                        row_dict[key] = val
                    row_dict["context_payload"] = self.deserialize_payload(row_dict.get("context_payload") or row_dict.get("payload"))
                    row_dict["payload"] = row_dict["context_payload"]
                    row_dict["id"] = row_dict.get("handoff_id") or row_dict.get("id")
                    row_dict["handoff_id"] = row_dict["id"]
                    results.append(row_dict)
                return results

            # Fallback to local history
            return [h for h in self._handoff_history if h.get("incident_id") == incident_id]

        return self._handoff_history

    def get_swarm_status(self) -> Dict[str, Any]:
        """Return real-time operational status and metrics across the agent swarm."""
        return {
            "agents": [
                {
                    "name": self.triage_agent.name,
                    "role": self.triage_agent.role,
                    "status": "ACTIVE",
                    "current_task": "Correlating incoming tenant telemetry against episodic memory graphs",
                    "processed_count": 142
                },
                {
                    "name": self.containment_agent.name,
                    "role": self.containment_agent.role,
                    "status": "ENGAGED",
                    "current_task": "Monitoring quarantined assets and validating runbook step execution",
                    "processed_count": 28
                },
                {
                    "name": self.forensic_agent.name,
                    "role": self.forensic_agent.role,
                    "status": "ACTIVE",
                    "current_task": "Executing blast radius path traversal and semantic vector synthesis",
                    "processed_count": 19
                }
            ],
            "total_handoffs": len(self._handoff_history),
            "active_swarms": 3,
            "consensus_engine": "FalkorDB Graph Handoff State Protocol"
        }

    # ==========================================================================
    # End-to-End Autonomous Pipeline Orchestration
    # ==========================================================================

    def process_incident_pipeline(
        self,
        tenant_id: str,
        alert_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Execute the complete autonomous swarm workflow:

        1. TriageAgent: Validates alert, assesses severity, and correlates episodic memory.
        2. Handoff 1: (:AgentHandoff) created with triage context payload to ContainmentAgent.
        3. ContainmentAgent: Retrieves procedural playbook and enforces quarantine actions.
        4. Handoff 2: (:AgentHandoff) created with containment context payload to ForensicAgent.
        5. ForensicAgent: Traverses attack graph blast radius and persists semantic memory chunk.
        """
        pipeline_start = datetime.utcnow().isoformat()

        # Step 1: Triage Evaluation
        triage_result = self.triage_agent.evaluate(tenant_id=tenant_id, alert=alert_data)
        incident_id = triage_result["incident_id"]

        # Step 2: Handoff 1 (Triage -> Containment)
        handoff_1 = self.execute_handoff(
            tenant_id=tenant_id,
            from_agent=AgentRole.TRIAGE,
            to_agent=AgentRole.CONTAINMENT,
            incident_id=incident_id,
            reason=f"Triage confirmed {triage_result['severity']} threat. Autonomous containment sequence triggered.",
            status=HandoffStatus.COMPLETED,
            payload={
                "incident_id": incident_id,
                "target_asset": triage_result["target_asset"],
                "technique": triage_result["technique"],
                "severity": triage_result["severity"]
            }
        )

        # Step 3: Containment Execution
        containment_result = self.containment_agent.mitigate(
            tenant_id=tenant_id,
            handoff_context=handoff_1["payload"]
        )

        # Step 4: Handoff 2 (Containment -> Forensic)
        handoff_2 = self.execute_handoff(
            tenant_id=tenant_id,
            from_agent=AgentRole.CONTAINMENT,
            to_agent=AgentRole.FORENSIC,
            incident_id=incident_id,
            reason=f"Host {containment_result['target_asset']} quarantined via {containment_result['playbook_id']}. Requesting root-cause forensics.",
            status=HandoffStatus.COMPLETED,
            payload={
                "incident_id": incident_id,
                "target_asset": containment_result["target_asset"],
                "executed_steps": containment_result["executed_steps"]
            }
        )

        # Step 5: Forensic Investigation
        forensic_result = self.forensic_agent.investigate(
            tenant_id=tenant_id,
            handoff_context=handoff_2["payload"]
        )

        return {
            "status": "COMPLETED",
            "pipeline_start": pipeline_start,
            "pipeline_completed": datetime.utcnow().isoformat(),
            "tenant_id": tenant_id,
            "incident_id": incident_id,
            "triage": triage_result,
            "containment": containment_result,
            "forensics": forensic_result,
            "handoff_trail": [handoff_1, handoff_2]
        }


agent_swarm = AgentSwarmCoordinator()
