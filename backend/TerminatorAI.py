"""
The Terminator – Django-integrated AI Skeleton
===============================================
Combines Django backend with LangGraph AI agents for system monitoring.
"""

import asyncio
import json
import logging
import os
import sys
from abc import ABC, abstractmethod
from collections import deque
from typing import TypedDict, Annotated, Sequence

import django
import psutil
from asgiref.sync import sync_to_async

# ── Django setup ──────────────────────────────────────────────────────
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from django.utils import timezone
from rest_framework.decorators import APIView
from rest_framework.response import Response
from backend.models import Settings, Alerts
from backend.Notifications import show_alert_notification

from langgraph.graph import StateGraph, END
from langgraph.graph.message import add_messages
from langchain_core.messages import HumanMessage, SystemMessage

# ── info.py integration ───────────────────────────────────────────────
from .info import (
    global_cpu_info,
    global_memory_info,
    global_storage_info,
    global_network_info,
    global_battery_info,
    processes_info,
)

_cpu_info     = global_cpu_info()
_memory_info  = global_memory_info()
_storage_info = global_storage_info()
_network_info = global_network_info()
_battery_info = global_battery_info()
_process_info = processes_info()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


# ╔══════════════════════════════════════════════════════════════════╗
# ║  CONSTANTS                                                       ║
# ╚══════════════════════════════════════════════════════════════════╝

SYSTEM_BLOCKLIST = frozenset({
    "system", "smss.exe", "csrss.exe", "wininit.exe", "winlogon.exe",
    "lsass.exe", "svchost.exe", "services.exe", "explorer.exe",
    "launchd", "kernel_task", "systemd", "init", "kthreadd",
})

ANALYSIS_PROMPT = """You are a system performance analyst with access to rolling metric history.

You receive:
  - CURRENT_ANOMALIES: threshold breaches detected this cycle
  - CURRENT_METRICS: full snapshot this cycle
  - METRIC_HISTORY: up to 5 previous snapshots (oldest first)

Return ONLY valid JSON:
{
  "root_causes": ["list of explanations"],
  "top_offending_processes": [{"name": str, "pid": int, "resource": "cpu|memory|disk", "impact": "low|medium|high"}],
  "predictions": ["forward-looking statements"],
  "trend_warnings": ["issues trending badly"],
  "urgency": "low|medium|high|critical",
  "show_recommendations": true
}"""

RECOMMENDATION_PROMPT = """You are a system optimization assistant.
Produce smart, context-aware action cards from the analysis.

Return ONLY a valid JSON array:
[{
  "priority": 1-5,
  "title": str,
  "description": str,
  "process_name": str | null,
  "process_pid": int | null,
  "action": "kill_process"|"restart_process"|"alert_user"|"no_action",
  "estimated_gain": str
}]"""


# ╔══════════════════════════════════════════════════════════════════╗
# ║  STATE & MONITORS                                                ║
# ╚══════════════════════════════════════════════════════════════════╝

class TerminatorState(TypedDict):
    metrics:           dict
    metric_history:    list[dict]
    anomalies:         list[dict]
    analysis:          dict
    recommendations:   list[dict]
    user_approved:     bool
    execution_result:  dict
    messages:          Annotated[Sequence, add_messages]


class ResourceMonitor(ABC):
    @abstractmethod
    async def snapshot(self) -> dict:
        pass


class CPUMonitor(ResourceMonitor):
    async def snapshot(self) -> dict:
        raw = _cpu_info.get_info()
        per_process = [
            {
                "pid": p["pid"],
                "name": p["name"],
                "cpu_percent": p["cpu"],
            }
            for p in _process_info.get_info(n=20, sort_by="cpu")
        ]
        return {
            "cores": raw["cores"],
            "threads": raw["threads"],
            "percent": raw["total usage"],
            "per_core": raw["per thread usage"],
            "freq_ghz": raw["total freq"],
            "per_process": per_process,
        }


class MemoryMonitor(ResourceMonitor):
    async def snapshot(self) -> dict:
        raw = _memory_info.get_info()
        per_process = [
            {
                "pid": p["pid"],
                "name": p["name"],
                "rss_mb": p["mem"],
            }
            for p in _process_info.get_info(n=20, sort_by="mem")
        ]
        raw_perc = raw["used-perc"]
        mem_percent = raw_perc * 100 if raw_perc <= 1.0 else raw_perc
        return {
            "total_gb": raw["total"],
            "used_gb": raw["used"],
            "available_gb": raw["available"],
            "percent": mem_percent,
            "per_process": per_process,
        }


class DiskMonitor(ResourceMonitor):
    async def snapshot(self) -> dict:
        raw = _storage_info.get_info()
        partitions = raw.get("partitions", {})
        worst_percent = 0.0
        worst_used_gb = 0.0
        worst_free_gb = 0.0
        for dev_data in partitions.values():
            if dev_data["used-perc"] > worst_percent:
                worst_percent = dev_data["used-perc"]
                worst_used_gb = dev_data["used"]
                worst_free_gb = dev_data["available"]
        return {
            "percent": worst_percent,
            "used_gb": worst_used_gb,
            "free_gb": worst_free_gb,
            "partitions": partitions,
            "io": {"read_mb": 0, "write_mb": 0},
        }


class NetworkMonitor(ResourceMonitor):
    async def snapshot(self) -> dict:
        raw = _network_info.get_info()
        return {
            "download_MBps": raw["download_MBps"],
            "upload_MBps": raw["upload_MBps"],
            "bytes_recv_mb": raw["download_MBps"],
            "connections": len(psutil.net_connections()),
        }


class BatteryMonitor(ResourceMonitor):
    async def snapshot(self) -> dict:
        raw = _battery_info.get_info()
        if raw == "no battery":
            return {"percent": None, "plugged_in": True, "secs_left": None}
        secs_left = None
        if "time" in raw and raw["time"] != "unknown" and raw["time"] != "plugged in":
            secs_left = int(raw["time"] * 3600)
        return {
            "percent": raw["perc"],
            "plugged_in": raw["charging"],
            "secs_left": secs_left,
        }


# ╔══════════════════════════════════════════════════════════════════╗
# ║  AGENTS                                                          ║
# ╚══════════════════════════════════════════════════════════════════╝

class BaseAgent(ABC):
    @abstractmethod
    async def run(self, state: TerminatorState) -> TerminatorState:
        pass


class MonitoringAgent(BaseAgent):
    """Collect metrics and detect anomalies"""

    def __init__(self):
        self.cpu_monitor = CPUMonitor()
        self.memory_monitor = MemoryMonitor()
        self.disk_monitor = DiskMonitor()
        self.network_monitor = NetworkMonitor()
        self.battery_monitor = BatteryMonitor()

    async def run(self, state: TerminatorState) -> TerminatorState:
        logger.info("MonitoringAgent: collecting metrics…")
        metrics = await self._collect_all_metrics()
        anomalies = await self._detect_anomalies(metrics)
        state["metrics"] = metrics
        state["anomalies"] = anomalies
        return state

    async def _collect_all_metrics(self) -> dict:
        return {
            "cpu": await self.cpu_monitor.snapshot(),
            "memory": await self.memory_monitor.snapshot(),
            "disk": await self.disk_monitor.snapshot(),
            "network": await self.network_monitor.snapshot(),
            "battery": await self.battery_monitor.snapshot(),
        }

    async def _detect_anomalies(self, metrics: dict) -> list[dict]:
        # Wrap Django ORM in sync_to_async
        @sync_to_async
        def get_settings_obj():
            try:
                return Settings.objects.get()
            except Settings.DoesNotExist:
                return Settings.objects.get_or_create()[0]

        anomalies = []
        settings = await get_settings_obj()

        checks = [
            ("cpu", "percent", settings.cpu_threshold, "CPU usage is high", settings.cpu_enabled),
            ("memory", "percent", settings.memory_threshold, "RAM usage is high", settings.memory_enabled),
            ("disk", "percent", settings.disk_threshold, "Disk is nearly full", settings.disk_enabled),
            ("network", "bytes_recv_mb", settings.network_threshold, "High network traffic", settings.network_enabled),
        ]

        for resource, field, threshold, detail, enabled in checks:
            if not enabled or threshold is None:
                continue
            value = metrics.get(resource, {}).get(field)
            if value is None:
                continue
            if value >= threshold:
                # Get top offending process for this resource
                top_process = None
                if resource == "cpu":
                    processes = metrics.get("cpu", {}).get("per_process", [])
                    top_process = processes[0] if processes else None
                elif resource == "memory":
                    processes = metrics.get("memory", {}).get("per_process", [])
                    top_process = processes[0] if processes else None
                
                anomalies.append({
                    "resource": resource,
                    "severity": "critical" if value >= threshold * 1.15 else "warning",
                    "value": value,
                    "threshold": threshold,
                    "detail": f"{detail}: {value} (limit {threshold})",
                    "top_process": top_process,
                })

        # Battery check
        bat = metrics.get("battery", {})
        pct = bat.get("percent")
        if pct is not None and not bat.get("plugged_in", True) and settings.battery_enabled:
            if pct <= settings.battery_threshold:
                anomalies.append({
                    "resource": "battery",
                    "severity": "warning" if pct > 10 else "critical",
                    "value": pct,
                    "threshold": settings.battery_threshold,
                    "detail": f"Battery low: {pct}%",
                    "top_process": None,
                })

        logger.info("MonitoringAgent: %d anomalies detected", len(anomalies))
        return anomalies


class AnalysisAgent(BaseAgent):
    """Analyze metrics and determine urgency"""

    def __init__(self, llm=None):
        self.llm = llm

    async def run(self, state: TerminatorState) -> TerminatorState:
        anomalies = state["anomalies"]
        logger.info("AnalysisAgent: analyzing %d anomalies…", len(anomalies))
        
        if self.llm:
            state["analysis"] = await self._llm_analysis(state["metrics"], anomalies, state.get("metric_history", []))
        else:
            state["analysis"] = self._rule_based_analysis(state["metrics"], anomalies)
        return state

    async def _llm_analysis(self, metrics: dict, anomalies: list[dict], history: list[dict]) -> dict:
        slim_history = [
            {
                "cpu_pct": s.get("cpu", {}).get("percent"),
                "mem_pct": s.get("memory", {}).get("percent"),
                "disk_pct": s.get("disk", {}).get("percent"),
            }
            for s in history
        ]
        prompt = (
            f"CURRENT_ANOMALIES:\n{json.dumps(anomalies, indent=2)}\n\n"
            f"CURRENT_METRICS:\n"
            f"  CPU: {metrics.get('cpu',{}).get('percent')}%\n"
            f"  MEM: {metrics.get('memory',{}).get('percent')}%\n"
            f"  DISK: {metrics.get('disk',{}).get('percent')}%\n\n"
            f"HISTORY: {json.dumps(slim_history)}"
        )
        try:
            resp = await self.llm.ainvoke([
                SystemMessage(content=ANALYSIS_PROMPT),
                HumanMessage(content=prompt),
            ])
            result = json.loads(resp.content.strip())
            result.setdefault("show_recommendations", bool(anomalies))
            result.setdefault("trend_warnings", [])
            return result
        except Exception as exc:
            logger.warning("LLM analysis failed: %s", exc)
            return self._rule_based_analysis(metrics, anomalies)

    def _rule_based_analysis(self, metrics: dict, anomalies: list[dict]) -> dict:
        severities = [a["severity"] for a in anomalies]
        urgency = "critical" if "critical" in severities else ("medium" if severities else "low")

        top_cpu = sorted(
            metrics.get("cpu", {}).get("per_process", []),
            key=lambda p: p.get("cpu_percent", 0), reverse=True
        )[:3]
        top_mem = sorted(
            metrics.get("memory", {}).get("per_process", []),
            key=lambda p: p.get("rss_mb", 0), reverse=True
        )[:3]

        offenders = []
        # Add CPU processes with resource type
        for p in top_cpu:
            p["resource"] = "cpu"
            if p not in offenders:
                offenders.append(p)
        
        # Add memory processes with resource type
        for p in top_mem:
            p["resource"] = "memory"
            if p not in offenders:
                offenders.append(p)

        return {
            "root_causes": [a["detail"] for a in anomalies],
            "top_offending_processes": offenders,
            "predictions": [],
            "urgency": urgency,
            "trend_warnings": [],
            "show_recommendations": bool(anomalies),
        }


class RecommendationAgent(BaseAgent):
    """Generate action recommendations"""

    def __init__(self, llm=None):
        self.llm = llm

    async def run(self, state: TerminatorState) -> TerminatorState:
        logger.info("RecommendationAgent: generating recommendations…")
        if self.llm:
            recs = await self._llm_recommendations(state["analysis"], state["metrics"])
        else:
            recs = self._rule_based_recommendations(state["analysis"], state["metrics"])
        state["recommendations"] = sorted(recs, key=lambda r: r.get("priority", 99))
        return state

    async def _llm_recommendations(self, analysis: dict, metrics: dict) -> list[dict]:
        prompt = f"ANALYSIS:\n{json.dumps(analysis, indent=2)}\n\nTOP PROCESSES:\n{json.dumps(metrics.get('cpu',{}).get('per_process',[])[:5])}"
        try:
            resp = await self.llm.ainvoke([
                SystemMessage(content=RECOMMENDATION_PROMPT),
                HumanMessage(content=prompt),
            ])
            return json.loads(resp.content.strip())
        except Exception as exc:
            logger.warning("LLM recommendations failed: %s", exc)
            return self._rule_based_recommendations(analysis, metrics)

    
    def _rule_based_recommendations(self, analysis: dict, metrics: dict) -> list[dict]:
        recs, priority = [], 1
        anomalies = analysis.get("root_causes", [])

        for proc in analysis.get("top_offending_processes", [])[:5]:
            resource = proc.get("resource")
            if not resource:
                continue

            keywords = RESOURCE_KEYWORDS.get(resource, [resource])
            has_anomaly = any(
                keyword in cause.lower()
                for cause in anomalies
                for keyword in keywords
            )

            if has_anomaly or not anomalies:
                recs.append({
                    "priority": priority,
                    "title": f"Kill {proc.get('name', '?')}",
                    "description": f"Terminate {proc.get('name')} (PID {proc.get('pid')}) to reduce {resource} usage",
                    "process_name": proc.get("name"),
                    "process_pid": proc.get("pid"),
                    "action": "kill_process",
                    "estimated_gain": f"Reduce {resource} usage by ~{priority*15}%",
                    "resource": resource,
                })
                priority += 1

        return recs
  
RESOURCE_KEYWORDS = {
    "cpu": ["cpu"],
    "memory": ["ram", "memory"],
    "disk": ["disk"],
    "network": ["network"],
}


class ExecutionAgent(BaseAgent):
    """Execute approved recommendations"""

    def __init__(self, dry_run: bool = False):
        self.dry_run = dry_run

    async def run(self, state: TerminatorState) -> TerminatorState:
        if not state.get("user_approved", False):
            state["execution_result"] = {"skipped": True, "reason": "awaiting approval"}
            return state

        actions, errors = [], []
        for rec in state["recommendations"]:
            action = rec.get("action")
            pid = rec.get("process_pid")
            name = rec.get("process_name", "?")

            if action == "kill_process" and pid:
                result = self._safe_kill(pid, name)
                (actions if result["success"] else errors).append(result)

        state["execution_result"] = {
            "actions_taken": actions,
            "errors": errors,
            "dry_run": self.dry_run,
        }
        return state

    def _safe_kill(self, pid: int, name: str) -> dict:
        if name.lower() in SYSTEM_BLOCKLIST:
            return {"pid": pid, "name": name, "success": False, "reason": "protected system process"}

        try:
            proc = psutil.Process(pid)
            if proc.name().lower() in SYSTEM_BLOCKLIST:
                return {"pid": pid, "name": name, "success": False, "reason": "protected"}
            
            if self.dry_run:
                logger.info("[DRY RUN] Would kill %s (PID %s)", name, pid)
                return {"pid": pid, "name": name, "success": True, "reason": "dry_run"}

            proc.terminate()
            try:
                proc.wait(timeout=5)
            except psutil.TimeoutExpired:
                proc.kill()

            return {"pid": pid, "name": name, "success": True, "reason": "terminated"}
        except (psutil.NoSuchProcess, psutil.AccessDenied) as exc:
            return {"pid": pid, "name": name, "success": False, "reason": str(exc)}


# ╔══════════════════════════════════════════════════════════════════╗
# ║  LANGGRAPH ORCHESTRATOR                                          ║
# ╚══════════════════════════════════════════════════════════════════╝

class TerminatorGraph:
    """Build and run the full LangGraph pipeline"""

    def __init__(self, llm=None, dry_run: bool = False):
        self.llm = llm
        self.monitoring_agent = MonitoringAgent()
        self.analysis_agent = AnalysisAgent(llm=llm)
        self.recommendation_agent = RecommendationAgent(llm=llm)
        self.execution_agent = ExecutionAgent(dry_run=dry_run)
        self._metric_history: deque = deque(maxlen=5)
        self._graph = self._build()

    def _build(self):
        builder = StateGraph(TerminatorState)
        builder.add_node("monitoring", self.monitoring_agent.run)
        builder.add_node("analysis", self.analysis_agent.run)
        builder.add_node("recommendations", self.recommendation_agent.run)
        builder.add_node("execution", self.execution_agent.run)

        builder.set_entry_point("monitoring")
        builder.add_edge("monitoring", "analysis")
        builder.add_conditional_edges(
            "analysis",
            lambda s: "recommendations" if s["analysis"].get("show_recommendations") else END,
            {"recommendations": "recommendations", END: END},
        )
        builder.add_conditional_edges(
            "recommendations",
            lambda s: "execution" if s.get("user_approved") else END,
            {"execution": "execution", END: END},
        )
        builder.add_edge("execution", END)
        return builder.compile()

    async def run(self, user_approved: bool = False) -> TerminatorState:
        state = await self._graph.ainvoke(self._initial_state(user_approved))
        if state.get("metrics"):
            self._metric_history.append(state["metrics"])
        return state

    def stream(self, user_approved: bool = False):
        return self._graph.stream(self._initial_state(user_approved))

    def _initial_state(self, user_approved: bool) -> TerminatorState:
        return {
            "metrics": {},
            "metric_history": list(self._metric_history),
            "anomalies": [],
            "analysis": {},
            "recommendations": [],
            "user_approved": user_approved,
            "execution_result": {},
            "messages": [],
        }


# ╔══════════════════════════════════════════════════════════════════╗
# ║  DJANGO API ENDPOINTS                                            ║
# ╚══════════════════════════════════════════════════════════════════╝

# Global graph instance
_terminator_graph = None

def get_terminator_graph(llm=None):
    """Lazy-init the graph"""
    global _terminator_graph
    if _terminator_graph is None:
        _terminator_graph = TerminatorGraph(llm=llm, dry_run=False)
    return _terminator_graph


class TerminatorAnalysisView(APIView):
    """
    POST /api/terminator/analyze/
    Runs analysis, creates alerts with specific recommendations per alert
    """

    def post(self, request):
        try:
            graph = get_terminator_graph()
            # Run async code synchronously
            state = asyncio.run(graph.run(user_approved=False))

            alerts_created = 0
            for anomaly in state.get("anomalies", []):
                top_proc = anomaly.get("top_process", {})
                
                # Generate recommendations specific to THIS anomaly/process
                process_pid = top_proc.get("pid") if top_proc else None
                anomaly_specific_recs = [
                    r for r in state.get("recommendations", [])
                    if process_pid and r.get("process_pid") == process_pid
                ]
                
                # Create alert in database with specific recommendations
                alert = Alerts.objects.create(
                    pid=process_pid if process_pid else 0,
                    process_name=top_proc.get("name", "System") if top_proc else "System",
                    alert_level=anomaly["severity"],
                    resource=anomaly["resource"],
                    alert_message=anomaly["detail"],
                    resource_value=anomaly.get("value"),
                    threshold=anomaly.get("threshold"),
                    recommendations=anomaly_specific_recs,  # Per-alert recommendations
                )
                alerts_created += 1
                
                # Show notification
                try:
                    show_alert_notification(alert)
                    logger.info(f"🔔 Notification shown for {anomaly['resource']} alert - {top_proc.get('name', 'System') if top_proc else 'System'}")
                except Exception as e:
                    logger.error(f"❌ Notification failed for {anomaly['resource']}: {e}", exc_info=True)

            return Response({
                "success": True,
                "recommendations": state.get("recommendations"),
                "alerts_created": alerts_created,
            })
        except Exception as e:
            logger.error("Terminator analysis failed: %s", e, exc_info=True)
            return Response({"error": str(e)}, status=500)
        
class TerminatorExecuteView(APIView):
    """
    POST /api/terminator/execute/
    Body: {"alert_id": 123, "recommendation_index": 0}
    """

    def post(self, request):
        try:
            alert_id = request.data.get("alert_id")
            rec_index = request.data.get("recommendation_index")

            if alert_id is None:
                return Response({"error": "alert_id is required"}, status=400)
            if rec_index is None:
                return Response({"error": "recommendation_index is required"}, status=400)

            alert = Alerts.objects.get(alert_id=alert_id)
            recommendations = alert.recommendations

            if rec_index >= len(recommendations) or rec_index < 0:
                return Response({"error": f"Invalid index, alert has {len(recommendations)} recommendations"}, status=400)

            selected_rec = recommendations[rec_index]

            state = {
                "recommendations": [selected_rec],
                "user_approved": True,
                "execution_result": {},
                "metrics": {}, "metric_history": [], "anomalies": [],
                "analysis": {}, "messages": [],
            }

            graph = get_terminator_graph()
            exec_state = asyncio.run(graph.execution_agent.run(state))

            return Response({
                "success": True,
                "executed_recommendation": selected_rec,
                "actions_taken": exec_state["execution_result"].get("actions_taken", []),
                "errors": exec_state["execution_result"].get("errors", []),
            })

        except Alerts.DoesNotExist:
            return Response({"error": "Alert not found"}, status=404)
        except Exception as e:
            logger.error("Terminator execution failed: %s", e)
            return Response({"error": str(e)}, status=500)
                

from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler

# ╔══════════════════════════════════════════════════════════════════╗
# ║  FOLDER MONITOR                                                  ║
# ╚══════════════════════════════════════════════════════════════════╝

class FolderEventHandler(FileSystemEventHandler):
    def __init__(self, callback):
        self.callback = callback

    def on_modified(self, event):
        if not event.is_directory:
            self.callback("write", event.src_path)

    def on_created(self, event):
        if not event.is_directory:
            self.callback("write", event.src_path)

    def on_deleted(self, event):
        if not event.is_directory:
            self.callback("delete", event.src_path)

    def on_moved(self, event):
        if not event.is_directory:
            self.callback("move", event.src_path)


class FolderMonitor:
    def __init__(self):
        self._observers: dict[str, Observer] = {}

    def start_from_settings(self):
        try:
            settings = Settings.objects.get()
            if settings.folder and os.path.isdir(settings.folder):
                self.watch(settings.folder)
                logger.info("👀 Auto-watching from settings: %s", settings.folder)
            else:
                logger.info("📁 No folder configured in settings, skipping.")
        except Settings.DoesNotExist:
            logger.warning("Settings not found, skipping folder monitor.")

    def watch(self, folder_path: str, callback=None):
        if folder_path in self._observers:
            return

        def _default_callback(event_type, file_path):
            logger.info("📁 [%s] %s → %s", event_type.upper(), folder_path, file_path)
            
            alert=Alerts.objects.create(
                pid=0,
                process_name="FolderMonitor",
                alert_level="warning",
                resource="filesystem",
                alert_message=f"[{event_type.upper()}] {file_path}",
                resource_value=None,
                threshold=None,
                recommendations=[],
            )

            try:
                show_alert_notification(alert)
            except Exception as e:
                logger.error("❌ Folder monitor notification failed: %s", e)


        handler = FolderEventHandler(callback or _default_callback)
        observer = Observer()
        observer.schedule(handler, folder_path, recursive=True)
        observer.start()
        self._observers[folder_path] = observer
        logger.info("👀 Watching folder: %s", folder_path)

    def watched_folders(self) -> list[str]:
        return list(self._observers.keys())

    def stop_all(self):
        for path in list(self._observers):
            self.unwatch(path)

_folder_monitor = FolderMonitor()

class FolderMonitorView(APIView):
    """
    POST /api/terminator/folders/watch/   → {"path": "/some/folder"}
    POST /api/terminator/folders/unwatch/ → {"path": "/some/folder"}
    GET  /api/terminator/folders/         → list watched folders
    """

    def get(self, request):
        return Response({"watched_folders": _folder_monitor.watched_folders()})

    def post(self, request):
        action = request.data.get("action")  # "watch" or "unwatch"
        path = request.data.get("path")

        if not path:
            return Response({"error": "path is required"}, status=400)
        if not os.path.isdir(path):
            return Response({"error": f"'{path}' is not a valid directory"}, status=400)

        if action == "watch":
            _folder_monitor.watch(path)
            return Response({"success": True, "watching": path})
        elif action == "unwatch":
            _folder_monitor.unwatch(path)
            return Response({"success": True, "unwatched": path})
        else:
            return Response({"error": "action must be 'watch' or 'unwatch'"}, status=400)

# ╔══════════════════════════════════════════════════════════════════╗
# ║  EXAMPLE USAGE                                                   ║
# ╚══════════════════════════════════════════════════════════════════╝

# if __name__ == "__main__":
#     async def test():
#         print("\n🚀 Testing Terminator + Django integration\n")
#         graph = TerminatorGraph(llm=None, dry_run=True)
#         state = await graph.run(user_approved=False)
        
#         print(f"✅ Anomalies: {len(state['anomalies'])}")
#         for a in state['anomalies']:
#             top_proc = a.get("top_process")
#             process_info = f" (caused by {top_proc['name']} PID {top_proc['pid']})" if top_proc else ""
#             print(f"   • {a['detail']}{process_info}")
        
#         print(f"\n💡 Recommendations: {len(state['recommendations'])}")
#         for r in state['recommendations']:
#             print(f"   • {r['title']}")
        
#         print(f"\n🧠 Analysis urgency: {state['analysis'].get('urgency')}")

#     asyncio.run(test())