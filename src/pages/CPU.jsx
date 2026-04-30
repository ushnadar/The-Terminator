import { useEffect, useState } from "react";

function CPU() {
  const [cpuData, setCpuData] = useState(null);
  const [processData, setProcessData] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchCPU();
    fetchProcesses();

    const interval = setInterval(() => {
      fetchCPU();
      fetchProcesses();
    }, 2000); // auto-refresh every 2 seconds

    return () => clearInterval(interval);
  }, []);

  const fetchCPU = async () => {
    try {
      const response = await fetch("http://127.0.0.1:8000/api/cpu-info/");
      const data = await response.json();
      setCpuData(data);
    } catch (err) {
      console.error("Error fetching CPU data:", err);
      setError("Failed to load CPU data");
    }
  };

  const fetchProcesses = async () => {
    try {
      const response = await fetch("http://127.0.0.1:8000/api/process-info/?sort_by=cpu&n=10");
      const data = await response.json();
      setProcessData(data);
    } catch (err) {
      console.error("Error fetching process data:", err);
      setError("Failed to load process data");
    }
  };

  return (
    <div>
      <h1>CPU Monitoring</h1>

      {error && <p style={{ color: "red" }}>{error}</p>}

      {/* TOTAL CPU */}
      <div className="card">
        <h3>Total CPU Usage</h3>
        <p>{cpuData ? cpuData["total usage"] + "%" : "Loading..."}</p>
      </div>

      {/* PER PROCESS */}
      <div className="card">
        <h3>Top Processes</h3>
        {processData.length > 0 ? (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left", padding: "8px" }}>PID</th>
                <th style={{ textAlign: "left", padding: "8px" }}>Process</th>
                <th style={{ textAlign: "center", padding: "8px" }}>CPU %</th>
              </tr>
            </thead>
            <tbody>
              {processData.map((proc) => (
                <tr key={proc.pid} style={{ borderTop: "1px solid #ccc" }}>
                  <td style={{ padding: "8px" }}>{proc.pid}</td>
                  <td style={{ padding: "8px" }}>{proc.name}</td>
                  <td style={{ textAlign: "center" }}>{proc.cpu}</td>
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

export default CPU;