import React, { useState, useRef, useEffect } from "react";
import { supabase } from "../SupabaseClient";
import NavBar from "../components/NavBar";

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
    
    setDetectionLogs(prev => [newLog, ...prev].slice(0, 50)); // Keep last 50 logs
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

      // Handle detections
      if (data.action === "detections") {
        const detections = data.detections;
        setCameraDetections(prev => ({
          ...prev,
          [camId]: detections
        }));
        
        drawBoundingBoxes(camId, detections);
        
        // Add logs for new detections
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
    <div style={{ background: "#f8fafc", minHeight: "100vh" }}>
      <NavBar />
      <div style={{ display: "flex", gap: "20px", padding: "30px", maxWidth: "1600px", margin: "0 auto" }}>
        {/* Left Side - Camera Grid */}
        <div style={{ flex: 1 }}>
          <div style={{ 
            display: "flex", 
            justifyContent: "space-between", 
            alignItems: "center",
            marginBottom: "30px"
          }}>
            <h2 style={{ margin: 0, color: "#1e293b", fontSize: "28px", fontWeight: "700" }}>
              📺 Live Cameras
            </h2>
            <button
              onClick={() => setShowPopup(true)}
              style={{ 
                padding: "12px 24px", 
                background: "#3b82f6", 
                color: "white", 
                borderRadius: "8px", 
                cursor: "pointer",
                border: "none",
                fontSize: "16px",
                fontWeight: "600",
                boxShadow: "0 2px 8px rgba(59, 130, 246, 0.3)",
                transition: "all 0.2s"
              }}
              onMouseOver={(e) => e.target.style.background = "#2563eb"}
              onMouseOut={(e) => e.target.style.background = "#3b82f6"}
            >
              + Add Camera
            </button>
          </div>

          {cameras.length === 0 ? (
            <div style={{ 
              textAlign: "center", 
              padding: "50px", 
              background: "white", 
              borderRadius: "12px",
              border: "2px dashed #cbd5e1",
              boxShadow: "0 1px 3px rgba(0,0,0,0.1)"
            }}>
              <p style={{ color: "#64748b", fontSize: "18px", margin: "0 0 10px 0" }}>No cameras available</p>
              <p style={{ color: "#94a3b8", fontSize: "14px", margin: 0 }}>Click "Add Camera" to connect a camera</p>
            </div>
          ) : (
            <div style={{ 
              display: "grid", 
              gridTemplateColumns: "repeat(auto-fill, minmax(400px, 1fr))", 
              gap: "20px" 
            }}>
              {cameras.map((cam) => {
                const isWatching = activeStreams[cam.id];
                const detections = cameraDetections[cam.id] || [];
                
                return (
                  <div
                    key={cam.id}
                    style={{
                      background: "white",
                      borderRadius: "12px",
                      padding: "20px",
                      border: isWatching ? "2px solid #3b82f6" : "2px solid #e2e8f0",
                      boxShadow: isWatching ? "0 4px 12px rgba(59, 130, 246, 0.2)" : "0 1px 3px rgba(0,0,0,0.1)",
                      transition: "all 0.3s"
                    }}
                  >
                    <div style={{ 
                      display: "flex", 
                      justifyContent: "space-between", 
                      alignItems: "center",
                      marginBottom: "15px"
                    }}>
                      <div>
                        <h3 style={{ margin: "0 0 5px 0", color: "#1e293b", fontWeight: "600" }}>
                          📹 {cam.Name}
                        </h3>
                        <p style={{ margin: 0, color: "#64748b", fontSize: "12px" }}>
                          ID: {cam.id.substring(0, 8)}...
                        </p>
                      </div>
                      <div style={{ display: "flex", gap: "8px" }}>
                        {!isWatching ? (
                          <button
                            onClick={() => joinStream(cam.id)}
                            style={{ 
                              padding: "8px 16px", 
                              borderRadius: "6px", 
                              cursor: "pointer", 
                              background: "#3b82f6", 
                              color: "white",
                              border: "none",
                              fontWeight: "600",
                              fontSize: "14px",
                              transition: "all 0.2s"
                            }}
                            onMouseOver={(e) => e.target.style.background = "#2563eb"}
                            onMouseOut={(e) => e.target.style.background = "#3b82f6"}
                          >
                            Watch
                          </button>
                        ) : (
                          <button
                            onClick={() => stopWatching(cam.id)}
                            style={{ 
                              padding: "8px 16px", 
                              borderRadius: "6px", 
                              cursor: "pointer", 
                              background: "#ef4444", 
                              color: "white",
                              border: "none",
                              fontWeight: "600",
                              fontSize: "14px",
                              transition: "all 0.2s"
                            }}
                            onMouseOver={(e) => e.target.style.background = "#dc2626"}
                            onMouseOut={(e) => e.target.style.background = "#ef4444"}
                          >
                            Stop
                          </button>
                        )}
                        <button
                          onClick={() => removeCamera(cam.id)}
                          style={{ 
                            padding: "8px 12px", 
                            borderRadius: "6px", 
                            cursor: "pointer", 
                            background: "#64748b", 
                            color: "white",
                            border: "none",
                            fontWeight: "600",
                            fontSize: "14px",
                            transition: "all 0.2s"
                          }}
                          onMouseOver={(e) => e.target.style.background = "#475569"}
                          onMouseOut={(e) => e.target.style.background = "#64748b"}
                        >
                          ✕
                        </button>
                      </div>
                    </div>

                    {isWatching && (
                      <div style={{ marginTop: "15px" }}>
                        <div style={{ position: "relative" }}>
                          <video
                            ref={activeStreams[cam.id].videoRef}
                            autoPlay
                            playsInline
                            style={{ 
                              width: "100%", 
                              borderRadius: "8px",
                              background: "#000",
                              aspectRatio: "16/9",
                              display: "block"
                            }}
                          />
                          <canvas
                            ref={(el) => { canvasRefs.current[cam.id] = el; }}
                            style={{
                              position: "absolute",
                              top: 0,
                              left: 0,
                              width: "100%",
                              height: "100%",
                              pointerEvents: "none"
                            }}
                          />
                        </div>
                        <div style={{ 
                          marginTop: "10px", 
                          padding: "8px", 
                          background: "#f1f5f9", 
                          borderRadius: "6px",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center"
                        }}>
                          <span style={{ color: "#ef4444", fontSize: "12px", fontWeight: "700" }}>
                            🔴 LIVE
                          </span>
                          <div>
                            <span style={{ color: "#22c55e", fontSize: "11px", marginRight: "10px" }}>
                              🎭 {detections.filter(d => d.type === 'face_mask').length}
                            </span>
                            <span style={{ color: "#ef4444", fontSize: "11px" }}>
                              🔪 {detections.filter(d => d.type === 'knife').length}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    {!isWatching && (
                      <div style={{ 
                        width: "100%", 
                        aspectRatio: "16/9",
                        background: "#f1f5f9",
                        borderRadius: "8px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        marginTop: "15px",
                        border: "1px solid #e2e8f0"
                      }}>
                        <p style={{ color: "#94a3b8" }}>Click Watch to stream</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Side - Detection Logs */}
        <div style={{ width: "350px" }}>
          <h2 style={{ margin: "0 0 20px 0", color: "#1e293b", fontSize: "24px", fontWeight: "700" }}>
            📋 Detection Logs
          </h2>
          
          <div style={{ 
            background: "white", 
            borderRadius: "12px", 
            padding: "20px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
            maxHeight: "calc(100vh - 180px)",
            overflowY: "auto"
          }}>
            {detectionLogs.length === 0 ? (
              <div style={{ textAlign: "center", padding: "30px 0" }}>
                <p style={{ color: "#94a3b8", margin: 0 }}>No detections yet</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {detectionLogs.map(log => (
                  <div
                    key={log.id}
                    style={{
                      padding: "12px",
                      borderRadius: "8px",
                      background: log.isAlert ? "#fee2e2" : "#dcfce7",
                      border: `1px solid ${log.isAlert ? "#fecaca" : "#bbf7d0"}`
                    }}
                  >
                    <div style={{ 
                      display: "flex", 
                      justifyContent: "space-between", 
                      marginBottom: "5px" 
                    }}>
                      <span style={{ 
                        color: log.isAlert ? "#dc2626" : "#16a34a", 
                        fontSize: "12px",
                        fontWeight: "700"
                      }}>
                        {log.isAlert ? "⚠️ ALERT" : "✓ DETECTED"}
                      </span>
                      <span style={{ 
                        color: log.isAlert ? "#991b1b" : "#15803d", 
                        fontSize: "11px" 
                      }}>
                        {log.timestamp}
                      </span>
                    </div>
                    <p style={{ 
                      margin: "5px 0 0 0", 
                      color: log.isAlert ? "#dc2626" : "#16a34a",
                      fontSize: "13px",
                      fontWeight: "600"
                    }}>
                      {log.detectionType === 'knife' ? '🔪' : '🎭'} {log.className}
                    </p>
                    <p style={{ 
                      margin: "3px 0 0 0", 
                      color: log.isAlert ? "#991b1b" : "#15803d",
                      fontSize: "11px"
                    }}>
                      Camera: {log.cameraName}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add Camera Popup */}
      {showPopup && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(0, 0, 0, 0.5)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000
        }}>
          <div style={{
            background: "white",
            borderRadius: "16px",
            padding: "30px",
            width: "90%",
            maxWidth: "500px",
            boxShadow: "0 20px 60px rgba(0, 0, 0, 0.3)"
          }}>
            <h3 style={{ margin: "0 0 20px 0", color: "#1e293b", fontSize: "24px", fontWeight: "700" }}>
              Add Camera
            </h3>
            
            <div style={{ marginBottom: "20px" }}>
              <label style={{ display: "block", marginBottom: "8px", color: "#475569", fontSize: "14px", fontWeight: "600" }}>
                Camera Name
              </label>
              <input
                type="text"
                value={popupCameraName}
                onChange={(e) => setPopupCameraName(e.target.value)}
                placeholder="Enter camera name"
                style={{
                  width: "100%",
                  padding: "12px",
                  borderRadius: "8px",
                  border: "2px solid #e2e8f0",
                  fontSize: "16px",
                  outline: "none",
                  transition: "border 0.2s",
                  boxSizing: "border-box"
                }}
                onFocus={(e) => e.target.style.borderColor = "#3b82f6"}
                onBlur={(e) => e.target.style.borderColor = "#e2e8f0"}
              />
            </div>

            <div style={{ marginBottom: "20px" }}>
              <label style={{ display: "block", marginBottom: "8px", color: "#475569", fontSize: "14px", fontWeight: "600" }}>
                Camera ID
              </label>
              <input
                type="text"
                value={popupCameraId}
                onChange={(e) => setPopupCameraId(e.target.value)}
                placeholder="Enter camera ID"
                style={{
                  width: "100%",
                  padding: "12px",
                  borderRadius: "8px",
                  border: "2px solid #e2e8f0",
                  fontSize: "16px",
                  outline: "none",
                  transition: "border 0.2s",
                  boxSizing: "border-box"
                }}
                onFocus={(e) => e.target.style.borderColor = "#3b82f6"}
                onBlur={(e) => e.target.style.borderColor = "#e2e8f0"}
              />
            </div>

            {popupError && (
              <div style={{
                padding: "12px",
                background: "#fee2e2",
                border: "1px solid #fecaca",
                borderRadius: "8px",
                marginBottom: "20px"
              }}>
                <p style={{ margin: 0, color: "#dc2626", fontSize: "14px" }}>
                  ⚠️ {popupError}
                </p>
              </div>
            )}

            <div style={{ display: "flex", gap: "10px" }}>
              <button
                onClick={handleAddCamera}
                style={{
                  flex: 1,
                  padding: "12px",
                  background: "#3b82f6",
                  color: "white",
                  borderRadius: "8px",
                  border: "none",
                  fontSize: "16px",
                  fontWeight: "600",
                  cursor: "pointer",
                  transition: "all 0.2s"
                }}
                onMouseOver={(e) => e.target.style.background = "#2563eb"}
                onMouseOut={(e) => e.target.style.background = "#3b82f6"}
              >
                Add Camera
              </button>
              <button
                onClick={() => {
                  setShowPopup(false);
                  setPopupCameraName("");
                  setPopupCameraId("");
                  setPopupError("");
                }}
                style={{
                  flex: 1,
                  padding: "12px",
                  background: "#f1f5f9",
                  color: "#64748b",
                  borderRadius: "8px",
                  border: "none",
                  fontSize: "16px",
                  fontWeight: "600",
                  cursor: "pointer",
                  transition: "all 0.2s"
                }}
                onMouseOver={(e) => e.target.style.background = "#e2e8f0"}
                onMouseOut={(e) => e.target.style.background = "#f1f5f9"}
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