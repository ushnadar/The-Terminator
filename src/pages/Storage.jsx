import { useEffect, useState } from "react";

function Storage() {
  const [storageData, setStorageData] = useState(null);

  useEffect(() => {
    fetchStorage();

    const interval = setInterval(() => {
      fetchStorage();
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

  return (
    <div>
      <h1>Storage Monitoring</h1>

      {storageData ? (
        Object.entries(storageData).map(([drive, info]) => (
          <div className="card" key={drive}>
            <h3>Drive: {drive}</h3>

            <p>Total: {info.total} GB</p>
            <p>Used: {info.used} GB</p>
            <p>Available: {info.available} GB</p>
            <p>Usage: {info["used-perc"]}%</p>

            {/* Optional progress bar */}
            <div className="progress">
              <div
                className="progress-fill"
                style={{ width: info["used-perc"] + "%" }}
              ></div>
            </div>
          </div>
        ))
      ) : (
        <p>Loading storage data...</p>
      )}

      {/* Placeholder (future feature) */}
      <div className="card">
        <h3>Folder Monitoring</h3>
        <p>No folders selected.</p>
      </div>
    </div>
  );
}

export default Storage;