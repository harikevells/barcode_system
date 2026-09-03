import { useEffect, useRef, useState } from "react";
import { HashRouter as Router, Routes, Route, Link, useNavigate, useLocation } from "react-router-dom";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import Select from "react-select";
import { ShopDropdown, ShopSelectorModal } from "./Shops";
import { BarChartIcon, ClipboardIcon, BoxIcon, ScrollIcon, FileIcon, PlusIcon, DownloadIcon, TrendingDownIcon, UploadIcon, ArrowLeftIcon, SearchIcon, FolderIcon, TrashIcon, LockIcon, EyeIcon, EyeOffIcon } from "./icons";



// Dynamically connect to whichever IP or hostname you are currently visiting in your browser
// export const API_BASE_URL = `http://localhost:5001/api`;


export const API_BASE_URL = "http://16.16.123.89:5001/api"


let activeShopId = localStorage.getItem('activeShopId') || null;

export const setActiveShop = (id) => {
  activeShopId = id;
  if (id) {
    localStorage.setItem('activeShopId', id);
  } else {
    localStorage.removeItem('activeShopId');
  }
};

export const getActiveShop = () => activeShopId;

const originalFetch = window.fetch;
window.fetch = async function () {
  let [resource, config] = arguments;
  if (resource && typeof resource === 'string' && resource.startsWith(API_BASE_URL)) {
    if (activeShopId) {
      if (!config) config = {};
      if (!config.headers) config.headers = {};

      if (config.headers instanceof Headers) {
        config.headers.set('x-shop-id', activeShopId);
      } else {
        config.headers['x-shop-id'] = activeShopId;
      }
    }
  }
  return originalFetch.apply(this, [resource, config]);
};



const globalStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap');
  @import url('https://fonts.googleapis.com/css2?family=Righteous&display=swap');
  * {
    font-family: 'Outfit', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  }
  body {
    margin: 0;
    padding: 0;
    background-color: #f8fafc;
    color: #1e293b;
  }
  input, button, select, table {
    font-family: inherit;
  }
  .card {
    background: #ffffff;
    border-radius: 16px;
    box-shadow: 0 4px 20px rgba(0,0,0,0.02), 0 2px 8px rgba(0,0,0,0.02);
    border: 1px solid #f1f5f9;
    padding: 24px;
    margin-bottom: 24px;
  }
  .btn {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 10px 20px;
    border-radius: 10px;
    font-weight: 600;
    font-size: 14px;
    cursor: pointer;
    transition: all 0.2s;
    border: none;
    text-decoration: none;
  }
  .btn-primary {
    background: #1565c0;
    color: white;
  }
  .btn-primary:hover {
    background: #0d47a1;
  }
  .btn-secondary {
    background: #ffffff;
    color: #334155;
    border: 1px solid #cbd5e1;
  }
  .btn-secondary:hover {
    background: #f1f5f9;
  }
  .btn-success {
    background: #2e7d32;
    color: white;
  }
  .btn-success:hover {
    background: #1b5e20;
  }
  .btn-danger {
    background: #c62828;
    color: white;
  }
  .btn-danger:hover {
    background: #b71c1c;
  }
  .table-modern {
    width: 100%;
    border-collapse: separate;
    border-spacing: 0;
  }
  .table-modern th {
    background: #f8fafc;
    color: #475569;
    font-weight: 700;
    padding: 14px 16px;
    border-bottom: 2px solid #e2e8f0;
    text-align: left;
  }
  .table-modern td {
    padding: 14px 16px;
    border-bottom: 1px solid #f1f5f9;
    color: #334155;
  }
  .table-modern tr:hover td {
    background: #f8fafc;
  }
`;


// --- LOGIN COMPONENT ---
function Login({ onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = (e) => {
    e.preventDefault();
    const envUser = process.env.REACT_APP_ADMIN_USERNAME || "admin";
    const envPass = process.env.REACT_APP_ADMIN_PASSWORD || "password";

    if (username === envUser && password === envPass) {
      onLogin();
    } else {
      setError("Invalid username or password");
    }
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#fcf2f6', position: 'relative' }}>
      {/* Top Right Logo */}
      <div style={{ position: 'absolute', top: '40px', right: '50px', zIndex: 10 }}>
        <img src="./main_logo.png" alt="Inventory Master Logo" style={{ height: "70px", objectFit: "contain" }} />
      </div>

      {/* Left Form Panel */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '40px' }}>
        <div style={{ width: '100%', maxWidth: '380px' }}>
          <h1 style={{ fontSize: '32px', fontWeight: 800, color: '#1a1a2e', marginBottom: '8px' }}>Let's Get Started</h1>
          <p style={{ color: '#8892b0', fontSize: '14px', marginBottom: '40px' }}>Sign into continue to Application</p>

          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#8892b0', marginBottom: '8px' }}>User Name</label>
              <input
                id="username"
                name="username"
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                style={{ width: '100%', padding: '14px', borderRadius: '4px', border: '1px solid #e2e8f0', boxSizing: 'border-box', outline: 'none' }}
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#8892b0', marginBottom: '8px' }}>Pass Word</label>
              <div style={{ position: 'relative' }}>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  style={{ width: '100%', padding: '14px', borderRadius: '4px', border: '1px solid #e2e8f0', boxSizing: 'border-box', outline: 'none' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}
                >
                  {showPassword ? <EyeOffIcon size={20} /> : <EyeIcon size={20} />}
                </button>
              </div>
            </div>

            {error && <p style={{ color: '#ef4444', fontSize: '13px', marginTop: 0, marginBottom: '20px' }}>{error}</p>}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
              <label style={{ fontSize: '12px', color: '#8892b0', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input id="rememberMe" name="rememberMe" type="checkbox" style={{ accentColor: '#0ea5e9' }} /> Remember Me
              </label>
              <a href="#" style={{ fontSize: '12px', color: '#ef4444', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}><LockIcon size={14} /> Forgot Password?</a>
            </div>

            <button type="submit" style={{ width: '100%', maxWidth: '200px', padding: '14px', background: '#00b14f', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 600, fontSize: '14px', cursor: 'pointer', margin: '0 auto', display: 'block' }}>
              Sign in
            </button>
          </form>
        </div>
      </div>

      {/* Right Illustration Panel */}
      <div style={{ flex: 1, background: 'transparent', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <img src="./login-bg.png" alt="Warehouse Illustration" style={{ maxWidth: '90%', maxHeight: '80vh', objectFit: 'contain' }} />
      </div>
    </div>
  );
}


// --- ADMIN AUTH MODAL ---
function AdminAuthModal({ isOpen, onClose, onSuccess }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (username === "admin" && password === "superadmin123") {
      setError("");
      setUsername("");
      setPassword("");
      onSuccess();
      onClose();
    } else {
      setError("Invalid username or password.");
    }
  };

  return (
    <div style={{
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: "rgba(0, 0, 0, 0.5)",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      zIndex: 9999,
      fontFamily: "inherit"
    }}>
      <div style={{
        background: "#ffffff",
        padding: "24px 32px",
        borderRadius: "12px",
        boxShadow: "0 10px 25px rgba(0,0,0,0.15)",
        width: "100%",
        maxWidth: "380px"
      }}>
        <h3 style={{ margin: "0 0 12px 0", color: "#1e293b", fontSize: "18px", fontWeight: 700 }}>
          🔒 Higher Authority Authorization
        </h3>
        <p style={{ margin: "0 0 16px 0", color: "#64748b", fontSize: "13px" }}>
          Please enter admin credentials to authorize this action.
        </p>

        {error && (
          <div style={{
            background: "#fee2e2",
            color: "#b91c1c",
            padding: "8px 12px",
            borderRadius: "6px",
            fontSize: "13px",
            marginBottom: "12px",
            fontWeight: 500
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: "12px" }}>
            <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#475569", marginBottom: "4px" }}>
              Username
            </label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter admin username"
              style={{
                width: "100%",
                padding: "8px 12px",
                borderRadius: "6px",
                border: "1px solid #cbd5e1",
                fontSize: "14px",
                boxSizing: "border-box"
              }}
            />
          </div>

          <div style={{ marginBottom: "20px" }}>
            <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#475569", marginBottom: "4px" }}>
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter admin password"
              style={{
                width: "100%",
                padding: "8px 12px",
                borderRadius: "6px",
                border: "1px solid #cbd5e1",
                fontSize: "14px",
                boxSizing: "border-box"
              }}
            />
          </div>

          <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
            <button
              type="button"
              onClick={() => {
                setError("");
                setUsername("");
                setPassword("");
                onClose();
              }}
              style={{
                padding: "8px 16px",
                background: "#f1f5f9",
                color: "#475569",
                border: "none",
                borderRadius: "6px",
                fontSize: "13px",
                fontWeight: 600,
                cursor: "pointer"
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              style={{
                padding: "8px 16px",
                background: "#b91c1c",
                color: "#ffffff",
                border: "none",
                borderRadius: "6px",
                fontSize: "13px",
                fontWeight: 600,
                cursor: "pointer"
              }}
            >
              Authorize & Clear
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


// --- GLOBAL HEADER COMPONENT ---
function Header() {
  const location = useLocation();
  const path = location.pathname;
  const [isAuthOpen, setIsAuthOpen] = useState(false);

  const navItems = [
    { label: "Dashboard", path: "/", icon: <BarChartIcon size={18} /> },
    { label: "Products", path: "/products", icon: <ClipboardIcon size={18} /> },
    { label: "Inventory Audit", path: "/audit-history", icon: <BoxIcon size={18} /> }
  ];

  return (
    <header style={{
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      background: "#ffffff",
      padding: "16px 32px",
      boxShadow: "0 4px 20px rgba(0, 0, 0, 0.03)",
      borderBottom: "1px solid #eaeaea",
      marginBottom: "24px",
      fontFamily: "'Outfit', 'Segoe UI', sans-serif"
    }}>
      {/* Left: Logo */}
      <div style={{ display: "flex", alignItems: "center" }}>
        <img src="./main_logo.png" alt="Inventory Master Logo" style={{ height: "45px", objectFit: "contain" }} />
      </div>

      {/* Center: Nav Pills */}
      <nav style={{
        display: "flex",
        background: "#f4f6fa",
        padding: "6px",
        borderRadius: "30px",
        gap: "4px",
        border: "1px solid #e2e8f0"
      }}>
        {navItems.map((item) => {
          const isActive = path === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "10px 20px",
                borderRadius: "20px",
                textDecoration: "none",
                fontSize: "14px",
                fontWeight: 600,
                color: isActive ? "#ffffff" : "#64748b",
                background: isActive ? "linear-gradient(135deg, #ec407a 0%, #e91e63 100%)" : "transparent",
                boxShadow: isActive ? "0 4px 12px rgba(233, 30, 99, 0.2)" : "none",
                transition: "all 0.2s ease-in-out"
              }}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Center-Right: Shop Dropdown */}
      <div style={{ marginRight: "16px" }}><ShopDropdown /></div>

      {/* Right: Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <Link
          to="/logs"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "8px 16px",
            borderRadius: "20px",
            border: "1px solid #cbd5e1",
            background: path === "/logs" ? "#f1f5f9" : "#ffffff",
            color: "#334155",
            textDecoration: "none",
            fontWeight: 600,
            fontSize: "14px",
            transition: "all 0.2s ease-in-out",
            boxShadow: "0 2px 5px rgba(0,0,0,0.02)"
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "#f1f5f9";
            e.currentTarget.style.borderColor = "#94a3b8";
          }}
          onMouseLeave={(e) => {
            if (path !== "/logs") {
              e.currentTarget.style.background = "#ffffff";
              e.currentTarget.style.borderColor = "#cbd5e1";
            }
          }}
        >
          <span><ClipboardIcon size={16} color="#64748b" /></span>
          <span>Logs</span>
        </Link>

        <button
          onClick={() => setIsAuthOpen(true)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            padding: "8px 16px",
            borderRadius: "20px",
            border: "none",
            background: "#7f1d1d",
            color: "#ffffff",
            fontWeight: 700,
            fontSize: "13px",
            cursor: "pointer",
            transition: "all 0.2s ease-in-out"
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "#991b1b" }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "#7f1d1d" }}
        >
          <TrashIcon size={16} color="#ffffff" /> Clear All Data
        </button>

        <button
          onClick={() => {
            localStorage.removeItem('auth');
            window.location.reload();
          }}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            padding: "8px 16px",
            borderRadius: "20px",
            border: "none",
            background: "#fee2e2",
            color: "#b91c1c",
            fontWeight: 700,
            fontSize: "13px",
            cursor: "pointer",
            transition: "all 0.2s ease-in-out"
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "#fecaca" }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "#fee2e2" }}
        >
          Logout
        </button>
      </div>

      <AdminAuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onSuccess={async () => {
          if (window.confirm("WARNING: This will delete ALL data from ALL databases including products, logs, etc. Proceed?")) {
            try {
              await fetch(`${API_BASE_URL}/clear-all`, { method: "DELETE" });
              window.location.reload();
            } catch (err) {
              console.error("Error clearing all data:", err);
            }
          }
        }}
      />
    </header>
  );
}

// --- EXCEL PARSER HELPER (Global) ---
const parseExcelFile = async (file, expectedType) => {
  const workbook = new ExcelJS.Workbook();
  const arrayBuffer = await file.arrayBuffer();
  await workbook.xlsx.load(arrayBuffer);
  const worksheet = workbook.getWorksheet(1) || workbook.worksheets[0];
  if (!worksheet) throw new Error("No worksheets found in the Excel file.");

  const rows = [];
  let headerRow = null;
  let colMap = {};

  worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    const rowData = [];
    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      let val = cell.value;
      if (val && typeof val === 'object' && val.result !== undefined) {
        val = val.result;
      }
      rowData[colNumber] = val;
    });

    if (rowNumber === 1) {
      headerRow = rowData;
      headerRow.forEach((h, index) => {
        if (!h) return;
        const cleanHeader = String(h).toLowerCase().replace(/[^a-z0-9]/g, "");
        if (cleanHeader.includes("barcode") || cleanHeader.includes("code")) {
          colMap.barcode = index;
        } else if (cleanHeader.includes("productname") || cleanHeader.includes("name") || cleanHeader.includes("item")) {
          colMap.productName = index;
        } else if (cleanHeader.includes("mrp") || cleanHeader.includes("price") || cleanHeader.includes("rate")) {
          colMap.mrp = index;
        } else if (cleanHeader.includes("qty") || cleanHeader.includes("quantity") || cleanHeader.includes("physicalqty") || cleanHeader.includes("systemqty") || cleanHeader.includes("stock") || cleanHeader.includes("count") || cleanHeader.includes("sold")) {
          colMap.quantity = index;
        }
      });
    } else {
      const barcode = colMap.barcode !== undefined ? String(rowData[colMap.barcode] || "").trim() : undefined;
      const productName = colMap.productName !== undefined ? String(rowData[colMap.productName] || "").trim() : undefined;
      const mrp = colMap.mrp !== undefined ? parseFloat(rowData[colMap.mrp]) || 0 : undefined;
      const quantity = colMap.quantity !== undefined ? parseInt(rowData[colMap.quantity]) || 0 : undefined;

      if (productName || barcode) {
        rows.push({ barcode, productName, mrp, physicalQuantity: quantity, quantity });
      }
    }
  });

  return rows;
};

// --- DASHBOARD COMPONENT ---
function Dashboard() {
  const [dashboardScans, setDashboardScans] = useState([]);
  const [manualInputs, setManualInputs] = useState({});
  const [scannerStatuses, setScannerStatuses] = useState({});
  const [lastInputSource, setLastInputSource] = useState("Waiting for scan...");
  const [wsStatus, setWsStatus] = useState("Connecting...");
  const [serverScannerCount, setServerScannerCount] = useState(1);
  const [manualScannerCount, setManualScannerCount] = useState(null);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authSuccessCallback, setAuthSuccessCallback] = useState(() => () => { });
  const [aData, setAData] = useState([]);
  const [bData, setBData] = useState([]);
  const wsRef = useRef(null);
  const hidBuffer = useRef("");
  const hidTimer = useRef(null);
  const lastProcessedCodes = useRef({});
  const SCANNER_COLORS = ["#1565c0", "#2e7d32", "#ef6c00", "#7c3aed", "#d81b60", "#00897b"];
  const maxScannerNum = manualScannerCount !== null ? manualScannerCount : serverScannerCount;
  const scannersToShow = Array.from({ length: maxScannerNum }, (_, i) => i + 1);



  const processScan = async (code, source = "Unknown") => {
    const trimmedCode = String(code || "").trim();
    if (!trimmedCode) return;

    const upperCode = trimmedCode.toUpperCase();
    if (!upperCode) return;

    const hasA = upperCode.includes("A");
    const hasB = upperCode.includes("B");
    const aIndex = upperCode.indexOf("A");
    const bIndex = upperCode.indexOf("B");

    if ((hasA && hasB) || (hasA && aIndex > 0) || (hasB && bIndex > 0)) {
      console.error("Concatenated scan detected:", trimmedCode);
      alert("Overlapping/Concatenated scans detected! Please scan again.");
      setLastInputSource(`⚠️ Blocked: Concatenated scan (${source})`);
      return;
    }

    const firstChar = upperCode.charAt(0);
    let colNum = 1;
    if (firstChar >= "A" && firstChar <= "Z") {
      colNum = firstChar.charCodeAt(0) - 64;
    } else if (source && source.includes(":") && !isNaN(parseInt(source.split(":").pop()))) {
      colNum = parseInt(source.split(":").pop()) || 1;
    }

    const nowTs = Date.now();
    if (lastProcessedCodes.current[trimmedCode] && nowTs - lastProcessedCodes.current[trimmedCode] < 2000) {
      console.log(`Ignoring duplicate scan: ${trimmedCode} from ${source}`);
      return;
    }
    lastProcessedCodes.current[trimmedCode] = nowTs;

    try {
      await fetch(`${API_BASE_URL}/scan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ barcode: trimmedCode })
      });
    } catch (err) {
      console.error("Error saving scan:", err);
    }

    const timeStr = new Date().toLocaleTimeString();
    setDashboardScans((prev) => [...prev, { value: trimmedCode, ts: nowTs, scanner: colNum }]);
    setLastInputSource(`Scanner ${colNum} (${source} @ ${timeStr}): ${trimmedCode}`);
    setScannerStatuses((prev) => ({ ...prev, [colNum]: "Active" }));
  };

  useEffect(() => {
    let isUnmounted = false;
    let reconnectTimeout = null;

    const connectWS = () => {
      if (isUnmounted) return;
      const ws = new WebSocket(`ws://16.16.123.89:8080`);
      wsRef.current = ws;

      ws.onopen = () => {
        if (!isUnmounted) setWsStatus("Connected");
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.source === "system" && data.activeScannersCount) {
            setServerScannerCount(data.activeScannersCount);
          } else if (data.source === "serial") {
            const portName = data.port ? data.port.split('\\').pop() : '';
            processScan(data.value, `Serial:${portName}`);
          }
        } catch (e) {
          console.error("WS Parse Error", e);
        }
      };

      ws.onclose = () => {
        if (isUnmounted) return;
        setWsStatus("Disconnected");
        reconnectTimeout = setTimeout(connectWS, 2000);
      };

      ws.onerror = () => {
        if (isUnmounted) return;
        setWsStatus("Disconnected");
      };
    };

    const handleKeydownDetection = (e) => {
      if (e.key === "Enter" && hidBuffer.current.length > 3) {
        if (hidTimer.current) clearTimeout(hidTimer.current);
        const code = hidBuffer.current;
        hidBuffer.current = "";
        processScan(code, "Keyboard/HID");
        return;
      }

      if (e.key.length === 1) {
        if (document.activeElement.tagName === "INPUT") return;
        hidBuffer.current += e.key;
        if (hidTimer.current) clearTimeout(hidTimer.current);
        hidTimer.current = setTimeout(() => {
          if (hidBuffer.current.length > 3) {
            processScan(hidBuffer.current, "Keyboard/HID");
          }
          hidBuffer.current = "";
        }, 50);
      }
    };

    connectWS();
    window.addEventListener("keydown", handleKeydownDetection);

    return () => {
      isUnmounted = true;
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      window.removeEventListener("keydown", handleKeydownDetection);
      if (wsRef.current) {
        const ws = wsRef.current;
        ws.onopen = null;
        ws.onmessage = null;
        ws.onclose = null;
        ws.onerror = null;
        if (ws.readyState === WebSocket.CONNECTING) {
          ws.onopen = () => { try { ws.close(); } catch (e) { } };
        } else if (ws.readyState === WebSocket.OPEN) {
          try { ws.close(); } catch (e) { }
        }
      }
    };
  }, []);

  const handleDashboardManualAdd = async (column) => {
    const barcode = (manualInputs[column] || "").trim();
    if (!barcode) return;

    if (!barcode.toUpperCase().startsWith(column)) {
      alert(`Manual entry for Column ${column} must start with "${column}"!`);
      return;
    }

    try {
      await fetch(`${API_BASE_URL}/manual`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ barcode })
      });

      const nowTs = Date.now();
      const colNum = column.charCodeAt(0) - 64;
      setDashboardScans((prev) => [...prev, { value: barcode, ts: nowTs, scanner: colNum }]);
      setManualInputs((prev) => ({ ...prev, [column]: "" }));
      setLastInputSource(`Manual → Column ${column}: ${barcode}`);
    } catch (err) {
      console.error("Error adding manual barcode:", err);
    }
  };

  const handleClear = async () => {
    setAuthSuccessCallback(() => async () => {
      if (window.confirm("WARNING: This will delete ALL data from the database. Proceed?")) {
        try {
          await fetch(`${API_BASE_URL}/clear`, { method: "DELETE" });
          setAData([]);
          setBData([]);
          setDashboardScans([]);
          setSessionScans([]);
          setActiveSession(null);
          try {
            localStorage.removeItem("dashboardScans");
            localStorage.removeItem("activeSession");
            localStorage.removeItem("sessionScans");
          } catch (e) { }
          setLastInputSource("Database and UI Cleared.");
        } catch (err) {
          console.error("Error clearing data:", err);
        }
      }
    });
    setIsAuthOpen(true);
  };

  const handleClearAll = async () => {
    setAuthSuccessCallback(() => async () => {
      if (window.confirm("WARNING: This will delete ALL data from ALL databases including products, logs, etc. Proceed?")) {
        try {
          await fetch(`${API_BASE_URL}/clear-all`, { method: "DELETE" });
          setAData([]);
          setBData([]);
          setDashboardScans([]);
          setSessionScans([]);
          setActiveSession(null);
          try {
            localStorage.removeItem("dashboardScans");
            localStorage.removeItem("activeSession");
            localStorage.removeItem("sessionScans");
          } catch (e) { }
          setLastInputSource("All Databases and UI Cleared.");
        } catch (err) {
          console.error("Error clearing all data:", err);
        }
      }
    });
    setIsAuthOpen(true);
  };

  const StatusDot = ({ status }) => (
    <span
      style={{
        display: "inline-block",
        width: 10,
        height: 10,
        borderRadius: "50%",
        background: status === "Active" ? "#2e7d32" : "#ff9800",
        marginRight: 6,
        verticalAlign: "middle",
        boxShadow: status === "Active" ? "0 0 6px #2e7d32" : "0 0 4px #ff9800",
      }}
    />
  );

  const panelStyle = {
    flex: 1,
    minWidth: 300,
    border: "1px solid #d9d9d9",
    borderRadius: 10,
    padding: 18,
    background: "#fff",
    boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
  };

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc" }}>
      <Header />
      <div style={{ padding: "0 32px 32px 32px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div>
            <h1 style={{ margin: 0, color: "#0f172a", fontWeight: 800, fontSize: "28px", letterSpacing: "-0.5px" }}>📡 Barcode Scanner Dashboard</h1>
            <p style={{ margin: "4px 0 0 0", color: "#64748b", fontSize: "14px" }}>Monitor scans and check hardware connections live.</p>
          </div>
        </div>

        {/* Status Banner */}
        <div style={{ marginBottom: 24, padding: "16px 24px", background: "#fff", border: "1px solid #f1f5f9", borderRadius: 16, boxShadow: "0 4px 20px rgba(0,0,0,0.02)", display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
          <span style={{ background: wsStatus === "Connected" ? "#e2f0d9" : "#fce8e6", color: wsStatus === "Connected" ? "#2e7d32" : "#c62828", borderRadius: "12px", padding: "4px 12px", fontSize: 13, fontWeight: 700 }}>Serial Server: {wsStatus}</span>
          <div style={{ color: "#e2e8f0" }}>|</div>
          {scannersToShow.map(num => {
            const col = String.fromCharCode(64 + num);
            const accentColor = SCANNER_COLORS[(num - 1) % SCANNER_COLORS.length];
            const status = scannerStatuses[num] || "Ready";
            return (
              <React.Fragment key={num}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <StatusDot status={status} />
                  <span style={{ fontWeight: 700, color: accentColor }}>Scanner {num} ({col})</span>
                </div>
                <div style={{ color: "#e2e8f0" }}>|</div>
              </React.Fragment>
            );
          })}
          <span style={{ color: "#64748b", marginLeft: "auto", fontSize: 13, fontWeight: 500 }}>{lastInputSource}</span>
          <button onClick={handleClear} className="btn btn-danger" style={{ padding: "6px 14px", fontSize: 13, borderRadius: "8px" }}><span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><TrashIcon size={16} /> CLEAR DB</span></button>
        </div>

        <div style={{ display: "flex", gap: 24, alignItems: "flex-start", flexWrap: "wrap" }}>
          {scannersToShow.map((num) => {
            const col = String.fromCharCode(64 + num);
            const accentColor = SCANNER_COLORS[(num - 1) % SCANNER_COLORS.length];
            const columnScans = dashboardScans.filter(d => d.scanner === num);
            const manualVal = manualInputs[col] || "";

            return (
              <div key={num} style={{ ...panelStyle, border: "1px solid #f1f5f9", borderRadius: "16px", padding: "24px" }}>
                <h2 style={{ margin: "0 0 14px", color: accentColor, fontSize: 18, fontWeight: 700 }}>
                  Scanner {num} (Column {col}) <span style={{ fontSize: 13, color: "#64748b", fontWeight: 500 }}>({columnScans.length} scans)</span>
                </h2>
                <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
                  <input
                    type="text"
                    value={manualVal}
                    onChange={(e) => setManualInputs(prev => ({ ...prev, [col]: e.target.value }))}
                    onKeyDown={(e) => e.key === "Enter" && handleDashboardManualAdd(col)}
                    placeholder={`Manual entry for ${col}...`}
                    style={{ flex: 1, padding: "10px 12px", borderRadius: 8, border: `1px solid ${accentColor}40`, fontSize: 13, outline: "none" }}
                  />
                  <button
                    onClick={() => handleDashboardManualAdd(col)}
                    className="btn"
                    style={{ padding: "10px 16px", borderRadius: 8, background: accentColor, color: "white", border: "none", cursor: "pointer", fontWeight: 700 }}
                  >
                    Add
                  </button>
                </div>
                <hr style={{ border: "none", borderTop: "1px solid #f1f5f9", marginBottom: 16 }} />
                {columnScans.length === 0 ? (
                  <p style={{ color: "#94a3b8", fontStyle: "italic", textAlign: "center" }}>No scans yet.</p>
                ) : (
                  columnScans.map((d, i) => (
                    <div key={`col-${col}-${i}`} style={{ margin: "6px 0", padding: "10px 14px", background: `${accentColor}08`, borderRadius: 8, fontFamily: "monospace", fontSize: 14, display: "flex", justifyContent: "space-between", border: `1px solid ${accentColor}20` }}>
                      <span><strong style={{ color: "#94a3b8", marginRight: 8 }}>{i + 1}.</strong>{d.value}</span>
                      <span style={{ fontSize: 11, color: "#94a3b8", fontWeight: 500 }}>{new Date(d.ts).toLocaleTimeString()}</span>
                    </div>
                  ))
                )}
              </div>
            );
          })}
        </div>
      </div>
      <AdminAuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onSuccess={authSuccessCallback}
      />
    </div>
  );
}

// --- LIVE AUDIT (formerly HISTORY) COMPONENT ---
function RackHistory() {
  const navigate = useNavigate();

  // Load session purely from DB on mount — do NOT use stale localStorage as initial state
  const [activeSession, setActiveSession] = useState(null);
  const [sessionLoaded, setSessionLoaded] = useState(false); // prevents flash of "Start Audit" enabled
  const [sessionScans, setSessionScans] = useState([]);

  const [selectedBarcodes, setSelectedBarcodes] = useState([]);
  const [manualInputs, setManualInputs] = useState({});
  const [manualScannerCount, setManualScannerCount] = useState(null);
  const [serverScannerCount, setServerScannerCount] = useState(1);
  const [sessionMaxColumns, setSessionMaxColumns] = useState(1);

  // On mount: fetch active session from DB and restore state
  useEffect(() => {
    fetch(`${API_BASE_URL}/scanners/count`)
      .then(res => res.json())
      .then(data => { if (data && data.count !== undefined) setServerScannerCount(data.count); })
      .catch(() => { });

    fetch(`${API_BASE_URL}/audit-sessions/active/current`)
      .then(res => res.json())
      .then(data => {
        if (data && data.session && data.session.status === "active") {
          setActiveSession(data.session);
          if (Array.isArray(data.session.scans)) {
            setSessionScans(data.session.scans);
          }
        } else {
          // No active session in DB — clear any stale localStorage
          setActiveSession(null);
          setSessionScans([]);
          try {
            localStorage.removeItem("activeSession");
            localStorage.removeItem("sessionScans");
          } catch (e) { }
        }
      })
      .catch(() => { })
      .finally(() => setSessionLoaded(true));
  }, []);

  const [showEndModal, setShowEndModal] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [auditName, setAuditName] = useState("");
  const uploadAuditExcelRef = useRef(null);

  // Keep a ref for WebSocket handler to always have latest session
  const activeSessionRef = useRef(null);
  const [wsStatus, setWsStatus] = useState("Connecting...");
  useEffect(() => {
    activeSessionRef.current = activeSession;
  }, [activeSession]);

  // HID Scanner support for RackHistory
  const hidBuffer = useRef("");
  const hidTimer = useRef(null);

  useEffect(() => {
    const processHIDScan = (code) => {
      if (!activeSessionRef.current) return;
      const colNum = "1"; // Default for HID
      fetch(`${API_BASE_URL}/audit-sessions/${activeSessionRef.current._id}/scan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ barcode: code, scanner: colNum })
      }).catch(err => console.error("Save HID scan error:", err));
      setSessionScans(prev => [...prev, { barcode: code, timestamp: new Date(), scanner: colNum }]);
    };

    const handleKeydownDetection = (e) => {
      if (e.key === "Enter" && hidBuffer.current.length > 3) {
        if (hidTimer.current) clearTimeout(hidTimer.current);
        const code = hidBuffer.current;
        hidBuffer.current = "";
        processHIDScan(code);
        return;
      }

      if (e.key.length === 1) {
        if (document.activeElement.tagName === "INPUT" || document.activeElement.tagName === "TEXTAREA") return;
        hidBuffer.current += e.key;
        if (hidTimer.current) clearTimeout(hidTimer.current);
        hidTimer.current = setTimeout(() => {
          if (hidBuffer.current.length > 3) {
            processHIDScan(hidBuffer.current);
          }
          hidBuffer.current = "";
        }, 50);
      }
    };

    window.addEventListener("keydown", handleKeydownDetection);
    return () => {
      window.removeEventListener("keydown", handleKeydownDetection);
    };
  }, []);

  // WebSocket connection — clean reconnect loop
  useEffect(() => {
    let isUnmounted = false;
    let ws = null;
    let reconnectTimeout = null;

    const connectWS = () => {
      if (isUnmounted) return;
      try {
        ws = new WebSocket(`ws://16.16.123.89:8080`);

        ws.onopen = () => {
          console.log("✅ WebSocket connected to ws://16.16.123.89:8080");
          if (!isUnmounted) setWsStatus("Connected ✅");
        };

        ws.onmessage = (event) => {
          console.log("📡 WS raw message:", event.data);
          try {
            const data = JSON.parse(event.data);
            if (data.source === "system" && data.activeScannersCount) {
              if (!isUnmounted) setServerScannerCount(data.activeScannersCount);
            } else if (data.source === "serial" && data.value) {
              const currentSession = activeSessionRef.current;
              console.log("🔍 Scan received, session ref:", currentSession ? currentSession.status : "NO SESSION");
              if (!currentSession || currentSession.status !== "active") {
                console.warn("⚠️ Scan dropped - no active session. Current ref:", currentSession);
                return;
              }
              const rawBarcode = String(data.value).trim();
              // Extract scanner number from data.scanner OR parse from port string e.g. "RaspberryPi (Scanner 1)"
              let scannerNum = "1";
              if (data.scanner) {
                scannerNum = String(data.scanner);
              } else if (data.port) {
                const match = String(data.port).match(/(\d+)/);
                if (match) scannerNum = match[1];
              }
              console.log("✅ Saving scan:", rawBarcode, "scanner:", scannerNum);

              fetch(`${API_BASE_URL}/audit-sessions/${currentSession._id}/scan`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ barcode: rawBarcode, scanner: scannerNum })
              }).catch(err => console.error("Save scan error:", err));

              console.log("Checking isUnmounted:", isUnmounted);
              if (!isUnmounted) {
                setSessionScans(prev => {
                  const newState = [...prev, { barcode: rawBarcode, timestamp: new Date(), scanner: scannerNum }];
                  console.log("STATE UPDATE TRIGGERED, old length:", prev.length, "new length:", newState.length);
                  return newState;
                });
              } else {
                console.warn("isUnmounted is TRUE, skipping state update!");
              }
            }
          } catch (e) {
            console.error("WS message parse error:", e);
          }
        };

        ws.onclose = () => {
          if (!isUnmounted) {
            console.log("⚠️ WebSocket closed. Reconnecting in 2s...");
            setWsStatus("Reconnecting...");
            reconnectTimeout = setTimeout(connectWS, 2000);
          }
        };

        ws.onerror = () => {
          if (!isUnmounted) {
            try { ws.close(); } catch (e) { }
          }
        };
      } catch (e) {
        console.error("WebSocket creation failed:", e);
        if (!isUnmounted) {
          reconnectTimeout = setTimeout(connectWS, 2000);
        }
      }
    };

    connectWS();

    return () => {
      isUnmounted = true;
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (ws) {
        ws.onopen = null;
        ws.onmessage = null;
        ws.onclose = null;
        ws.onerror = null;
        if (ws.readyState === WebSocket.CONNECTING) {
          ws.onopen = () => { try { ws.close(); } catch (e) { } };
        } else if (ws.readyState === WebSocket.OPEN) {
          try { ws.close(); } catch (e) { }
        }
      }
    };
  }, []);

  const handleStartAudit = async () => {
    try {
      let currentActiveCount = serverScannerCount || 1;
      try {
        const countRes = await fetch(`${API_BASE_URL}/scanners/count`);
        const countData = await countRes.json();
        if (countData && countData.count !== undefined && countData.count > 0) {
          currentActiveCount = countData.count;
          setServerScannerCount(currentActiveCount);
        }
      } catch (e) { }

      const res = await fetch(`${API_BASE_URL}/audit-sessions`, { method: "POST" });
      const data = await res.json();
      if (data && data.session) {
        // Update ref IMMEDIATELY so WebSocket handler uses latest session right away
        activeSessionRef.current = data.session;
        setActiveSession(data.session);
        setSessionScans([]);
        setSessionMaxColumns(currentActiveCount);
        setManualScannerCount(null);
        console.log("🟢 Fresh Audit started with", currentActiveCount, "scanner columns. Session ID:", data.session._id);
      }
    } catch (err) {
      console.error(err);
      alert("Failed to start audit.");
    }
  };

  const handleManualAdd = async (column) => {
    if (!activeSession) {
      alert("Please start an audit session first to scan barcodes.");
      return;
    }
    const barcode = (manualInputs[column] || "").trim();
    if (!barcode) return;

    const colNum = typeof column === "number" ? column : (column.charCodeAt ? column.charCodeAt(0) - 64 : 1);

    try {
      await fetch(`${API_BASE_URL}/audit-sessions/${activeSession._id}/scan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ barcode, scanner: String(colNum) })
      });
      setSessionScans(prev => [...prev, { barcode, timestamp: new Date(), scanner: String(colNum) }]);
      setManualInputs(prev => ({ ...prev, [column]: "" }));
    } catch (err) {
      console.error("Error adding manual barcode:", err);
      alert("Failed to add barcode.");
    }
  };

  const parseAuditBarcodeExcel = async (file) => {
    const workbook = new ExcelJS.Workbook();
    const arrayBuffer = await file.arrayBuffer();
    await workbook.xlsx.load(arrayBuffer);
    const worksheet = workbook.getWorksheet(1) || workbook.worksheets[0];
    if (!worksheet) throw new Error("No worksheets found in the Excel file.");

    const scans = [];
    worksheet.eachRow({ includeEmpty: true }, (row) => {
      const firstCell = row.getCell(1);
      const value = firstCell && firstCell.value !== null && firstCell.value !== undefined ? String(firstCell.value).trim() : "";
      if (value) {
        scans.push({ barcode: value, timestamp: new Date(), scanner: "1" });
      }
    });

    return scans;
  };

  const handleUploadAuditExcel = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const namePrompt = window.prompt("Audit Name", "Uploaded Audit");
      const auditNameValue = (namePrompt || "Uploaded Audit").trim() || "Uploaded Audit";
      const uploadedScans = await parseAuditBarcodeExcel(file);
      const uploadedAt = new Date();

      const createSessionRes = await fetch(`${API_BASE_URL}/audit-sessions`, { method: "POST" });
      const createSessionData = await createSessionRes.json();
      if (!createSessionRes.ok || !createSessionData.session) {
        throw new Error(createSessionData.error || "Failed to create uploaded audit session");
      }

      const saveSessionRes = await fetch(`${API_BASE_URL}/audit-sessions/${createSessionData.session._id}/end`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          save: true,
          name: auditNameValue,
          scans: uploadedScans.map(scan => ({ ...scan, timestamp: uploadedAt, scanner: "1" })),
          startTime: uploadedAt.toISOString(),
          endTime: uploadedAt.toISOString()
        })
      });

      const saveData = await saveSessionRes.json();
      if (!saveSessionRes.ok) {
        throw new Error(saveData.error || "Failed to save uploaded audit");
      }

      alert(`Uploaded audit saved as "${auditNameValue}" with ${uploadedScans.length} barcode(s).`);
      setShowSaveModal(false);
      setAuditName("");
      window.location.href = "/audit-history";
    } catch (err) {
      console.error("Error uploading audit Excel:", err);
      alert("Failed to upload audit Excel: " + err.message);
    } finally {
      e.target.value = "";
    }
  };

  const handleClearHistory = async () => {
    if (window.confirm("Clear all scanned barcodes in the current session?")) {
      try {
        if (activeSession) {
          await fetch(`${API_BASE_URL}/audit-sessions/${activeSession._id}`, {
            method: "DELETE"
          });
        }
      } catch (err) {
        console.error("Error deleting session:", err);
      } finally {
        setSessionScans([]);
        setActiveSession(null);
        try {
          localStorage.removeItem("activeSession");
          localStorage.removeItem("sessionScans");
        } catch (e) { }
      }
    }
  };

  const handleEndAuditClick = () => {
    setShowEndModal(true);
  };

  const handleConfirmSave = async () => {
    try {
      await fetch(`${API_BASE_URL}/audit-sessions/${activeSession._id}/end`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ save: true, name: auditName, scans: sessionScans })
      });
      setShowSaveModal(false);
      setActiveSession(null);
      setSessionScans([]);
      setSessionMaxColumns(serverScannerCount || 1);
      setManualScannerCount(null);
      setAuditName("");
      try {
        localStorage.removeItem("activeSession");
        localStorage.removeItem("sessionScans");
      } catch (e) { }
      alert("Audit saved successfully.");
    } catch (err) {
      console.error(err);
      alert("Failed to save audit.");
    }
  };

  const handleConfirmDiscard = async () => {
    try {
      if (activeSession) {
        await fetch(`${API_BASE_URL}/audit-sessions/${activeSession._id}/end`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ save: false })
        });
      }
    } catch (err) {
      console.error("Error discarding audit:", err);
    } finally {
      setShowEndModal(false);
      setActiveSession(null);
      setSessionScans([]);
      setSessionMaxColumns(serverScannerCount || 1);
      setManualScannerCount(null);
      try {
        localStorage.removeItem("activeSession");
        localStorage.removeItem("sessionScans");
      } catch (e) { }
    }
  };

  const handleDeleteScan = async (itemToDelete) => {
    setSessionScans(prev => {
      const idx = prev.findIndex(item => item === itemToDelete || (item.barcode === itemToDelete.barcode && new Date(item.timestamp).getTime() === new Date(itemToDelete.timestamp).getTime()));
      if (idx !== -1) {
        const updated = [...prev];
        updated.splice(idx, 1);
        return updated;
      }
      return prev;
    });

    if (activeSession) {
      try {
        await fetch(`${API_BASE_URL}/audit-sessions/${activeSession._id}/scan`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ barcode: itemToDelete.barcode })
        });
      } catch (err) {
        console.error("Error deleting scan from backend:", err);
      }
    }
  };

  const barcodeOptions = Array.from(new Set(sessionScans.map(item => item.barcode)))
    .map(barcode => ({ value: barcode, label: barcode }));

  const filteredData = sessionScans.filter((item) => {
    if (selectedBarcodes.length > 0) {
      if (!selectedBarcodes.some(b => b.value === item.barcode)) return false;
    }
    return true;
  });

  const SCANNER_COLORS = ["#1565c0", "#6a1b9a", "#00796b", "#d81b60", "#f57c00", "#388e3c", "#5d4037", "#455a64"];

  // Scanner Column Mapping & Sorting for Live Audit
  const getScannerNumber = (item) => {
    if (!item) return 1;
    let rawId = "1";
    if (typeof item === 'object' && item.scanner !== undefined && item.scanner !== null) {
      rawId = String(item.scanner);
    }
    const match = rawId.match(/(\d+)/);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > 0) return num;
    }
    return 1;
  };

  const activeScannerNums = new Set();
  sessionScans.forEach(item => {
    activeScannerNums.add(getScannerNumber(item));
  });

  const maxDetectedScanner = activeScannerNums.size > 0 ? Math.max(...Array.from(activeScannerNums)) : 1;

  const baseScannerCount = Math.max(
    serverScannerCount || 0,
    maxDetectedScanner,
    sessionMaxColumns || 1,
    1
  );

  useEffect(() => {
    if (baseScannerCount > sessionMaxColumns) {
      setSessionMaxColumns(baseScannerCount);
    }
  }, [baseScannerCount, sessionMaxColumns]);

  const actualScannerCount = baseScannerCount;
  const maxScannerNum = manualScannerCount !== null ? manualScannerCount : baseScannerCount;
  const scannersToShow = Array.from({ length: maxScannerNum }, (_, i) => i + 1);

  // Group scans by scanner and reverse so newest scan is on top row!
  const scansByScanner = scannersToShow.map(num =>
    filteredData.filter(item => getScannerNumber(item) === num).slice().reverse()
  );
  const maxRows = Math.max(...scansByScanner.map(arr => arr.length), 0);

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc" }}>
      <Header />
      <div style={{ padding: "0 32px 32px 32px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div>
            <h1 style={{ margin: 0, color: "#0f172a", fontWeight: 800, fontSize: "28px", letterSpacing: "-0.5px" }}><span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><ScrollIcon size={28} /> Live Audit</span></h1>
            <p style={{ margin: "4px 0 0 0", color: "#64748b", fontSize: "14px" }}>Start a new audit session to begin scanning.</p>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <Link to="/audit-history" className="btn btn-secondary" style={{ borderRadius: "20px", background: "#f1f5f9", color: "#334155", padding: "8px 16px", textDecoration: "none", fontWeight: 600 }}><span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><ClipboardIcon size={16} /> View Audit History</span></Link>
            {/* <Link to="/" className="btn btn-secondary" style={{ borderRadius: "20px" }}><span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><ArrowLeftIcon size={16} /> Back to Dashboard</span></Link> */}
          </div>
        </div>

        <div style={{ background: "#fff", padding: 20, borderRadius: 10, boxShadow: "0 2px 8px rgba(0,0,0,0.06)", marginBottom: 18 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 15, flexWrap: "wrap", gap: 10 }}>
            <div style={{ display: "flex", gap: 15, alignItems: "center", flex: 1 }}>
              <div style={{ minWidth: 250 }}>
                <Select
                  isMulti
                  options={barcodeOptions}
                  value={selectedBarcodes}
                  onChange={setSelectedBarcodes}
                  placeholder="Search Barcode"
                  styles={{ control: (base) => ({ ...base, minHeight: 38, borderRadius: 5 }) }}
                />
              </div>
              <button onClick={handleClearHistory} style={{ background: "#d32f2f", color: "#fff", border: "none", padding: "8px 14px", borderRadius: 6, cursor: "pointer", fontWeight: 700 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><TrashIcon size={16} /> Clear Scan History</span>
              </button>
            </div>

            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <select
                value={manualScannerCount || "auto"}
                onChange={(e) => setManualScannerCount(e.target.value === "auto" ? null : Number(e.target.value))}
                title="Select number of scanner columns"
                style={{
                  padding: "8px 14px",
                  borderRadius: 20,
                  border: "1px solid #cbd5e1",
                  background: "#f8fafc",
                  fontWeight: 700,
                  fontSize: 14,
                  color: "#1e293b",
                  cursor: "pointer",
                  outline: "none"
                }}
              >
                <option value="auto">Auto ({actualScannerCount} Active Scanners)</option>
                <option value={2}>2 Scanners</option>
                <option value={3}>3 Scanners</option>
                <option value={4}>4 Scanners</option>
                <option value={5}>5 Scanners</option>
                <option value={6}>6 Scanners</option>
                <option value={8}>8 Scanners</option>
              </select>
              <input
                type="file"
                accept=".xlsx,.xls"
                style={{ display: "none" }}
                ref={uploadAuditExcelRef}
                onChange={handleUploadAuditExcel}
              />
              <button
                onClick={() => uploadAuditExcelRef.current?.click()}
                style={{
                  background: "linear-gradient(180deg, #0284c7 0%, #0369a1 100%)",
                  color: "#fff",
                  border: "none",
                  padding: "10px 20px",
                  borderRadius: 20,
                  cursor: "pointer",
                  fontWeight: 700,
                  fontSize: 15
                }}
              >
                Upload Excel
              </button>
              <button
                onClick={handleStartAudit}
                disabled={!sessionLoaded || activeSession !== null}
                style={{
                  background: activeSession ? "#a5d6a7" : "linear-gradient(180deg, #66bb6a 0%, #43a047 100%)",
                  color: "#fff",
                  border: "none",
                  padding: "10px 20px",
                  borderRadius: 20,
                  cursor: (!sessionLoaded || activeSession) ? "not-allowed" : "pointer",
                  fontWeight: 700,
                  fontSize: 15,
                  opacity: (!sessionLoaded || activeSession) ? 0.6 : 1
                }}
              >
                {!sessionLoaded ? "Loading..." : activeSession ? "Audit Active" : "Start Audit"}
              </button>
              <button
                onClick={handleEndAuditClick}
                disabled={!activeSession}
                style={{
                  background: !activeSession ? "#ef9a9a" : "linear-gradient(180deg, #ef5350 0%, #d32f2f 100%)",
                  color: "#fff",
                  border: "none",
                  padding: "10px 20px",
                  borderRadius: 20,
                  cursor: !activeSession ? "not-allowed" : "pointer",
                  fontWeight: 700,
                  fontSize: 15,
                  opacity: !activeSession ? 0.6 : 1
                }}
              >
                End Audit
              </button>
            </div>
          </div>

          <div style={{ overflowX: "auto", width: "100%", borderRadius: 8 }}>
            {console.log("RENDERING TABLE, sessionScans length:", sessionScans.length, "maxRows:", maxRows, "filteredData length:", filteredData.length, "scannersToShow:", scannersToShow)}
            <table style={{ width: "100%", minWidth: `${Math.max(800, scannersToShow.length * 270)}px`, borderCollapse: "collapse", fontSize: 14, tableLayout: "fixed" }}>
              <thead>
                <tr style={{ background: "#f8f9fa", borderBottom: "2px solid #eee" }}>
                  {scannersToShow.map(num => {
                    const col = String.fromCharCode(64 + num);
                    const manualVal = manualInputs[col] || "";
                    const accentColor = SCANNER_COLORS[(num - 1) % SCANNER_COLORS.length];
                    return (
                      <th key={num} style={{ textAlign: "left", padding: "10px 12px", width: `${100 / scannersToShow.length}%` }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                          <span style={{ fontWeight: 700, color: accentColor }}>Scanner {num}</span>
                          <div style={{ display: "flex", gap: 6 }}>
                            <input
                              type="text"
                              value={manualVal}
                              onChange={e => setManualInputs(prev => ({ ...prev, [col]: e.target.value }))}
                              onKeyDown={e => e.key === "Enter" && handleManualAdd(col)}
                              placeholder={`Manual entry for ${col}...`}
                              disabled={!activeSession}
                              style={{
                                flex: 1, padding: "7px 10px", borderRadius: 8, border: `1px solid ${accentColor}40`,
                                fontSize: 13, outline: "none", background: !activeSession ? "#f1f5f9" : "#fff", fontFamily: "monospace"
                              }}
                            />
                            <button
                              onClick={() => handleManualAdd(col)}
                              disabled={!activeSession}
                              style={{
                                padding: "7px 14px", borderRadius: 8, background: !activeSession ? "#94a3b8" : accentColor,
                                color: "#fff", border: "none", cursor: !activeSession ? "not-allowed" : "pointer", fontWeight: 700, fontSize: 13
                              }}
                            >
                              Add
                            </button>
                          </div>
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {maxRows === 0 && (
                  <tr>
                    <td colSpan={scannersToShow.length} style={{ textAlign: "center", padding: 20, color: "#64748b" }}>
                      {!activeSession ? "Click 'Start Audit' to begin scanning." : "Ready to scan... awaiting barcodes."}
                    </td>
                  </tr>
                )}
                {Array.from({ length: maxRows }).map((_, rowIndex) => (
                  <tr key={rowIndex} style={{ borderBottom: "1px solid #eee" }}>
                    {scannersToShow.map((num, colIdx) => {
                      const item = scansByScanner[colIdx][rowIndex];
                      const color = SCANNER_COLORS[(num - 1) % SCANNER_COLORS.length];
                      return (
                        <td key={num} style={{ padding: "10px 12px", verticalAlign: "middle" }}>
                          {item && (
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                              <div style={{ display: "flex", flexDirection: "column" }}>
                                <span style={{ fontFamily: "monospace", fontWeight: 600, fontSize: 14, color }}>
                                  {item.barcode}
                                </span>
                                <span style={{ fontSize: 11, color: "#94a3b8", fontWeight: 400, marginTop: 2 }}>
                                  {new Date(item.timestamp).toLocaleString()}
                                </span>
                              </div>
                              <button
                                onClick={() => handleDeleteScan(item)}
                                title="Delete scan entry"
                                style={{
                                  background: "none",
                                  border: "none",
                                  cursor: "pointer",
                                  color: "#94a3b8",
                                  padding: 6,
                                  borderRadius: 6,
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  transition: "all 0.15s ease"
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.color = "#ef5350";
                                  e.currentTarget.style.background = "#fee2e2";
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.color = "#94a3b8";
                                  e.currentTarget.style.background = "none";
                                }}
                              >
                                <TrashIcon size={15} />
                              </button>
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* MODALS */}
      {showEndModal && (
        <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", background: "rgba(0,0,0,0.4)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000 }}>
          <div style={{ background: "#fff", borderRadius: 8, padding: 30, width: 400, textAlign: "center", boxShadow: "0 10px 25px rgba(0,0,0,0.2)", position: "relative" }}>
            <button onClick={() => setShowEndModal(false)} style={{ position: "absolute", top: 10, right: 10, background: "none", border: "none", cursor: "pointer", fontSize: 20, color: "#ef5350" }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="#ef5350"><path d="M12 2C6.47 2 2 6.47 2 12s4.47 10 10 10 10-4.47 10-10S17.53 2 12 2zm5 13.59L15.59 17 12 13.41 8.41 17 7 15.59 10.59 12 7 8.41 8.41 7 12 10.59 15.59 7 17 8.41 13.41 12 17 15.59z" /></svg>
            </button>
            <h2 style={{ margin: "20px 0 30px", fontSize: 22, color: "#1a1a2e" }}>Do You Want To Save?</h2>
            <div style={{ display: "flex", justifyContent: "center", gap: 20 }}>
              <button onClick={() => { setShowEndModal(false); setShowSaveModal(true); }} style={{ background: "#00b050", color: "#fff", border: "none", padding: "10px 40px", borderRadius: 6, fontSize: 18, cursor: "pointer", fontWeight: 600 }}>Yes</button>
              <button onClick={handleConfirmDiscard} style={{ background: "#f04e4e", color: "#fff", border: "none", padding: "10px 40px", borderRadius: 6, fontSize: 18, cursor: "pointer", fontWeight: 600 }}>No</button>
            </div>
          </div>
        </div>
      )}

      {showSaveModal && (
        <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", background: "rgba(0,0,0,0.4)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000 }}>
          <div style={{ background: "#fff", borderRadius: 8, width: 450, overflow: "hidden", boxShadow: "0 10px 25px rgba(0,0,0,0.2)" }}>
            <div style={{ background: "#1f295c", padding: "15px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ margin: 0, color: "#fff", fontSize: 18, fontWeight: 500, textAlign: "center", flex: 1 }}>Save As</h3>
              <button onClick={() => setShowSaveModal(false)} style={{ background: "none", border: "none", cursor: "pointer" }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="#fff"><path d="M12 2C6.47 2 2 6.47 2 12s4.47 10 10 10 10-4.47 10-10S17.53 2 12 2zm5 13.59L15.59 17 12 13.41 8.41 17 7 15.59 10.59 12 7 8.41 8.41 7 12 10.59 15.59 7 17 8.41 13.41 12 17 15.59z" /></svg>
              </button>
            </div>
            <div style={{ padding: 30 }}>
              <label style={{ display: "block", marginBottom: 10, fontSize: 16, color: "#333", fontWeight: 500 }}>List Name</label>
              <input type="text" value={auditName} onChange={e => setAuditName(e.target.value)} placeholder="List 1" style={{ width: "100%", padding: "12px 15px", borderRadius: 6, border: "1px solid #e0e0e0", fontSize: 16, background: "#f8f9fa", boxSizing: "border-box", marginBottom: 30 }} />
              <div style={{ textAlign: "center" }}>
                <button onClick={handleConfirmSave} style={{ background: "#00b050", color: "#fff", border: "none", padding: "10px 40px", borderRadius: 6, fontSize: 18, cursor: "pointer", fontWeight: 600 }}>Save</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// --- AUDIT HISTORY COMPONENT ---
function AuditHistory() {
  const [audits, setAudits] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE_URL}/audit-sessions`)
      .then(res => res.json())
      .then(data => {
        setAudits(data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this audit?")) {
      await fetch(`${API_BASE_URL}/audit-sessions/${id}`, { method: 'DELETE' });
      setAudits(audits.filter(a => a._id !== id));
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc" }}>
      <Header />
      <div style={{ padding: "0 32px 32px 32px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div>
            <h1 style={{ margin: 0, color: "#0f172a", fontWeight: 800, fontSize: "28px", letterSpacing: "-0.5px" }}><span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><FolderIcon size={28} /> Audit History</span></h1>
            <p style={{ margin: "4px 0 0 0", color: "#64748b", fontSize: "14px" }}>View all previously saved audits.</p>
          </div>
          <Link to="/" className="btn btn-secondary" style={{ borderRadius: "20px" }}><span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><ArrowLeftIcon size={16} /> Back to Live Audit</span></Link>
        </div>

        <div style={{ background: "#fff", padding: 20, borderRadius: 10, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
          {loading ? <p>Loading...</p> : audits.length === 0 ? <p>No saved audits found.</p> : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
              <thead>
                <tr style={{ background: "#f8f9fa", borderBottom: "2px solid #eee", textAlign: "left" }}>
                  <th style={{ padding: 12, color: "#334155" }}>Audit Name</th>
                  <th style={{ padding: 12, color: "#334155" }}>Start Time</th>
                  <th style={{ padding: 12, color: "#334155" }}>End Time</th>
                  <th style={{ padding: 12, color: "#334155" }}>Total Qty</th>
                  <th style={{ padding: 12, color: "#334155" }}>Status</th>
                  <th style={{ padding: 12, textAlign: "center", color: "#334155" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {audits.map(audit => (
                  <tr key={audit._id} style={{ borderBottom: "1px solid #eee" }}>
                    <td style={{ padding: 12, fontWeight: 600, color: "#1565c0" }}>{audit.name || audit.auditId}</td>
                    <td style={{ padding: 12, color: "#475569" }}>{new Date(audit.startTime).toLocaleString()}</td>
                    <td style={{ padding: 12, color: "#475569" }}>{audit.endTime ? new Date(audit.endTime).toLocaleString() : "-"}</td>
                    <td style={{ padding: 12, fontWeight: 600, color: "#0f172a" }}>{audit.totalScannedItems}</td>
                    <td style={{ padding: 12 }}>
                      <span style={{ background: "#dcfce7", color: "#166534", padding: "4px 10px", borderRadius: 12, fontSize: 12, fontWeight: 700 }}>
                        {audit.status.toUpperCase()}
                      </span>
                    </td>
                    <td style={{ padding: 12, textAlign: "center" }}>
                      <Link to="/audit-details" state={{ id: audit._id }} style={{ background: "#e0f2fe", color: "#0284c7", border: "none", padding: "6px 12px", borderRadius: 4, cursor: "pointer", fontSize: 12, fontWeight: 600, textDecoration: "none", marginRight: 8, display: "inline-block" }}>View</Link>
                      <Link to="/audit" state={{ auditId: audit._id }} style={{ background: "#fef08a", color: "#854d0e", border: "none", padding: "6px 12px", borderRadius: 4, cursor: "pointer", fontSize: 12, fontWeight: 600, textDecoration: "none", marginRight: 8, display: "inline-block" }}>Compare</Link>
                      <button onClick={() => handleDelete(audit._id)} style={{ background: "#fee2e2", color: "#991b1b", border: "none", padding: "6px 12px", borderRadius: 4, cursor: "pointer", fontSize: 12, fontWeight: 600 }}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

// --- AUDIT DETAILS COMPONENT ---
function AuditDetails() {
  const location = useLocation();
  const navigate = useNavigate();
  const [audit, setAudit] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!location.state?.id) {
      navigate('/audit-history');
      return;
    }
    fetch(`${API_BASE_URL}/audit-sessions/${location.state.id}`)
      .then(res => res.json())
      .then(data => {
        setAudit(data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, [location, navigate]);

  if (loading) return <div style={{ padding: 40, textAlign: "center" }}>Loading audit details...</div>;
  if (!audit) return <div style={{ padding: 40, textAlign: "center" }}>Audit not found.</div>;

  const scans = audit.scans || [];

  const SCANNER_COLORS = ["#1565c0", "#6a1b9a", "#00796b", "#d81b60", "#f57c00", "#388e3c", "#5d4037", "#455a64"];

  // Scanner Column Mapping & Sorting for AuditDetails
  const getScannerNumber = (item) => {
    if (!item) return 1;
    let rawId = "1";
    if (typeof item === 'object' && item.scanner !== undefined && item.scanner !== null) {
      rawId = String(item.scanner);
    }
    const match = rawId.match(/(\d+)/);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > 0) return num;
    }
    return 1;
  };

  const activeScannerNums = new Set();
  scans.forEach(item => {
    activeScannerNums.add(getScannerNumber(item));
  });

  const maxScannerNum = Math.max(1, ...Array.from(activeScannerNums));
  const scannersToShow = Array.from({ length: maxScannerNum }, (_, i) => i + 1);

  // Group scans by scanner and reverse so newest scan is on top row!
  const scansByScanner = scannersToShow.map(num =>
    scans.filter(item => getScannerNumber(item) === num).slice().reverse()
  );
  const maxRows = Math.max(...scansByScanner.map(arr => arr.length), 0);

  const handleDeleteAuditDetailScan = async (itemToDelete) => {
    const updatedScans = scans.filter(item => item !== itemToDelete && !(item.barcode === itemToDelete.barcode && new Date(item.timestamp).getTime() === new Date(itemToDelete.timestamp).getTime()));
    setAudit(prev => ({ ...prev, scans: updatedScans }));

    try {
      await fetch(`${API_BASE_URL}/audit-sessions/${audit._id}/scans`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scans: updatedScans })
      });
    } catch (err) {
      console.error("Failed to delete scan in AuditDetails:", err);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc" }}>
      <Header />
      <div style={{ padding: "0 32px 32px 32px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div>
            <h1 style={{ margin: 0, color: "#0f172a", fontWeight: 800, fontSize: "28px", letterSpacing: "-0.5px" }}><span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><SearchIcon size={28} /> Audit Details: {audit.name || audit.auditId}</span></h1>
            <p style={{ margin: "4px 0 0 0", color: "#64748b", fontSize: "14px" }}>
              Started: {new Date(audit.startTime).toLocaleString()} | Ended: {audit.endTime ? new Date(audit.endTime).toLocaleString() : "N/A"}
            </p>
          </div>
          <Link to="/audit-history" className="btn btn-secondary" style={{ borderRadius: "20px" }}><span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><ArrowLeftIcon size={16} /> Back to History</span></Link>
        </div>

        <div style={{ background: "#fff", padding: 20, borderRadius: 10, boxShadow: "0 2px 8px rgba(0,0,0,0.06)", marginBottom: 18 }}>
          <div style={{ overflowX: "auto", width: "100%", borderRadius: 8 }}>
            <table style={{ width: "100%", minWidth: `${Math.max(800, scannersToShow.length * 270)}px`, borderCollapse: "collapse", fontSize: 14, tableLayout: "fixed" }}>
              <thead>
                <tr style={{ background: "#f8f9fa", borderBottom: "2px solid #eee" }}>
                  {scannersToShow.map((num, colIdx) => {
                    const accentColor = SCANNER_COLORS[(num - 1) % SCANNER_COLORS.length];
                    return (
                      <th key={num} style={{ textAlign: "left", padding: "12px", width: `${100 / scannersToShow.length}%` }}>
                        <span style={{ fontWeight: 700, color: accentColor }}>Scanner {num} ({scansByScanner[colIdx]?.length || 0} items)</span>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {maxRows === 0 && (
                  <tr>
                    <td colSpan={scannersToShow.length} style={{ textAlign: "center", padding: 20, color: "#64748b" }}>
                      No scans recorded in this session.
                    </td>
                  </tr>
                )}
                {Array.from({ length: maxRows }).map((_, rowIndex) => (
                  <tr key={rowIndex} style={{ borderBottom: "1px solid #eee" }}>
                    {scannersToShow.map((num, colIdx) => {
                      const item = scansByScanner[colIdx][rowIndex];
                      const color = SCANNER_COLORS[(num - 1) % SCANNER_COLORS.length];
                      return (
                        <td key={num} style={{ padding: "10px 12px", verticalAlign: "middle" }}>
                          {item && (
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                              <div style={{ display: "flex", flexDirection: "column" }}>
                                <span style={{ fontFamily: "monospace", fontWeight: 600, fontSize: 14, color }}>
                                  {item.barcode}
                                </span>
                                <span style={{ fontSize: 11, color: "#94a3b8", fontWeight: 400, marginTop: 2 }}>
                                  {new Date(item.timestamp).toLocaleString()}
                                </span>
                              </div>
                              <button
                                onClick={() => handleDeleteAuditDetailScan(item)}
                                title="Delete scan entry"
                                style={{
                                  background: "none",
                                  border: "none",
                                  cursor: "pointer",
                                  color: "#94a3b8",
                                  padding: 6,
                                  borderRadius: 6,
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  transition: "all 0.15s ease"
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.color = "#ef5350";
                                  e.currentTarget.style.background = "#fee2e2";
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.color = "#94a3b8";
                                  e.currentTarget.style.background = "none";
                                }}
                              >
                                <TrashIcon size={15} />
                              </button>
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- PRODUCT MANAGEMENT COMPONENT ---
function ProductManagement() {
  const [products, setProducts] = useState([]);
  const [selectedBarcodes, setSelectedBarcodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formVisible, setFormVisible] = useState(false);
  const [formData, setFormData] = useState({
    barcode: "",
    productName: "",
    mrp: "",
    physicalQuantity: ""
  });

  const importProductsRef = useRef(null);
  const importSalesRef = useRef(null);
  const receivedStockRef = useRef(null);
  const testerDamageRef = useRef(null);
  const shrinkageRef = useRef(null);

  const handleImportProducts = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setLoading(true);
      const parsedRows = await parseExcelFile(file, "products");

      const response = await fetch(`${API_BASE_URL}/products/import`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ products: parsedRows })
      });

      const resData = await response.json();
      if (response.ok) {
        alert(resData.message || "Products imported successfully!");
        await fetchProducts();
      } else {
        alert(resData.error || "Failed to import products.");
      }
    } catch (err) {
      console.error(err);
      alert("Error reading/importing Excel file: " + err.message);
    } finally {
      setLoading(false);
      e.target.value = ""; // Reset file input
    }
  };

  const handleImportSales = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setLoading(true);
      const parsedRows = await parseExcelFile(file, "sales");

      const response = await fetch(`${API_BASE_URL}/sales/import`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sales: parsedRows })
      });

      const resData = await response.json();
      if (response.ok) {
        let alertMsg = resData.message || "Sales imported successfully!";
        if (resData.warnings && resData.warnings.length > 0) {
          alertMsg += "\n\nWarnings:\n" + resData.warnings.join("\n");
        }
        alert(alertMsg);
        await fetchProducts();
      } else {
        alert(resData.error || "Failed to import sales.");
      }
    } catch (err) {
      console.error(err);
      alert("Error reading/importing Excel file: " + err.message);
    } finally {
      setLoading(false);
      e.target.value = ""; // Reset file input
    }
  };

  const handleImportTesterDamage = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setLoading(true);
      const parsedRows = await parseExcelFile(file, "testerDamage");

      const response = await fetch(`${API_BASE_URL}/tester-damage/import`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ testerDamage: parsedRows })
      });

      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        const resData = await response.json();
        if (response.ok) {
          let alertMsg = resData.message || "Tester/Damage records imported successfully!";
          if (resData.warnings && resData.warnings.length > 0) {
            alertMsg += "\n\nWarnings:\n" + resData.warnings.join("\n");
          }
          alert(alertMsg);
          await fetchProducts();
        } else {
          alert(resData.error || "Failed to import Tester/Damage records.");
        }
      } else {
        const rawText = await response.text();
        console.error("Non-JSON Server response:", rawText);
        alert(`Server error (${response.status}): Please make sure the backend server is running and updated.`);
      }
    } catch (err) {
      console.error(err);
      alert("Error reading/importing Excel file: " + err.message);
    } finally {
      setLoading(false);
      e.target.value = ""; // Reset file input
    }
  };

  const handleImportShrinkage = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setLoading(true);
      const parsedRows = await parseExcelFile(file, "shrinkage");

      const response = await fetch(`${API_BASE_URL}/shrinkage/import`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shrinkage: parsedRows })
      });

      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        const resData = await response.json();
        if (response.ok) {
          let alertMsg = resData.message || "Shrinkage records imported successfully!";
          if (resData.warnings && resData.warnings.length > 0) {
            alertMsg += "\n\nWarnings:\n" + resData.warnings.join("\n");
          }
          alert(alertMsg);
          await fetchProducts();
        } else {
          alert(resData.error || "Failed to import shrinkage records.");
        }
      } else {
        const rawText = await response.text();
        console.error("Non-JSON Server response:", rawText);
        alert(`Server error (${response.status}): Please make sure the backend server is running and updated.`);
      }
    } catch (err) {
      console.error(err);
      alert("Error reading/importing Excel file: " + err.message);
    } finally {
      setLoading(false);
      e.target.value = ""; // Reset file input
    }
  };

  const handleReceivedStock = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setLoading(true);
      const parsedRows = await parseExcelFile(file, "products");

      const response = await fetch(`${API_BASE_URL}/products/received-stock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ products: parsedRows })
      });

      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        const resData = await response.json();
        if (response.ok) {
          alert(resData.message || "Received stock processed successfully!");
          await fetchProducts();
        } else {
          alert(resData.error || "Failed to import received stock.");
        }
      } else {
        const rawText = await response.text();
        console.error("Non-JSON Server response:", rawText);
        alert(`Server error (${response.status}): Please restart the backend server so the new API route is loaded.`);
      }
    } catch (err) {
      console.error(err);
      alert("Error reading/importing Received Stock Excel file: " + err.message);
    } finally {
      setLoading(false);
      e.target.value = ""; // Reset file input
    }
  };

  const handleExportProducts = async () => {
    try {
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet("Products Inventory");

      const headers = ["Barcode", "Product Name", "MRP (₹)", "System Qty"];
      sheet.addRow(headers);

      const headerRow = sheet.getRow(1);
      headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
      headerRow.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF2E7D32" } // Green background
      };
      headerRow.alignment = { vertical: "middle", horizontal: "center" };

      products.forEach(p => {
        sheet.addRow([
          p.barcode,
          p.productName,
          p.mrp,
          p.physicalQuantity
        ]);
      });

      sheet.columns.forEach((column) => {
        column.width = 15;
      });
      sheet.getColumn(2).width = 30; // Make Product Name wider

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      saveAs(blob, `Product_Inventory_${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch (err) {
      console.error(err);
      alert("Error exporting products list: " + err.message);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/products`);
      const data = await response.json();
      if (response.status === 400 && data && data.error === "SHOP_REQUIRED") {
        setActiveShop(null);
        window.location.reload();
        return;
      }
      setProducts(Array.isArray(data) ? data : []);
      setLoading(false);
    } catch (err) {
      console.error("Error fetching products:", err);
      setProducts([]);
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.barcode.trim() || !formData.productName.trim()) {
      alert("Barcode and Product Name are required");
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/products`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          barcode: formData.barcode,
          productName: formData.productName,
          mrp: parseFloat(formData.mrp) || 0,
          physicalQuantity: parseInt(formData.physicalQuantity) || 0
        })
      });

      if (response.ok) {
        setFormData({ barcode: "", productName: "", mrp: "", physicalQuantity: "" });
        setFormVisible(false);
        await fetchProducts();
      } else {
        alert("Failed to save product");
      }
    } catch (err) {
      console.error("Error saving product:", err);
      alert("Error saving product");
    }
  };

  const handleEdit = (product) => {
    setFormData({
      barcode: product.barcode,
      productName: product.productName,
      mrp: product.mrp,
      physicalQuantity: product.physicalQuantity
    });
    setFormVisible(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this product?")) return;
    try {
      const response = await fetch(`${API_BASE_URL}/products/${id}`, {
        method: "DELETE"
      });
      if (response.ok) {
        await fetchProducts();
      } else {
        alert("Failed to delete product");
      }
    } catch (err) {
      console.error("Error deleting product:", err);
      alert("Error deleting product");
    }
  };

  const safeProducts = Array.isArray(products) ? products : [];
  const overallProductQty = safeProducts.length;
  const totalProductQty = safeProducts.reduce((acc, p) => acc + (Number(p.physicalQuantity) || 0), 0);
  const totalAmount = safeProducts.reduce((acc, p) => acc + ((Number(p.mrp) || 0) * (Number(p.physicalQuantity) || 0)), 0);

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc" }}>
      <Header />
      <div style={{ padding: "0 32px 32px 32px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div>
            <h1 style={{ margin: 0, color: "#0f172a", fontWeight: 800, fontSize: "28px", letterSpacing: "-0.5px" }}><span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><ClipboardIcon size={28} /> Master Stock</span></h1>
            <p style={{ margin: "4px 0 0 0", color: "#64748b", fontSize: "14px" }}>Manage your products, import from Excel, and export data.</p>
          </div>
        </div>

        <div style={{ display: "flex", marginBottom: "20px", justifyContent: "space-between" }}>
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            {/* {!formVisible && (
            <button
              onClick={() => setFormVisible(true)}
              className="btn btn-success"
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><PlusIcon size={16} /> Add New Product</span>
            </button>
          )} */}

            {/* <input
            type="file"
            accept=".xlsx, .xls"
            style={{ display: "none" }}
            ref={importProductsRef}
            onChange={handleImportProducts}
          />
          <button
            className="btn btn-primary"
            onClick={() => importProductsRef.current.click()}
            disabled={loading}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><DownloadIcon size={16} /> Import Products</span>
          </button> */}



            <input
              type="file"
              accept=".xlsx, .xls"
              style={{ display: "none" }}
              ref={receivedStockRef}
              onChange={handleReceivedStock}
            />
            <button
              className="btn"
              style={{ background: "#0284c7", color: "#fff" }}
              onClick={() => receivedStockRef.current.click()}
              disabled={loading}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><PlusIcon size={16} /> Stock Inward</span>
            </button>

            <input
              type="file"
              accept=".xlsx, .xls"
              style={{ display: "none" }}
              ref={importSalesRef}
              onChange={handleImportSales}
            />
            <button
              className="btn"
              style={{ background: "#f59e0b", color: "#fff" }}
              onClick={() => importSalesRef.current.click()}
              disabled={loading}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><TrendingDownIcon size={16} /> Import Sales</span>
            </button>

            <input
              type="file"
              accept=".xlsx, .xls"
              style={{ display: "none" }}
              ref={testerDamageRef}
              onChange={handleImportTesterDamage}
            />
            <button
              className="btn"
              style={{ background: "#e11d48", color: "#fff" }}
              onClick={() => testerDamageRef.current.click()}
              disabled={loading}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><TrendingDownIcon size={16} /> Tester/ Damage</span>
            </button>

            <input
              type="file"
              accept=".xlsx, .xls"
              style={{ display: "none" }}
              ref={shrinkageRef}
              onChange={handleImportShrinkage}
            />
            <button
              className="btn"
              style={{ background: "#475569", color: "#fff" }}
              onClick={() => shrinkageRef.current.click()}
              disabled={loading}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><TrendingDownIcon size={16} /> Shrinkage</span>
            </button>
          </div>
          <div>
            <button
              className="btn"
              style={{ background: "#2e7d32", color: "#fff" }}
              onClick={handleExportProducts}
              disabled={loading || products.length === 0}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><UploadIcon size={16} /> Export Excel</span>
            </button>
          </div>
        </div>

        {formVisible && (
          <div style={{ background: "#fff", padding: 20, borderRadius: 10, boxShadow: "0 2px 8px rgba(0,0,0,0.06)", marginBottom: 20, maxWidth: 600 }}>
            <h2 style={{ margin: "0 0 16px", color: "#1a1a2e" }}>Add/Update Product</h2>
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "block", marginBottom: 6, fontWeight: 600, color: "#333" }}>Barcode *</label>
                <input
                  type="text"
                  value={formData.barcode}
                  onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                  placeholder="Enter barcode"
                  style={{ width: "100%", padding: "10px 12px", borderRadius: 5, border: "1px solid #ddd", fontSize: 14, boxSizing: "border-box" }}
                />
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "block", marginBottom: 6, fontWeight: 600, color: "#333" }}>Product Name *</label>
                <input
                  type="text"
                  value={formData.productName}
                  onChange={(e) => setFormData({ ...formData, productName: e.target.value })}
                  placeholder="Enter product name"
                  style={{ width: "100%", padding: "10px 12px", borderRadius: 5, border: "1px solid #ddd", fontSize: 14, boxSizing: "border-box" }}
                />
              </div>
              <div style={{ marginBottom: 16, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={{ display: "block", marginBottom: 6, fontWeight: 600, color: "#333" }}>MRP</label>
                  <input
                    type="number"
                    value={formData.mrp}
                    onChange={(e) => setFormData({ ...formData, mrp: e.target.value })}
                    placeholder="0"
                    style={{ width: "100%", padding: "10px 12px", borderRadius: 5, border: "1px solid #ddd", fontSize: 14, boxSizing: "border-box" }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", marginBottom: 6, fontWeight: 600, color: "#333" }}>Physical Quantity</label>
                  <input
                    type="number"
                    value={formData.physicalQuantity}
                    onChange={(e) => setFormData({ ...formData, physicalQuantity: e.target.value })}
                    placeholder="0"
                    style={{ width: "100%", padding: "10px 12px", borderRadius: 5, border: "1px solid #ddd", fontSize: 14, boxSizing: "border-box" }}
                  />
                </div>
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <button
                  type="submit"
                  style={{ flex: 1, padding: "10px", borderRadius: 5, background: "#2e7d32", color: "#fff", border: "none", cursor: "pointer", fontWeight: 600 }}
                >
                  💾 Save Product
                </button>
                <button
                  type="button"
                  onClick={() => setFormVisible(false)}
                  style={{ flex: 1, padding: "10px", borderRadius: 5, background: "#ccc", color: "#333", border: "none", cursor: "pointer", fontWeight: 600 }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        <div style={{ background: "#fff", padding: 20, borderRadius: 10, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h2 style={{ margin: 0, color: "#1a1a2e" }}>All Products</h2>
            <div style={{ width: '400px' }}>
              <Select
                isMulti
                options={products.map(p => ({ value: p.barcode, label: `${p.barcode} - ${p.productName}` }))}
                value={selectedBarcodes}
                onChange={setSelectedBarcodes}
                placeholder="Search and select barcodes..."
                styles={{
                  control: (base) => ({ ...base, borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: 'none', fontSize: '14px' })
                }}
              />
            </div>
          </div>

          {/* Summary Cards */}
          <div style={{ display: "flex", gap: "10px", marginBottom: "20px", flexWrap: "wrap" }}>
            {/* Card 1: Overall Product Count */}
            <div style={{
              background: "linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)",
              border: "1px solid #bfdbfe",
              borderRadius: "8px",
              padding: "10px 16px",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              boxShadow: "0 1px 2px rgba(0, 0, 0, 0.05)",
              transition: "transform 0.15s ease",
              cursor: "default"
            }}
              onMouseEnter={(e) => e.currentTarget.style.transform = "translateY(-1px)"}
              onMouseLeave={(e) => e.currentTarget.style.transform = "translateY(0px)"}
            >
              <span style={{ fontSize: "14px", color: "#1e3a8a", fontWeight: 600 }}>Overall Product Count:</span>
              <span style={{ fontSize: "15px", fontWeight: 800, color: "#1e3a8a" }}>{overallProductQty}</span>
            </div>

            {/* Card 2: Total Product Quantity */}
            <div style={{
              background: "linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)",
              border: "1px solid #bbf7d0",
              borderRadius: "8px",
              padding: "10px 16px",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              boxShadow: "0 1px 2px rgba(0, 0, 0, 0.05)",
              transition: "transform 0.15s ease",
              cursor: "default"
            }}
              onMouseEnter={(e) => e.currentTarget.style.transform = "translateY(-1px)"}
              onMouseLeave={(e) => e.currentTarget.style.transform = "translateY(0px)"}
            >
              <span style={{ fontSize: "14px", color: "#14532d", fontWeight: 600 }}>Total Product Quantity:</span>
              <span style={{ fontSize: "15px", fontWeight: 800, color: "#14532d" }}>{totalProductQty}</span>
            </div>

            {/* Card 3: Total Amount */}
            <div style={{
              background: "linear-gradient(135deg, #faf5ff 0%, #f3e8ff 100%)",
              border: "1px solid #e9d5ff",
              borderRadius: "8px",
              padding: "10px 16px",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              boxShadow: "0 1px 2px rgba(0, 0, 0, 0.05)",
              transition: "transform 0.15s ease",
              cursor: "default"
            }}
              onMouseEnter={(e) => e.currentTarget.style.transform = "translateY(-1px)"}
              onMouseLeave={(e) => e.currentTarget.style.transform = "translateY(0px)"}
            >
              <span style={{ fontSize: "14px", color: "#581c87", fontWeight: 600 }}>Total Amount:</span>
              <span style={{ fontSize: "15px", fontWeight: 800, color: "#581c87" }}>₹{totalAmount.toLocaleString('en-IN')}</span>
            </div>
          </div>

          {loading ? (
            <p>Loading products...</p>
          ) : products.length === 0 ? (
            <p style={{ color: "#bbb" }}>No products added yet</p>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
              <thead>
                <tr style={{ background: "#f8f9fa", borderBottom: "2px solid #eee" }}>
                  <th style={{ textAlign: "left", padding: 12, fontWeight: 700 }}>Barcode</th>
                  <th style={{ textAlign: "left", padding: 12, fontWeight: 700 }}>Product Name</th>
                  <th style={{ textAlign: "center", padding: 12, fontWeight: 700 }}>System Quantity</th>
                  <th style={{ textAlign: "center", padding: 12, fontWeight: 700 }}>MRP</th>
                  {/* <th style={{ textAlign: "center", padding: 12, fontWeight: 700 }}>Actions</th> */}
                </tr>
              </thead>
              <tbody>
                {(selectedBarcodes.length > 0 ? products.filter(p => selectedBarcodes.find(sel => sel.value === p.barcode)) : products).map((product) => (
                  <tr key={product._id} style={{ borderBottom: "1px solid #eee" }}>
                    <td style={{ padding: 12, fontFamily: "monospace", fontWeight: 600 }}>{product.barcode}</td>
                    <td style={{ padding: 12 }}>{product.productName}</td>
                    <td style={{ textAlign: "center", padding: 12, fontWeight: 600 }}>{product.physicalQuantity}</td>
                    <td style={{ textAlign: "center", padding: 12 }}>₹{product.mrp}</td>
                    {/* <td style={{ textAlign: "center", padding: 12 }}>
                      <button
                        onClick={() => handleEdit(product)}
                        style={{ background: "#e0f2fe", color: "#0284c7", border: "none", padding: "6px 12px", borderRadius: 4, cursor: "pointer", fontSize: 12, fontWeight: 600, marginRight: 8 }}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(product._id)}
                        style={{ background: "#fee2e2", color: "#991b1b", border: "none", padding: "6px 12px", borderRadius: 4, cursor: "pointer", fontSize: 12, fontWeight: 600 }}
                      >
                        Delete
                      </button>
                    </td> */}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

// --- AUDIT SCANNING COMPONENT ---
function AuditScanning() {
  const navigate = useNavigate();
  const location = useLocation();
  const compareAuditId = location.state?.auditId;
  const [scanCount, setScanCount] = useState({});
  const [totalScans, setTotalScans] = useState(0);
  const [products, setProducts] = useState([]);
  const [selectedProducts, setSelectedProducts] = useState(new Set());
  const [auditTitle, setAuditTitle] = useState("Global Audit Dashboard");

  // Fetch all master products so we can display them during the audit
  useEffect(() => {
    fetch(`${API_BASE_URL}/products`)
      .then(res => res.json())
      .then(data => setProducts(data))
      .catch(err => console.error("Error fetching products:", err));

    if (compareAuditId) {
      fetch(`${API_BASE_URL}/audit-sessions/${compareAuditId}`)
        .then(res => res.json())
        .then(data => {
          setAuditTitle(`Audit Comparison: ${data.name || data.auditId}`);
          const counts = {};
          let total = 0;
          (data.scans || []).forEach(scan => {
            counts[scan.barcode] = (counts[scan.barcode] || 0) + 1;
            total++;
          });
          setScanCount(counts);
          setTotalScans(total);
        })
        .catch(err => console.error("Error fetching session:", err));
    } else {
      // Fetch live grand totals
      fetch(`${API_BASE_URL}/audit/totals`)
        .then(res => res.json())
        .then(data => {
          setScanCount(data);
          const total = Object.values(data).reduce((acc, val) => acc + val, 0);
          setTotalScans(total);
        })
        .catch(err => console.error("Error fetching totals:", err));
    }
  }, [compareAuditId]);

  useEffect(() => {
    if (compareAuditId) return; // Do not connect WS if we are just comparing an old session
    const ws = new WebSocket(`ws://16.16.123.89:8080`);
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.source === "serial") {
          handleScan(data.value, false); // Hardware scan, do NOT hit API from UI
        }
      } catch (e) { }
    };
    return () => ws.close();
  }, [compareAuditId]);

  const handleScan = async (scannedCode, isManual = false) => {
    const code = (typeof scannedCode === 'string' ? scannedCode : "").trim();
    if (!code) return;

    if (isManual) {
      try {
        await fetch(`${API_BASE_URL}/barcode`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ barcode: code, scanner: "Web UI" })
        });
      } catch (err) {
        console.error("Error recording manual scan:", err);
      }
    }

    setScanCount((prev) => ({
      ...prev,
      [code]: (prev[code] || 0) + 1
    }));
    setTotalScans((prev) => prev + 1);
  };

  const handleRecordSelected = async () => {
    if (selectedProducts.size === 0) return;

    // Process all selected products manually
    for (const barcode of selectedProducts) {
      await handleScan(barcode, true);
    }

    // Clear selection after recording
    setSelectedProducts(new Set());
  };

  const toggleSelection = (barcode) => {
    setSelectedProducts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(barcode)) newSet.delete(barcode);
      else newSet.add(barcode);
      return newSet;
    });
  };

  const isAllSelected = products.length > 0 && products.every(p => selectedProducts.has(p.barcode));

  const handleSelectAll = (e) => {
    e.stopPropagation();
    if (isAllSelected) {
      setSelectedProducts(prev => {
        const newSet = new Set(prev);
        products.forEach(p => newSet.delete(p.barcode));
        return newSet;
      });
    } else {
      setSelectedProducts(prev => {
        const newSet = new Set(prev);
        products.forEach(p => newSet.add(p.barcode));
        return newSet;
      });
    }
  };

  const completeAudit = () => {
    const auditIdToPass = compareAuditId || (activeSession ? activeSession._id : null);
    navigate("/reconciliation", { state: { selectedBarcodes: Array.from(selectedProducts), auditId: auditIdToPass } });
  };

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc" }}>
      <Header />
      <div style={{ padding: "0 32px 32px 32px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div>
            <h1 style={{ margin: 0, color: "#0f172a", fontWeight: 800, fontSize: "28px", letterSpacing: "-0.5px" }}><span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><BoxIcon size={28} /> Inventory Audit - Barcode Scanning</span></h1>
            <p style={{ margin: "4px 0 0 0", color: "#64748b", fontSize: "14px" }}>Scan barcodes to verify inventory levels.</p>
          </div>
        </div>

        <div>
          <div style={{ background: "#fff", padding: 20, borderRadius: 10, boxShadow: "0 2px 8px rgba(0,0,0,0.06)", marginBottom: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 15 }}>
              <div>
                <h2 style={{ margin: 0, color: "#1a1a2e", fontSize: 18 }}>{auditTitle}</h2>
                <p style={{ margin: "6px 0 0", color: "#666", fontSize: 13 }}>{compareAuditId ? "Comparing historical audit counts vs master products" : "Live running totals from all scanners"}</p>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 28, fontWeight: 700, color: "#2e7d32" }}>{totalScans}</div>
                <div style={{ fontSize: 13, color: "#666" }}>Total Scans (All Time)</div>
              </div>
            </div>

            <hr style={{ border: "none", borderTop: "1px solid #eee", marginBottom: 20 }} />

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <h3 style={{ margin: 0, color: "#1a1a2e", fontSize: 16 }}>Audit Progress</h3>
              {/* <button
                onClick={handleRecordSelected}
                disabled={selectedProducts.size === 0}
                style={{
                  padding: "8px 16px", borderRadius: 5, background: selectedProducts.size > 0 ? "#1565c0" : "#ccc",
                  color: "#fff", border: "none", cursor: selectedProducts.size > 0 ? "pointer" : "not-allowed",
                  fontWeight: 600, fontSize: 13
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><DownloadIcon size={16} /> Record Selected Scans ({selectedProducts.size})</span>
              </button> */}
            </div>

            <div style={{ maxHeight: 400, overflowY: "auto", border: "1px solid #eee", borderRadius: 8 }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                <thead style={{ position: "sticky", top: 0, zIndex: 1 }}>
                  <tr style={{ background: "#f8f9fa", borderBottom: "2px solid #ddd", textAlign: "left" }}>
                    <th style={{ padding: "10px 12px", width: "40px", textAlign: "center" }}>
                      <input
                        type="checkbox"
                        checked={isAllSelected}
                        onChange={handleSelectAll}
                        style={{ cursor: "pointer", width: 16, height: 16 }}
                      />
                    </th>
                    <th style={{ padding: "10px 12px" }}>Product Name</th>
                    <th style={{ padding: "10px 12px" }}>Barcode</th>
                    <th style={{ padding: "10px 12px", textAlign: "center" }}>System Quantity</th>
                    <th style={{ padding: "10px 12px", textAlign: "center" }}>Physical Quantity</th>
                  </tr>
                </thead>
                <tbody>
                  {products.length === 0 && Object.keys(scanCount).length === 0 ? (
                    <tr>
                      <td colSpan="4" style={{ padding: 20, textAlign: "center", color: "#999", fontStyle: "italic" }}>No products in master data. Start scanning!</td>
                    </tr>
                  ) : null}

                  {products.map(p => {
                    const scanned = scanCount[p.barcode] || 0;
                    const isComplete = scanned === p.physicalQuantity;
                    const isOver = scanned > p.physicalQuantity;
                    const isSelected = selectedProducts.has(p.barcode);

                    return (
                      <tr key={p.barcode} onClick={() => toggleSelection(p.barcode)} style={{ borderBottom: "1px solid #eee", background: isSelected ? "#e3f2fd" : isComplete ? "#e8f5e9" : isOver ? "#ffebee" : "#fff", cursor: "pointer" }}>
                        <td style={{ padding: "10px 12px", textAlign: "center" }}>
                          <input type="checkbox" checked={isSelected} readOnly style={{ cursor: "pointer", width: 16, height: 16 }} />
                        </td>
                        <td style={{ padding: "10px 12px", fontWeight: 600, color: "#333" }}>
                          {isComplete && <span style={{ marginRight: 8 }}>✅</span>}
                          {isOver && <span style={{ marginRight: 8 }}>⚠️</span>}
                          {p.productName}
                        </td>
                        <td style={{ padding: "10px 12px", fontFamily: "monospace", color: "#666" }}>{p.barcode}</td>
                        <td style={{ padding: "10px 12px", textAlign: "center", fontWeight: 600, color: "#555" }}>{p.physicalQuantity}</td>
                        <td style={{ padding: "10px 12px", textAlign: "center", fontWeight: 700, color: scanned > 0 ? (isOver ? "#c62828" : "#2e7d32") : "#bbb", fontSize: 16 }}>
                          {scanned > 0 ? scanned : "-"}
                        </td>
                      </tr>
                    );
                  })}

                  {/* Unknown Barcodes (Scanned but not in Master Data) */}
                  {Object.entries(scanCount).filter(([barcode]) => !products.some(p => p.barcode === barcode)).map(([barcode, count]) => (
                    <tr key={barcode} style={{ borderBottom: "1px solid #eee", background: "#fff3e0" }}>
                      <td style={{ padding: "10px 12px", textAlign: "center" }}>-</td>
                      <td style={{ padding: "10px 12px", fontWeight: 600, color: "#e65100" }}>⚠️ Unknown Product</td>
                      <td style={{ padding: "10px 12px", fontFamily: "monospace", color: "#666" }}>{barcode}</td>
                      <td style={{ padding: "10px 12px", textAlign: "center", fontWeight: 600, color: "#999" }}>?</td>
                      <td style={{ padding: "10px 12px", textAlign: "center", fontWeight: 700, color: "#e65100", fontSize: 16 }}>{count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <button
            onClick={completeAudit}
            style={{ width: "100%", padding: "12px", borderRadius: 5, background: "#2e7d32", color: "#fff", border: "none", cursor: "pointer", fontWeight: 700, fontSize: 16 }}
          >
            {selectedProducts.size > 0
              ? `✅ Complete Audit & View Report (${selectedProducts.size} Selected)`
              : "✅ Complete Audit & View Report"}
          </button>
        </div>
      </div>
    </div>
  );
}

// --- RECONCILIATION REPORT COMPONENT ---
function ReconciliationReport() {
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);
  const location = useLocation();
  const selectedBarcodes = location.state?.selectedBarcodes;
  const auditId = location.state?.auditId;

  useEffect(() => {
    const fetchReport = async () => {
      try {
        let url = `${API_BASE_URL}/reconciliation/report`;
        const params = new URLSearchParams();
        if (selectedBarcodes && selectedBarcodes.length > 0) {
          params.append('barcodes', selectedBarcodes.join(","));
        }
        if (auditId) {
          params.append('auditId', auditId);
        }
        const queryString = params.toString();
        if (queryString) {
          url += `?${queryString}`;
        }

        const response = await fetch(url);
        const data = await response.json();
        setReportData(data);
        setLoading(false);
      } catch (err) {
        console.error("Error fetching report:", err);
        setLoading(false);
      }
    };

    fetchReport();
  }, [selectedBarcodes]);

  if (loading) return <div style={{ padding: 24, textAlign: "center" }}>Loading report...</div>;
  if (!reportData || !reportData.data) return <div style={{ padding: 24, textAlign: "center" }}>No data available</div>;

  const { data, summary } = reportData;

  const exportToExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Reconciliation Report");

    const headers = [
      "Barcode", "Product Name", "MRP", "",
      "System Qty", "System Value", "",
      "Phy Qty", "Phy Value", "",
      "Diff", "Diff Value"
    ];
    sheet.addRow(headers);

    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
    headerRow.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF1565C0" }
    };
    headerRow.alignment = { vertical: "middle", horizontal: "center" };

    data.forEach(item => {
      sheet.addRow([
        item.barcode,
        item.productName,
        item.mrp,
        "",
        item.sysQty,
        item.sysAmt,
        "",
        item.phyQty,
        item.phyAmt,
        "",
        item.diff,
        item.diffAmt
      ]);
    });

    sheet.addRow([]);
    const summaryRow = sheet.addRow([
      "TOTAL", "", "", "",
      summary.totalSysQty, summary.totalSysAmt, "",
      summary.totalPhyQty, summary.totalPhyAmt, "",
      summary.totalDiffQty, summary.totalDiffAmt
    ]);

    summaryRow.font = { bold: true };
    summaryRow.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFF8F9FA" }
    };

    sheet.columns.forEach((column) => {
      column.width = 15;
    });
    sheet.getColumn(2).width = 30;

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    saveAs(blob, `Reconciliation_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc" }}>
      <Header />
      <div style={{ padding: "0 32px 32px 32px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div>
            <h1 style={{ margin: 0, color: "#0f172a", fontWeight: 800, fontSize: "28px", letterSpacing: "-0.5px" }}><span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><BarChartIcon size={28} /> Inventory Reconciliation</span></h1>
            <p style={{ margin: "4px 0 0 0", color: "#64748b", fontSize: "14px" }}>Running totals vs Master Data • {new Date().toLocaleString()}</p>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button
              onClick={exportToExcel}
              className="btn btn-success"
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><DownloadIcon size={16} /> Export to Excel</span>
            </button>
            <Link to="/audit" className="btn btn-primary" style={{ borderRadius: 6 }}><span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><ArrowLeftIcon size={16} /> Back to Audit</span></Link>
          </div>
        </div>

        <div style={{ background: "#fff", padding: 20, borderRadius: 10, boxShadow: "0 2px 8px rgba(0,0,0,0.06)", marginBottom: 20 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
            <div style={{ background: "#f5f9ff", padding: 16, borderRadius: 8, border: "1px solid #dbeafe" }}>
              <div style={{ fontSize: 13, color: "#475569", marginBottom: 4 }}>Total System Qty</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: "#1565c0" }}>{summary.totalSysQty}</div>
            </div>
            <div style={{ background: "#f5f9ff", padding: 16, borderRadius: 8, border: "1px solid #dbeafe" }}>
              <div style={{ fontSize: 13, color: "#475569", marginBottom: 4 }}>Total System Value</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: "#1565c0" }}>₹{summary.totalSysAmt.toLocaleString()}</div>
            </div>
            <div style={{ background: "#fdf5ff", padding: 16, borderRadius: 8, border: "1px solid #f3e8ff" }}>
              <div style={{ fontSize: 13, color: "#475569", marginBottom: 4 }}>Total Phy Qty</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: "#7c3aed" }}>{summary.totalPhyQty}</div>
            </div>
            <div style={{ background: "#fdf5ff", padding: 16, borderRadius: 8, border: "1px solid #f3e8ff" }}>
              <div style={{ fontSize: 13, color: "#475569", marginBottom: 4 }}>Total Phy Value</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: "#7c3aed" }}>₹{summary.totalPhyAmt.toLocaleString()}</div>
            </div>
            <div style={{ background: summary.totalDiffQty === 0 ? "#e8f5e9" : "#ffebee", padding: 16, borderRadius: 8, border: summary.totalDiffQty === 0 ? "1px solid #bbf7d0" : "1px solid #fecaca" }}>
              <div style={{ fontSize: 13, color: "#475569", marginBottom: 4 }}>Total Diff</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: summary.totalDiffQty === 0 ? "#2e7d32" : "#c62828" }}>{summary.totalDiffQty > 0 ? '+' : ''}{summary.totalDiffQty}</div>
            </div>
            <div style={{ background: summary.totalDiffAmt === 0 ? "#e8f5e9" : "#ffebee", padding: 16, borderRadius: 8, border: summary.totalDiffAmt === 0 ? "1px solid #bbf7d0" : "1px solid #fecaca" }}>
              <div style={{ fontSize: 13, color: "#475569", marginBottom: 4 }}>Total Diff Value</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: summary.totalDiffAmt === 0 ? "#2e7d32" : "#c62828" }}>{summary.totalDiffAmt > 0 ? '+' : ''}₹{Math.abs(summary.totalDiffAmt).toLocaleString()}</div>
            </div>
          </div>
        </div>

        <div style={{ background: "#fff", padding: 20, borderRadius: 10, boxShadow: "0 2px 8px rgba(0,0,0,0.06)", overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "#f8f9fa", borderBottom: "2px solid #ddd" }}>
                <th style={{ textAlign: "left", padding: 12, fontWeight: 700, borderRight: "1px solid #e2e8f0" }}>Barcode</th>
                <th style={{ textAlign: "left", padding: 12, fontWeight: 700, borderRight: "1px solid #e2e8f0" }}>Product Name</th>
                <th style={{ textAlign: "center", padding: 12, fontWeight: 700, borderRight: "1px solid #e2e8f0" }}>MRP</th>
                <th style={{ textAlign: "center", padding: 12, fontWeight: 700, background: "#eef2ff", borderRight: "1px solid #c7d2fe" }}>System Qty</th>
                <th style={{ textAlign: "center", padding: 12, fontWeight: 700, background: "#eef2ff", borderRight: "1px solid #c7d2fe" }}>System Value</th>
                <th style={{ textAlign: "center", padding: 12, fontWeight: 700, background: "#f5f3ff", borderRight: "1px solid #ddd6fe" }}>Phy Qty</th>
                <th style={{ textAlign: "center", padding: 12, fontWeight: 700, background: "#f5f3ff", borderRight: "1px solid #ddd6fe" }}>Phy Value</th>
                <th style={{ textAlign: "center", padding: 12, fontWeight: 700, borderRight: "1px solid #e2e8f0", color: data.some(d => d.diff !== 0) ? "#c62828" : "#2e7d32" }}>Diff</th>
                <th style={{ textAlign: "center", padding: 12, fontWeight: 700, color: data.some(d => d.diffAmt !== 0) ? "#c62828" : "#2e7d32" }}>Diff Value</th>
              </tr>
            </thead>
            <tbody>
              {data.map((item, idx) => {
                const diffColor = item.diff === 0 ? "#2e7d32" : "#c62828";
                return (
                  <tr key={idx} style={{ borderBottom: "1px solid #eee" }}>
                    <td style={{ padding: 12, fontFamily: "monospace", fontWeight: 600, borderRight: "1px solid #f1f5f9" }}>{item.barcode}</td>
                    <td style={{ padding: 12, borderRight: "1px solid #f1f5f9" }}>{item.productName}</td>
                    <td style={{ textAlign: "center", padding: 12, borderRight: "1px solid #f1f5f9" }}>₹{item.mrp}</td>
                    <td style={{ textAlign: "center", padding: 12, background: "#eef2ff", borderRight: "1px solid #c7d2fe", fontWeight: 600 }}>{item.sysQty}</td>
                    <td style={{ textAlign: "center", padding: 12, background: "#eef2ff", borderRight: "1px solid #c7d2fe" }}>₹{item.sysAmt.toLocaleString()}</td>
                    <td style={{ textAlign: "center", padding: 12, background: "#f5f3ff", borderRight: "1px solid #ddd6fe", fontWeight: 600 }}>{item.phyQty}</td>
                    <td style={{ textAlign: "center", padding: 12, background: "#f5f3ff", borderRight: "1px solid #ddd6fe" }}>₹{item.phyAmt.toLocaleString()}</td>
                    <td style={{ textAlign: "center", padding: 12, fontWeight: 700, color: diffColor, borderRight: "1px solid #f1f5f9" }}>{item.diff > 0 ? '+' : ''}{item.diff}</td>
                    <td style={{ textAlign: "center", padding: 12, fontWeight: 700, color: diffColor }}>{item.diffAmt > 0 ? '+' : ''}₹{Math.abs(item.diffAmt).toLocaleString()}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr style={{ background: "#f8f9fa", borderTop: "2px solid #ddd", fontWeight: 700 }}>
                <td style={{ padding: 12, borderRight: "1px solid #e2e8f0" }}>TOTAL</td>
                <td style={{ padding: 12, borderRight: "1px solid #e2e8f0" }}></td>
                <td style={{ textAlign: "center", padding: 12, borderRight: "1px solid #e2e8f0" }}>-</td>
                <td style={{ textAlign: "center", padding: 12, background: "#eef2ff", borderRight: "1px solid #c7d2fe" }}>{summary.totalSysQty}</td>
                <td style={{ textAlign: "center", padding: 12, background: "#eef2ff", borderRight: "1px solid #c7d2fe" }}>₹{summary.totalSysAmt.toLocaleString()}</td>
                <td style={{ textAlign: "center", padding: 12, background: "#f5f3ff", borderRight: "1px solid #ddd6fe" }}>{summary.totalPhyQty}</td>
                <td style={{ textAlign: "center", padding: 12, background: "#f5f3ff", borderRight: "1px solid #ddd6fe" }}>₹{summary.totalPhyAmt.toLocaleString()}</td>
                <td style={{ textAlign: "center", padding: 12, color: summary.totalDiffQty === 0 ? "#2e7d32" : "#c62828", borderRight: "1px solid #e2e8f0" }}>{summary.totalDiffQty > 0 ? '+' : ''}{summary.totalDiffQty}</td>
                <td style={{ textAlign: "center", padding: 12, color: summary.totalDiffAmt === 0 ? "#2e7d32" : "#c62828" }}>{summary.totalDiffAmt > 0 ? '+' : ''}₹{Math.abs(summary.totalDiffAmt).toLocaleString()}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}

// --- ACTIVITY LOGS COMPONENT ---
function ActivityLogs() {
  const [sessions, setSessions] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedSessions, setExpandedSessions] = useState({});
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [sessionNotes, setSessionNotes] = useState({});
  const [editingNoteId, setEditingNoteId] = useState(null);
  const [savingNoteId, setSavingNoteId] = useState(null);
  const [editedNoteValues, setEditedNoteValues] = useState({});

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/import-sessions`);
      const data = await response.json();
      setSessions(Array.isArray(data) ? data : []);

      const prodRes = await fetch(`${API_BASE_URL}/products`);
      const prodData = await prodRes.json();
      setProducts(Array.isArray(prodData) ? prodData : []);
    } catch (err) {
      console.error("Error fetching data in ActivityLogs:", err);
    } finally {
      setLoading(false);
    }
  };

  const toggleSession = (sessionId) => {
    setExpandedSessions(prev => ({ ...prev, [sessionId]: !prev[sessionId] }));
  };

  const calculateSessionTotals = (sessionProducts) => {
    let totalQty = 0;
    let totalValue = 0;
    sessionProducts.forEach(p => {
      const qty = Number(p.quantity) || 0;
      const mrp = Number(p.mrp) || 0;
      totalQty += qty;
      totalValue += qty * mrp;
    });
    return { totalQty, totalValue };
  };

  const handleNoteSave = async (sessionId, noteText) => {
    try {
      setSavingNoteId(sessionId);
      const truncatedNote = String(noteText || "").substring(0, 30);
      const response = await fetch(`${API_BASE_URL}/import-sessions/${sessionId}/note`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: truncatedNote })
      });
      if (response.ok) {
        setSessionNotes(prev => ({ ...prev, [sessionId]: truncatedNote }));
        setSessions(prev => prev.map(s => s.importSessionId === sessionId ? { ...s, notes: truncatedNote } : s));
        setEditedNoteValues(prev => ({ ...prev, [sessionId]: "" }));
        setEditingNoteId(null);
      } else {
        alert("Failed to save note. Please try again.");
      }
    } catch (err) {
      console.error("Error saving note:", err);
      alert("Failed to save note: " + err.message);
    } finally {
      setSavingNoteId(null);
    }
  };

  const getImportTypeBadge = (importType) => {
    const styles = {
      "Sales Import": { bg: "#fee2e2", color: "#991b1b" },
      "Received Stock Import": { bg: "#dbeafe", color: "#1e40af" },
      "Product Import": { bg: "#dcfce7", color: "#166534" },
      "Manual Entry": { bg: "#fef3c7", color: "#92400e" },
      "Tester/ Damage": { bg: "#ffe4e6", color: "#9f1239" },
      "Shrinkage": { bg: "#f1f5f9", color: "#334155" }
    };
    const s = styles[importType] || { bg: "#e0e7ff", color: "#3730a3" };
    return (
      <span style={{ padding: "4px 10px", borderRadius: "6px", fontSize: "12px", fontWeight: 700, background: s.bg, color: s.color, whiteSpace: "nowrap" }}>
        {importType}
      </span>
    );
  };

  const handleExportSession = async (session) => {
    try {
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet("Products Inventory");

      // Header row — match existing inventory template exactly
      const headerRow = sheet.addRow(["Barcode", "Product Name", "MRP (₹)", "Physical Qty"]);
      headerRow.eachCell((cell) => {
        cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF2E7D32" } };
        cell.alignment = { horizontal: "center", vertical: "middle" };
        cell.border = {
          top: { style: "thin" }, bottom: { style: "thin" },
          left: { style: "thin" }, right: { style: "thin" }
        };
      });

      // Data rows
      session.products.forEach((p) => {
        const row = sheet.addRow([
          p.barcode || "",
          p.productName || "",
          p.mrp !== undefined ? p.mrp : 0,
          p.quantity !== undefined ? p.quantity : 0
        ]);
        row.eachCell((cell) => {
          cell.border = {
            top: { style: "thin" }, bottom: { style: "thin" },
            left: { style: "thin" }, right: { style: "thin" }
          };
          cell.alignment = { vertical: "middle" };
        });
      });

      // Column widths
      sheet.columns = [
        { width: 20 }, { width: 28 }, { width: 12 }, { width: 14 }
      ];

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const dateStr = new Date(session.timestamp).toLocaleDateString("en-GB").replace(/\//g, "-");
      const typeStr = session.importType.replace(/ /g, "_");
      a.href = url;
      a.download = `${typeStr}_${dateStr}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert("Export failed: " + err.message);
    }
  };

  const handleDownloadMonthlyReport = async () => {
    try {
      setLoading(true);
      const workbook = new ExcelJS.Workbook();

      // 1. Summary Sheet
      const summarySheet = workbook.addWorksheet("Monthly Summary");
      summarySheet.views = [{ showGridLines: true }];

      const titleCell = summarySheet.getCell("A1");
      const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
      titleCell.value = `Monthly Inventory Report - ${monthNames[selectedMonth]} ${selectedYear}`;
      titleCell.font = { name: "Arial", size: 16, bold: true, color: { argb: "FF1E3A8A" } };
      summarySheet.mergeCells("A1:C1");

      summarySheet.addRow([]); // empty row

      const headerRow = summarySheet.addRow(["Metric Name", "Quantity / Count", "Respected Amount (₹)"]);
      headerRow.eachCell(cell => {
        cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF2E7D32" } };
        cell.alignment = { horizontal: "center" };
      });

      summarySheet.addRow(["Overall Product Count", overallProductCount, "N/A"]);
      summarySheet.addRow(["Total Product Quantity", overallProductQty, overallProductAmt]);
      summarySheet.addRow(["Total Out Product Quantity", totalSales, totalSalesAmt]);
      summarySheet.addRow(["Total Available Product Quantity", totalSystemQty, totalSystemAmt]);

      // Format Summary numbers
      for (let i = 4; i <= 7; i++) {
        const row = summarySheet.getRow(i);
        row.getCell(2).alignment = { horizontal: "right" };
        if (i > 4) {
          row.getCell(3).numFmt = "₹#,##0.00";
          row.getCell(3).alignment = { horizontal: "right" };
        } else {
          row.getCell(3).alignment = { horizontal: "center" };
        }
      }
      summarySheet.columns = [{ width: 35 }, { width: 20 }, { width: 25 }];

      // Helper to add consolidated activity sheet
      const addConsolidatedActivitySheet = (sheetName, importType, hasAction = false) => {
        const sheet = workbook.addWorksheet(sheetName);
        sheet.views = [{ showGridLines: true }];

        const headers = ["Barcode", "Product Name", "MRP (₹)", "Total Quantity", "Latest Transaction Date"];
        if (hasAction) headers.push("Actions Logged");

        const headerRow = sheet.addRow(headers);
        headerRow.eachCell(cell => {
          cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E3A8A" } };
          cell.alignment = { horizontal: "center", vertical: "middle" };
        });

        // Filter sessions of this type
        const sessionsOfType = currentMonthSessions.filter(s => s.importType === importType);

        // Group products by barcode (or productName if barcode is empty) to avoid duplicates
        const grouped = {};
        sessionsOfType.forEach(session => {
          const sessionDate = new Date(session.timestamp);
          session.products.forEach(p => {
            const barcodeKey = String(p.barcode || "").trim();
            const nameKey = String(p.productName || "").trim();
            const key = (barcodeKey || nameKey || "unknown").toLowerCase();

            if (!grouped[key]) {
              grouped[key] = {
                barcode: barcodeKey,
                productName: nameKey,
                mrp: Number(p.mrp) || 0,
                quantity: 0,
                latestDate: sessionDate,
                actions: new Set()
              };
            } else {
              if (sessionDate > grouped[key].latestDate) {
                grouped[key].latestDate = sessionDate;
              }
            }

            grouped[key].quantity += Number(p.quantity) || 0;
            if (p.action) {
              grouped[key].actions.add(p.action);
            } else {
              grouped[key].actions.add(importType);
            }
          });
        });

        // Add consolidated rows to sheet
        Object.values(grouped).forEach(item => {
          const rowData = [
            item.barcode,
            item.productName,
            item.mrp,
            item.quantity,
            item.latestDate.toLocaleString()
          ];
          if (hasAction) {
            rowData.push(Array.from(item.actions).join(", "));
          }

          const addedRow = sheet.addRow(rowData);
          addedRow.getCell(3).numFmt = "₹#,##0.00";
          addedRow.getCell(3).alignment = { horizontal: "right" };
          addedRow.getCell(4).alignment = { horizontal: "right" };
          addedRow.getCell(5).alignment = { horizontal: "center" };
        });

        sheet.columns = [
          { width: 20 }, { width: 30 }, { width: 14 }, { width: 16 }, { width: 24 }, { width: 30 }
        ];
      };

      // 2. Product Imports Sheet (Consolidated)
      addConsolidatedActivitySheet("Product Imports", "Product Import", true);

      // 3. Sales Imports Sheet (Consolidated)
      addConsolidatedActivitySheet("Sales Imports", "Sales Import");

      // 4. Received Stock Sheet (Consolidated)
      addConsolidatedActivitySheet("Received Stock", "Received Stock Import");

      // 5. Tester & Damage Sheet (Consolidated)
      addConsolidatedActivitySheet("Tester & Damage", "Tester/ Damage");

      // 6. Shrinkage Sheet (Consolidated)
      addConsolidatedActivitySheet("Shrinkage", "Shrinkage");

      // 7. Manual Entries Sheet (Consolidated)
      addConsolidatedActivitySheet("Manual Entries", "Manual Entry", true);

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const formattedMonth = String(selectedMonth + 1).padStart(2, "0");
      a.download = `Monthly_Inventory_Report_${selectedYear}_${formattedMonth}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert("Failed to download monthly report: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const overallProductCount = products.length;

  // Filter log sessions to the selected calendar month dynamically
  const currentMonthSessions = sessions.filter(session => {
    const d = new Date(session.timestamp);
    return d.getFullYear() === selectedYear && d.getMonth() === selectedMonth;
  });

  let totalSales = 0;
  let totalSalesAmt = 0;
  currentMonthSessions.forEach(session => {
    if (session.importType === "Sales Import" || session.importType === "Tester/ Damage" || session.importType === "Shrinkage") {
      session.products.forEach(p => {
        const qty = Number(p.quantity) || 0;
        const mrp = Number(p.mrp) || 0;
        totalSales += qty;
        totalSalesAmt += qty * mrp;
      });
    }
  });

  const safeProducts = Array.isArray(products) ? products : [];
  const totalSystemQty = safeProducts.reduce((acc, p) => acc + (Number(p.physicalQuantity) || 0), 0);
  const totalSystemAmt = safeProducts.reduce((acc, p) => acc + ((Number(p.physicalQuantity) || 0) * (Number(p.mrp) || 0)), 0);

  const overallProductQty = totalSystemQty + totalSales;
  const overallProductAmt = totalSystemAmt + totalSalesAmt;

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc" }}>
      <Header />
      <div style={{ padding: "0 32px 32px 32px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div>
            <h1 style={{ margin: 0, color: "#0f172a", fontWeight: 800, fontSize: "28px", letterSpacing: "-0.5px" }}>
              <span style={{ display: "flex", alignItems: "center", gap: "10px" }}><ClipboardIcon size={28} /> Stock Movement Log</span>
            </h1>
            <p style={{ margin: "4px 0 0 0", color: "#64748b", fontSize: "14px" }}>Import history — expand any row to view product-level details.</p>
          </div>

          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            {/* Month Select */}
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              style={{
                padding: "8px 12px",
                borderRadius: "6px",
                border: "1px solid #cbd5e1",
                background: "#fff",
                fontSize: "14px",
                color: "#334155",
                cursor: "pointer",
                outline: "none"
              }}
            >
              {["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"].map((m, idx) => (
                <option key={idx} value={idx}>{m}</option>
              ))}
            </select>

            {/* Year Select */}
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              style={{
                padding: "8px 12px",
                borderRadius: "6px",
                border: "1px solid #cbd5e1",
                background: "#fff",
                fontSize: "14px",
                color: "#334155",
                cursor: "pointer",
                outline: "none"
              }}
            >
              {[2024, 2025, 2026, 2027, 2028, 2029, 2030].map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>

            {/* Download Report Button */}
            <button
              className="btn btn-primary"
              onClick={handleDownloadMonthlyReport}
              disabled={loading}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "8px 16px",
                fontSize: "14px",
                background: "#1e3a8a",
                borderColor: "#1e3a8a"
              }}
            >
              <DownloadIcon size={16} /> Download Monthly Report
            </button>
          </div>
        </div>

        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, max-content)",
          gap: "12px",
          marginBottom: "20px"
        }}>
          {/* Card 1: Overall Product Count */}
          <div style={{
            background: "linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)",
            border: "1px solid #bfdbfe",
            borderRadius: "8px",
            padding: "10px 16px",
            display: "flex",
            flexDirection: "column",
            boxShadow: "0 1px 2px rgba(0, 0, 0, 0.05)",
            transition: "transform 0.15s ease",
            cursor: "default",
            justifyContent: "center"
          }}
            onMouseEnter={(e) => e.currentTarget.style.transform = "translateY(-1px)"}
            onMouseLeave={(e) => e.currentTarget.style.transform = "translateY(0px)"}
          >
            <span style={{ fontSize: "13px", color: "#1e3a8a", fontWeight: 500 }}>
              Overall Product Count: <strong style={{ fontWeight: 700 }}>{overallProductCount}</strong>
            </span>
          </div>

          {/* Card 2: Total Product Quantity */}
          <div style={{
            background: "linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)",
            border: "1px solid #bbf7d0",
            borderRadius: "8px",
            padding: "10px 16px",
            display: "flex",
            flexDirection: "column",
            boxShadow: "0 1px 2px rgba(0, 0, 0, 0.05)",
            transition: "transform 0.15s ease",
            cursor: "default",
            justifyContent: "center"
          }}
            onMouseEnter={(e) => e.currentTarget.style.transform = "translateY(-1px)"}
            onMouseLeave={(e) => e.currentTarget.style.transform = "translateY(0px)"}
          >
            <span style={{ fontSize: "13px", color: "#14532d", fontWeight: 500 }}>
              Total Product Quantity: <strong style={{ fontWeight: 700 }}>{overallProductQty}</strong>
            </span>
          </div>

          {/* Card 4: Total Out Product Quantity */}
          {/* <div style={{
            background: "linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%)",
            border: "1px solid #fed7aa",
            borderRadius: "8px",
            padding: "10px 16px",
            display: "flex",
            flexDirection: "column",
            boxShadow: "0 1px 2px rgba(0, 0, 0, 0.05)",
            transition: "transform 0.15s ease",
            cursor: "default",
            justifyContent: "center"
          }}
          onMouseEnter={(e) => e.currentTarget.style.transform = "translateY(-1px)"}
          onMouseLeave={(e) => e.currentTarget.style.transform = "translateY(0px)"}
          >
            <span style={{ fontSize: "13px", color: "#c2410c", fontWeight: 500 }}>
              Total Out Product Quantity: <strong style={{ fontWeight: 700 }}>{totalSales}</strong>
            </span>
          </div> */}

          {/* Card 6: Total Available Product Quantity */}
          {/* <div style={{
            background: "linear-gradient(135deg, #faf5ff 0%, #f3e8ff 100%)",
            border: "1px solid #e9d5ff",
            borderRadius: "8px",
            padding: "10px 16px",
            display: "flex",
            flexDirection: "column",
            boxShadow: "0 1px 2px rgba(0, 0, 0, 0.05)",
            transition: "transform 0.15s ease",
            cursor: "default",
            justifyContent: "center"
          }}
          onMouseEnter={(e) => e.currentTarget.style.transform = "translateY(-1px)"}
          onMouseLeave={(e) => e.currentTarget.style.transform = "translateY(0px)"}
          >
            <span style={{ fontSize: "13px", color: "#581c87", fontWeight: 500 }}>
              Total Available Product Quantity: <strong style={{ fontWeight: 700 }}>{totalSystemQty}</strong>
            </span>
          </div> */}

          {/* Row 2 Col 1 Spacer */}
          <div></div>

          {/* Card 3: Total Product Amount */}
          <div style={{
            background: "linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)",
            border: "1px solid #bbf7d0",
            borderRadius: "8px",
            padding: "10px 16px",
            display: "flex",
            flexDirection: "column",
            boxShadow: "0 1px 2px rgba(0, 0, 0, 0.05)",
            transition: "transform 0.15s ease",
            cursor: "default",
            justifyContent: "center"
          }}
            onMouseEnter={(e) => e.currentTarget.style.transform = "translateY(-1px)"}
            onMouseLeave={(e) => e.currentTarget.style.transform = "translateY(0px)"}
          >
            <span style={{ fontSize: "13px", color: "#14532d", fontWeight: 500 }}>
              Total Product Amount: <strong style={{ fontWeight: 700 }}>₹{overallProductAmt.toLocaleString()}</strong>
            </span>
          </div>

          {/* Card 5: Total Out Product Amount */}
          {/* <div style={{
            background: "linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%)",
            border: "1px solid #fed7aa",
            borderRadius: "8px",
            padding: "10px 16px",
            display: "flex",
            flexDirection: "column",
            boxShadow: "0 1px 2px rgba(0, 0, 0, 0.05)",
            transition: "transform 0.15s ease",
            cursor: "default",
            justifyContent: "center"
          }}
          onMouseEnter={(e) => e.currentTarget.style.transform = "translateY(-1px)"}
          onMouseLeave={(e) => e.currentTarget.style.transform = "translateY(0px)"}
          >
            <span style={{ fontSize: "13px", color: "#c2410c", fontWeight: 500 }}>
              Total Out Product Amount: <strong style={{ fontWeight: 700 }}>₹{totalSalesAmt.toLocaleString()}</strong>
            </span>
          </div> */}

          {/* Card 7: Total Available Product Amount */}
          {/* <div style={{
            background: "linear-gradient(135deg, #faf5ff 0%, #f3e8ff 100%)",
            border: "1px solid #e9d5ff",
            borderRadius: "8px",
            padding: "10px 16px",
            display: "flex",
            flexDirection: "column",
            boxShadow: "0 1px 2px rgba(0, 0, 0, 0.05)",
            transition: "transform 0.15s ease",
            cursor: "default",
            justifyContent: "center"
          }}
          onMouseEnter={(e) => e.currentTarget.style.transform = "translateY(-1px)"}
          onMouseLeave={(e) => e.currentTarget.style.transform = "translateY(0px)"}
          >
            <span style={{ fontSize: "13px", color: "#581c87", fontWeight: 500 }}>
              Total Available Product Amount: <strong style={{ fontWeight: 700 }}>₹{totalSystemAmt.toLocaleString()}</strong>
            </span>
          </div> */}
        </div>

        <div className="card" style={{ padding: 0, overflow: "hidden", width: "100%", boxSizing: "border-box" }}>
          {/* Table header */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr 1fr 1fr 1fr 1fr 48px",
            gap: 0,
            background: "#e2e8f0",
            padding: "12px 16px",
            fontWeight: 700,
            fontSize: "13px",
            color: "#475569",
            borderBottom: "1px solid #cbd5e1",
            width: "100%",
            boxSizing: "border-box"
          }}>
            <span>Time Stamp</span>
            <span>Movement Type</span>
            <span>Notes</span>
            <span style={{ textAlign: "center" }}>Product Count</span>
            <span style={{ textAlign: "center" }}>Total Qty</span>
            <span style={{ textAlign: "center" }}>Total Value</span>
            <span style={{ textAlign: "center" }}>Action</span>
            <span></span>
          </div>

          {loading ? (
            <div style={{ padding: 32, textAlign: "center", color: "#94a3b8" }}>Loading import logs...</div>
          ) : sessions.length === 0 ? (
            <div style={{ padding: 32, textAlign: "center", color: "#94a3b8" }}>No import sessions found. Import products or sales to see history here.</div>
          ) : (
            sessions.map((session, idx) => {
              const isExpanded = !!expandedSessions[session.importSessionId];
              const isEditingNote = editingNoteId === session.importSessionId;
              const currentNote = sessionNotes[session.importSessionId] || session.notes || "";
              const { totalQty, totalValue } = calculateSessionTotals(session.products);
              return (
                <div key={session.importSessionId} style={{ borderBottom: idx < sessions.length - 1 ? "1px solid #e2e8f0" : "none" }}>
                  {/* Session row */}
                  <div style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr 1fr 1fr 1fr 1fr 1fr 48px",
                    gap: 0,
                    padding: "12px 16px",
                    alignItems: "center",
                    background: isExpanded ? "#f1f5f9" : "#fff",
                    transition: "background 0.15s",
                    width: "100%",
                    boxSizing: "border-box"
                  }}
                  >
                    <span style={{ fontSize: "13px", color: "#475569", whiteSpace: "nowrap", cursor: "pointer" }} onClick={() => toggleSession(session.importSessionId)}>
                      {new Date(session.timestamp).toLocaleString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }).replace(",", "")}
                    </span>
                    <span style={{ cursor: "pointer" }} onClick={() => toggleSession(session.importSessionId)}>{getImportTypeBadge(session.importType)}</span>
                    <span onClick={(e) => e.stopPropagation()}>
                      {isEditingNote ? (
                        <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                          <input
                            type="text"
                            maxLength="30"
                            value={editedNoteValues[session.importSessionId] || currentNote || ""}
                            onChange={(e) => setEditedNoteValues(prev => ({ ...prev, [session.importSessionId]: e.target.value }))}
                            onKeyDown={(e) => {
                              if (e.key === "Escape") {
                                setEditedNoteValues(prev => ({ ...prev, [session.importSessionId]: "" }));
                                setEditingNoteId(null);
                              }
                            }}
                            autoFocus
                            style={{ flex: 1, padding: "4px 8px", borderRadius: "4px", border: "1px solid #3b82f6", fontSize: "12px", outline: "none" }}
                          />
                          <button
                            onClick={() => handleNoteSave(session.importSessionId, editedNoteValues[session.importSessionId] || currentNote || "")}
                            disabled={savingNoteId === session.importSessionId}
                            style={{ padding: "4px 8px", borderRadius: "4px", background: "#16a34a", color: "#fff", border: "none", cursor: savingNoteId === session.importSessionId ? "not-allowed" : "pointer", fontSize: "11px", fontWeight: 600 }}
                            title="Save note"
                          >
                            {savingNoteId === session.importSessionId ? "..." : "Save"}
                          </button>
                          <button
                            onClick={() => {
                              setEditedNoteValues(prev => ({ ...prev, [session.importSessionId]: "" }));
                              setEditingNoteId(null);
                            }}
                            disabled={savingNoteId === session.importSessionId}
                            style={{ padding: "4px 8px", borderRadius: "4px", background: "#94a3b8", color: "#fff", border: "none", cursor: savingNoteId === session.importSessionId ? "not-allowed" : "pointer", fontSize: "11px", fontWeight: 600 }}
                            title="Cancel edit"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <span
                          style={{ fontSize: "12px", color: "#64748b", cursor: "pointer", padding: "4px 8px", borderRadius: "4px", background: "#f1f5f9", display: "inline-block", maxWidth: "130px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                          onClick={() => setEditingNoteId(session.importSessionId)}
                          title={currentNote}
                        >
                          {currentNote || "—"}
                        </span>
                      )}
                    </span>
                    <span style={{ textAlign: "center", fontWeight: 700, color: "#0f172a", fontSize: "14px", cursor: "pointer" }} onClick={() => toggleSession(session.importSessionId)}>
                      {session.products.length}
                    </span>
                    <span style={{ textAlign: "center", fontWeight: 600, color: "#0f172a", fontSize: "14px", cursor: "pointer" }} onClick={() => toggleSession(session.importSessionId)}>
                      {totalQty}
                    </span>
                    <span style={{ textAlign: "center", fontWeight: 600, color: "#0f172a", fontSize: "14px", cursor: "pointer" }} onClick={() => toggleSession(session.importSessionId)}>
                      ₹{totalValue.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                    </span>
                    <span style={{ textAlign: "center" }} onClick={(e) => e.stopPropagation()}>
                      <button
                        className="btn"
                        style={{ background: "#16a34a", color: "#fff", padding: "6px 12px", fontSize: "12px", fontWeight: 600, borderRadius: "6px" }}
                        onClick={(e) => { e.stopPropagation(); handleExportSession(session); }}
                      >
                        <span style={{ display: "flex", alignItems: "center", gap: "4px" }}><DownloadIcon size={12} /> Export</span>
                      </button>
                    </span>
                    <span style={{ textAlign: "center", color: "#64748b", fontSize: "16px", userSelect: "none", cursor: "pointer" }} onClick={() => toggleSession(session.importSessionId)}>
                      {isExpanded ? "▲" : "▼"}
                    </span>
                  </div>

                  {/* Expanded product detail table */}
                  {isExpanded && (
                    <div style={{ background: "#f8fafc", borderTop: "1px solid #e2e8f0", padding: "0 0 12px 0" }}>
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                        <thead>
                          <tr style={{ background: "#e0f2fe" }}>
                            <th style={{ padding: "10px 20px", textAlign: "left", fontWeight: 700, color: "#0369a1", borderBottom: "1px solid #bae6fd" }}>Time Stamp</th>
                            <th style={{ padding: "10px 12px", textAlign: "left", fontWeight: 700, color: "#0369a1", borderBottom: "1px solid #bae6fd" }}>Product Name</th>
                            <th style={{ padding: "10px 12px", textAlign: "left", fontWeight: 700, color: "#0369a1", borderBottom: "1px solid #bae6fd" }}>Barcode</th>
                            <th style={{ padding: "10px 12px", textAlign: "center", fontWeight: 700, color: "#0369a1", borderBottom: "1px solid #bae6fd" }}>MRP (₹)</th>
                            <th style={{ padding: "10px 12px", textAlign: "center", fontWeight: 700, color: "#0369a1", borderBottom: "1px solid #bae6fd" }}>Quantity</th>
                            <th style={{ padding: "10px 12px", textAlign: "left", fontWeight: 700, color: "#0369a1", borderBottom: "1px solid #bae6fd" }}>Type</th>
                          </tr>
                        </thead>
                        <tbody>
                          {session.products.map((p, pIdx) => (
                            <tr key={pIdx} style={{ background: pIdx % 2 === 0 ? "#fff" : "#f1f5f9" }}>
                              <td style={{ padding: "9px 20px", whiteSpace: "nowrap", color: "#64748b" }}>
                                {new Date(p.timestamp).toLocaleString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }).replace(",", "")}
                              </td>
                              <td style={{ padding: "9px 12px", fontWeight: 600, color: "#0f172a" }}>{p.productName}</td>
                              <td style={{ padding: "9px 12px", fontFamily: "monospace", color: "#475569" }}>{p.barcode}</td>
                              <td style={{ padding: "9px 12px", textAlign: "center", color: "#0f172a" }}>₹{(p.mrp || 0).toFixed(2)}</td>
                              <td style={{ padding: "9px 12px", textAlign: "center", fontWeight: 600, color: "#0f172a" }}>{p.quantity || 0}</td>
                              <td style={{ padding: "9px 12px" }}>
                                <span style={{
                                  padding: "2px 8px", borderRadius: "4px", fontSize: "11px", fontWeight: 600,
                                  background: p.action && p.action.includes("CREATE") ? "#dcfce7" : "#e0e7ff",
                                  color: p.action && p.action.includes("CREATE") ? "#166534" : "#3730a3"
                                }}>
                                  {p.action || "—"}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

// --- LICENSE WRAPPER ---
function LicenseWrapper({ children }) {
  const [licenseStatus, setLicenseStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [keyInput, setKeyInput] = useState("");
  const [activating, setActivating] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    checkLicense();
  }, []);

  const checkLicense = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/license/status`);
      const data = await res.json();
      setLicenseStatus(data.valid);
      if (!data.valid && data.message) setErrorMsg(data.message);
    } catch (err) {
      setLicenseStatus(false);
      setErrorMsg("Cannot connect to server to verify license.");
    } finally {
      setLoading(false);
    }
  };

  const handleActivate = async (e) => {
    e.preventDefault();
    setActivating(true);
    setErrorMsg("");
    try {
      const res = await fetch(`${API_BASE_URL}/license/activate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: keyInput.trim() })
      });
      const data = await res.json();
      if (data.valid) {
        setLicenseStatus(true);
      } else {
        setErrorMsg(data.message);
      }
    } catch (err) {
      setErrorMsg("Activation failed. Please try again.");
    } finally {
      setActivating(false);
    }
  };

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', fontFamily: 'Outfit, sans-serif' }}>Verifying License...</div>;

  if (licenseStatus === true) return children;

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#f1f5f9', fontFamily: 'Outfit, sans-serif' }}>
      <div style={{ background: '#fff', padding: '40px', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', maxWidth: '400px', width: '100%', textAlign: 'center' }}>
        <h2 style={{ marginTop: 0, color: '#1e293b' }}>Activate Software</h2>
        <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '24px' }}>Please enter your license key to continue.</p>
        {errorMsg && <div style={{ background: '#fee2e2', color: '#b91c1c', padding: '10px', borderRadius: '6px', marginBottom: '16px', fontSize: '14px' }}>{errorMsg}</div>}
        <form onSubmit={handleActivate}>
          <input id="licenseKey" name="licenseKey" type="text" placeholder="XXXX-XXXX-XXXX-XXXX" value={keyInput} onChange={(e) => setKeyInput(e.target.value)} required style={{ width: '100%', padding: '12px', borderRadius: '6px', border: '1px solid #cbd5e1', marginBottom: '16px', fontSize: '16px', boxSizing: 'border-box', fontFamily: 'monospace' }} />
          <button type="submit" disabled={activating} style={{ width: '100%', padding: '12px', background: '#2e7d32', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: activating ? 'not-allowed' : 'pointer', fontSize: '16px' }}>
            {activating ? 'Verifying...' : 'Activate License'}
          </button>
        </form>
      </div>
    </div>
  );
}

// --- MAIN APP WITH ROUTING ---

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => localStorage.getItem('auth') === 'true');
  const [shopSelected, setShopSelected] = useState(() => !!localStorage.getItem('activeShopId'));

  const handleLogin = () => {
    localStorage.setItem('auth', 'true');
    setIsAuthenticated(true);
    setShopSelected(false);
    localStorage.removeItem('activeShopId');
  };

  const handleShopSelected = () => {
    setShopSelected(true);
  };

  if (!isAuthenticated) {
    return (
      <LicenseWrapper>
        <style>{globalStyles}</style>
        <Login onLogin={handleLogin} />
      </LicenseWrapper>
    );
  }

  if (!shopSelected) {
    return (
      <LicenseWrapper>
        <style>{globalStyles}</style>
        <ShopSelectorModal onSelected={handleShopSelected} />
      </LicenseWrapper>
    );
  }

  return (
    <LicenseWrapper>
      <Router>
        <style>{globalStyles}</style>
        <Routes>
          <Route path="/" element={<RackHistory />} />
          <Route path="/audit-history" element={<AuditHistory />} />
          <Route path="/audit-details" element={<AuditDetails />} />
          <Route path="/products" element={<ProductManagement />} />
          <Route path="/audit" element={<AuditScanning />} />
          <Route path="/reconciliation" element={<ReconciliationReport />} />
          <Route path="/logs" element={<ActivityLogs />} />
        </Routes>
      </Router>
    </LicenseWrapper>
  );
}


export default App;
