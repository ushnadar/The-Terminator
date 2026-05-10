import { useState, useEffect } from "react";

// Defined outside Settings so React doesn't treat it as a new component type on every render
function ThresholdRow({ label, enabled, onToggle, value, setValue }) {
  return (
    <div className="input-group">
      <div className="threshold-row">
        <label className="threshold-label">
          <input
            type="checkbox"
            checked={enabled}
            onChange={onToggle}
            className="threshold-checkbox"
          />
          {label}
        </label>
        <input
          className="input-field"
          type="number"
          value={value}
          disabled={!enabled}
          onChange={(e) => setValue(e.target.value)}
        />
      </div>
    </div>
  );
}

function Settings() {
  const [username, setUsername] = useState("");

  const [cpu, setCpu] = useState("");
  const [memory, setMemory] = useState("");
  const [disk, setDisk] = useState("");
  const [battery, setBattery] = useState("");
  const [analysisDelay, setAnalysisDelay] = useState("");

  const [cpuEnabled, setCpuEnabled] = useState(false);
  const [memoryEnabled, setMemoryEnabled] = useState(false);
  const [diskEnabled, setDiskEnabled] = useState(false);
  const [batteryEnabled, setBatteryEnabled] = useState(false);

  const [notificationsEnabled, setNotificationsEnabled] = useState(false);

  const [folderPath, setFolderPath] = useState("");
  const [folderDisplay, setFolderDisplay] = useState("");
  const [savedFolder, setSavedFolder] = useState("");

  useEffect(() => {
    fetch("http://127.0.0.1:8000/api/settings/")
      .then((res) => res.json())
      .then((data) => {
        setUsername(data.username || "");
        setCpu(data.cpu_threshold ?? "");
        setMemory(data.memory_threshold ?? "");
        setDisk(data.disk_threshold ?? "");
        setBattery(data.battery_threshold ?? "");
        setAnalysisDelay(data.analysis_delay ?? "");
        setCpuEnabled(data.cpu_enabled ?? false);
        setMemoryEnabled(data.memory_enabled ?? false);
        setDiskEnabled(data.disk_enabled ?? false);
        setBatteryEnabled(data.battery_enabled ?? false);
        setNotificationsEnabled(data.allow_notifications ?? false);
        const saved = data["folder-path"] || data.folder || "";
        setSavedFolder(saved);
        setFolderPath(saved);
        if (saved) {
          const parts = saved.replace(/\\/g, "/").split("/").filter(Boolean);
          setFolderDisplay(parts[parts.length - 1] || saved);
        }
      })
      .catch((err) => console.error("Error fetching settings:", err));
  }, []);

  const handleFolderSelect = (e) => {
    // Try files first (non-empty folders); fall back to the input value for empty folders
    const files = e.target.files;
    if (files && files.length > 0) {
      const relativePath = files[0].webkitRelativePath || "";
      const folderName = relativePath.split("/")[0];
      setFolderDisplay(folderName);
      setFolderPath(folderName);
    } else {
      // Empty folder: browser sets input.value to something like "C:\fakepath\FolderName"
      const raw = e.target.value || "";
      const folderName = raw.replace(/\\/g, "/").split("/").filter(Boolean).pop() || "";
      if (folderName) {
        setFolderDisplay(folderName);
        setFolderPath(folderName);
      }
    }
    // Reset the input so the same folder can be re-selected if needed
    e.target.value = "";
  };

  const handleClearFolder = () => {
    setFolderDisplay("");
    setFolderPath("");
  };

  const handleSave = () => {
    const payload = {
      username,
      cpu_enabled: cpuEnabled,
      cpu_threshold: cpu === "" ? null : Number(cpu),
      memory_enabled: memoryEnabled,
      memory_threshold: memory === "" ? null : Number(memory),
      disk_enabled: diskEnabled,
      disk_threshold: disk === "" ? null : Number(disk),
      battery_enabled: batteryEnabled,
      battery_threshold: battery === "" ? null : Number(battery),
      allow_notifications: notificationsEnabled,
      folder: folderPath,
      analysis_delay: analysisDelay === "" ? null : Number(analysisDelay),
    };

    fetch("http://127.0.0.1:8000/api/settings/update/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setSavedFolder(folderPath);
          alert(data.message || "Settings saved!");
        } else {
          alert("Error: " + (data.error || "Could not save settings."));
        }
      })
      .catch((err) => {
        console.error("Error saving settings:", err);
        alert("Network error: could not reach the server.");
      });
  };

  return (
    <div>
      <h1>Settings</h1>

      {/* Username */}
      <div className="card">
        <h3>Username</h3>
        <p style={{ color: "#888", marginBottom: "12px" }}>
          Current: <span style={{ color: "#fff" }}>{username || "Not set"}</span>
        </p>
        <input
          className="input-field"
          type="text"
          placeholder="Enter username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
      </div>

      {/* Notifications Toggle */}
      <div className="card" style={{ marginTop: "16px" }}>
        <h3>Notifications</h3>
        <div className="notif-row">
          <span className="notif-label">
            {notificationsEnabled ? "Notifications On" : "Notifications Off"}
          </span>
          <button
            className={`notif-toggle ${notificationsEnabled ? "notif-toggle--on" : "notif-toggle--off"}`}
            onClick={() => setNotificationsEnabled(!notificationsEnabled)}
          >
            {notificationsEnabled ? "Turn Off" : "Turn On"}
          </button>
        </div>
      </div>

      {/* Folder Monitoring */}
      <div className="card" style={{ marginTop: "16px" }}>
        <h3>Folder Monitoring</h3>
        <p style={{ color: "#888", fontSize: "12px", marginBottom: "12px" }}>
          Select a folder from your computer to monitor
        </p>
        <input
          type="file"
          id="folder-picker"
          webkitdirectory=""
          directory=""
          multiple
          style={{ display: "none" }}
          onChange={handleFolderSelect}
        />
        <label htmlFor="folder-picker" className="folder-pick-btn">
           Choose Folder
        </label>

        {folderDisplay ? (
          <div style={{ marginTop: "12px", display: "flex", alignItems: "center", gap: "10px" }}>
            <p style={{ margin: 0, fontSize: "13px", color: "#888" }}>
              Selected:{" "}
              <span style={{ color: "#ff4d6d", letterSpacing: "1px" }}>{folderDisplay}</span>
              {savedFolder === folderPath && (
                <span style={{ marginLeft: "8px", color: "#4cff91", fontSize: "11px" }}>✓ saved</span>
              )}
            </p>
            <button
              onClick={handleClearFolder}
              style={{
                background: "none", border: "1px solid #333", borderRadius: "4px",
                color: "#555", fontSize: "11px", cursor: "pointer", padding: "2px 8px",
                letterSpacing: "1px",
              }}
            >
              CLEAR
            </button>
          </div>
        ) : savedFolder ? (
          <div style={{ marginTop: "12px", display: "flex", alignItems: "center", gap: "10px" }}>
            <p style={{ margin: 0, fontSize: "13px", color: "#888" }}>
              Monitoring:{" "}
              <span style={{ color: "#ff4d6d", letterSpacing: "1px" }}>{savedFolder}</span>
              <span style={{ marginLeft: "8px", color: "#4cff91", fontSize: "11px" }}>✓ active</span>
            </p>
            <button
              onClick={handleClearFolder}
              style={{
                background: "none", border: "1px solid #333", borderRadius: "4px",
                color: "#555", fontSize: "11px", cursor: "pointer", padding: "2px 8px",
                letterSpacing: "1px",
              }}
            >
              CLEAR
            </button>
          </div>
        ) : (
          <p style={{ marginTop: "12px", fontSize: "12px", color: "#444" }}>No folder selected</p>
        )}
      </div>

      {/* Thresholds */}
      <div className="card" style={{ marginTop: "16px" }}>
        <h3>Alert Thresholds</h3>
        <p style={{ color: "#555", fontSize: "11px", letterSpacing: "2px", marginBottom: "20px" }}>
          ENABLE A RESOURCE AND SET ITS ALERT THRESHOLD (%)
        </p>
        <ThresholdRow label="CPU"     enabled={cpuEnabled}     onToggle={() => setCpuEnabled(!cpuEnabled)}         value={cpu}     setValue={setCpu}     />
        <ThresholdRow label="Memory"  enabled={memoryEnabled}  onToggle={() => setMemoryEnabled(!memoryEnabled)}   value={memory}  setValue={setMemory}  />
        <ThresholdRow label="Disk"    enabled={diskEnabled}    onToggle={() => setDiskEnabled(!diskEnabled)}       value={disk}    setValue={setDisk}    />
        <ThresholdRow label="Battery" enabled={batteryEnabled} onToggle={() => setBatteryEnabled(!batteryEnabled)} value={battery} setValue={setBattery} />
      </div>

      {/* Analysis Delay */}
      <div className="card" style={{ marginTop: "16px" }}>
        <h3>Analysis Delay</h3>
        <p style={{ color: "#555", fontSize: "11px", letterSpacing: "2px", marginBottom: "20px" }}>
          INTERVAL BETWEEN SYSTEM ANALYSES (SECONDS)
        </p>
        <div className="input-group">
          <div className="threshold-row">
            <label className="threshold-label">Delay</label>
            <input
              className="input-field"
              type="number"
              value={analysisDelay}
              onChange={(e) => setAnalysisDelay(e.target.value)}
            />
          </div>
        </div>
      </div>

      <button className="save-btn" onClick={handleSave} style={{ marginTop: "24px" }}>
        Save Settings
      </button>
    </div>
  );
}

export default Settings;