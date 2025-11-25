import React, { useRef, useState, useEffect } from "react";
import NavBar from "../components/NavBar";
import { supabase } from "../SupabaseClient";

export default function Stream() {
  const videoRef = useRef(null);
  const [cameraName, setCameraName] = useState("");
  const [cameraId, setCameraId] = useState(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [stream, setStream] = useState(null);
  const [streamerChannel, setStreamerChannel] = useState(null);

  const viewersRef = useRef({}); // track peerConnections per viewer
  const wsRef = useRef(null);
  
  // ---------------- WebRTC Configuration ----------------
  const rtcConfig = {
    iceServers: [
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "stun:stun1.l.google.com:19302" }
    ]
  };

  // ---------------- WebRTC Setup ----------------
const startWebRTC = (cameraId, mediaStream) => {
  wsRef.current = new WebSocket("ws://localhost:8000/ws/camera/");

  wsRef.current.onopen = () => {
    console.log("WebSocket connected");
    // Register as streamer
    wsRef.current.send(JSON.stringify({ 
      action: "streamer_join", 
      camera_id: cameraId 
    }));
  };

  wsRef.current.onmessage = async (message) => {
    const data = JSON.parse(message.data);
    console.log("Received message:", data);

    // Store streamer channel
    if (data.action === "streamer_joined") {
      setStreamerChannel(data.channel);
      console.log("Streamer channel:", data.channel);
    }

    // Viewer joined → create offer
    if (data.action === "viewer_joined") {
      const viewerChannel = data.viewer;
      console.log("Viewer joined:", viewerChannel);
      
      const pc = new RTCPeerConnection(rtcConfig);
      viewersRef.current[viewerChannel] = pc;

      // Add tracks to peer connection - USE THE PASSED STREAM
      if (mediaStream) {
        mediaStream.getTracks().forEach((track) => {
          pc.addTrack(track, mediaStream);
          console.log("Added track:", track.kind);
        });
      } else {
        console.error("No media stream available!");
      }

      // Handle ICE candidates
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          console.log("Sending ICE candidate to viewer:", viewerChannel);
          wsRef.current.send(JSON.stringify({ 
            action: "ice-candidate", 
            target: viewerChannel, 
            candidate: event.candidate 
          }));
        }
      };

      // Monitor connection state
      pc.onconnectionstatechange = () => {
        console.log("Connection state with viewer:", pc.connectionState);
      };

      pc.oniceconnectionstatechange = () => {
        console.log("ICE connection state:", pc.iceConnectionState);
      };

      // Create and send offer
      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        console.log("Created offer for viewer:", viewerChannel);

        wsRef.current.send(JSON.stringify({ 
          action: "offer", 
          target: viewerChannel, 
          sdp: offer 
        }));
      } catch (err) {
        console.error("Error creating offer:", err);
      }
    }

      // Receive answer from viewer
      if (data.action === "answer") {
        const senderChannel = data.sender;
        const pc = viewersRef.current[senderChannel];
        if (pc) {
          try {
            await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
            console.log("Set remote description from viewer:", senderChannel);
          } catch (err) {
            console.error("Error setting remote description:", err);
          }
        }
      }

      // ICE candidate from viewer
      if (data.action === "ice-candidate") {
        const senderChannel = data.sender;
        const pc = viewersRef.current[senderChannel];
        if (pc && data.candidate) {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
            console.log("Added ICE candidate from viewer:", senderChannel);
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
    };
  };

  // ---------------- Start Stream ----------------
const startStream = async () => {
  if (!cameraName.trim()) {
    alert("Please enter a camera name");
    return;
  }

  try {
    // ---------------- Start webcam FIRST ----------------
    const mediaStream = await navigator.mediaDevices.getUserMedia({ 
  video: { 
    width: { ideal: 1280 },
    height: { ideal: 720 }
  }, 
  audio: false 
});

// ADD THESE DEBUG LINES
console.log("Media stream obtained:", mediaStream);
console.log("Video tracks:", mediaStream.getVideoTracks());
console.log("Track settings:", mediaStream.getVideoTracks()[0]?.getSettings());

setStream(mediaStream);
setIsStreaming(true);

// Attach video to element - WAIT FOR NEXT RENDER
setTimeout(() => {
  if (videoRef.current) {
    videoRef.current.srcObject = mediaStream;
    console.log("Video element srcObject set:", videoRef.current.srcObject);
    
    videoRef.current.play().catch(err => {
      console.error("Error playing video:", err);
    });
  } else {
    console.error("videoRef.current is null!");
  }
}, 100);

    // ---------------- Insert camera in Supabase ----------------
    const { data, error } = await supabase
      .from("Cameras")
      .insert([{ Name: cameraName }])
      .select()
      .single();

    if (error) throw error;
    setCameraId(data.id);
    console.log("Camera created with ID:", data.id);

    // ---------------- Start WebRTC with the stream ----------------
    startWebRTC(data.id, mediaStream);
  } catch (err) {
    console.error("Error starting stream:", err);
    alert("Error starting stream: " + err.message);
  }
};

  // ---------------- Stop Stream ----------------
  const stopStream = async () => {
    try {
      // ---------------- Close all peer connections ----------------
      Object.values(viewersRef.current).forEach(pc => {
        pc.close();
      });
      viewersRef.current = {};

      // ---------------- Stop webcam ----------------
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }

      // ---------------- Close WebSocket ----------------
      if (wsRef.current) {
        wsRef.current.close();
      }

      // ---------------- Delete camera from Supabase ----------------
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

      console.log("Stream stopped");
    } catch (err) {
      console.error("Error stopping stream:", err);
      alert("Error stopping stream: " + err.message);
    }
  };
// ---------------- Attach stream to video element ----------------
useEffect(() => {
  if (stream && videoRef.current) {
    console.log("Attaching stream to video element");
    videoRef.current.srcObject = stream;
    videoRef.current.play().catch(err => {
      console.error("Error playing video:", err);
    });
  }
}, [stream]);
  // ---------------- Cleanup on unmount ----------------
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
          <div style={{ display: "flex", justifyContent: "center", marginBottom: "20px" }}>
            <video
  ref={videoRef}
  autoPlay
  muted
  playsInline
  onLoadedMetadata={() => {
    console.log("Video metadata loaded");
    console.log("Video dimensions:", videoRef.current.videoWidth, "x", videoRef.current.videoHeight);
  }}
  onCanPlay={() => {
    console.log("Video can play");
  }}
  style={{ 
    width: "80%", 
    maxWidth: "800px",
    borderRadius: "12px", 
    border: "3px solid #22c55e",
    background: "#000"
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