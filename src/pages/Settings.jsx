import { useState, useEffect } from "react";

function Settings() {
  const [username, setUsername] = useState("");

  const [cpu, setCpu] = useState("");
  const [memory, setMemory] = useState("");
  const [disk, setDisk] = useState("");
  const [battery, setBattery] = useState("");

  const [cpuEnabled, setCpuEnabled] = useState(true);
  const [memoryEnabled, setMemoryEnabled] = useState(true);
  const [diskEnabled, setDiskEnabled] = useState(true);
  const [batteryEnabled, setBatteryEnabled] = useState(true);

  const [selectedFolder, setSelectedFolder] = useState("");

  // ✅ Fetch data from backend
  useEffect(() => {
    fetch("http://127.0.0.1:8000/get_settings/")
      .then((res) => res.json())
      .then((data) => {
        setUsername(data.username || "");

        setCpu(data.cpu_threshold ?? "");
        setMemory(data.memory_threshold ?? "");
        setDisk(data.disk_threshold ?? "");
        setBattery(data.battery_threshold ?? "");

        setCpuEnabled(data.cpu_enabled ?? true);
        setMemoryEnabled(data.memory_enabled ?? true);
        setDiskEnabled(data.disk_enabled ?? true);
        setBatteryEnabled(data.battery_enabled ?? true);
      })
      .catch((err) => console.error("Error fetching settings:", err));
  }, []);

  // ✅ Save settings to backend
  const handleSave = () => {
    const payload = {
      username: username,

      cpu_enabled: cpuEnabled,
      cpu_threshold: cpu,

      memory_enabled: memoryEnabled,
      memory_threshold: memory,

      disk_enabled: diskEnabled,
      disk_threshold: disk,

      battery_enabled: batteryEnabled,
      battery_threshold: battery,
    };

    fetch("http://127.0.0.1:8000/update_settings/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    })
      .then((res) => res.json())
      .then((data) => {
        alert(data.message || "Settings saved!");
      })
      .catch((err) => console.error("Error saving settings:", err));
  };

  const handleRangeChange = (value, setter, min, max) => {
    if (value === "") {
      setter("");
      return;
    }

    let num = Number(value);
    if (num < min) num = min;
    if (num > max) num = max;

    setter(num);
  };

  const handleFolderSelect = (e) => {
    const files = e.target.files;
    if (files.length > 0) {
      const folderName = files[0].webkitRelativePath.split("/")[0];
      setSelectedFolder(folderName);
    }
  };

  return (
    <div>
      <h1>Settings</h1>

      {/* Username */}
      <div className="card">
        <h3>Username</h3>
        <p>Current Username: {username || "Not set"}</p>
        <input
          className="input-field"
          type="text"
          placeholder="Enter username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
      </div>

      {/* Folder Monitoring */}
      <div className="card">
        <h3>Folder Monitoring</h3>

        <input
          className="input-field"
          type="file"
          webkitdirectory="true"
          directory=""
          multiple
          onChange={handleFolderSelect}
        />

        <p>
          {selectedFolder
            ? `Selected Folder: ${selectedFolder}`
            : "No folder selected."}
        </p>
      </div>

      {/* Thresholds */}
      <div className="card">
        <h3>Alert Thresholds</h3>

        {/* CPU */}
        <div className="input-group">
          <div style={{ display: "flex", gap: "10px" }}>
            <input
              type="checkbox"
              checked={cpuEnabled}
              onChange={() => setCpuEnabled(!cpuEnabled)}
            />
            <p>CPU Threshold</p>
          </div>

          <input
            className="input-field"
            type="number"
            value={cpu}
            disabled={!cpuEnabled}
            onChange={(e) =>
              handleRangeChange(e.target.value, setCpu, 35, 100)
            }
          />
        </div>

        {/* Memory */}
        <div className="input-group">
          <div style={{ display: "flex", gap: "10px" }}>
            <input
              type="checkbox"
              checked={memoryEnabled}
              onChange={() => setMemoryEnabled(!memoryEnabled)}
            />
            <p>Memory Threshold</p>
          </div>

          <input
            className="input-field"
            type="number"
            value={memory}
            disabled={!memoryEnabled}
            onChange={(e) =>
              handleRangeChange(e.target.value, setMemory, 35, 100)
            }
          />
        </div>

        {/* Disk */}
        <div className="input-group">
          <div style={{ display: "flex", gap: "10px" }}>
            <input
              type="checkbox"
              checked={diskEnabled}
              onChange={() => setDiskEnabled(!diskEnabled)}
            />
            <p>Disk Threshold</p>
          </div>

          <input
            className="input-field"
            type="number"
            value={disk}
            disabled={!diskEnabled}
            onChange={(e) =>
              handleRangeChange(e.target.value, setDisk, 35, 100)
            }
          />
        </div>

        {/* Battery */}
        <div className="input-group">
          <div style={{ display: "flex", gap: "10px" }}>
            <input
              type="checkbox"
              checked={batteryEnabled}
              onChange={() => setBatteryEnabled(!batteryEnabled)}
            />
            <p>Battery Threshold</p>
          </div>

          <input
            className="input-field"
            type="number"
            value={battery}
            disabled={!batteryEnabled}
            onChange={(e) =>
              handleRangeChange(e.target.value, setBattery, 0, 100)
            }
          />
        </div>
      </div>

      {/* Save Button */}
      <button
        onClick={handleSave}
        style={{
          marginTop: "20px",
          padding: "10px 20px",
          cursor: "pointer",
        }}
      >
        Save Settings
      </button>
    </div>
  );
}

export default Settings;