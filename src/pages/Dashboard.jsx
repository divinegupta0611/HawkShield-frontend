import React, { useEffect, useRef, useState, useCallback } from "react";
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
  const frameIntervals = useRef({});
  const mountedRef = useRef(true);
  const initializedCameras = useRef(new Set());

  // Get unique device ID
  const getDeviceId = useCallback(() => {
    let deviceId = localStorage.getItem('deviceId');
    if (!deviceId) {
      deviceId = 'device_' + Math.random().toString(36).substr(2, 9);
      localStorage.setItem('deviceId', deviceId);
    }
    return deviceId;
  }, []);

  // Fetch cameras from backend API
  useEffect(() => {
    const fetchCameras = async () => {
      try {
        if (!mountedRef.current) return;
        
        const response = await fetch("https://hawkshield-backend-6.onrender.com/api/cameras/");
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
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
    const interval = setInterval(fetchCameras, 10000);
    
    return () => {
      clearInterval(interval);
    };
  }, []);

  // Fetch logs from backend
  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const [threatRes, safeRes] = await Promise.all([
          fetch("https://hawkshield-backend-6.onrender.com/api/detection/logs/?type=threat&limit=50"),
          fetch("https://hawkshield-backend-6.onrender.com/api/detection/logs/?type=safe&limit=50")
        ]);

        if (threatRes.ok) {
          const threatData = await threatRes.json();
          const threatLogEntries = threatData.logs.map(log => {
            const timestamp = new Date(log.timestamp).toLocaleTimeString();
            const threatTypes = log.threatTypes?.join(", ") || "Threat";
            return `[${timestamp}] ${log.cameraId} | ${log.cameraName} - ⚠️ ${threatTypes} detected`;
          });
          if (mountedRef.current) {
            setThreatLogs(threatLogEntries);
          }
        }

        if (safeRes.ok) {
          const safeData = await safeRes.json();
          const safeLogEntries = safeData.logs.map(log => {
            const timestamp = new Date(log.timestamp).toLocaleTimeString();
            return `[${timestamp}] ${log.cameraId} | ${log.cameraName} - ✓ Safe`;
          });
          if (mountedRef.current) {
            setSafeLogs(safeLogEntries);
          }
        }
      } catch (err) {
        console.error("Error fetching logs:", err);
      }
    };

    fetchLogs();
    const logInterval = setInterval(fetchLogs, 5000);
    
    return () => clearInterval(logInterval);
  }, []);

  // Initialize camera streams (only once per camera to prevent flickering)
  useEffect(() => {
    if (loading) return;

    const deviceId = getDeviceId();

    cameras.forEach((cam) => {
      const camId = cam.cameraId || cam.id;
      
      // Skip if already initialized
      if (initializedCameras.current.has(camId)) {
        return;
      }

      const isLocalCamera = cam.sourceDeviceId === deviceId;
      
      if (isLocalCamera) {
        // This is a local camera - start webcam stream
        initializeLocalStream(camId);
      } else {
        // This is a remote camera - start fetching frames
        initializeRemoteStream(camId);
      }
      
      initializedCameras.current.add(camId);
    });

    // Cleanup function
    return () => {
      Object.entries(streams.current).forEach(([camId, stream]) => {
        stream.getTracks().forEach(track => track.stop());
      });
      Object.values(detectionIntervals.current).forEach(interval => clearInterval(interval));
      Object.values(frameIntervals.current).forEach(interval => clearInterval(interval));
      streams.current = {};
      detectionIntervals.current = {};
      frameIntervals.current = {};
    };
  }, [cameras, loading, getDeviceId]);

  const initializeLocalStream = async (camId) => {
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

      // Start streaming frames to backend and detection
      startStreamingToBackend(camId, stream);
      
    } catch (e) {
      console.error("Camera access error:", e);
      setIsStreaming(prev => ({ ...prev, [camId]: false }));
    }
  };

  const initializeRemoteStream = (camId) => {
    // Start fetching frames from backend
    if (frameIntervals.current[camId]) {
      clearInterval(frameIntervals.current[camId]);
    }

    frameIntervals.current[camId] = setInterval(() => {
      fetchRemoteFrame(camId);
    }, 200); // Fetch frame every 200ms for smooth playback (5 FPS)
    
    // Fetch first frame immediately
    fetchRemoteFrame(camId);
  };

  const fetchRemoteFrame = async (camId) => {
    try {
      const response = await fetch(
        `https://hawkshield-backend-6.onrender.com/api/cameras/frame/${camId}/`
      );
      
      if (response.ok) {
        const data = await response.json();
        if (data.frame && videoRefs.current[camId]) {
          const video = videoRefs.current[camId];
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            
            // Create a video stream from canvas
            const stream = canvas.captureStream(5); // 5 FPS
            if (video.srcObject) {
              video.srcObject.getTracks().forEach(track => track.stop());
            }
            video.srcObject = stream;
            setIsStreaming(prev => ({ ...prev, [camId]: true }));
          };
          img.src = `data:image/jpeg;base64,${data.frame}`;
        }
      } else {
        setIsStreaming(prev => ({ ...prev, [camId]: false }));
      }
    } catch (err) {
      console.error("Error fetching remote frame:", err);
      setIsStreaming(prev => ({ ...prev, [camId]: false }));
    }
  };

  const startStreamingToBackend = (camId, stream) => {
    // Start detection interval
    if (detectionIntervals.current[camId]) {
      clearInterval(detectionIntervals.current[camId]);
    }

    detectionIntervals.current[camId] = setInterval(() => {
      if (mountedRef.current && streams.current[camId]) {
        sendForDetection(camId);
        uploadFrame(camId);
      }
    }, 5000); // Detection every 5 seconds

    // Upload frames more frequently for smooth streaming
    if (frameIntervals.current[camId]) {
      clearInterval(frameIntervals.current[camId]);
    }
    
    frameIntervals.current[camId] = setInterval(() => {
      if (mountedRef.current && streams.current[camId]) {
        uploadFrame(camId);
      }
    }, 200); // Upload frame every 200ms (5 FPS)
  };

  const uploadFrame = async (camId) => {
    const frame = await captureFrame(camId);
    if (!frame) return;

    const formData = new FormData();
    formData.append("frame", frame, "frame.jpg");

    try {
      await fetch(`https://hawkshield-backend-6.onrender.com/api/cameras/frame/${camId}/upload/`, {
        method: "POST",
        body: formData
      });
    } catch (err) {
      console.error("Frame upload error:", err);
    }
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
    formData.append("cameraName", cam.cameraName || cam.name || "Unknown");

    try {
      const res = await fetch("https://hawkshield-backend-6.onrender.com/api/detection/threats/", {
        method: "POST",
        body: formData
      });

      if (!res.ok) throw new Error(`Detection failed: ${res.status}`);

      const data = await res.json();
      console.log("Detection result:", data);
      // Logs are now fetched from backend automatically
    } catch (err) {
      console.error("Detection error:", err);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

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

        // Stop intervals
        if (detectionIntervals.current[cameraId]) {
          clearInterval(detectionIntervals.current[cameraId]);
          delete detectionIntervals.current[cameraId];
        }
        if (frameIntervals.current[cameraId]) {
          clearInterval(frameIntervals.current[cameraId]);
          delete frameIntervals.current[cameraId];
        }

        // Remove from initialized set
        initializedCameras.current.delete(cameraId);

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
                  ref={(el) => {
                    if (el && !videoRefs.current[camId]) {
                      videoRefs.current[camId] = el;
                    }
                  }}
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