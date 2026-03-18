import { useEffect, useState } from "react";

function Battery() {
  const [batteryData, setBatteryData] = useState(null);

  useEffect(() => {
    fetchBattery();

    const interval = setInterval(() => {
      fetchBattery();
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const fetchBattery = async () => {
    try {
      const response = await fetch("http://127.0.0.1:8000/api/battery-info/");
      const data = await response.json();
      setBatteryData(data);
    } catch (error) {
      console.error("Error fetching battery:", error);
    }
  };

  return (
    <div>
      <h1>Battery Monitoring</h1>

      <div className="card">
        <h3>Battery Status</h3>
        <p>{batteryData ? batteryData.perc + "%" : "Loading..."}</p>
      </div>

      <div className="card">
        <h3>Charging</h3>
        <p>{batteryData ? (batteryData.charging ? "Yes ⚡" : "No") : "Loading..."}</p>
      </div>

      <div className="card">
        <h3>Estimated Time Remaining</h3>
        <p>
          {batteryData
            ? batteryData.charging
              ? "Charging..."
              : batteryData.time
              ? batteryData.time + " hours"
              : "Calculating..."
            : "Loading..."}
        </p>
      </div>
    </div>
  );
}

export default Battery;