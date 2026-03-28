"""
The Terminator – AI Skeleton (class-based, single file)
========================================================
Architecture: Four LangGraph agents in a clean class hierarchy

    BaseAgent (abstract)
    ├── MonitoringAgent        – collects CPU / memory / disk / network / battery
    ├── AnalysisAgent          – root-cause + urgency (LLM or rule-based)
    ├── RecommendationAgent    – ranked action cards (LLM or rule-based)
    └── ExecutionAgent         – safe process termination

    ResourceMonitor (base for per-resource collectors)
    ├── CPUMonitor
    ├── MemoryMonitor
    ├── DiskMonitor
    ├── NetworkMonitor
    └── BatteryMonitor

    TerminatorGraph  – builds & runs the LangGraph pipeline

Usage:
    pip install psutil langgraph langchain-core
    python terminator_ai.py
"""

import asyncio
import json
import logging
import os
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import TypedDict, Annotated, Sequence, Optional

import psutil

from langgraph.graph import StateGraph, END
from langgraph.graph.message import add_messages
from langchain_core.messages import HumanMessage, SystemMessage

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


# ╔══════════════════════════════════════════════════════════════════╗
# ║  CONSTANTS & THRESHOLDS                                          ║
# ╚══════════════════════════════════════════════════════════════════╝

THRESHOLDS = {
    "cpu_percent":      85.0,
    "memory_percent":   80.0,
    "disk_percent":     90.0,
    "network_mb_recv": 500.0,
    "battery_percent":  20.0,
}

SYSTEM_BLOCKLIST = frozenset({
    "system", "smss.exe", "csrss.exe", "wininit.exe", "winlogon.exe",
    "lsass.exe", "svchost.exe", "services.exe", "explorer.exe",
    "launchd", "kernel_task", "systemd", "init", "kthreadd",
    "dockerd", "sshd",
})

ANALYSIS_PROMPT = """You are a system performance analyst.
Given anomalies and raw metrics, return ONLY valid JSON (no markdown):
{
  "root_causes": ["..."],
  "top_offending_processes": [{"name": str, "pid": int, "resource": str, "impact": "low|medium|high"}],
  "predictions": ["..."],
  "urgency": "low|medium|high|critical"
}"""

RECOMMENDATION_PROMPT = """You are a system optimization assistant.
Return ONLY a valid JSON array of recommendation cards (no markdown):
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
# ║  SHARED STATE                                                    ║
# ╚══════════════════════════════════════════════════════════════════╝

class TerminatorState(TypedDict):
    metrics:           dict
    anomalies:         list[dict]
    analysis:          dict
    recommendations:   list[dict]
    user_approved:     bool
    execution_result:  dict
    messages:          Annotated[Sequence, add_messages]


# ╔══════════════════════════════════════════════════════════════════╗
# ║  RESOURCE MONITORS  (per-resource data collectors)              ║
# ╚══════════════════════════════════════════════════════════════════╝

class ResourceMonitor(ABC):
    """Abstract base class for all per-resource monitors."""

    @abstractmethod
    async def snapshot(self) -> dict:
        """Return a dict of current metrics for this resource."""
        ...


class CPUMonitor(ResourceMonitor):
    """Collects CPU utilisation metrics."""

    async def snapshot(self) -> dict:
        return {
            "percent":     psutil.cpu_percent(interval=1),
            "per_core":    psutil.cpu_percent(interval=None, percpu=True),
            "per_process": [
                {"pid": p.pid, "name": p.name(), "cpu_percent": p.cpu_percent()}
                for p in psutil.process_iter(["pid", "name", "cpu_percent"])
            ],
        }


class MemoryMonitor(ResourceMonitor):
    """Collects RAM utilisation metrics."""

    async def snapshot(self) -> dict:
        vm = psutil.virtual_memory()
        return {
            "total_gb":    round(vm.total / 1e9, 2),
            "used_gb":     round(vm.used  / 1e9, 2),
            "percent":     vm.percent,
            "per_process": [
                {
                    "pid":    p.pid,
                    "name":   p.name(),
                    "rss_mb": round(p.memory_info().rss / 1e6, 1),
                }
                for p in psutil.process_iter(["pid", "name", "memory_info"])
                if p.memory_info().rss > 50 * 1e6
            ],
        }


class DiskMonitor(ResourceMonitor):
    """Collects disk space and I/O metrics."""

    def __init__(self, path: str = "/"):
        self.path = path

    async def snapshot(self) -> dict:
        disk = psutil.disk_usage(self.path)
        io   = psutil.disk_io_counters()
        return {
            "percent": disk.percent,
            "used_gb": round(disk.used / 1e9, 2),
            "free_gb": round(disk.free / 1e9, 2),
            "io": {
                "read_mb":  round(io.read_bytes  / 1e6, 2) if io else 0,
                "write_mb": round(io.write_bytes / 1e6, 2) if io else 0,
            },
        }


class NetworkMonitor(ResourceMonitor):
    """Collects network I/O and connection metrics."""

    async def snapshot(self) -> dict:
        net = psutil.net_io_counters()
        return {
            "bytes_sent_mb": round(net.bytes_sent / 1e6, 2),
            "bytes_recv_mb": round(net.bytes_recv / 1e6, 2),
            "connections":   len(psutil.net_connections()),
        }


class BatteryMonitor(ResourceMonitor):
    """Collects battery status metrics (returns safe defaults on desktops)."""

    async def snapshot(self) -> dict:
        bat = psutil.sensors_battery()
        if bat is None:
            return {"percent": None, "plugged_in": True, "secs_left": None}
        return {
            "percent":    bat.percent,
            "plugged_in": bat.power_plugged,
            "secs_left":  bat.secsleft if bat.secsleft != psutil.POWER_TIME_UNLIMITED else None,
        }


# ╔══════════════════════════════════════════════════════════════════╗
# ║  BASE AGENT                                                      ║
# ╚══════════════════════════════════════════════════════════════════╝

class BaseAgent(ABC):
    """Abstract base class for all LangGraph agents."""

    @abstractmethod
    async def run(self, state: TerminatorState) -> TerminatorState:
        """Execute the agent's logic and return the updated state."""
        ...


# ╔══════════════════════════════════════════════════════════════════╗
# ║  NODE 1 – MONITORING AGENT                                       ║
# ╚══════════════════════════════════════════════════════════════════╝

class MonitoringAgent(BaseAgent):
    """
    Collects all system metrics via ResourceMonitor subclasses,
    then performs threshold-based anomaly detection.
    """

    def __init__(self):
        self.cpu_monitor     = CPUMonitor()
        self.memory_monitor  = MemoryMonitor()
        self.disk_monitor    = DiskMonitor()
        self.network_monitor = NetworkMonitor()
        self.battery_monitor = BatteryMonitor()

    async def run(self, state: TerminatorState) -> TerminatorState:
        logger.info("MonitoringAgent: collecting metrics …")
        metrics   = await self._collect_all_metrics()
        anomalies = self._detect_anomalies(metrics)
        state["metrics"]   = metrics
        state["anomalies"] = anomalies
        return state

    async def _collect_all_metrics(self) -> dict:
        return {
            "cpu":     await self.cpu_monitor.snapshot(),
            "memory":  await self.memory_monitor.snapshot(),
            "disk":    await self.disk_monitor.snapshot(),
            "network": await self.network_monitor.snapshot(),
            "battery": await self.battery_monitor.snapshot(),
        }

    def _detect_anomalies(self, metrics: dict) -> list[dict]:
        anomalies = []

        # Standard resource checks against THRESHOLDS
        checks = [
            ("cpu",     "percent",       "cpu_percent",     "CPU usage is high"),
            ("memory",  "percent",       "memory_percent",  "RAM usage is high"),
            ("disk",    "percent",       "disk_percent",    "Disk is nearly full"),
            ("network", "bytes_recv_mb", "network_mb_recv", "High inbound network traffic"),
        ]
        for resource, field, key, detail in checks:
            value = metrics.get(resource, {}).get(field)
            if value is None:
                continue
            limit = THRESHOLDS[key]
            if value >= limit:
                anomalies.append({
                    "resource":  resource,
                    "severity":  "critical" if value >= limit * 1.15 else "warning",
                    "value":     value,
                    "threshold": limit,
                    "detail":    f"{detail}: {value} (limit {limit})",
                })

        # Battery check (only when on battery power)
        bat = metrics.get("battery", {})
        pct = bat.get("percent")
        if pct is not None and not bat.get("plugged_in", True):
            if pct <= THRESHOLDS["battery_percent"]:
                anomalies.append({
                    "resource":  "battery",
                    "severity":  "warning" if pct > 10 else "critical",
                    "value":     pct,
                    "threshold": THRESHOLDS["battery_percent"],
                    "detail":    f"Battery low: {pct}%",
                })

        logger.info("MonitoringAgent: %d anomalies detected", len(anomalies))
        return anomalies


# ╔══════════════════════════════════════════════════════════════════╗
# ║  NODE 2 – ANALYSIS AGENT                                         ║
# ╚══════════════════════════════════════════════════════════════════╝

class AnalysisAgent(BaseAgent):
    """
    Performs root-cause analysis and urgency assessment.
    Uses an LLM when available; falls back to rule-based logic.
    """

    def __init__(self, llm=None):
        self.llm = llm  # TODO: inject ChatOpenAI / ChatAnthropic here

    async def run(self, state: TerminatorState) -> TerminatorState:
        logger.info("AnalysisAgent: analysing %d anomalies …", len(state["anomalies"]))
        if not state["anomalies"]:
            state["analysis"] = {"urgency": "low", "findings": "No anomalies detected."}
            return state

        if self.llm:
            state["analysis"] = await self._llm_analysis(state["metrics"], state["anomalies"])
        else:
            state["analysis"] = self._rule_based_analysis(state["metrics"], state["anomalies"])
        return state

    async def _llm_analysis(self, metrics: dict, anomalies: list[dict]) -> dict:
        prompt = (
            f"ANOMALIES:\n{json.dumps(anomalies, indent=2)}\n\n"
            f"METRICS:\n{json.dumps(metrics, indent=2)}"
        )
        try:
            resp = await self.llm.ainvoke([
                SystemMessage(content=ANALYSIS_PROMPT),
                HumanMessage(content=prompt),
            ])
            return json.loads(resp.content.strip())
        except Exception as exc:
            logger.warning("LLM analysis failed (%s) – falling back to rules", exc)
            return self._rule_based_analysis(metrics, anomalies)

    def _rule_based_analysis(self, metrics: dict, anomalies: list[dict]) -> dict:
        severities = [a["severity"] for a in anomalies]
        urgency    = "critical" if "critical" in severities else ("medium" if severities else "low")

        top_cpu = sorted(
            metrics.get("cpu", {}).get("per_process", []),
            key=lambda p: p.get("cpu_percent", 0), reverse=True
        )[:3]
        top_mem = sorted(
            metrics.get("memory", {}).get("per_process", []),
            key=lambda p: p.get("rss_mb", 0), reverse=True
        )[:3]

        offenders, seen = [], set()
        for p in top_cpu:
            if p["pid"] not in seen:
                offenders.append({
                    **p, "resource": "cpu",
                    "impact": "high" if p.get("cpu_percent", 0) > 60 else "medium",
                })
                seen.add(p["pid"])
        for p in top_mem:
            if p["pid"] not in seen:
                offenders.append({
                    **p, "resource": "memory",
                    "impact": "high" if p.get("rss_mb", 0) > 1000 else "medium",
                })
                seen.add(p["pid"])

        predictions = []
        disk = metrics.get("disk", {})
        if disk.get("percent", 0) > 80 and disk.get("free_gb", 0) > 0:
            # TODO: use real daily write rate from DiskMonitor
            days = int(disk["free_gb"] / 1.0)
            predictions.append(f"At current usage, disk may be full in ~{days} days.")

        return {
            "root_causes":             [a["detail"] for a in anomalies],
            "top_offending_processes": offenders,
            "predictions":             predictions,
            "urgency":                 urgency,
        }


# ╔══════════════════════════════════════════════════════════════════╗
# ║  NODE 3 – RECOMMENDATION AGENT                                   ║
# ╚══════════════════════════════════════════════════════════════════╝

class RecommendationAgent(BaseAgent):
    """
    Produces a prioritised list of actionable recommendation cards.
    Uses an LLM when available; falls back to rule-based logic.
    """

    def __init__(self, llm=None):
        self.llm = llm  # TODO: inject LLM

    async def run(self, state: TerminatorState) -> TerminatorState:
        logger.info("RecommendationAgent: building recommendations …")
        if self.llm:
            recs = await self._llm_recommendations(state["analysis"], state["metrics"])
        else:
            recs = self._rule_based_recommendations(state["analysis"], state["metrics"])
        state["recommendations"] = sorted(recs, key=lambda r: r.get("priority", 99))
        return state

    async def _llm_recommendations(self, analysis: dict, metrics: dict) -> list[dict]:
        prompt = (
            f"ANALYSIS:\n{json.dumps(analysis, indent=2)}\n\n"
            f"TOP CPU:\n{json.dumps(metrics.get('cpu', {}).get('per_process', [])[:5], indent=2)}\n\n"
            f"TOP MEM:\n{json.dumps(metrics.get('memory', {}).get('per_process', [])[:5], indent=2)}"
        )
        try:
            resp = await self.llm.ainvoke([
                SystemMessage(content=RECOMMENDATION_PROMPT),
                HumanMessage(content=prompt),
            ])
            return json.loads(resp.content.strip())
        except Exception as exc:
            logger.warning("LLM recommendations failed (%s) – using rules", exc)
            return self._rule_based_recommendations(analysis, metrics)

    def _rule_based_recommendations(self, analysis: dict, metrics: dict) -> list[dict]:
        recs, priority = [], 1

        for proc in analysis.get("top_offending_processes", []):
            resource = proc.get("resource", "cpu")
            name     = proc.get("name", "?")
            pid      = proc.get("pid")
            impact   = proc.get("impact", "medium")

            if resource == "cpu":
                pct = proc.get("cpu_percent", 0)
                recs.append({
                    "priority":      priority,
                    "title":         f"High CPU: {name}",
                    "description":   (
                        f"{name} (PID {pid}) is using {pct:.1f}% CPU. "
                        "Terminating it could free up significant processing power."
                    ),
                    "process_name":  name,
                    "process_pid":   pid,
                    "action":        "kill_process" if impact == "high" else "alert_user",
                    "estimated_gain": f"~{pct:.0f}% CPU freed",
                })
            elif resource == "memory":
                mb = proc.get("rss_mb", 0)
                recs.append({
                    "priority":      priority,
                    "title":         f"High Memory: {name}",
                    "description":   f"{name} (PID {pid}) is consuming {mb:.0f} MB RAM.",
                    "process_name":  name,
                    "process_pid":   pid,
                    "action":        "kill_process" if impact == "high" else "alert_user",
                    "estimated_gain": f"~{mb:.0f} MB RAM freed",
                })
            priority += 1

        for pred in analysis.get("predictions", []):
            recs.append({
                "priority":       priority,
                "title":          "Predicted Issue",
                "description":    pred,
                "process_name":   None,
                "process_pid":    None,
                "action":         "alert_user",
                "estimated_gain": "Prevents future degradation",
            })
            priority += 1

        return recs


# ╔══════════════════════════════════════════════════════════════════╗
# ║  NODE 4 – EXECUTION AGENT                                        ║
# ╚══════════════════════════════════════════════════════════════════╝

class ExecutionAgent(BaseAgent):
    """
    Executes approved recommendations safely.
    Guards against terminating protected system processes.
    Set dry_run=True during development to log without killing.
    """

    def __init__(self, dry_run: bool = False):
        self.dry_run = dry_run

    async def run(self, state: TerminatorState) -> TerminatorState:
        if not state.get("user_approved", False):
            state["execution_result"] = {
                "skipped": True,
                "reason":  "awaiting user approval",
            }
            return state

        actions_taken, errors = [], []
        for rec in state["recommendations"]:
            action = rec.get("action")
            pid    = rec.get("process_pid")
            name   = rec.get("process_name", "?")

            if action == "kill_process" and pid is not None:
                result = self._safe_kill(pid, name)
                (actions_taken if result["success"] else errors).append(result)

        state["execution_result"] = {
            "actions_taken": actions_taken,
            "errors":        errors,
            "dry_run":       self.dry_run,
        }
        return state

    def _safe_kill(self, pid: int, name: str) -> dict:
        base = {"pid": pid, "name": name}

        # Blocklist check on provided name
        if name.lower() in SYSTEM_BLOCKLIST:
            return {**base, "success": False, "reason": "blocked — protected system process"}

        # Verify the process still exists and check its actual name
        try:
            proc = psutil.Process(pid)
            if proc.name().lower() in SYSTEM_BLOCKLIST:
                return {**base, "success": False, "reason": "blocked — actual name is protected"}
        except psutil.NoSuchProcess:
            return {**base, "success": False, "reason": "process no longer exists"}

        # Dry-run mode
        if self.dry_run:
            logger.info("[DRY RUN] Would kill %s (PID %s)", name, pid)
            return {**base, "success": True, "reason": "dry_run"}

        # Live termination with graceful → force escalation
        try:
            proc.terminate()
            try:
                proc.wait(timeout=5)
            except psutil.TimeoutExpired:
                proc.kill()
            return {**base, "success": True, "reason": "terminated"}
        except psutil.AccessDenied:
            return {**base, "success": False, "reason": "access denied"}
        except Exception as exc:
            return {**base, "success": False, "reason": str(exc)}


# ╔══════════════════════════════════════════════════════════════════╗
# ║  LANGGRAPH ORCHESTRATOR                                          ║
# ╚══════════════════════════════════════════════════════════════════╝

class TerminatorGraph:
    """
    Builds and runs the full LangGraph pipeline:

        monitoring → analysis → (conditional) recommendations → (conditional) execution
    """

    def __init__(self, llm=None, dry_run: bool = False):
        self.monitoring_agent     = MonitoringAgent()
        self.analysis_agent       = AnalysisAgent(llm=llm)
        self.recommendation_agent = RecommendationAgent(llm=llm)
        self.execution_agent      = ExecutionAgent(dry_run=dry_run)
        self._graph = self._build()

    def _build(self):
        builder = StateGraph(TerminatorState)

        builder.add_node("monitoring",      self.monitoring_agent.run)
        builder.add_node("analysis",        self.analysis_agent.run)
        builder.add_node("recommendations", self.recommendation_agent.run)
        builder.add_node("execution",       self.execution_agent.run)

        builder.set_entry_point("monitoring")
        builder.add_edge("monitoring", "analysis")

        # Skip recommendations if no anomalies were found
        builder.add_conditional_edges(
            "analysis",
            lambda s: "recommendations" if s.get("anomalies") else END,
            {"recommendations": "recommendations", END: END},
        )

        # Skip execution until user explicitly approves
        builder.add_conditional_edges(
            "recommendations",
            lambda s: "execution" if s.get("user_approved") else END,
            {"execution": "execution", END: END},
        )

        builder.add_edge("execution", END)
        return builder.compile()

    async def run(self, user_approved: bool = False) -> TerminatorState:
        """Run the full pipeline once and return the final state."""
        return await self._graph.ainvoke(self._initial_state(user_approved))

    def stream(self, user_approved: bool = False):
        """Stream node-by-node updates for real-time UI consumption."""
        return self._graph.stream(self._initial_state(user_approved))

    @staticmethod
    def _initial_state(user_approved: bool) -> TerminatorState:
        return {
            "metrics":          {},
            "anomalies":        [],
            "analysis":         {},
            "recommendations":  [],
            "user_approved":    user_approved,
            "execution_result": {},
            "messages":         [],
        }


# ╔══════════════════════════════════════════════════════════════════╗
# ║  ENTRY POINT                                                     ║
# ╚══════════════════════════════════════════════════════════════════╝

if __name__ == "__main__":
    async def main():
        # TODO: pass llm=ChatAnthropic(...) or llm=ChatOpenAI(...) once you have an API key
        graph = TerminatorGraph(dry_run=True)

        print("\n── Running one monitoring cycle ──")
        state = await graph.run(user_approved=False)

        print(f"\nAnomalies  : {len(state['anomalies'])}")
        for a in state["anomalies"]:
            print(f"  [{a['severity'].upper()}] {a['detail']}")

        print(f"\nAnalysis urgency : {state['analysis'].get('urgency', 'n/a')}")
        for cause in state["analysis"].get("root_causes", []):
            print(f"  - {cause}")

        print(f"\nRecommendations : {len(state['recommendations'])}")
        for r in state["recommendations"]:
            print(f"  [{r['priority']}] {r['title']} → {r['action']} | {r['estimated_gain']}")

        print("\nDone. Set user_approved=True to trigger execution.\n")

    asyncio.run(main())
