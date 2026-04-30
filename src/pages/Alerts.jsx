import { useEffect, useState } from "react";

function Alerts() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  const [analysisLoading, setAnalysisLoading] = useState(false);

  const [selected, setSelected] = useState({});
  // { alertId: [recIndex1, recIndex2] }

  // ✅ Fetch alerts
  const fetchAlerts = () => {
    fetch("http://127.0.0.1:8000/api/alerts/?n=10")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setAlerts(data.alerts);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchAlerts();
  }, []);

  // 🔥 RUN ANALYSIS (RESTORED)
  const runAnalysis = () => {
    setAnalysisLoading(true);

    fetch("http://127.0.0.1:8000/api/terminator/analyze/", {
      method: "POST",
    })
      .then((res) => res.json())
      .then((data) => {
        console.log("Analysis:", data);
        fetchAlerts(); // refresh alerts after analysis
      })
      .catch((err) => console.error(err))
      .finally(() => setAnalysisLoading(false));
  };

  // ✅ Toggle checkbox per alert recommendation
  const toggleSelect = (alertId, index) => {
    setSelected((prev) => {
      const current = prev[alertId] || [];

      const updated = current.includes(index)
        ? current.filter((i) => i !== index)
        : [...current, index];

      return { ...prev, [alertId]: updated };
    });
  };

  // ✅ Execute selected recommendations for alert
  const executeSelected = (alert) => {
    const selectedIndexes = selected[alert.alert_id] || [];

    if (selectedIndexes.length === 0) {
      alert("Select at least one recommendation");
      return;
    }

    const approved = selectedIndexes.map(
      (i) => alert.recommendations[i]
    );

    fetch("http://127.0.0.1:8000/api/terminator/execute/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        approved_recommendations: approved,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        console.log("Execution:", data);
        fetchAlerts();
      })
      .catch((err) => console.error(err));
  };

  // ✅ Acknowledge
  const handleAcknowledge = (id) => {
    fetch(
      `http://127.0.0.1:8000/api/alerts/acknowledge/?alert_id=${id}`
    )
      .then(() => fetchAlerts())
      .catch((err) => console.error(err));
  };

  // ✅ Delete
  const handleDelete = (id) => {
    fetch(
      `http://127.0.0.1:8000/api/alerts/delete/?alert_id=${id}`,
      { method: "DELETE" }
    )
      .then(() => fetchAlerts())
      .catch((err) => console.error(err));
  };

  return (
    <div>
      <h1>AI Terminator Dashboard</h1>

      {/* 🔥 RUN ANALYSIS (BACK AGAIN) */}
      <button onClick={runAnalysis} disabled={analysisLoading}>
        {analysisLoading ? "Analyzing..." : "Run Analysis"}
      </button>

      <h2>Active Alerts</h2>

      {loading ? (
        <p>Loading alerts...</p>
      ) : alerts.length === 0 ? (
        <div>No active alerts</div>
      ) : (
        alerts.map((alert) => (
          <div key={alert.alert_id} className="alert-card">
            <h3>{alert.process_name}</h3>

            <p><b>PID:</b> {alert.pid}</p>
            <p><b>Resource:</b> {alert.resource}</p>
            <p><b>Level:</b> {alert.alert_level}</p>
            <p><b>Message:</b> {alert.alert_message}</p>

            <p>
              <b>Value:</b> {alert.resource_value} / {alert.threshold}
            </p>

            <p>
              <b>Status:</b>{" "}
              {alert.is_acknowledged ? "Acknowledged" : "Pending"}
            </p>

            {/* 🔥 Recommendations with CHECKBOXES */}
            {alert.recommendations &&
              alert.recommendations.length > 0 && (
                <div style={{ marginTop: "10px" }}>
                  <b>Recommendations:</b>

                  {alert.recommendations.map((rec, index) => (
                    <div
                      key={index}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        marginTop: "5px",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={
                          selected[alert.alert_id]?.includes(index) || false
                        }
                        onChange={() =>
                          toggleSelect(alert.alert_id, index)
                        }
                      />

                      <span>
                        {rec.process_name} → {rec.action}
                      </span>
                    </div>
                  ))}

                  <button
                    onClick={() => executeSelected(alert)}
                    style={{ marginTop: "8px" }}
                  >
                    Execute 
                  </button>
                </div>
              )}

            {/* 🔘 Actions */}
            <div style={{ marginTop: "10px" }}>
              {!alert.is_acknowledged && (
                <button onClick={() => handleAcknowledge(alert.alert_id)}>
                  Acknowledge
                </button>
              )}

              <button
                onClick={() => handleDelete(alert.alert_id)}
                style={{ marginLeft: "10px" }}
              >
                Delete
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

export default Alerts;