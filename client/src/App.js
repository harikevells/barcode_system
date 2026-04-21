import { useEffect, useState } from "react";

const panelStyle = {
  flex: 1,
  minWidth: 280,
  border: "1px solid #d9d9d9",
  borderRadius: 8,
  padding: 16,
  background: "#fff",
};

function App() {
  const [aData, setAData] = useState([]);
  const [bData, setBData] = useState([]);

  useEffect(() => {
    const ws = new WebSocket("ws://localhost:8080");

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.device === "A") {
        setAData((prev) => [...prev, data.value]);
      } else if (data.device === "B") {
        setBData((prev) => [...prev, data.value]);
      }
    };

    return () => ws.close();
  }, []);

  return (
    <div
      style={{
        padding: 20,
        minHeight: "100vh",
        background: "#f4f6f8",
        fontFamily: "Segoe UI, Tahoma, sans-serif",
      }}
    >
      <h1 style={{ marginTop: 0 }}>Barcode Scanner Dashboard</h1>

      <div style={{ display: "flex", gap: 20, alignItems: "flex-start", flexWrap: "wrap" }}>
        <div style={panelStyle}>
          <h2>Scanner A</h2>
          {aData.length === 0 ? <p>No scans yet.</p> : aData.map((d, i) => <p key={`a-${i}`}>{d}</p>)}
        </div>

        <div style={panelStyle}>
          <h2>Scanner B</h2>
          {bData.length === 0 ? <p>No scans yet.</p> : bData.map((d, i) => <p key={`b-${i}`}>{d}</p>)}
        </div>
      </div>
    </div>
  );
}

export default App;
