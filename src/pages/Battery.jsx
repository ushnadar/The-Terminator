function Battery() {
  return (
    <div>
      <h1>Battery Monitoring</h1>

      <div className="card">
        <h3>Battery Status</h3>
        <p>--%</p>
      </div>

      <div className="card">
        <h3>Charging</h3>
        <p>--</p>
      </div>

      <div className="card">
        <h3>Estimated Time Remaining</h3>
        <p>-- hours</p>
      </div>
    </div>
  );
}

export default Battery;