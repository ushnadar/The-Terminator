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

  const getMemBarWidth = (memMB) => {
    if (!processData.length) return 0;
    const max = parseFloat(processData[0].mem) || 1;
    const val = parseFloat(memMB) || 0;
    return Math.min((val / max) * 100, 100);
  };

  return (
    <div>
      <h1>Memory Monitoring</h1>

      {error && <p style={{ color: "red" }}>{error}</p>}

      <div className="card">
        <h3>Total RAM</h3>
        <p>{memoryData ? memoryData.total + " GB" : "Loading..."}</p>
      </div>

      <div className="card" style={{ marginTop: "16px" }}>
        <h3>Used Memory</h3>
        <p>
          {memoryData
            ? `${memoryData.used} GB (${memoryData["used-perc"]}%)`
            : "Loading..."}
        </p>
      </div>

      <div className="card" style={{ marginTop: "16px" }}>
        <h3>Available Memory</h3>
        <p>{memoryData ? memoryData.available + " GB" : "Loading..."}</p>
      </div>

      <div className="card" style={{ marginTop: "24px", padding: "30px" }}>
        <h3 style={{ marginBottom: "24px" }}>Per Process Usage</h3>

        {processData.length > 0 ? (
          <table className="proc-table">
            <thead>
              <tr>
                <th>Process</th>
                <th>PID</th>
                <th>Memory</th>
              </tr>
            </thead>
            <tbody>
              {processData.map((proc) => (
                <tr key={proc.pid}>
                  <td>
                    <span className="proc-dot proc-dot--running" />
                    {proc.name}
                  </td>
                  <td>{proc.pid}</td>
                  <td className="col-metric">
                    <div className="proc-metric">
                      <span className="proc-metric__value" style={{ minWidth: "72px" }}>
                        {proc.mem} MB
                      </span>
                      <div className="proc-bar-track">
                        <div
                          className="proc-bar-fill"
                          style={{ width: `${getMemBarWidth(proc.mem)}%` }}
                        />
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p style={{ color: "#888", letterSpacing: "2px" }}>Loading processes...</p>
        )}
      </div>
    </div>
  );
}

export default Memory;
