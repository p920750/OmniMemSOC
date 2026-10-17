import logging
import re
import time
from typing import Any, Dict, List, Optional
from app.config import settings

logger = logging.getLogger(__name__)

class FalkorClientManager:
    """Robust multi-tenant FalkorDB driver manager with connection pooling and authentication."""

    def __init__(self):
        self._driver = None
        self._pool = None
        self._connected = False
        self._last_connect_attempt = 0.0
        self._connect_cooldown = 10.0  # seconds between reconnect retries
        self._tenant_graphs: Dict[str, Any] = {}

    @staticmethod
    def sanitize_tenant_id(tenant_id: str) -> str:
        """Sanitize tenant ID to ensure a valid FalkorDB graph identifier."""
        clean = re.sub(r"[^a-zA-Z0-9_]", "_", tenant_id.strip().lower())
        return clean.strip("_") or "default"

    def get_tenant_namespace(self, tenant_id: str) -> str:
        """Derive dedicated tenant graph namespace (e.g. graph_{tenant_id})."""
        clean_id = self.sanitize_tenant_id(tenant_id)
        return f"graph_{clean_id}"

    def connect(self, force: bool = False) -> bool:
        """Establish authenticated connection to FalkorDB using connection pooling."""
        now = time.time()
        if not force and not self._connected and (now - self._last_connect_attempt < self._connect_cooldown):
            return False

        self._last_connect_attempt = now
        try:
            from falkordb import FalkorDB
            from redis import ConnectionPool

            # Initialize Redis connection pool with credentials
            pool_kwargs: Dict[str, Any] = {
                "host": settings.FALKORDB_HOST,
                "port": settings.FALKORDB_PORT,
                "max_connections": settings.FALKORDB_MAX_CONNECTIONS,
                "socket_timeout": settings.FALKORDB_TIMEOUT,
                "decode_responses": True,
            }
            if settings.FALKORDB_USERNAME:
                pool_kwargs["username"] = settings.FALKORDB_USERNAME
            if settings.FALKORDB_PASSWORD:
                pool_kwargs["password"] = settings.FALKORDB_PASSWORD
            if settings.FALKORDB_SSL:
                pool_kwargs["ssl"] = True

            self._pool = ConnectionPool(**pool_kwargs)
            self._driver = FalkorDB(connection_pool=self._pool)

            # Test connection probe
            self._driver.connection.ping()
            self._connected = True
            logger.info(
                "Connected to FalkorDB at %s:%s (authenticated, pool_size=%s)",
                settings.FALKORDB_HOST,
                settings.FALKORDB_PORT,
                settings.FALKORDB_MAX_CONNECTIONS
            )
            return True
        except ImportError:
            # When running without falkordb installed locally
            logger.warning("FalkorDB or Redis Python package not installed; running in offline simulation mode.")
            self._connected = False
            return False
        except Exception as exc:
            logger.warning("FalkorDB connection failed (%s:%s): %s. Operating in offline preview mode.",
                           settings.FALKORDB_HOST, settings.FALKORDB_PORT, exc)
            self._connected = False
            return False

    @property
    def is_connected(self) -> bool:
        """Check if active connection to FalkorDB is established."""
        return self._connected

    def ping(self) -> bool:
        """Health check probe verifying connection to FalkorDB."""
        if not self._driver or not self._connected:
            return self.connect()
        try:
            return bool(self._driver.connection.ping())
        except Exception as exc:
            logger.error("FalkorDB ping failed: %s", exc)
            self._connected = False
            return False

    def get_tenant_graph(self, tenant_id: str):
        """Retrieve or initialize isolated graph namespace context for the specified tenant."""
        namespace = self.get_tenant_namespace(tenant_id)

        if namespace in self._tenant_graphs:
            return self._tenant_graphs[namespace]

        if not self._driver or not self._connected:
            self.connect()

        if self._driver and self._connected:
            try:
                graph = self._driver.select_graph(namespace)
                self._tenant_graphs[namespace] = graph
                return graph
            except Exception as exc:
                logger.error("Failed to select graph namespace '%s': %s", namespace, exc)
                return None
        return None

    @staticmethod
    def _normalize_header(raw_header: Any) -> List[str]:
        """Convert FalkorDB header descriptors [type, name] into clean column name strings."""
        if not raw_header:
            return []
        cleaned = []
        for col in raw_header:
            if isinstance(col, (list, tuple)) and len(col) > 1:
                name = col[1].decode("utf-8") if isinstance(col[1], bytes) else str(col[1])
                cleaned.append(name)
            elif isinstance(col, bytes):
                cleaned.append(col.decode("utf-8"))
            else:
                cleaned.append(str(col))
        return cleaned

    def execute_query(
        self,
        tenant_id: str,
        cypher_query: str,
        params: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Execute a write/read OpenCypher query against a tenant's isolated graph."""
        namespace = self.get_tenant_namespace(tenant_id)
        graph = self.get_tenant_graph(tenant_id)

        if not graph:
            logger.debug("FalkorDB offline. Query preview returned for namespace %s", namespace)
            return {
                "tenant_id": tenant_id,
                "namespace": namespace,
                "status": "offline_preview",
                "query": cypher_query,
                "data": [],
                "header": [],
                "message": f"FalkorDB is offline. Connect database to execute live on {namespace}."
            }

        try:
            res = graph.query(cypher_query, params or {})
            header = self._normalize_header(getattr(res, "header", []))
            return {
                "tenant_id": tenant_id,
                "namespace": namespace,
                "status": "success",
                "query": cypher_query,
                "data": getattr(res, "result_set", []),
                "header": header,
                "statistics": getattr(res, "statistics", {})
            }
        except Exception as exc:
            logger.error("Error executing Cypher on %s: %s", namespace, exc)
            return {
                "tenant_id": tenant_id,
                "namespace": namespace,
                "status": "error",
                "query": cypher_query,
                "error": str(exc)
            }

    def execute_ro_query(
        self,
        tenant_id: str,
        cypher_query: str,
        params: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Execute an optimized read-only OpenCypher query against a tenant's graph."""
        namespace = self.get_tenant_namespace(tenant_id)
        graph = self.get_tenant_graph(tenant_id)

        if not graph:
            return {
                "tenant_id": tenant_id,
                "namespace": namespace,
                "status": "offline_preview",
                "query": cypher_query,
                "data": [],
                "header": [],
                "message": f"FalkorDB offline. Read-only preview for {namespace}."
            }

        try:
            # falkordb supports ro_query for read-only optimization
            if hasattr(graph, "ro_query"):
                res = graph.ro_query(cypher_query, params or {})
            else:
                res = graph.query(cypher_query, params or {})
            header = self._normalize_header(getattr(res, "header", []))
            return {
                "tenant_id": tenant_id,
                "namespace": namespace,
                "status": "success",
                "query": cypher_query,
                "data": getattr(res, "result_set", []),
                "header": header
            }
        except Exception as exc:
            logger.error("Error executing RO Cypher on %s: %s", namespace, exc)
            return {
                "tenant_id": tenant_id,
                "namespace": namespace,
                "status": "error",
                "query": cypher_query,
                "error": str(exc)
            }

    def list_tenant_graphs(self) -> List[str]:
        """List active FalkorDB graph namespaces matching tenant prefix."""
        if not self._driver or not self._connected:
            self.connect()

        if self._driver and self._connected:
            try:
                if hasattr(self._driver, "list_graphs"):
                    graphs = self._driver.list_graphs()
                    return [g for g in graphs if g.startswith("graph_")]
            except Exception as exc:
                logger.error("Failed to list FalkorDB graphs: %s", exc)
        return list(self._tenant_graphs.keys())

    def delete_tenant_graph(self, tenant_id: str) -> bool:
        """Delete an entire tenant graph namespace (e.g. on tenant offboarding)."""
        namespace = self.get_tenant_namespace(tenant_id)
        graph = self.get_tenant_graph(tenant_id)
        if graph and hasattr(graph, "delete"):
            try:
                graph.delete()
                self._tenant_graphs.pop(namespace, None)
                logger.info("Deleted graph namespace '%s'", namespace)
                return True
            except Exception as exc:
                logger.error("Failed to delete graph '%s': %s", namespace, exc)
                return False
        return False

    def close(self):
        """Close connection pool and release resources."""
        if self._pool:
            try:
                self._pool.disconnect()
                logger.info("FalkorDB connection pool disconnected.")
            except Exception as exc:
                logger.error("Error closing connection pool: %s", exc)
        self._connected = False
        self._driver = None
        self._tenant_graphs.clear()

falkor_client = FalkorClientManager()
