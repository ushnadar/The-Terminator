import { useEffect, useState } from "react";

function Alerts() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState({});
  const [executingId, setExecutingId] = useState(null);

  const fetchAlerts = () => {
    fetch("http://127.0.0.1:8000/api/alerts/?n=10")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setAlerts(data.alerts);
        setLoading(false);
      })
      .catch((err) => { console.error(err); setLoading(false); });
  };

  useEffect(() => {
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 10000);
    return () => clearInterval(interval);
  }, []);

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
    const approved = selectedIndexes.map((i) => alert.recommendations[i]);
    fetch("http://127.0.0.1:8000/api/terminator/execute/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ approved_recommendations: approved }),
    })
      .then((res) => res.json())
      .then(() => { fetchAlerts(); setSelected((prev) => ({ ...prev, [alert.alert_id]: [] })); })
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

  const getResourceIcon = (resource) => {
    const icons = { cpu: "", memory: "", disk: "", battery: "", network: "", filesystem: "" };
    return icons[resource] || "⚠";
  };

  const isCritical = (level) => level === "critical";

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "24px" }}>
        <h1 style={{ margin: 0 }}>Active Alerts</h1>
        <span style={{ fontSize: "12px", color: "#555", letterSpacing: "2px" }}>
          {alerts.length} ALERT{alerts.length !== 1 ? "S" : ""}
        </span>
      </div>

      {loading ? (
        <div className="card" style={{ textAlign: "center", padding: "48px", color: "#555", letterSpacing: "2px", fontSize: "12px" }}>
          LOADING...
        </div>
      ) : alerts.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: "56px 32px" }}>
          <div style={{ fontSize: "40px", marginBottom: "16px" }}>✅</div>
          <p style={{ color: "#4cff91", fontSize: "13px", letterSpacing: "2px", margin: 0 }}>ALL SYSTEMS NORMAL</p>
          <p style={{ color: "#444", fontSize: "12px", marginTop: "8px" }}>No active alerts detected</p>
        </div>
      ) : (
        alerts.map((alert) => {
          const selectedIndexes = selected[alert.alert_id] || [];
          const isExecuting = executingId === alert.alert_id;
          const critical = isCritical(alert.alert_level);

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
              {/* left accent bar — only red for critical, subtle for warning */}
              <div style={{
                position: "absolute", left: 0, top: 0, bottom: 0, width: "3px",
                backgroundColor: critical ? "#ff4d6d" : "#333",
              }} />

              <div style={{ paddingLeft: "12px" }}>

                {/* Top row: icon + name + badges */}
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
                    {alert.is_acknowledged && (
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

                {/* Message */}
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

                {/* Metrics row */}
                <div style={{ display: "flex", gap: "10px", marginBottom: "14px" }}>
                  {[
                    { label: "VALUE", value: alert.resource_value != null ? `${alert.resource_value}%` : "—" },
                    { label: "THRESHOLD", value: alert.threshold != null ? `${alert.threshold}%` : "—" },
                    { label: "STATUS", value: alert.is_acknowledged ? "Acknowledged" : "Pending" },
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

                {/* Recommendations */}
                {alert.recommendations && alert.recommendations.length > 0 && (
                  <div style={{ marginBottom: "14px" }}>
                    <p style={{ margin: "0 0 8px", fontSize: "10px", color: "#444", letterSpacing: "2px" }}>
                      RECOMMENDATIONS
                    </p>
                    {alert.recommendations.map((rec, index) => {
                      const isChecked = selectedIndexes.includes(index);
                      return (
                        <div
                          key={index}
                          onClick={() => toggleSelect(alert.alert_id, index)}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "10px",
                            padding: "9px 12px",
                            marginBottom: "5px",
                            borderRadius: "6px",
                            backgroundColor: isChecked ? "#ff4d6d0e" : "#ffffff05",
                            border: `1px solid ${isChecked ? "#ff4d6d33" : "#ffffff08"}`,
                            cursor: "pointer",
                            transition: "all 0.15s ease",
                          }}
                        >
                          {/* custom checkbox */}
                          <div style={{
                            width: "14px", height: "14px", borderRadius: "3px", flexShrink: 0,
                            border: `1.5px solid ${isChecked ? "#ff4d6d" : "#333"}`,
                            backgroundColor: isChecked ? "#ff4d6d" : "transparent",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            transition: "all 0.15s ease",
                          }}>
                            {isChecked && <span style={{ color: "#fff", fontSize: "9px", fontWeight: "700" }}>✓</span>}
                          </div>

                          <div style={{ flex: 1 }}>
                            <p style={{ margin: 0, fontSize: "12px", color: "#ccc" }}>
                              {rec.title || `${rec.process_name} → ${rec.action}`}
                            </p>
                            {rec.description && (
                              <p style={{ margin: "2px 0 0", fontSize: "11px", color: "#555" }}>{rec.description}</p>
                            )}
                          </div>

                          {rec.estimated_gain && (
                            <span style={{ fontSize: "10px", color: "#666", whiteSpace: "nowrap" }}>
                              {rec.estimated_gain}
                            </span>
                          )}
                        </div>
                      );
                    })}

                    <button
                      onClick={() => executeSelected(alert)}
                      disabled={selectedIndexes.length === 0 || isExecuting}
                      style={{
                        marginTop: "8px",
                        padding: "7px 18px",
                        borderRadius: "6px",
                        border: "none",
                        backgroundColor: selectedIndexes.length === 0 ? "#1a1a1a" : "#ff4d6d",
                        color: selectedIndexes.length === 0 ? "#333" : "#fff",
                        fontSize: "11px",
                        fontWeight: "700",
                        letterSpacing: "1px",
                        cursor: selectedIndexes.length === 0 ? "not-allowed" : "pointer",
                        transition: "all 0.15s ease",
                        opacity: isExecuting ? 0.6 : 1,
                      }}
                    >
                      {isExecuting ? "EXECUTING..." : `EXECUTE (${selectedIndexes.length})`}
                    </button>
                  </div>
                )}

                {/* Action buttons */}
                <div style={{ display: "flex", gap: "8px" }}>
                  {!alert.is_acknowledged && (
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