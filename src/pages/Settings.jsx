import { useState } from "react";

function Settings() {
  const [username, setUsername] = useState("");

  const [cpu, setCpu] = useState("");
  const [memory, setMemory] = useState("");
  const [disk, setDisk] = useState("");
  const [battery, setBattery] = useState("");

  // individual enable/disable
  const [cpuEnabled, setCpuEnabled] = useState(true);
  const [memoryEnabled, setMemoryEnabled] = useState(true);
  const [diskEnabled, setDiskEnabled] = useState(true);
  const [batteryEnabled, setBatteryEnabled] = useState(true);

  const [selectedFolder, setSelectedFolder] = useState("");

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
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <input
              type="checkbox"
              checked={cpuEnabled}
              onChange={() => setCpuEnabled(!cpuEnabled)}
            />
            <p>CPU Threshold</p>
          </div>

          <div className="percent-input">
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
        </div>

        {/* Memory */}
        <div className="input-group">
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <input
              type="checkbox"
              checked={memoryEnabled}
              onChange={() => setMemoryEnabled(!memoryEnabled)}
            />
            <p>Memory Threshold</p>
          </div>

          <div className="percent-input">
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
        </div>

        {/* Disk */}
        <div className="input-group">
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <input
              type="checkbox"
              checked={diskEnabled}
              onChange={() => setDiskEnabled(!diskEnabled)}
            />
            <p>Disk Threshold</p>
          </div>

          <div className="percent-input">
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
        </div>

        {/* Battery */}
        <div className="input-group">
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <input
              type="checkbox"
              checked={batteryEnabled}
              onChange={() => setBatteryEnabled(!batteryEnabled)}
            />
            <p>Battery Threshold</p>
          </div>

          <div className="percent-input">
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
      </div>
    </div>
  );
}

export default Settings;