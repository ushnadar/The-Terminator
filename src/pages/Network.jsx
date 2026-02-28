function Network() {
  return (
    <div>
      <h1>Network Monitoring</h1>

      <div className="card">
        <h3>Download Speed</h3>
        <p>-- Mbps</p>
      </div>

      <div className="card">
        <h3>Upload Speed</h3>
        <p>-- Mbps</p>
      </div>

      <div className="card">
        <h3>Active Connections</h3>
        <p>No active connections.</p>
      </div>
    </div>
  );
}

export default Network;