import { useEffect, useState } from "react";

function CPU() {
  const [cpuData, setCpuData] = useState(null);
  const [processData, setProcessData] = useState([]);

  useEffect(() => {
    fetchCPU();
    fetchProcesses();

    // optional: auto refresh every 2 sec
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
    } catch (error) {
      console.error("Error fetching CPU data:", error);
    }
  };

  const fetchProcesses = async () => {
    try {
      const response = await fetch("http://127.0.0.1:8000/api/process-info/");
      const data = await response.json();
      setProcessData(data);
    } catch (error) {
      console.error("Error fetching process data:", error);
    }
  };

  return (
    <div>
      <h1>CPU Monitoring</h1>

      {/* TOTAL CPU */}
      <div className="card">
        <h3>Total CPU Usage</h3>
        <p>
          {cpuData ? cpuData["total usage"] + "%" : "Loading..."}
        </p>
      </div>

      {/* PER PROCESS */}
      <div className="card">
        <h3>Top Processes</h3>

        {processData.length > 0 ? (
          <ul>
            {processData.map((proc) => (
              <li key={proc.pid}>
                {proc.name} → {proc.cpu}%
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

export default CPU;