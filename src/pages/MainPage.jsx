function MainPage() {
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
          <p>Usage: --%</p>
        </div>

        <div className="card">
          <h3>Memory</h3>
          <p>Usage: --%</p>
        </div>

        <div className="card">
          <h3>Storage</h3>
          <p>Usage: --%</p>
        </div>

        <div className="card">
          <h3>Network</h3>
          <p>Speed: --</p>
        </div>

        <div className="card">
          <h3>Battery</h3>
          <p>Status: --%</p>
        </div>
      </div>
    </div>
  );
}

export default MainPage;