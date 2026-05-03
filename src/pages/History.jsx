import { useEffect, useState } from "react";

function History() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  const fetchHistory = () => {
    fetch("http://127.0.0.1:8000/api/history/?n=50&sort=latest")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setHistory(data.history);
        setLoading(false);
      })
      .catch((err) => { console.error(err); setLoading(false); });
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleDelete = (id) => {
    fetch(`http://127.0.0.1:8000/api/history/delete/?history_id=${id}`, {
      method: "DELETE",
    })
      .then((res) => {
        if (!res.ok) throw new Error("Delete failed");
        fetchHistory();
      })
      .catch((err) => console.error("Delete error:", err));
  };

  const getResourceIcon = (resource) => {
    const icons = { cpu: "", memory: "", disk: "", battery: "", network: "", filesystem: "" };
    return icons[resource] || "⚠";
  };

  const formatDate = (iso) => {
    const d = new Date(iso);
    return {
      date: d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
      time: d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
    };
  };

  const resources = ["all", ...Array.from(new Set(history.map((h) => h.resource)))];
  const filtered = filter === "all" ? history : history.filter((h) => h.resource === filter);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "24px" }}>
        <h1 style={{ margin: 0 }}>Alert History</h1>
        <span style={{ fontSize: "12px", color: "#555", letterSpacing: "2px" }}>
          {filtered.length} RECORD{filtered.length !== 1 ? "S" : ""}
        </span>
      </div>

      {!loading && history.length > 0 && (
        <div style={{ display: "flex", gap: "6px", marginBottom: "20px", flexWrap: "wrap" }}>
          {resources.map((r) => (
            <button
              key={r}
              onClick={() => setFilter(r)}
              style={{
                padding: "4px 12px",
                borderRadius: "999px",
                border: `1px solid ${filter === r ? "#ff4d6d44" : "#222"}`,
                backgroundColor: filter === r ? "#ff4d6d10" : "transparent",
                color: filter === r ? "#ff4d6d" : "#555",
                fontSize: "11px",
                fontWeight: "600",
                letterSpacing: "1px",
                cursor: "pointer",
                textTransform: "uppercase",
                transition: "all 0.15s ease",
              }}
            >
              {r}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="card" style={{ textAlign: "center", padding: "48px", color: "#555", letterSpacing: "2px", fontSize: "12px" }}>
          LOADING...
        </div>
      ) : filtered.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: "56px 32px" }}>
          <div style={{ fontSize: "40px", marginBottom: "16px" }}>🗂</div>
          <p style={{ color: "#555", fontSize: "13px", letterSpacing: "2px", margin: 0 }}>NO RECORDS FOUND</p>
          <p style={{ color: "#333", fontSize: "12px", marginTop: "8px" }}>Executed actions will appear here</p>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <table className="proc-table" style={{ width: "100%" }}>
            <thead>
              <tr>
                <th>RESOURCE</th>
                <th>PROCESS</th>
                <th>PID</th>
                <th>DATE</th>
                <th>TIME</th>
                <th style={{ textAlign: "right" }}>ACTION</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item, index) => {
                const { date, time } = formatDate(item.created_at);
                const processName = item.process_name && item.process_name.trim() !== ""
                  ? item.process_name
                  : "—";

                return (
                  <tr key={index}>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span>{getResourceIcon(item.resource)}</span>
                        <span style={{
                          fontSize: "10px", fontWeight: "600",
                          letterSpacing: "1px", color: "#888", textTransform: "uppercase",
                        }}>
                          {item.resource}
                        </span>
                      </div>
                    </td>
                    <td style={{ color: processName === "—" ? "#444" : "#ccc", fontSize: "13px" }}>
                      {processName}
                    </td>
                    <td style={{ color: "#555", fontSize: "12px", fontFamily: "monospace" }}>{item.pid || "—"}</td>
                    <td style={{ color: "#666", fontSize: "12px" }}>{date}</td>
                    <td style={{ color: "#555", fontSize: "12px", fontFamily: "monospace" }}>{time}</td>
                    <td style={{ textAlign: "right" }}>
                      <button
                        onClick={() => handleDelete(item.id || item.history_id)}
                        style={{
                          padding: "4px 12px",
                          borderRadius: "6px",
                          border: "1px solid #2a2a2a",
                          backgroundColor: "transparent",
                          color: "#555",
                          fontSize: "11px",
                          fontWeight: "600",
                          letterSpacing: "1px",
                          cursor: "pointer",
                          transition: "all 0.15s ease",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor = "#ff4d6d44";
                          e.currentTarget.style.color = "#ff4d6d";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = "#2a2a2a";
                          e.currentTarget.style.color = "#555";
                        }}
                      >
                        DELETE
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default History;