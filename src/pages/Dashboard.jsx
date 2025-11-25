import React, { useState, useRef, useEffect } from "react";
import NavBar from "../components/NavBar";
import { supabase } from "../SupabaseClient";
import '../style/DashboardCSS.css';

export default function Dashboard() {
  const [cameras, setCameras] = useState([]);
  const [activeStreams, setActiveStreams] = useState({}); // cameraId -> {pc, ws, videoRef}

  // ---------------- WebRTC Configuration ----------------
  const rtcConfig = {
    iceServers: [
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "stun:stun1.l.google.com:19302" }
    ]
  };

  // ---------------- Fetch Cameras ----------------
  const fetchCameras = async () => {
    const { data, error } = await supabase.from("Cameras").select("*");
    if (!error) {
      setCameras(data);
      console.log("Fetched cameras:", data);
    } else {
      console.error("Error fetching cameras:", error);
    }
  };

  // ---------------- Polling for cameras ----------------
  useEffect(() => {
    fetchCameras();
    const interval = setInterval(fetchCameras, 3000); // Poll every 3 seconds
    return () => clearInterval(interval);
  }, []);

  // ---------------- Join Stream ----------------
  const joinStream = (camId) => {
    if (activeStreams[camId]) {
      console.log("Already watching camera:", camId);
      return;
    }

    console.log("Joining stream for camera:", camId);

    // Create WebSocket connection
    const ws = new WebSocket("ws://localhost:8000/ws/camera/");
    const pc = new RTCPeerConnection(rtcConfig);
    const videoRef = React.createRef();

    // Store active stream
    setActiveStreams(prev => ({
      ...prev,
      [camId]: { pc, ws, videoRef }
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

      // Handle offer from streamer
      if (data.action === "offer") {
        console.log("Received offer from streamer");
        
        // Handle incoming track
        pc.ontrack = (event) => {
          console.log("Received track:", event.streams[0]);
          if (videoRef.current) {
            videoRef.current.srcObject = event.streams[0];
          }
        };

        // Handle ICE candidates
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

        // Monitor connection state
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

      // Handle ICE candidates from streamer
      if (data.action === "ice-candidate") {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
          console.log("Added ICE candidate from streamer");
        } catch (err) {
          console.error("Error adding ICE candidate:", err);
        }
      }

      // Handle streamer left
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
      
      setActiveStreams(prev => {
        const newStreams = { ...prev };
        delete newStreams[camId];
        return newStreams;
      });
      
      console.log("Stopped watching camera:", camId);
    }
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
    <div style={{ background: "#1a1a1a", minHeight: "100vh", color: "white" }}>
      <NavBar />
      <div style={{ padding: "30px" }}>
        <h2 style={{ marginBottom: "30px" }}>📺 CCTV Dashboard</h2>

        {cameras.length === 0 ? (
          <div style={{ 
            textAlign: "center", 
            padding: "50px", 
            background: "#2a2a2a", 
            borderRadius: "12px",
            border: "2px dashed #555"
          }}>
            <p style={{ color: "#888", fontSize: "18px" }}>No cameras available</p>
            <p style={{ color: "#666", fontSize: "14px" }}>Start streaming from a camera to see it here</p>
          </div>
        ) : (
          <div style={{ 
            display: "grid", 
            gridTemplateColumns: "repeat(auto-fill, minmax(400px, 1fr))", 
            gap: "20px" 
          }}>
            {cameras.map((cam) => {
              const isWatching = activeStreams[cam.id];
              
              return (
                <div
                  key={cam.id}
                  style={{
                    background: "#2a2a2a",
                    borderRadius: "12px",
                    padding: "20px",
                    border: isWatching ? "2px solid #22c55e" : "2px solid #555"
                  }}
                >
                  <div style={{ 
                    display: "flex", 
                    justifyContent: "space-between", 
                    alignItems: "center",
                    marginBottom: "15px"
                  }}>
                    <div>
                      <h3 style={{ margin: "0 0 5px 0", color: "white" }}>
                        📹 {cam.Name}
                      </h3>
                      <p style={{ margin: 0, color: "#888", fontSize: "12px" }}>
                        ID: {cam.id}
                      </p>
                    </div>
                    {!isWatching ? (
                      <button
                        onClick={() => joinStream(cam.id)}
                        style={{ 
                          padding: "8px 16px", 
                          borderRadius: "6px", 
                          cursor: "pointer", 
                          background: "#22c55e", 
                          color: "white",
                          border: "none",
                          fontWeight: "bold",
                          fontSize: "14px"
                        }}
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
                          fontWeight: "bold",
                          fontSize: "14px"
                        }}
                      >
                        Stop
                      </button>
                    )}
                  </div>

                  {/* Video Window */}
                  {isWatching && (
                    <div style={{ marginTop: "15px" }}>
                      <video
                        ref={activeStreams[cam.id].videoRef}
                        autoPlay
                        playsInline
                        style={{ 
                          width: "100%", 
                          borderRadius: "8px",
                          background: "#000",
                          aspectRatio: "16/9"
                        }}
                      />
                      <div style={{ 
                        marginTop: "10px", 
                        padding: "8px", 
                        background: "#1a1a1a", 
                        borderRadius: "6px",
                        textAlign: "center"
                      }}>
                        <span style={{ color: "#22c55e", fontSize: "12px", fontWeight: "bold" }}>
                          🔴 LIVE
                        </span>
                      </div>
                    </div>
                  )}

                  {!isWatching && (
                    <div style={{ 
                      width: "100%", 
                      aspectRatio: "16/9",
                      background: "#1a1a1a",
                      borderRadius: "8px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      marginTop: "15px"
                    }}>
                      <p style={{ color: "#666" }}>Click Watch to stream</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}