import React, { useEffect, useRef, useState } from "react";
import NavBar from "../components/NavBar";
import '../style/DashboardCSS.css';

export default function Dashboard() {
  const [cameras, setCameras] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [safeLogs, setSafeLogs] = useState([]);
  const [threatLogs, setThreatLogs] = useState([]);

  const videoRefs = useRef({});
  const streams = useRef({});

  // Fetch cameras from backend API
  useEffect(() => {
    const fetchCameras = async () => {
      try {
        setLoading(true);
        console.log("Fetching cameras from backend...");
        
        const response = await fetch("http://127.0.0.1:8000/api/cameras/");
        console.log("Response status:", response.status);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log("Received cameras:", data);
        
        // Backend returns {cameras: [...]}
        const camerasArray = data.cameras || [];
        
        setCameras(camerasArray);
        setError(null);
      } catch (error) {
        console.error("Error fetching cameras:", error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchCameras();
    
    // Optional: Refresh cameras every 10 seconds
    const interval = setInterval(fetchCameras, 10000);
    return () => clearInterval(interval);
  }, []);

  // Start webcam stream for each camera
  useEffect(() => {
    cameras.forEach(async (cam) => {
      const camId = cam.cameraId || cam.id;
      
      if (!streams.current[camId]) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: true });
          streams.current[camId] = stream;

          if (videoRefs.current[camId]) {
            videoRefs.current[camId].srcObject = stream;
          }
        } catch (e) {
          console.log("Camera access error:", e);
        }
      }
    });

    // Cleanup function
    return () => {
      Object.values(streams.current).forEach(stream => {
        stream.getTracks().forEach(track => track.stop());
      });
    };
  }, [cameras]);

  const captureFrame = (camId) => {
    const video = videoRefs.current[camId];
    if (!video) return null;

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    return new Promise((resolve) => {
      canvas.toBlob((blob) => resolve(blob), "image/jpeg");
    });
  };

  const sendForDetection = async (cam) => {
    const camId = cam.cameraId;
    const camName = cam.cameraName;

    const frame = await captureFrame(camId);
    if (!frame) return;

    const formData = new FormData();
    formData.append("image", frame, "frame.jpg");

    try {
      const res = await fetch("http://127.0.0.1:8000/api/detection/threats/", {
        method: "POST",
        body: formData
      });

      const data = await res.json();

      const hasThreat =
        data.knife.length > 0 ||
        data.gun.length > 0 ||
        data.mask?.length > 0 ||
        data.emotion?.length > 0;

      const timestamp = new Date().toLocaleTimeString();
      const logEntry = `[${timestamp}] ${camId} | ${camName} - ${hasThreat ? "⚠️ Threat detected" : "✓ Safe"}`;

      if (hasThreat) {
        setThreatLogs((prev) => [...prev.slice(-20), logEntry]);
      } else {
        setSafeLogs((prev) => [...prev.slice(-20), logEntry]);
      }
    } catch (err) {
      console.log("Detection error:", err);
    }
  };

  useEffect(() => {
    const interval = setInterval(() => {
      cameras.forEach((cam) => {
        sendForDetection(cam);
      });
    }, 4000);

    return () => clearInterval(interval);
  }, [cameras]);

  // REMOVE CAMERA FUNCTION
  const removeCamera = async (cameraId) => {
    if (!window.confirm("Are you sure you want to delete this camera?")) return;

    try {
      const response = await fetch(`http://127.0.0.1:8000/api/cameras/delete/${cameraId}/`, {
        method: "DELETE",
      });

      if (response.ok) {
        // Stop webcam stream
        if (streams.current[cameraId]) {
          streams.current[cameraId].getTracks().forEach((t) => t.stop());
          delete streams.current[cameraId];
        }

        // Remove camera from list
        setCameras(cameras.filter((cam) => (cam.cameraId || cam.id) !== cameraId));
        alert("Camera removed successfully!");
      } else {
        throw new Error("Failed to remove camera");
      }
    } catch (error) {
      console.error("Error removing camera:", error);
      alert("Failed to remove camera. Check console for details.");
    }
  };

  return (
    <div className="dashboard-container">
      <NavBar />

      {/* Loading State */}
      {loading && (
        <div className="loading-state">
          <p>
            <span className="loading-spinner"></span>
            Loading cameras...
          </p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="error-state">
          <strong>⚠️ Error loading cameras:</strong> {error}
          <small>Make sure your backend is running on http://127.0.0.1:8000</small>
        </div>
      )}

      {/* Logs Section */}
      {!loading && !error && cameras.length > 0 && (
        <div className="logs-container">
          {/* SAFE LOGS */}
          <div className="log-box safe">
            <h3>✓ Safe Logs</h3>
            {safeLogs.length === 0 ? (
              <p style={{ color: '#16a34a', textAlign: 'center', marginTop: '2rem', opacity: 0.6 }}>
                No safe logs yet...
              </p>
            ) : (
              safeLogs.map((log, i) => (
                <div key={i} className="log-entry">{log}</div>
              ))
            )}
          </div>

          {/* THREAT LOGS */}
          <div className="log-box threat">
            <h3>⚠️ Threat Logs</h3>
            {threatLogs.length === 0 ? (
              <p style={{ color: '#dc2626', textAlign: 'center', marginTop: '2rem', opacity: 0.6 }}>
                No threats detected...
              </p>
            ) : (
              threatLogs.map((log, i) => (
                <div key={i} className="log-entry">{log}</div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Cameras Grid */}
      {!loading && !error && cameras.length > 0 && (
        <div className="cameras-grid">
          {cameras.map((cam) => {
            const camId = cam.cameraId || cam.id;
            const camName = cam.cameraName || cam.name || "Unknown Camera";
            
            return (
              <div key={camId} className="camera-card">
                <div className="camera-header">
                  <div className="camera-title">
                    <h3>{camName}</h3>
                    <div className="camera-stats">
                      <span className="stat-badge">ID: {camId}</span>
                      {cam.people !== undefined && (
                        <span className="stat-badge">👥 {cam.people}</span>
                      )}
                      {cam.threats !== undefined && (
                        <span className="stat-badge">⚠️ {cam.threats}</span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => removeCamera(camId)}
                    className="remove-button"
                  >
                    Remove
                  </button>
                </div>

                <video
                  ref={(el) => (videoRefs.current[camId] = el)}
                  autoPlay
                  playsInline
                  muted
                  className="camera-video"
                ></video>
              </div>
            );
          })}
        </div>
      )}

      {/* No Cameras State */}
      {!loading && !error && cameras.length === 0 && (
        <div className="no-cameras-state">
          <div className="no-cameras-icon">📹</div>
          <h3>No cameras added yet</h3>
          <p>Add your first camera from the Home page to start monitoring!</p>
          <a href="/" className="home-link">
            Go to Home
          </a>
        </div>
      )}
    </div>
  );
}