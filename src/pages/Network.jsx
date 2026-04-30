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
      setNetworkError(null); // Clear previous error on success
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
      setProcessError(null); // Clear previous error on success
    } catch (err) {
      console.error("Error fetching process network data:", err);
      setProcessError("Failed to load process network info");
    }
  };

  return (
    <div>
      <h1>Network Monitoring</h1>

      {/* TOTAL DOWNLOAD SPEED */}
      <div className="card">
        <h3>⬇ Download Speed</h3>
        <p>
          {networkData
            ? `${(networkData.download_MBps * 8).toFixed(2)} Mbps`
            : networkError
            ? networkError
            : "Loading..."}
        </p>
      </div>

      {/* TOTAL UPLOAD SPEED */}
      <div className="card">
        <h3>⬆ Upload Speed</h3>
        <p>
          {networkData
            ? `${(networkData.upload_MBps * 8).toFixed(2)} Mbps`
            : networkError
            ? networkError
            : "Loading..."}
        </p>
      </div>

      {/* PER PROCESS NETWORK USAGE */}
      <div className="card">
        <h3>Per-Process Network Usage</h3>
        {processError && <p style={{ color: "red" }}>{processError}</p>}
        {processData.length > 0 ? (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left", padding: "8px" }}>PID</th>
                <th style={{ textAlign: "left", padding: "8px" }}>Process</th>
                <th style={{ textAlign: "center", padding: "8px" }}>⬇ Download</th>
                <th style={{ textAlign: "center", padding: "8px" }}>⬆ Upload</th>
              </tr>
            </thead>
            <tbody>
              {processData.map((proc) => (
                <tr key={proc.pid} style={{ borderTop: "1px solid #ccc" }}>
                  <td style={{ padding: "8px" }}>{proc.pid}</td>
                  <td style={{ padding: "8px" }}>{proc.name}</td>
                  <td style={{ textAlign: "center" }}>
                    {proc.download_MBps.toFixed(2)}
                  </td>
                  <td style={{ textAlign: "center" }}>
                    {proc.upload_MBps.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          !processError && <p>Loading per-process network data...</p>
        )}
      </div>
    </div>
  );
}

export default Network;