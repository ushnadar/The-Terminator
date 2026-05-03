import { useState, useEffect } from "react";

function Settings() {
  const [username, setUsername] = useState("");

  const [cpu, setCpu] = useState("");
  const [memory, setMemory] = useState("");
  const [disk, setDisk] = useState("");
  const [battery, setBattery] = useState("");

  const [cpuEnabled, setCpuEnabled] = useState(false);
  const [memoryEnabled, setMemoryEnabled] = useState(false);
  const [diskEnabled, setDiskEnabled] = useState(false);
  const [batteryEnabled, setBatteryEnabled] = useState(false);

  const [notificationsEnabled, setNotificationsEnabled] = useState(false);

  const [folderPath, setFolderPath] = useState("");   // what we send to backend
  const [folderDisplay, setFolderDisplay] = useState(""); // what we show to user
  const [savedFolder, setSavedFolder] = useState("");   // what is currently saved

  useEffect(() => {
    fetch("http://127.0.0.1:8000/api/settings/")
      .then((res) => res.json())
      .then((data) => {
        setUsername(data.username || "");
        setCpu(data.cpu_threshold ?? "");
        setMemory(data.memory_threshold ?? "");
        setDisk(data.disk_threshold ?? "");
        setBattery(data.battery_threshold ?? "");
        setCpuEnabled(data.cpu_enabled ?? false);
        setMemoryEnabled(data.memory_enabled ?? false);
        setDiskEnabled(data.disk_enabled ?? false);
        setBatteryEnabled(data.battery_enabled ?? false);
        setNotificationsEnabled(data.allow_notifications ?? false);
        // API returns "folder-path" key
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
    const files = e.target.files;
    if (!files || files.length === 0) return;
    // webkitRelativePath = "FolderName/somefile.txt"
    const relativePath = files[0].webkitRelativePath || "";
    const folderName = relativePath.split("/")[0];
    setFolderDisplay(folderName);
    setFolderPath(folderName);  // store the name; backend maps it from settings
  };

  const getRangeError = (value, min, max) => {
    if (value === "" || value === null) return null;
    const num = Number(value);
    if (isNaN(num)) return null;
    if (num < min || num > max) return `${min}–${max}% only`;
    return null;
  };

  const clampForSave = (value, min, max) => {
    const num = Number(value);
    if (isNaN(num) || value === "") return min;
    return Math.min(Math.max(num, min), max);
  };

  const handleSave = () => {
    const payload = {
      username,
      cpu_enabled: cpuEnabled,
      cpu_threshold: clampForSave(cpu, 35, 100),
      memory_enabled: memoryEnabled,
      memory_threshold: clampForSave(memory, 35, 100),
      disk_enabled: diskEnabled,
      disk_threshold: clampForSave(disk, 35, 100),
      battery_enabled: batteryEnabled,
      battery_threshold: clampForSave(battery, 1, 100),
      allow_notifications: notificationsEnabled,
      folder: folderPath,   // just save the folder name to the DB
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
          alert("Error: " + (data.error || "Could not save settings"));
        }
      })
      .catch((err) => console.error("Error saving settings:", err));
  };

  const ThresholdRow = ({ label, enabled, onToggle, value, setValue, min, max }) => {
    const error = enabled ? getRangeError(value, min, max) : null;
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
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <input
              className={`input-field${error ? " input-field--error" : ""}`}
              type="number"
              value={value}
              disabled={!enabled}
              min={min}
              max={max}
              onChange={(e) => setValue(e.target.value)}
            />
            {error && (
              <span className="threshold-error-badge">
                ⚠ {error}
              </span>
            )}
          </div>
        </div>
      </div>
    );
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
          <p style={{ marginTop: "12px", fontSize: "13px", color: "#888" }}>
            Selected:{" "}
            <span style={{ color: "#ff4d6d", letterSpacing: "1px" }}>{folderDisplay}</span>
            {savedFolder === folderPath && (
              <span style={{ marginLeft: "8px", color: "#4cff91", fontSize: "11px" }}>✓ saved</span>
            )}
          </p>
        ) : savedFolder ? (
          <p style={{ marginTop: "12px", fontSize: "13px", color: "#888" }}>
            Monitoring:{" "}
            <span style={{ color: "#ff4d6d", letterSpacing: "1px" }}>{savedFolder}</span>
            <span style={{ marginLeft: "8px", color: "#4cff91", fontSize: "11px" }}>✓ active</span>
          </p>
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
        <ThresholdRow label="CPU"     enabled={cpuEnabled}     onToggle={() => setCpuEnabled(!cpuEnabled)}         value={cpu}     setValue={setCpu}     min={35} max={100} />
        <ThresholdRow label="Memory"  enabled={memoryEnabled}  onToggle={() => setMemoryEnabled(!memoryEnabled)}   value={memory}  setValue={setMemory}  min={35} max={100} />
        <ThresholdRow label="Disk"    enabled={diskEnabled}    onToggle={() => setDiskEnabled(!diskEnabled)}       value={disk}    setValue={setDisk}    min={35} max={100} />
        <ThresholdRow label="Battery" enabled={batteryEnabled} onToggle={() => setBatteryEnabled(!batteryEnabled)} value={battery} setValue={setBattery} min={1}  max={100} />
      </div>

      <button className="save-btn" onClick={handleSave} style={{ marginTop: "24px" }}>
        Save Settings
      </button>
    </div>
  );
}

export default Settings;
