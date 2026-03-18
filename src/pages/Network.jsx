import { useEffect, useState } from "react";

function Network() {
  const [networkData, setNetworkData] = useState(null);

  useEffect(() => {
    fetchNetwork();

    const interval = setInterval(() => {
      fetchNetwork();
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  const fetchNetwork = async () => {
    try {
      const response = await fetch("http://127.0.0.1:8000/api/network-info/");
      const data = await response.json();
      setNetworkData(data);
    } catch (error) {
      console.error("Error fetching network:", error);
    }
  };

  return (
    <div>
      <h1>Network Monitoring</h1>

      {/* DOWNLOAD */}
      <div className="card">
        <h3>Download Speed</h3>
        <p>
          {networkData
            ? (networkData.download_MBps * 8).toFixed(2) + " Mbps"
            : "Loading..."}
        </p>
      </div>

      {/* UPLOAD */}
      <div className="card">
        <h3>Upload Speed</h3>
        <p>
          {networkData
            ? (networkData.upload_MBps * 8).toFixed(2) + " Mbps"
            : "Loading..."}
        </p>
      </div>

      {/* PLACEHOLDER */}
      <div className="card">
        <h3>Active Connections</h3>
        <p>Not implemented yet</p>
      </div>
    </div>
  );
}

export default Network;