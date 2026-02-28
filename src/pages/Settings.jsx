function Settings() {
  return (
    <div>
      <h1>Settings</h1>

      <div className="card">
        <h3>Username</h3>
        <input type="text" placeholder="Enter username" />
      </div>

      <div className="card">
        <h3>Alert Thresholds</h3>
        <p>CPU Threshold</p>
        <p>Memory Threshold</p>
        <p>Disk Threshold</p>
        <p>Battery Threshold</p>
      </div>
    </div>
  );
}

export default Settings;