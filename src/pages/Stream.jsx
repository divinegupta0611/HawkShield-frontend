import React, { useRef, useState, useEffect } from "react";
import { supabase } from "../SupabaseClient";
import NavBar from "../components/NavBar";

export default function Stream() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [cameraName, setCameraName] = useState("");
  const [cameraId, setCameraId] = useState(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [stream, setStream] = useState(null);
  const [streamerChannel, setStreamerChannel] = useState(null);
  const [detections, setDetections] = useState([]);

  const viewersRef = useRef({});
  const wsRef = useRef(null);
  const detectionIntervalRef = useRef(null);
  
  const rtcConfig = {
    iceServers: [
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "stun:stun1.l.google.com:19302" }
    ]
  };

  // ---------------- Draw Bounding Boxes ----------------
  const drawBoundingBoxes = (detections) => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    
    if (!canvas || !video) return;

    const ctx = canvas.getContext('2d');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw each detection
    detections.forEach(det => {
      const [x1, y1, x2, y2] = det.bbox;
      const width = x2 - x1;
      const height = y2 - y1;
      
      // Choose color based on detection type
      const color = det.type === 'knife' ? '#ef4444' : '#22c55e';
      
      // Draw rectangle
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.strokeRect(x1, y1, width, height);
      
      // Draw label background
      const label = `${det.class} ${(det.confidence * 100).toFixed(0)}%`;
      ctx.font = '16px Arial';
      const textWidth = ctx.measureText(label).width;
      ctx.fillStyle = color;
      ctx.fillRect(x1, y1 - 25, textWidth + 10, 25);
      
      // Draw label text
      ctx.fillStyle = 'white';
      ctx.fillText(label, x1 + 5, y1 - 7);
    });
  };

  // ---------------- Capture and Send Frame for Detection ----------------
  const sendFrameForDetection = () => {
    const video = videoRef.current;
    if (!video || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0);
    
    // Convert to base64
    const frameData = canvas.toDataURL('image/jpeg', 0.8);
    
    // Send to backend with camera name
    wsRef.current.send(JSON.stringify({
      action: "video_frame",
      frame: frameData,
      camera_name: cameraName
    }));
  };

  // ---------------- WebRTC Setup ----------------
  const startWebRTC = (cameraId, mediaStream) => {
    wsRef.current = new WebSocket("ws://localhost:8000/ws/camera/");

    wsRef.current.onopen = () => {
      console.log("WebSocket connected");
      wsRef.current.send(JSON.stringify({ 
        action: "streamer_join", 
        camera_id: cameraId 
      }));
      
      // Start sending frames for detection (every 500ms)
      detectionIntervalRef.current = setInterval(sendFrameForDetection, 500);
    };

    wsRef.current.onmessage = async (message) => {
      const data = JSON.parse(message.data);
      console.log("Received message:", data);

      if (data.action === "streamer_joined") {
        setStreamerChannel(data.channel);
        console.log("Streamer channel:", data.channel);
      }

      // Handle detections from backend
      if (data.action === "detections") {
        setDetections(data.detections);
        drawBoundingBoxes(data.detections);
      }

      if (data.action === "viewer_joined") {
        const viewerChannel = data.viewer;
        console.log("Viewer joined:", viewerChannel);
        
        const pc = new RTCPeerConnection(rtcConfig);
        viewersRef.current[viewerChannel] = pc;

        if (mediaStream) {
          mediaStream.getTracks().forEach((track) => {
            pc.addTrack(track, mediaStream);
            console.log("Added track:", track.kind);
          });
        }

        pc.onicecandidate = (event) => {
          if (event.candidate) {
            wsRef.current.send(JSON.stringify({ 
              action: "ice-candidate", 
              target: viewerChannel, 
              candidate: event.candidate 
            }));
          }
        };

        pc.onconnectionstatechange = () => {
          console.log("Connection state with viewer:", pc.connectionState);
        };

        try {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          wsRef.current.send(JSON.stringify({ 
            action: "offer", 
            target: viewerChannel, 
            sdp: offer 
          }));
        } catch (err) {
          console.error("Error creating offer:", err);
        }
      }

      if (data.action === "answer") {
        const senderChannel = data.sender;
        const pc = viewersRef.current[senderChannel];
        if (pc) {
          try {
            await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
          } catch (err) {
            console.error("Error setting remote description:", err);
          }
        }
      }

      if (data.action === "ice-candidate") {
        const senderChannel = data.sender;
        const pc = viewersRef.current[senderChannel];
        if (pc && data.candidate) {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
          } catch (err) {
            console.error("Error adding ICE candidate:", err);
          }
        }
      }
    };

    wsRef.current.onerror = (error) => {
      console.error("WebSocket error:", error);
    };

    wsRef.current.onclose = () => {
      console.log("WebSocket closed");
      if (detectionIntervalRef.current) {
        clearInterval(detectionIntervalRef.current);
      }
    };
  };

  // ---------------- Start Stream ----------------
  const startStream = async () => {
    if (!cameraName.trim()) {
      alert("Please enter a camera name");
      return;
    }

    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }, 
        audio: false 
      });

      console.log("Media stream obtained:", mediaStream);
      setStream(mediaStream);
      setIsStreaming(true);

      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
          videoRef.current.play().catch(err => {
            console.error("Error playing video:", err);
          });
        }
      }, 100);

      const { data, error } = await supabase
        .from("Cameras")
        .insert([{ Name: cameraName }])
        .select()
        .single();

      if (error) throw error;
      setCameraId(data.id);
      console.log("Camera created with ID:", data.id);

      startWebRTC(data.id, mediaStream);
    } catch (err) {
      console.error("Error starting stream:", err);
      alert("Error starting stream: " + err.message);
    }
  };

  // ---------------- Stop Stream ----------------
  const stopStream = async () => {
    try {
      // Stop detection interval
      if (detectionIntervalRef.current) {
        clearInterval(detectionIntervalRef.current);
      }

      Object.values(viewersRef.current).forEach(pc => {
        pc.close();
      });
      viewersRef.current = {};

      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }

      if (wsRef.current) {
        wsRef.current.close();
      }

      if (cameraId) {
        const { error } = await supabase
          .from("Cameras")
          .delete()
          .eq("id", cameraId);
        if (error) throw error;
      }

      setStream(null);
      setIsStreaming(false);
      setCameraName("");
      setCameraId(null);
      setStreamerChannel(null);
      setDetections([]);

      console.log("Stream stopped");
    } catch (err) {
      console.error("Error stopping stream:", err);
      alert("Error stopping stream: " + err.message);
    }
  };

  useEffect(() => {
    if (stream && videoRef.current) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(err => {
        console.error("Error playing video:", err);
      });
    }
  }, [stream]);

  useEffect(() => {
    return () => {
      if (isStreaming) {
        stopStream();
      }
    };
  }, []);

  return (
    <div style={{ padding: "30px", textAlign: "center", minHeight: "100vh", background: "#1a1a1a" }}>
      {!isStreaming && <NavBar />}

      {!isStreaming && (
        <div style={{ maxWidth: "500px", margin: "50px auto" }}>
          <h2 style={{ color: "white", marginBottom: "30px" }}>Start Your Camera Stream</h2>
          <input
            value={cameraName}
            onChange={(e) => setCameraName(e.target.value)}
            placeholder="Enter Camera Name"
            style={{ 
              padding: "12px", 
              width: "100%", 
              marginBottom: "20px", 
              borderRadius: "8px", 
              border: "1px solid #555",
              background: "#2a2a2a",
              color: "white",
              fontSize: "16px"
            }}
          />
          <button
            onClick={startStream}
            style={{ 
              padding: "12px 30px", 
              background: "#22c55e", 
              color: "white", 
              borderRadius: "8px", 
              cursor: "pointer",
              border: "none",
              fontSize: "16px",
              fontWeight: "bold",
              width: "100%"
            }}
          >
            Start Streaming
          </button>
        </div>
      )}

      {isStreaming && (
        <div style={{ marginTop: "20px" }}>
          <h3 style={{ color: "white", marginBottom: "10px" }}>
            📹 {cameraName}
          </h3>
          <p style={{ color: "#888", marginBottom: "20px", fontSize: "14px" }}>
            Camera ID: {cameraId} | Channel: {streamerChannel}
          </p>
          
          {/* Detection Stats */}
          <div style={{ 
            marginBottom: "20px", 
            padding: "10px", 
            background: "#2a2a2a", 
            borderRadius: "8px",
            display: "inline-block"
          }}>
            <span style={{ color: "#22c55e", marginRight: "20px" }}>
              🎭 Masks: {detections.filter(d => d.type === 'face_mask').length}
            </span>
            <span style={{ color: "#ef4444" }}>
              🔪 Knives: {detections.filter(d => d.type === 'knife').length}
            </span>
          </div>

          <div style={{ display: "flex", justifyContent: "center", marginBottom: "20px", position: "relative" }}>
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              style={{ 
                width: "80%", 
                maxWidth: "800px",
                borderRadius: "12px", 
                border: "3px solid #22c55e",
                background: "#000",
                display: "block"
              }}
            />
            <canvas
              ref={canvasRef}
              style={{
                position: "absolute",
                width: "80%",
                maxWidth: "800px",
                pointerEvents: "none"
              }}
            />
          </div>
          
          <button
            onClick={stopStream}
            style={{ 
              padding: "12px 30px", 
              background: "#ef4444", 
              color: "white", 
              borderRadius: "8px", 
              cursor: "pointer",
              border: "none",
              fontSize: "16px",
              fontWeight: "bold"
            }}
          >
            Stop Streaming
          </button>
        </div>
      )}
    </div>
  );
}