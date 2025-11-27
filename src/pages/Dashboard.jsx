import React, { useState, useRef, useEffect } from "react";
import { supabase } from "../SupabaseClient";
import NavBar from "../components/NavBar";
import "../style/DashboardCSS.css";

export default function Dashboard() {
  const [cameras, setCameras] = useState([]);
  const [activeStreams, setActiveStreams] = useState({});
  const [showPopup, setShowPopup] = useState(false);
  const [popupCameraName, setPopupCameraName] = useState("");
  const [popupCameraId, setPopupCameraId] = useState("");
  const [popupError, setPopupError] = useState("");
  const [detectionLogs, setDetectionLogs] = useState([]);
  const [cameraDetections, setCameraDetections] = useState({});

  const canvasRefs = useRef({});

  const rtcConfig = {
    iceServers: [
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "stun:stun1.l.google.com:19302" }
    ]
  };

  // ---------------- Draw Bounding Boxes ----------------
  const drawBoundingBoxes = (camId, detections) => {
    const canvas = canvasRefs.current[camId];
    const videoRef = activeStreams[camId]?.videoRef?.current;
    
    if (!canvas || !videoRef) return;

    const ctx = canvas.getContext('2d');
    canvas.width = videoRef.videoWidth;
    canvas.height = videoRef.videoHeight;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    detections.forEach(det => {
      const [x1, y1, x2, y2] = det.bbox;
      const width = x2 - x1;
      const height = y2 - y1;
      
      const color = det.type === 'knife' ? '#ef4444' : '#22c55e';
      
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.strokeRect(x1, y1, width, height);
      
      const label = `${det.class} ${(det.confidence * 100).toFixed(0)}%`;
      ctx.font = '16px Arial';
      const textWidth = ctx.measureText(label).width;
      ctx.fillStyle = color;
      ctx.fillRect(x1, y1 - 25, textWidth + 10, 25);
      
      ctx.fillStyle = 'white';
      ctx.fillText(label, x1 + 5, y1 - 7);
    });
  };

  // ---------------- Add Detection Log ----------------
  const addDetectionLog = (cameraName, detectionType, className, timestamp) => {
    const newLog = {
      id: Date.now(),
      cameraName,
      detectionType,
      className,
      timestamp,
      isAlert: detectionType === 'knife' || className.toLowerCase().includes('without')
    };
    
    setDetectionLogs(prev => [newLog, ...prev].slice(0, 50));
  };

  // ---------------- Verify and Add Camera ----------------
  const handleAddCamera = async () => {
    setPopupError("");

    if (!popupCameraName.trim() || !popupCameraId.trim()) {
      setPopupError("Please enter both camera name and ID");
      return;
    }

    try {
      const { data, error } = await supabase
        .from("Cameras")
        .select("*")
        .eq("id", popupCameraId)
        .eq("Name", popupCameraName)
        .single();

      if (error || !data) {
        setPopupError("Camera not found. Please check the name and ID.");
        return;
      }

      if (cameras.find(cam => cam.id === data.id)) {
        setPopupError("Camera already added to dashboard.");
        return;
      }

      setCameras(prev => [...prev, data]);
      
      setShowPopup(false);
      setPopupCameraName("");
      setPopupCameraId("");
      setPopupError("");
      
      setTimeout(() => {
        joinStream(data.id);
      }, 500);
      
    } catch (err) {
      console.error("Error verifying camera:", err);
      setPopupError("Error verifying camera. Please try again.");
    }
  };

  // ---------------- Join Stream ----------------
  const joinStream = (camId) => {
    if (activeStreams[camId]) {
      console.log("Already watching camera:", camId);
      return;
    }

    console.log("Joining stream for camera:", camId);

    const ws = new WebSocket("ws://localhost:8000/ws/camera/");
    const pc = new RTCPeerConnection(rtcConfig);
    const videoRef = React.createRef();
    const canvasRef = document.createElement('canvas');
    canvasRefs.current[camId] = canvasRef;

    setActiveStreams(prev => ({
      ...prev,
      [camId]: { pc, ws, videoRef, canvasRef }
    }));

    ws.onopen = () => {
      console.log("WebSocket connected for camera:", camId);
      ws.send(JSON.stringify({ 
        action: "viewer_join", 
        camera_id: camId 
      }));
    };

    ws.onmessage = async (message) => {
      const data = JSON.parse(message.data);
      console.log("Received message:", data);

      if (data.action === "offer") {
        console.log("Received offer from streamer");
        
        pc.ontrack = (event) => {
          console.log("Received track:", event.streams[0]);
          if (videoRef.current) {
            videoRef.current.srcObject = event.streams[0];
            videoRef.current.play().catch(err => {
              console.error("Error playing video:", err);
            });
          }
        };

        pc.onicecandidate = (event) => {
          if (event.candidate) {
            console.log("Sending ICE candidate to streamer");
            ws.send(JSON.stringify({ 
              action: "ice-candidate", 
              target: data.sender, 
              candidate: event.candidate 
            }));
          }
        };

        pc.onconnectionstatechange = () => {
          console.log("Connection state:", pc.connectionState);
        };

        pc.oniceconnectionstatechange = () => {
          console.log("ICE connection state:", pc.iceConnectionState);
        };

        try {
          await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          
          console.log("Sending answer to streamer");
          ws.send(JSON.stringify({ 
            action: "answer", 
            target: data.sender, 
            sdp: answer 
          }));
        } catch (err) {
          console.error("Error handling offer:", err);
        }
      }

      if (data.action === "ice-candidate") {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
          console.log("Added ICE candidate from streamer");
        } catch (err) {
          console.error("Error adding ICE candidate:", err);
        }
      }

      if (data.action === "detections") {
        const detections = data.detections;
        setCameraDetections(prev => ({
          ...prev,
          [camId]: detections
        }));
        
        drawBoundingBoxes(camId, detections);
        
        if (detections.length > 0) {
          detections.forEach(det => {
            addDetectionLog(
              data.camera_name || cameras.find(c => c.id === camId)?.Name || 'Unknown',
              det.type,
              det.class,
              data.timestamp || new Date().toLocaleTimeString()
            );
          });
        }
      }

      if (data.action === "streamer_left") {
        console.log("Streamer left camera:", camId);
        stopWatching(camId);
      }
    };

    ws.onerror = (error) => {
      console.error("WebSocket error:", error);
    };

    ws.onclose = () => {
      console.log("WebSocket closed for camera:", camId);
    };
  };

  // ---------------- Stop Watching ----------------
  const stopWatching = (camId) => {
    const stream = activeStreams[camId];
    if (stream) {
      if (stream.pc) stream.pc.close();
      if (stream.ws) stream.ws.close();
      
      delete canvasRefs.current[camId];
      
      setActiveStreams(prev => {
        const newStreams = { ...prev };
        delete newStreams[camId];
        return newStreams;
      });
      
      setCameraDetections(prev => {
        const newDetections = { ...prev };
        delete newDetections[camId];
        return newDetections;
      });
      
      console.log("Stopped watching camera:", camId);
    }
  };

  // ---------------- Remove Camera ----------------
  const removeCamera = (camId) => {
    stopWatching(camId);
    setCameras(prev => prev.filter(cam => cam.id !== camId));
  };

  // ---------------- Cleanup on unmount ----------------
  useEffect(() => {
    return () => {
      Object.keys(activeStreams).forEach(camId => {
        stopWatching(camId);
      });
    };
  }, []);

  return (
    <div className="dashboard-container">
      <NavBar />
      <div className="dashboard-content">
        {/* Left Side - Camera Grid */}
        <div className="cameras-section">
          <div className="section-header">
            <h2 className="section-title">
              <span className="icon">📺</span>
              Dashboard - Live Cameras
            </h2>
            <button className="btn-add-camera" onClick={() => setShowPopup(true)}>
              <span className="btn-icon">+</span>
              Add Camera
            </button>
          </div>

          {cameras.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📹</div>
              <p className="empty-title">No cameras available</p>
              <p className="empty-subtitle">Click "Add Camera" to connect a camera</p>
            </div>
          ) : (
            <div className="cameras-grid">
              {cameras.map((cam) => {
                const isWatching = activeStreams[cam.id];
                const detections = cameraDetections[cam.id] || [];
                
                return (
                  <div key={cam.id} className={`camera-card ${isWatching ? 'watching' : ''}`}>
                    <div className="camera-header">
                      <div className="camera-info">
                        <h3 className="camera-name">
                          <span className="camera-icon">📹</span>
                          {cam.Name}
                        </h3>
                        <p className="camera-id">ID: {cam.id.substring(0, 8)}...</p>
                      </div>
                      <div className="camera-actions">
                        {!isWatching ? (
                          <button className="btn-watch" onClick={() => joinStream(cam.id)}>
                            Watch
                          </button>
                        ) : (
                          <button className="btn-stop" onClick={() => stopWatching(cam.id)}>
                            Stop
                          </button>
                        )}
                        <button className="btn-remove" onClick={() => removeCamera(cam.id)}>
                          ✕
                        </button>
                      </div>
                    </div>

                    {isWatching ? (
                      <div className="video-container">
                        <div className="video-wrapper">
                          <video
                            ref={activeStreams[cam.id].videoRef}
                            autoPlay
                            playsInline
                            className="video-player"
                          />
                          <canvas
                            ref={(el) => { canvasRefs.current[cam.id] = el; }}
                            className="detection-canvas"
                          />
                        </div>
                        <div className="video-status">
                          <span className="status-live">🔴 LIVE</span>
                          <div className="detection-counts">
                            <span className="count-masks">
                              🎭 {detections.filter(d => d.type === 'face_mask').length}
                            </span>
                            <span className="count-knives">
                              🔪 {detections.filter(d => d.type === 'knife').length}
                            </span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="video-placeholder">
                        <p>Click Watch to stream</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Side - Detection Logs */}
        <div className="logs-section">
          <h2 className="section-title">
            <span className="icon">📋</span>
            Detection Logs
          </h2>
          
          <div className="logs-container">
            {detectionLogs.length === 0 ? (
              <div className="logs-empty">
                <p>No detections yet</p>
              </div>
            ) : (
              <div className="logs-list">
                {detectionLogs.map(log => (
                  <div key={log.id} className={`log-item ${log.isAlert ? 'alert' : 'normal'}`}>
                    <div className="log-header">
                      <span className="log-badge">
                        {log.isAlert ? "⚠️ ALERT" : "✓ DETECTED"}
                      </span>
                      <span className="log-time">{log.timestamp}</span>
                    </div>
                    <p className="log-detection">
                      {log.detectionType === 'knife' ? '🔪' : '🎭'} {log.className}
                    </p>
                    <p className="log-camera">Camera: {log.cameraName}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add Camera Modal */}
      {showPopup && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3 className="modal-title">Add Camera</h3>
            
            <div className="form-group">
              <label className="form-label">Camera Name</label>
              <input
                type="text"
                className="form-input"
                value={popupCameraName}
                onChange={(e) => setPopupCameraName(e.target.value)}
                placeholder="Enter camera name"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Camera ID</label>
              <input
                type="text"
                className="form-input"
                value={popupCameraId}
                onChange={(e) => setPopupCameraId(e.target.value)}
                placeholder="Enter camera ID"
              />
            </div>

            {popupError && (
              <div className="error-message">
                <span className="error-icon">⚠️</span>
                {popupError}
              </div>
            )}

            <div className="modal-actions">
              <button className="btn-modal-primary" onClick={handleAddCamera}>
                Add Camera
              </button>
              <button 
                className="btn-modal-secondary" 
                onClick={() => {
                  setShowPopup(false);
                  setPopupCameraName("");
                  setPopupCameraId("");
                  setPopupError("");
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}