import React, { useState, useEffect } from "react";
import { SceneAssets } from "./types";
import { loadAllAssets } from "./utils/sceneLoader";
import { LoadingScreen } from "./components/LoadingScreen";
import { SceneViewer } from "./components/SceneViewer";

export default function App() {
  const [assets, setAssets] = useState<SceneAssets | null>(null);
  const [loadMsg, setLoadMsg] = useState("Initializing…");
  const [loadPct, setLoadPct] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadAllAssets((msg, pct) => {
      setLoadMsg(msg);
      setLoadPct(pct);
    })
      .then(setAssets)
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : String(err);
        console.error("[App] Scene load failed:", msg);
        setError(msg);
      });
  }, []);

  if (error) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh",
          background: "#080a0e",
          color: "#ff2244",
          fontFamily: "'Share Tech Mono', monospace",
          gap: "1.5rem",
          padding: "2rem",
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: "1.5rem", letterSpacing: "0.2em" }}>
          ⚠ LOAD ERROR
        </div>

        {/* Error message — white-space preserved so newlines in the message show */}
        <div
          style={{
            fontSize: "0.8rem",
            color: "#ff6b6b",
            maxWidth: "700px",
            lineHeight: 1.8,
            whiteSpace: "pre-wrap",
            background: "rgba(255,34,68,0.06)",
            border: "1px solid rgba(255,34,68,0.2)",
            borderRadius: "6px",
            padding: "1rem 1.5rem",
            textAlign: "left",
          }}
        >
          {error}
        </div>

        <div
          style={{
            fontSize: "0.7rem",
            color: "#7a8fa6",
            maxWidth: "600px",
            lineHeight: 2,
            textAlign: "left",
          }}
        >
          <div
            style={{
              color: "#00d4ff",
              marginBottom: "0.5rem",
              letterSpacing: "0.15em",
            }}
          >
            REQUIRED FILES IN public/models/
          </div>
          {[
            "env.glb",
            "camera.glb",
            "car_1.glb",
            "car_2.glb",
            "car_3.glb",
            "car_4.glb",
            "car_5.glb",
            "car_6.glb",
            "car_7.glb",
          ].map((f) => (
            <div key={f} style={{ color: "#3d5068" }}>
              <span style={{ color: "#00d4ff" }}>public/models/</span>
              {f}
            </div>
          ))}
        </div>

        <div
          style={{ fontSize: "0.65rem", color: "#3d5068", marginTop: "0.5rem" }}
        >
          After copying files, restart the dev server:{" "}
          <span style={{ color: "#00d4ff" }}>npm run dev</span>
        </div>

        <button
          onClick={() => window.location.reload()}
          style={{
            padding: "8px 28px",
            background: "transparent",
            border: "1px solid #ff2244",
            color: "#ff2244",
            fontFamily: "'Share Tech Mono', monospace",
            fontSize: "0.7rem",
            letterSpacing: "0.2em",
            cursor: "pointer",
            borderRadius: "3px",
            transition: "all 0.2s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(255,34,68,0.1)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
          }}
        >
          RETRY
        </button>
      </div>
    );
  }

  if (!assets) {
    return <LoadingScreen message={loadMsg} progress={loadPct} />;
  }

  return <SceneViewer assets={assets} />;
}
