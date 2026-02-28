import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Sidebar from "./components/sidebar";
import BootScreen from "./pages/BootScreen";
import MainPage from "./pages/MainPage";
import CPU from "./pages/CPU";
import Memory from "./pages/Memory";
import Storage from "./pages/Storage";
import Network from "./pages/Network";
import Battery from "./pages/Battery";
import Alerts from "./pages/Alerts";
import History from "./pages/History";
import Settings from "./pages/Settings";

/* Layout Wrapper */
function Layout({ children }) {
  return (
    <div className="app-container">
      <Sidebar />
      <div className="content">
        <button
          className="back-button"
          onClick={() => window.location.href = "/"}
        >
          ⬅ Back to Boot
        </button>

        {children}
      </div>
    </div>
  );
}

function App() {
  return (
    <Router>
      <Routes>
        {/* Boot Screen */}
        <Route path="/" element={<BootScreen />} />

        {/* Dashboard */}
        <Route
          path="/dashboard"
          element={
            <Layout>
              <MainPage />
            </Layout>
          }
        />

        <Route path="/cpu" element={<Layout><CPU /></Layout>} />
        <Route path="/memory" element={<Layout><Memory /></Layout>} />
        <Route path="/storage" element={<Layout><Storage /></Layout>} />
        <Route path="/network" element={<Layout><Network /></Layout>} />
        <Route path="/battery" element={<Layout><Battery /></Layout>} />
        <Route path="/alerts" element={<Layout><Alerts /></Layout>} />
        <Route path="/history" element={<Layout><History /></Layout>} />
        <Route path="/settings" element={<Layout><Settings /></Layout>} />
      </Routes>
    </Router>
  );
}

export default App;