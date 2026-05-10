import { useEffect, useState } from "react";

function Alerts() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState({});
  const [executingId, setExecutingId] = useState(null);
  const [execResults, setExecResults] = useState({});
  const [activeTab, setActiveTab] = useState("all");

  const fetchAlerts = () => {
    fetch("http://127.0.0.1:8000/api/alerts/?n=10")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          const sorted = [...data.alerts].sort((a, b) => {
            if (a.is_acknowledged === b.is_acknowledged) return 0;
            return a.is_acknowledged ? 1 : -1;
          });
          setAlerts(sorted);

          sorted.forEach((alert) => {
            if (alert.is_acknowledged) return;
            const recs = alert.recommendations || [];
            if (recs.length === 0) return;
            const done = alert.executed_recommendations || [];
            const allDone = recs.every((_, i) => done.includes(i));
            if (allDone) {
              fetch(`http://127.0.0.1:8000/api/alerts/acknowledge/?alert_id=${alert.alert_id}`)
                .catch((err) => console.error(err));
            }
          });
        }
        setLoading(false);
      })
      .catch((err) => { console.error(err); setLoading(false); });
  };

  useEffect(() => {
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 10000);
    return () => clearInterval(interval);
  }, []);

  const getResourceIcon = (resource) => {
    const icons = { cpu: "", memory: "", disk: "", battery: "", network: "", filesystem: "" };
    return icons[resource] || "⚠";
  };

  // Derive unique resources from alerts for tab generation
  const resourceCounts = alerts.reduce((acc, alert) => {
    const r = alert.resource || "unknown";
    acc[r] = (acc[r] || 0) + 1;
    return acc;
  }, {});

  const tabs = [
    { key: "all", label: "All", icon: "⚡", count: alerts.length },
    ...Object.entries(resourceCounts).map(([resource, count]) => ({
      key: resource,
      label: resource.charAt(0).toUpperCase() + resource.slice(1),
      icon: getResourceIcon(resource),
      count,
    })),
  ];

  const filteredAlerts = activeTab === "all"
    ? alerts
    : alerts.filter((a) => a.resource === activeTab);

  const toggleSelect = (alertId, index) => {
    setSelected((prev) => {
      const current = prev[alertId] || [];
      const updated = current.includes(index)
        ? current.filter((i) => i !== index)
        : [...current, index];
      return { ...prev, [alertId]: updated };
    });
  };

  const executeSelected = (alert) => {
    const selectedIndexes = selected[alert.alert_id] || [];
    if (selectedIndexes.length === 0) return;
    setExecutingId(alert.alert_id);

    const requests = selectedIndexes.map((index) =>
      fetch("http://127.0.0.1:8000/api/terminator/execute/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          alert_id: alert.alert_id,
          recommendation_index: index,
        }),
      })
        .then((res) => res.json())
        .then((data) => ({ index, data }))
        .catch((err) => ({ index, data: { success: false, error: err.message } }))
    );

    Promise.all(requests)
      .then((results) => {
        setExecResults((prev) => {
          const prevResults = prev[alert.alert_id] || {};
          const newResults = { ...prevResults };
          results.forEach(({ index, data }) => {
            if (data.success) {
              const actionCount = data.actions_taken?.length ?? 0;
              const errorCount = data.errors?.length ?? 0;
              if (errorCount > 0) {
                const errorMsg = data.errors
                  .map((e) => typeof e === "string" ? e : e.reason || e.message || e.error || e.detail || JSON.stringify(e))
                  .join("; ");
                newResults[index] = { success: false, message: errorMsg };
              } else if (actionCount > 0) {
                newResults[index] = { success: true, message: "Executed successfully" };
              } else {
                newResults[index] = { success: false, message: "No actions were taken — process may have already exited" };
              }
            } else {
              newResults[index] = { success: false, message: data.error || "Execution failed" };
            }
          });
          return { ...prev, [alert.alert_id]: newResults };
        });

        setSelected((prev) => ({ ...prev, [alert.alert_id]: [] }));
        fetchAlerts();
      })
      .catch((err) => console.error(err))
      .finally(() => setExecutingId(null));
  };

  const handleAcknowledge = (id) => {
    fetch(`http://127.0.0.1:8000/api/alerts/acknowledge/?alert_id=${id}`)
      .then(() => fetchAlerts())
      .catch((err) => console.error(err));
  };

  const handleDelete = (id) => {
    fetch(`http://127.0.0.1:8000/api/alerts/delete/?alert_id=${id}`, { method: "DELETE" })
      .then(() => fetchAlerts())
      .catch((err) => console.error(err));
  };

  const isCritical = (level) => level === "critical";

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
        <h1 style={{ margin: 0 }}>All Alerts</h1>
        <span style={{ fontSize: "12px", color: "#555", letterSpacing: "2px" }}>
          {alerts.length} ALERT{alerts.length !== 1 ? "S" : ""}
        </span>
      </div>

      {/* Resource Filter Tabs */}
      <div style={{
        display: "flex",
        gap: "6px",
        marginBottom: "20px",
        overflowX: "auto",
        paddingBottom: "2px",
        scrollbarWidth: "none",
      }}>
        {tabs.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "6px 14px",
                borderRadius: "999px",
                border: `1px solid ${isActive ? "#ff4d6d66" : "#2a2a2a"}`,
                backgroundColor: isActive ? "#ff4d6d18" : "#ffffff06",
                color: isActive ? "#ff4d6d" : "#555",
                fontSize: "11px",
                fontWeight: "700",
                letterSpacing: "1px",
                cursor: "pointer",
                whiteSpace: "nowrap",
                transition: "all 0.15s ease",
                flexShrink: 0,
              }}
            >
              <span style={{ fontSize: "13px" }}>{tab.icon}</span>
              {tab.label.toUpperCase()}
              <span style={{
                padding: "1px 6px",
                borderRadius: "999px",
                backgroundColor: isActive ? "#ff4d6d33" : "#ffffff0a",
                color: isActive ? "#ff8fa3" : "#444",
                fontSize: "10px",
                fontWeight: "700",
                letterSpacing: "0.5px",
              }}>
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Alert List */}
      {loading ? (
        <div className="card" style={{ textAlign: "center", padding: "48px", color: "#555", letterSpacing: "2px", fontSize: "12px" }}>
          LOADING...
        </div>
      ) : filteredAlerts.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: "56px 32px" }}>
          <div style={{ fontSize: "40px", marginBottom: "16px" }}>✅</div>
          <p style={{ color: "#4cff91", fontSize: "13px", letterSpacing: "2px", margin: 0 }}>ALL SYSTEMS NORMAL</p>
          <p style={{ color: "#444", fontSize: "12px", marginTop: "8px" }}>
            {activeTab === "all" ? "No active alerts detected" : `No ${activeTab} alerts detected`}
          </p>
        </div>
      ) : (
        filteredAlerts.map((alert) => {
          const selectedIndexes = selected[alert.alert_id] || [];
          const isExecuting = executingId === alert.alert_id;
          const critical = isCritical(alert.alert_level);
          const isAcknowledged = alert.is_acknowledged;
          const doneIndexes = new Set(alert.executed_recommendations || []);
          const alertExecResults = execResults[alert.alert_id] || {};
          const executableSelected = selectedIndexes.filter((i) => !doneIndexes.has(i));

          return (
            <div
              key={alert.alert_id}
              className="card"
              style={{
                marginBottom: "12px",
                position: "relative",
                overflow: "hidden",
                borderColor: critical ? "#ff4d6d33" : "#ffffff0f",
              }}
            >
              <div style={{
                position: "absolute", left: 0, top: 0, bottom: 0, width: "3px",
                backgroundColor: critical ? "#ff4d6d" : "#333",
              }} />

              <div style={{ paddingLeft: "12px" }}>

                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <span style={{ fontSize: "18px" }}>{getResourceIcon(alert.resource)}</span>
                    <div>
                      <h3 style={{ margin: 0, fontSize: "14px", color: "#fff" }}>{alert.process_name}</h3>
                      <p style={{ margin: 0, fontSize: "11px", color: "#555", letterSpacing: "1px" }}>
                        PID {alert.pid} · {alert.resource.toUpperCase()}
                      </p>
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                    <span style={{
                      padding: "2px 9px",
                      borderRadius: "999px",
                      fontSize: "10px",
                      fontWeight: "700",
                      letterSpacing: "1px",
                      textTransform: "uppercase",
                      color: critical ? "#ff4d6d" : "#aaa",
                      border: `1px solid ${critical ? "#ff4d6d44" : "#333"}`,
                      backgroundColor: critical ? "#ff4d6d10" : "#ffffff08",
                    }}>
                      {alert.alert_level}
                    </span>
                    {isAcknowledged && (
                      <span style={{
                        padding: "2px 9px",
                        borderRadius: "999px",
                        fontSize: "10px",
                        fontWeight: "700",
                        letterSpacing: "1px",
                        color: "#555",
                        border: "1px solid #333",
                        backgroundColor: "#ffffff06",
                      }}>
                        ACK
                      </span>
                    )}
                  </div>
                </div>

                <p style={{
                  margin: "0 0 14px",
                  fontSize: "12px",
                  color: "#888",
                  padding: "8px 12px",
                  backgroundColor: "#ffffff06",
                  borderRadius: "6px",
                  borderLeft: `2px solid ${critical ? "#ff4d6d33" : "#333"}`,
                }}>
                  {alert.alert_message}
                </p>

                <div style={{ display: "flex", gap: "10px", marginBottom: "14px" }}>
                  {[
                    { label: "VALUE", value: alert.resource_value != null ? `${alert.resource_value}%` : "—" },
                    { label: "THRESHOLD", value: alert.threshold != null ? `${alert.threshold}%` : "—" },
                    { label: "STATUS", value: isAcknowledged ? "Acknowledged" : "Pending" },
                  ].map(({ label, value }) => (
                    <div key={label} style={{
                      flex: 1,
                      backgroundColor: "#ffffff05",
                      borderRadius: "6px",
                      padding: "8px 12px",
                      border: "1px solid #ffffff08",
                    }}>
                      <p style={{ margin: 0, fontSize: "9px", color: "#444", letterSpacing: "1.5px" }}>{label}</p>
                      <p style={{ margin: "4px 0 0", fontSize: "15px", fontWeight: "600", color: "#ccc" }}>{value}</p>
                    </div>
                  ))}
                </div>

                {alert.recommendations && alert.recommendations.length > 0 && (
                  <div style={{ marginBottom: "14px" }}>
                    <p style={{ margin: "0 0 8px", fontSize: "10px", color: "#444", letterSpacing: "2px" }}>
                      RECOMMENDATIONS
                    </p>

                    {isAcknowledged ? (
                      <div style={{
                        padding: "10px 14px",
                        borderRadius: "6px",
                        backgroundColor: "#ffffff05",
                        border: "1px solid #333",
                        fontSize: "11px",
                        color: "#555",
                        letterSpacing: "1px",
                      }}>
                        Execution disabled for acknowledged alerts
                      </div>
                    ) : (
                      <>
                        {alert.recommendations.map((rec, index) => {
                          const isChecked = selectedIndexes.includes(index);
                          const alreadyExecuted = doneIndexes.has(index);
                          const result = alertExecResults[index];

                          return (
                            <div key={index}>
                              <div
                                onClick={() => !alreadyExecuted && toggleSelect(alert.alert_id, index)}
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "10px",
                                  padding: "9px 12px",
                                  marginBottom: "2px",
                                  borderRadius: result ? "6px 6px 0 0" : "6px",
                                  backgroundColor: alreadyExecuted ? "#ffffff03" : isChecked ? "#ff4d6d0e" : "#ffffff05",
                                  border: `1px solid ${alreadyExecuted ? "#ffffff08" : isChecked ? "#ff4d6d33" : "#ffffff08"}`,
                                  borderBottom: result ? "none" : undefined,
                                  cursor: alreadyExecuted ? "default" : "pointer",
                                  opacity: alreadyExecuted ? 0.5 : 1,
                                  transition: "all 0.15s ease",
                                }}
                              >
                                <div style={{
                                  width: "14px", height: "14px", borderRadius: "3px", flexShrink: 0,
                                  border: `1.5px solid ${alreadyExecuted ? "#333" : isChecked ? "#ff4d6d" : "#333"}`,
                                  backgroundColor: alreadyExecuted ? "#ffffff08" : isChecked ? "#ff4d6d" : "transparent",
                                  display: "flex", alignItems: "center", justifyContent: "center",
                                  transition: "all 0.15s ease",
                                }}>
                                  {alreadyExecuted
                                    ? <span style={{ color: "#555", fontSize: "9px", fontWeight: "700" }}>—</span>
                                    : isChecked && <span style={{ color: "#fff", fontSize: "9px", fontWeight: "700" }}>✓</span>
                                  }
                                </div>

                                <div style={{ flex: 1 }}>
                                  <p style={{ margin: 0, fontSize: "12px", color: alreadyExecuted ? "#555" : "#ccc" }}>
                                    {rec.title || `${rec.process_name} → ${rec.action}`}
                                  </p>
                                  {rec.description && (
                                    <p style={{ margin: "2px 0 0", fontSize: "11px", color: "#555" }}>{rec.description}</p>
                                  )}
                                </div>

                                {alreadyExecuted ? (
                                  <span style={{ fontSize: "10px", color: "#444", letterSpacing: "1px" }}>DONE</span>
                                ) : rec.estimated_gain ? (
                                  <span style={{ fontSize: "10px", color: "#666", whiteSpace: "nowrap" }}>{rec.estimated_gain}</span>
                                ) : null}
                              </div>

                              {result && (
                                <div style={{
                                  padding: "6px 12px",
                                  marginBottom: "5px",
                                  borderRadius: "0 0 6px 6px",
                                  backgroundColor: result.success ? "#0a2a14" : "#2a0a0a",
                                  border: `1px solid ${result.success ? "#4cff9133" : "#ff4d6d33"}`,
                                  borderTop: "none",
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "6px",
                                }}>
                                  <span style={{ fontSize: "11px" }}>{result.success ? "✓" : "⚠"}</span>
                                  <span style={{ fontSize: "11px", color: result.success ? "#4cff91" : "#ff8fa3" }}>
                                    {result.message}
                                  </span>
                                </div>
                              )}
                            </div>
                          );
                        })}

                        <button
                          onClick={() => executeSelected(alert)}
                          disabled={executableSelected.length === 0 || isExecuting}
                          style={{
                            marginTop: "8px",
                            padding: "7px 18px",
                            borderRadius: "6px",
                            border: "none",
                            backgroundColor: executableSelected.length === 0 ? "#1a1a1a" : "#ff4d6d",
                            color: executableSelected.length === 0 ? "#333" : "#fff",
                            fontSize: "11px",
                            fontWeight: "700",
                            letterSpacing: "1px",
                            cursor: executableSelected.length === 0 ? "not-allowed" : "pointer",
                            transition: "all 0.15s ease",
                            opacity: isExecuting ? 0.6 : 1,
                          }}
                        >
                          {isExecuting ? "EXECUTING..." : `EXECUTE (${executableSelected.length})`}
                        </button>
                      </>
                    )}
                  </div>
                )}

                <div style={{ display: "flex", gap: "8px" }}>
                  {!isAcknowledged && (
                    <button
                      onClick={() => handleAcknowledge(alert.alert_id)}
                      style={{
                        padding: "6px 14px",
                        borderRadius: "6px",
                        border: "1px solid #333",
                        backgroundColor: "transparent",
                        color: "#888",
                        fontSize: "11px",
                        fontWeight: "600",
                        letterSpacing: "1px",
                        cursor: "pointer",
                      }}
                    >
                      ACKNOWLEDGE
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(alert.alert_id)}
                    style={{
                      padding: "6px 14px",
                      borderRadius: "6px",
                      border: "1px solid #2a2a2a",
                      backgroundColor: "transparent",
                      color: "#555",
                      fontSize: "11px",
                      fontWeight: "600",
                      letterSpacing: "1px",
                      cursor: "pointer",
                    }}
                  >
                    DELETE
                  </button>
                </div>

              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

export default Alerts;