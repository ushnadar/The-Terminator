import { Link, useLocation } from "react-router-dom";

function Sidebar() {
  const location = useLocation();

  return (
    <div className="sidebar">
      <h2 className="logo">THE TERMINATOR</h2>

      <nav>
        <Link className={location.pathname === "/dashboard" ? "active" : ""} to="/dashboard">Dashboard</Link>
        <Link className={location.pathname === "/cpu" ? "active" : ""} to="/cpu">CPU</Link>
        <Link className={location.pathname === "/memory" ? "active" : ""} to="/memory">Memory</Link>
        <Link className={location.pathname === "/storage" ? "active" : ""} to="/storage">Storage</Link>
        <Link className={location.pathname === "/network" ? "active" : ""} to="/network">Network</Link>
        <Link className={location.pathname === "/battery" ? "active" : ""} to="/battery">Battery</Link>
        <Link className={location.pathname === "/alerts" ? "active" : ""} to="/alerts">Alerts</Link>
        <Link className={location.pathname === "/history" ? "active" : ""} to="/history">History</Link>
        <Link className={location.pathname === "/settings" ? "active" : ""} to="/settings">Settings</Link>
      </nav>
    </div>
  );
}

export default Sidebar;