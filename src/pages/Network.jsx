import { useEffect, useState } from "react";

function Network() {
  const [networkData, setNetworkData] = useState(null);
  const [processData, setProcessData] = useState([]);
  const [networkError, setNetworkError] = useState(null);
  const [processError, setProcessError] = useState(null);

  useEffect(() => {
    fetchNetwork();
    fetchProcesses();

    const interval = setInterval(() => {
      fetchNetwork();
      fetchProcesses();
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  const fetchNetwork = async () => {
    try {
      const response = await fetch("http://127.0.0.1:8000/api/network-info/");
      const data = await response.json();
      setNetworkData(data);
      setNetworkError(null);
    } catch (err) {
      console.error("Error fetching network:", err);
      setNetworkError("Failed to load network info");
    }
  };

  const fetchProcesses = async () => {
    try {
      const response = await fetch(
        "http://127.0.0.1:8000/api/process-info/?sort_by=network&n=10"
      );
      const data = await response.json();
      setProcessData(data);
      setProcessError(null);
    } catch (err) {
      console.error("Error fetching process network data:", err);
      setProcessError("Failed to load process network info");
    }
  };

  const getBarWidth = (val, key) => {
    if (!processData.length) return 0;
    const max = Math.max(...processData.map((p) => parseFloat(p[key]) || 0)) || 1;
    return Math.min(((parseFloat(val) || 0) / max) * 100, 100);
  };

  return (
    <div>
      <h1>Network Monitoring</h1>

      <div className="card">
        <h3>⬇ Download Speed</h3>
        <p>
          {networkData
            ? `${(networkData.download_MBps * 8).toFixed(2)} Mbps`
            : networkError || "Loading..."}
        </p>
      </div>

      <div className="card" style={{ marginTop: "16px" }}>
        <h3>⬆ Upload Speed</h3>
        <p>
          {networkData
            ? `${(networkData.upload_MBps * 8).toFixed(2)} Mbps`
            : networkError || "Loading..."}
        </p>
      </div>

      <div className="card" style={{ marginTop: "24px", padding: "30px" }}>
        <h3 style={{ marginBottom: "24px" }}>Per Process Network Usage</h3>

        {processError && <p style={{ color: "red" }}>{processError}</p>}

        {processData.length > 0 ? (
          <table className="proc-table">
            <thead>
              <tr>
                <th>Process</th>
                <th>PID</th>
                <th>⬇ Download</th>
                <th>⬆ Upload</th>
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
                  <td className="col-network">
                    <div className="proc-metric">
                      <span className="proc-metric__value proc-metric__value--wide">
                        {proc.download_MBps.toFixed(2)} MB/s
                      </span>
                      <div className="proc-bar-track">
                        <div
                          className="proc-bar-fill"
                          style={{ width: `${getBarWidth(proc.download_MBps, "download_MBps")}%` }}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="col-network">
                    <div className="proc-metric">
                      <span className="proc-metric__value proc-metric__value--wide">
                        {proc.upload_MBps.toFixed(2)} MB/s
                      </span>
                      <div className="proc-bar-track">
                        <div
                          className="proc-bar-fill proc-bar-fill--upload"
                          style={{ width: `${getBarWidth(proc.upload_MBps, "upload_MBps")}%` }}
                        />
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          !processError && (
            <p style={{ color: "#888", letterSpacing: "2px" }}>
              Loading per-process network data...
            </p>
          )
        )}
      </div>
    </div>
  );
}

export default Network;
