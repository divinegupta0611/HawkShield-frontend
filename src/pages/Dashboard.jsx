import React, { useEffect, useRef, useState } from "react";
import NavBar from "../components/NavBar";
import '../style/DashboardCSS.css';

export default function Dashboard() {
  const [cameras, setCameras] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [safeLogs, setSafeLogs] = useState([]);
  const [threatLogs, setThreatLogs] = useState([]);
  const [isStreaming, setIsStreaming] = useState({});

  const videoRefs = useRef({});
  const streams = useRef({});
  const detectionIntervals = useRef({});
  const mountedRef = useRef(true);

  // Fetch cameras from backend API (REDUCED FREQUENCY)
  useEffect(() => {
    const fetchCameras = async () => {
      try {
        if (!mountedRef.current) return;
        
        console.log("Fetching cameras from backend...");
        
        const response = await fetch("https://hawkshield-backend-6.onrender.com/api/cameras/");
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log("Received cameras:", data);
        
        const camerasArray = data.cameras || [];
        
        if (mountedRef.current) {
          setCameras(camerasArray);
          setError(null);
        }
      } catch (error) {
        console.error("Error fetching cameras:", error);
        if (mountedRef.current) {
          setError(error.message);
        }
      } finally {
        if (mountedRef.current) {
          setLoading(false);
        }
      }
    };

    fetchCameras();
    
    // INCREASED INTERVAL: Refresh cameras every 30 seconds instead of 10
    const interval = setInterval(fetchCameras, 30000);
    
    return () => {
      clearInterval(interval);
      mountedRef.current = false;
    };
  }, []);

  // Start webcam stream ONLY for cameras that belong to THIS device
  useEffect(() => {
    const startLocalStreams = async () => {
      for (const cam of cameras) {
        const camId = cam.cameraId || cam.id;
        
        // Check if this camera should stream from THIS device
        // You can add a field like "sourceDeviceId" to identify which device owns this camera
        const shouldStreamLocally = cam.sourceDeviceId === getDeviceId() || !cam.hasRemoteStream;
        
        if (shouldStreamLocally && !streams.current[camId]) {
          try {
            const stream = await navigator.mediaDevices.getUserMedia({ 
              video: { width: 1280, height: 720 } 
            });
            
            if (!mountedRef.current) {
              stream.getTracks().forEach(track => track.stop());
              return;
            }
            
            streams.current[camId] = stream;
            setIsStreaming(prev => ({ ...prev, [camId]: true }));

            if (videoRefs.current[camId]) {
              videoRefs.current[camId].srcObject = stream;
            }

            // Start streaming to backend
            startStreamingToBackend(camId, stream);
            
          } catch (e) {
            console.error("Camera access error:", e);
            setIsStreaming(prev => ({ ...prev, [camId]: false }));
          }
        }
      }
    };

    startLocalStreams();

    // Cleanup function
    return () => {
      Object.entries(streams.current).forEach(([camId, stream]) => {
        stream.getTracks().forEach(track => track.stop());
        if (detectionIntervals.current[camId]) {
          clearInterval(detectionIntervals.current[camId]);
        }
      });
      streams.current = {};
      detectionIntervals.current = {};
    };
  }, [cameras]);

  // Get unique device ID (stored in localStorage)
  const getDeviceId = () => {
    let deviceId = localStorage.getItem('deviceId');
    if (!deviceId) {
      deviceId = 'device_' + Math.random().toString(36).substr(2, 9);
      localStorage.setItem('deviceId', deviceId);
    }
    return deviceId;
  };

  // Stream video to backend for remote viewing
  const startStreamingToBackend = (camId, stream) => {
    // Start detection interval for THIS camera only
    if (detectionIntervals.current[camId]) {
      clearInterval(detectionIntervals.current[camId]);
    }

    detectionIntervals.current[camId] = setInterval(() => {
      if (mountedRef.current && streams.current[camId]) {
        sendForDetection(camId);
      }
    }, 5000); // INCREASED: Detection every 5 seconds instead of 4
  };

  const captureFrame = (camId) => {
    const video = videoRefs.current[camId];
    if (!video || video.readyState !== 4) return null;

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    return new Promise((resolve) => {
      canvas.toBlob((blob) => resolve(blob), "image/jpeg", 0.8);
    });
  };

  const sendForDetection = async (camId) => {
    const cam = cameras.find(c => (c.cameraId || c.id) === camId);
    if (!cam) return;

    const frame = await captureFrame(camId);
    if (!frame) return;

    const formData = new FormData();
    formData.append("image", frame, "frame.jpg");
    formData.append("cameraId", camId);

    try {
      const res = await fetch("https://hawkshield-backend-6.onrender.com/api/detection/threats/", {
        method: "POST",
        body: formData
      });

      if (!res.ok) throw new Error(`Detection failed: ${res.status}`);

      const data = await res.json();

      const hasThreat =
        (data.knife?.length || 0) > 0 ||
        (data.gun?.length || 0) > 0 ||
        (data.mask?.length || 0) > 0 ||
        (data.emotion?.length || 0) > 0;

      const timestamp = new Date().toLocaleTimeString();
      const camName = cam.cameraName || cam.name || "Unknown";
      const logEntry = `[${timestamp}] ${camId} | ${camName} - ${hasThreat ? "⚠️ Threat detected" : "✓ Safe"}`;

      if (mountedRef.current) {
        if (hasThreat) {
          setThreatLogs((prev) => [...prev.slice(-20), logEntry]);
        } else {
          setSafeLogs((prev) => [...prev.slice(-20), logEntry]);
        }
      }
    } catch (err) {
      console.error("Detection error:", err);
    }
  };

  // REMOVE CAMERA FUNCTION
  const removeCamera = async (cameraId) => {
    if (!window.confirm("Are you sure you want to delete this camera?")) return;

    try {
      const response = await fetch(`https://hawkshield-backend-6.onrender.com/api/cameras/delete/${cameraId}/`, {
        method: "DELETE",
      });

      if (response.ok) {
        // Stop webcam stream
        if (streams.current[cameraId]) {
          streams.current[cameraId].getTracks().forEach((t) => t.stop());
          delete streams.current[cameraId];
        }

        // Stop detection interval
        if (detectionIntervals.current[cameraId]) {
          clearInterval(detectionIntervals.current[cameraId]);
          delete detectionIntervals.current[cameraId];
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
          <small>Make sure your backend is running properly</small>
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
                      {isStreaming[camId] && (
                        <span className="stat-badge live">🔴 LIVE</span>
                      )}
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
                
                {!isStreaming[camId] && (
                  <div className="video-placeholder">
                    <p>📹 Camera Offline</p>
                  </div>
                )}
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