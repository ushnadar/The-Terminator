function Memory() {
  return (
    <div>
      <h1>Memory Monitoring</h1>

      <div className="card">
        <h3>Total RAM</h3>
        <p>-- GB</p>
      </div>

      <div className="card">
        <h3>Used Memory</h3>
        <p>-- GB</p>
      </div>

      <div className="card">
        <h3>Per Process Memory</h3>
        <p>No process data yet.</p>
      </div>
    </div>
  );
}

export default Memory;