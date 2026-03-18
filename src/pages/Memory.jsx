import { useEffect, useState } from "react";

function Memory() {
  const [memoryData, setMemoryData] = useState(null);
  const [processData, setProcessData] = useState([]);

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
    } catch (error) {
      console.error("Error fetching memory:", error);
    }
  };

  const fetchProcesses = async () => {
    try {
      const response = await fetch("http://127.0.0.1:8000/api/process-info/?sort_by=mem");
      const data = await response.json();
      setProcessData(data);
    } catch (error) {
      console.error("Error fetching processes:", error);
    }
  };

  return (
    <div>
      <h1>Memory Monitoring</h1>

      {/* TOTAL RAM */}
      <div className="card">
        <h3>Total RAM</h3>
        <p>
          {memoryData ? memoryData.total + " GB" : "Loading..."}
        </p>
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
        <p>
          {memoryData ? memoryData.available + " GB" : "Loading..."}
        </p>
      </div>

      {/* PER PROCESS MEMORY */}
      <div className="card">
        <h3>Top Memory Consuming Processes</h3>

        {processData.length > 0 ? (
          <ul>
            {processData.map((proc) => (
              <li key={proc.pid}>
                {proc.name} → {proc.mem} MB
              </li>
            ))}
          </ul>
        ) : (
          <p>Loading processes...</p>
        )}
      </div>
    </div>
  );
}

export default Memory;