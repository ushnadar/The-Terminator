import { useEffect, useState } from "react";

function Memory() {
  const [memoryData, setMemoryData] = useState(null);
  const [processData, setProcessData] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchMemory();
    fetchProcesses();

    const interval = setInterval(() => {
      fetchMemory();
      fetchProcesses();
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  const fetchMemory = async () => {
    try {
      const response = await fetch("http://127.0.0.1:8000/api/memory-info/");
      const data = await response.json();
      setMemoryData(data);
    } catch (err) {
      console.error("Error fetching memory:", err);
      setError("Failed to load memory info");
    }
  };

  const fetchProcesses = async () => {
    try {
      const response = await fetch("http://127.0.0.1:8000/api/process-info/?sort_by=mem&n=10");
      const data = await response.json();
      setProcessData(data);
    } catch (err) {
      console.error("Error fetching processes:", err);
      setError("Failed to load process memory info");
    }
  };

  return (
    <div>
      <h1>Memory Monitoring</h1>

      {error && <p style={{ color: "red" }}>{error}</p>}

      {/* TOTAL RAM */}
      <div className="card">
        <h3>Total RAM</h3>
        <p>{memoryData ? memoryData.total + " GB" : "Loading..."}</p>
      </div>

      {/* USED MEMORY */}
      <div className="card">
        <h3>Used Memory</h3>
        <p>
          {memoryData
            ? `${memoryData.used} GB (${memoryData["used-perc"]}%)`
            : "Loading..."}
        </p>
      </div>

      {/* AVAILABLE MEMORY */}
      <div className="card">
        <h3>Available Memory</h3>
        <p>{memoryData ? memoryData.available + " GB" : "Loading..."}</p>
      </div>

      {/* PER PROCESS MEMORY */}
      <div className="card">
        <h3>Top Memory Consuming Processes</h3>
        {processData.length > 0 ? (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left", padding: "8px" }}>PID</th>
                <th style={{ textAlign: "left", padding: "8px" }}>Process</th>
                <th style={{ textAlign: "center", padding: "8px" }}>Memory (MB)</th>
              </tr>
            </thead>
            <tbody>
              {processData.map((proc) => (
                <tr key={proc.pid} style={{ borderTop: "1px solid #ccc" }}>
                  <td style={{ padding: "8px" }}>{proc.pid}</td>
                  <td style={{ padding: "8px" }}>{proc.name}</td>
                  <td style={{ textAlign: "center" }}>{proc.mem}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p>Loading processes...</p>
        )}
      </div>
    </div>
  );
}

export default Memory;