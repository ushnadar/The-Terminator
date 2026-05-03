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
    }, 2000);

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

  const getCpuBarWidth = (cpu) => {
    const val = parseFloat(cpu);
    return isNaN(val) ? 0 : Math.min(val, 100);
  };

  return (
    <div>
      <h1>CPU Monitoring</h1>

      {error && <p style={{ color: "red" }}>{error}</p>}

      <div className="card">
        <h3>Total CPU Usage</h3>
        <p>{cpuData ? cpuData["total usage"] + "%" : "Loading..."}</p>
      </div>

      <div className="card" style={{ marginTop: "24px", padding: "30px" }}>
        <h3 style={{ marginBottom: "24px" }}>Per Process Usage</h3>

        {processData.length > 0 ? (
          <table className="proc-table">
            <thead>
              <tr>
                <th>Process</th>
                <th>PID</th>
                <th>CPU %</th>
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
                      <span className="proc-metric__value">{proc.cpu}%</span>
                      <div className="proc-bar-track">
                        <div
                          className="proc-bar-fill"
                          style={{ width: `${getCpuBarWidth(proc.cpu)}%` }}
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

export default CPU;
