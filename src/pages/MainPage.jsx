import { useEffect, useState } from "react";

function MainPage() {
  const [cpu, setCpu] = useState(null);
  const [memory, setMemory] = useState(null);
  const [storage, setStorage] = useState(null);
  const [network, setNetwork] = useState(null);
  const [battery, setBattery] = useState(null);

  useEffect(() => {
    fetch("http://127.0.0.1:8000/api/cpu-info/")
      .then(res => res.json())
      .then(data => setCpu(data))
      .catch(err => console.log(err));

    fetch("http://127.0.0.1:8000/api/memory-info/")
      .then(res => res.json())
      .then(data => setMemory(data))
      .catch(err => console.log(err));

    fetch("http://127.0.0.1:8000/api/storage-info/")
      .then(res => res.json())
      .then(data => setStorage(data))
      .catch(err => console.log(err));

    fetch("http://127.0.0.1:8000/api/network-info/")
      .then(res => res.json())
      .then(data => setNetwork(data))
      .catch(err => console.log(err));

    fetch("http://127.0.0.1:8000/api/battery-info/")
      .then(res => res.json())
      .then(data => setBattery(data))
      .catch(err => console.log(err));
  }, []);

  return (
    <div>
      <h1>System Overview</h1>

      <div
        className="card-grid"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: "30px",
          marginTop: "30px"
        }}
      >
        <div className="card">
          <h3>CPU</h3>
          <p>Usage: {cpu ? cpu["total usage"] + "%" : "--%"}</p>
        </div>

        <div className="card">
          <h3>Memory</h3>
          <p>Usage: {memory ? memory["used-perc"] + "%" : "--%"}</p>
        </div>

        <div className="card">
          <h3>Storage</h3>
          <p>
            Usage: {
              storage && Object.keys(storage.partitions).length > 0
                ? Object.values(storage.partitions)[0]["used-perc"] + "%"
                : "--%"
            }
          </p>
        </div>

        <div className="card">
          <h3>Network</h3>
          <p>
            Speed: {
              network && Object.keys(network.connections).length > 0
                ? Object.values(network.connections)[0] + " Mbps"
                : "--"
            }
          </p>
        </div>

        <div className="card">
          <h3>Battery</h3>
          <p>
            Status: {
              battery
                ? typeof battery === "string"
                  ? battery
                  : battery.perc + "%"
                : "--%"
            }
          </p>
        </div>
      </div>
    </div>
  );
}

export default MainPage;