import { useEffect, useState } from "react";

function Alerts() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  // ✅ Fetch alerts from backend
  const fetchAlerts = () => {
    fetch("http://127.0.0.1:8000/get_alerts/?n=10")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setAlerts(data.alerts);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching alerts:", err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchAlerts();
  }, []);

  // ✅ Acknowledge alert
  const handleAcknowledge = (id) => {
    fetch(
      `http://127.0.0.1:8000/acknowledge_alert/?alert_id=${id}`
    )
      .then((res) => res.json())
      .then(() => {
        fetchAlerts(); // refresh list
      })
      .catch((err) => console.error(err));
  };

  // ✅ Delete alert
  const handleDelete = (id) => {
    fetch(
      `http://127.0.0.1:8000/delete_alert/?alert_id=${id}`,
      {
        method: "DELETE",
      }
    )
      .then((res) => res.json())
      .then(() => {
        fetchAlerts(); // refresh list
      })
      .catch((err) => console.error(err));
  };

  return (
    <div>
      <h1>Active AI Alerts</h1>

      {loading ? (
        <p>Loading alerts...</p>
      ) : alerts.length === 0 ? (
        <div className="alert-card">
          No active alerts detected.
        </div>
      ) : (
        alerts.map((alert) => (
          <div key={alert.alert_id} className="alert-card">
            <h3>{alert.process_name}</h3>

            <p><b>PID:</b> {alert.pid}</p>
            <p><b>Resource:</b> {alert.resource}</p>
            <p><b>Level:</b> {alert.alert_level}</p>
            <p><b>Message:</b> {alert.alert_message}</p>
            <p>
              <b>Value:</b> {alert.resource_value} /{" "}
              {alert.threshold}
            </p>
            <p>
              <b>Time:</b>{" "}
              {new Date(alert.created_at).toLocaleString()}
            </p>
            <p>
              <b>Status:</b>{" "}
              {alert.is_acknowledged
                ? "Acknowledged"
                : "Pending"}
            </p>

            <div style={{ marginTop: "10px" }}>
              {!alert.is_acknowledged && (
                <button
                  onClick={() =>
                    handleAcknowledge(alert.alert_id)
                  }
                >
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