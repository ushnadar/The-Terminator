import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

function BootScreen() {
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => {
      navigate("/dashboard");
    }, 5000); // 5 seconds

    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="boot-screen">
      <div className="boot-overlay"></div>

      <div className="boot-content">
        <h1 className="boot-title">THE TERMINATOR</h1>
        <p className="boot-subtitle">SYSTEM BOOT SEQUENCE INITIALIZING...</p>

        <div className="boot-loader">
          <div></div>
          <div></div>
          <div></div>
        </div>
      </div>
    </div>
  );
}

export default BootScreen;