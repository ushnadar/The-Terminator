import { useEffect, useState } from "react";

function Storage() {
  const [storageData, setStorageData] = useState(null);
  const [monitoredFolder, setMonitoredFolder] = useState("");

  useEffect(() => {
    fetchStorage();
    fetchMonitoredFolder();

    const interval = setInterval(() => {
      fetchStorage();
      fetchMonitoredFolder();
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const fetchStorage = async () => {
    try {
      const response = await fetch("http://127.0.0.1:8000/api/storage-info/");
      const data = await response.json();
      setStorageData(data.partitions);
    } catch (error) {
      console.error("Error fetching storage:", error);
    }
  };

  const fetchMonitoredFolder = async () => {
    try {
      const response = await fetch("http://127.0.0.1:8000/api/settings/");
      const data = await response.json();
      // API returns "folder-path" key per SettingsAPI.py
      setMonitoredFolder(data["folder-path"] || data.folder || "");
    } catch (error) {
      console.error("Error fetching settings:", error);
    }
  };

  const getBarClass = (perc) => {
    if (perc >= 90) return "proc-bar-fill proc-bar-fill--critical";
    if (perc >= 70) return "proc-bar-fill proc-bar-fill--warn";
    return "proc-bar-fill";
  };

  return (
    <div>
      <h1>Storage Monitoring</h1>

      {storageData ? (
        Object.entries(storageData).map(([drive, info]) => (
          <div className="card" key={drive} style={{ marginBottom: "16px" }}>
            <h3>Drive: {drive}</h3>
            <table className="proc-table">
              <thead>
                <tr>
                  <th>Total</th>
                  <th>Used</th>
                  <th>Available</th>
                  <th>Usage</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>{info.total} GB</td>
                  <td>{info.used} GB</td>
                  <td>{info.available} GB</td>
                  <td className="col-metric">
                    <div className="proc-metric">
                      <span className="proc-metric__value">{info["used-perc"]}%</span>
                      <div className="proc-bar-track">
                        <div
                          className={getBarClass(info["used-perc"])}
                          style={{ width: `${info["used-perc"]}%` }}
                        />
                      </div>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        ))
      ) : (
        <p style={{ color: "#888", letterSpacing: "2px" }}>Loading storage data...</p>
      )}

      {/* Folder Monitoring Status */}
      <div className="card" style={{ marginTop: "24px", padding: "30px" }}>
        <h3 style={{ marginBottom: "24px" }}>Folder Monitoring</h3>

        {monitoredFolder ? (
          <table className="proc-table">
            <thead>
              <tr>
                <th>Status</th>
                <th>Folder</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <span className="proc-dot proc-dot--running" />
                  Active
                </td>
                <td style={{ color: "#ffffff", letterSpacing: "0.5px" }}>
                  {monitoredFolder}
                </td>
              </tr>
            </tbody>
          </table>
        ) : (
          <div className="folder-empty-state">
            <span className="folder-empty-icon"></span>
            <p className="folder-empty-text">No folders being monitored</p>
            <p className="folder-empty-sub">Go to Settings to select a folder to watch</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default Storage;
