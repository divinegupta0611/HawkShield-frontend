import React, { useRef, useState, useEffect } from "react";

export default function StreamCamera() {
  const videoRef = useRef(null);
  const [pc, setPc] = useState(null);
  const [localStream, setLocalStream] = useState(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [cameraName, setCameraName] = useState("");
  const [currentCameraId, setCurrentCameraId] = useState(null);

  // Show camera preview immediately
  useEffect(() => {
    const enableCameraPreview = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
        setLocalStream(stream);
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error("Camera access error:", err);
        alert("Unable to access camera. Please grant permission.");
      }
    };
    enableCameraPreview();

    // Cleanup on unmount
    return () => {
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
      if (pc) {
        pc.close();
      }
    };
  }, []);

  const startStream = async () => {
    try {
      if (!cameraName.trim()) {
        alert("Enter a camera name!");
        return;
      }

      // STEP 1 — Create camera entry
      const createResp = await fetch("/api/cameras/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer <token>",
        },
        body: JSON.stringify({ name: cameraName }),
      });
      const cam = await createResp.json();
      const camera_id = cam.id;
      setCurrentCameraId(camera_id);

      // STEP 2 — Use already running preview stream
      const stream = localStream;

      // STEP 3 — Create WebRTC connection
      const rtc = new RTCPeerConnection({
        iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
      });
      setPc(rtc);
      stream.getTracks().forEach((t) => rtc.addTrack(t, stream));

      // STEP 4 — Create WebRTC offer
      const offer = await rtc.createOffer();
      await rtc.setLocalDescription(offer);

      // STEP 5 — Send offer to WebRTC server
      const resp = await fetch("https://your-webrtc-server/offer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          camera_id,
          sdp: offer.sdp,
          type: offer.type,
        }),
      });
      const answer = await resp.json();
      await rtc.setRemoteDescription({
        type: answer.type,
        sdp: answer.sdp,
      });

      // STEP 6 — Update camera status
      await fetch(`/api/cameras/${camera_id}/status/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_live: true }),
      });

      setIsStreaming(true);
    } catch (err) {
      console.error("Streaming error:", err);
      alert("Error starting stream");
    }
  };

  const stopStream = async () => {
    try {
      // Update camera status to not live
      if (currentCameraId) {
        await fetch(`/api/cameras/${currentCameraId}/status/`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ is_live: false }),
        });
      }

      // Close WebRTC connection
      if (pc) {
        pc.close();
        setPc(null);
      }

      // Stop local stream tracks
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
        setLocalStream(null);
      }

      // Clear video element
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }

      setIsStreaming(false);
      setCurrentCameraId(null);
      setCameraName("");

      // Restart camera preview
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: false,
      });
      setLocalStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Error stopping stream:", err);
      alert("Error stopping stream");
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      padding: "40px 20px",
      fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif"
    }}>
      <div style={{
        maxWidth: "800px",
        margin: "0 auto",
        background: "white",
        borderRadius: "20px",
        padding: "40px",
        boxShadow: "0 20px 60px rgba(0,0,0,0.3)"
      }}>
        {!isStreaming ? (
          <>
            <h1 style={{
              fontSize: "32px",
              fontWeight: "bold",
              color: "#333",
              marginBottom: "10px",
              textAlign: "center"
            }}>
              Stream Your Camera
            </h1>
            <p style={{
              color: "#666",
              textAlign: "center",
              marginBottom: "30px",
              fontSize: "16px"
            }}>
              Use this page to stream your laptop's webcam to the central monitoring dashboard
            </p>

            <div style={{
              background: "#f8f9fa",
              borderRadius: "12px",
              padding: "30px",
              marginBottom: "30px"
            }}>
              <label style={{
                display: "block",
                fontSize: "14px",
                fontWeight: "600",
                color: "#333",
                marginBottom: "10px"
              }}>
                Enter camera name (e.g., 'Entrance Camera')
              </label>
              <input
                type="text"
                value={cameraName}
                onChange={(e) => setCameraName(e.target.value)}
                placeholder="Camera Name"
                style={{
                  width: "100%",
                  padding: "15px",
                  fontSize: "16px",
                  border: "2px solid #ddd",
                  borderRadius: "8px",
                  outline: "none",
                  transition: "border-color 0.3s",
                  boxSizing: "border-box"
                }}
                onFocus={(e) => e.target.style.borderColor = "#667eea"}
                onBlur={(e) => e.target.style.borderColor = "#ddd"}
              />
              <button
                onClick={startStream}
                style={{
                  width: "100%",
                  marginTop: "15px",
                  padding: "15px",
                  fontSize: "18px",
                  fontWeight: "600",
                  background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                  color: "white",
                  border: "none",
                  borderRadius: "8px",
                  cursor: "pointer",
                  transition: "transform 0.2s, box-shadow 0.2s"
                }}
                onMouseOver={(e) => {
                  e.target.style.transform = "translateY(-2px)";
                  e.target.style.boxShadow = "0 10px 20px rgba(102, 126, 234, 0.4)";
                }}
                onMouseOut={(e) => {
                  e.target.style.transform = "translateY(0)";
                  e.target.style.boxShadow = "none";
                }}
              >
                Start Streaming
              </button>
            </div>

            <div style={{
              background: "#e3f2fd",
              borderLeft: "4px solid #2196F3",
              borderRadius: "8px",
              padding: "20px",
              marginBottom: "20px"
            }}>
              <h3 style={{
                fontSize: "18px",
                fontWeight: "600",
                color: "#1976D2",
                marginBottom: "15px",
                marginTop: "0"
              }}>
                Instructions:
              </h3>
              <ol style={{
                color: "#555",
                lineHeight: "1.8",
                paddingLeft: "20px",
                margin: "0"
              }}>
                <li>Enter a descriptive name for your camera</li>
                <li>Click "Start Streaming" and allow webcam access</li>
                <li>Your camera feed will appear on the central dashboard</li>
                <li>Keep this page open to continue streaming</li>
                <li>Click "Stop Streaming" when done</li>
              </ol>
            </div>
          </>
        ) : (
          <>
            <h2 style={{
              fontSize: "28px",
              fontWeight: "bold",
              color: "#333",
              marginBottom: "10px",
              textAlign: "center"
            }}>
              🔴 Live Streaming
            </h2>
            <p style={{
              color: "#666",
              textAlign: "center",
              marginBottom: "30px",
              fontSize: "16px"
            }}>
              Camera: <strong>{cameraName}</strong>
            </p>

            <div style={{
              background: "#000",
              borderRadius: "12px",
              overflow: "hidden",
              marginBottom: "20px",
              position: "relative"
            }}>
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                style={{
                  width: "100%",
                  display: "block",
                  maxHeight: "500px",
                  objectFit: "cover"
                }}
              ></video>
              <div style={{
                position: "absolute",
                top: "15px",
                left: "15px",
                background: "rgba(255, 0, 0, 0.9)",
                color: "white",
                padding: "8px 15px",
                borderRadius: "20px",
                fontSize: "14px",
                fontWeight: "600",
                display: "flex",
                alignItems: "center",
                gap: "8px"
              }}>
                <span style={{
                  width: "10px",
                  height: "10px",
                  background: "white",
                  borderRadius: "50%",
                  animation: "pulse 1.5s ease-in-out infinite"
                }}></span>
                LIVE
              </div>
            </div>

            <button
              onClick={stopStream}
              style={{
                width: "100%",
                padding: "15px",
                fontSize: "18px",
                fontWeight: "600",
                background: "#dc3545",
                color: "white",
                border: "none",
                borderRadius: "8px",
                cursor: "pointer",
                transition: "transform 0.2s, box-shadow 0.2s"
              }}
              onMouseOver={(e) => {
                e.target.style.transform = "translateY(-2px)";
                e.target.style.boxShadow = "0 10px 20px rgba(220, 53, 69, 0.4)";
                e.target.style.background = "#c82333";
              }}
              onMouseOut={(e) => {
                e.target.style.transform = "translateY(0)";
                e.target.style.boxShadow = "none";
                e.target.style.background = "#dc3545";
              }}
            >
              Stop Streaming
            </button>

            <div style={{
              marginTop: "20px",
              padding: "15px",
              background: "#fff3cd",
              borderLeft: "4px solid #ffc107",
              borderRadius: "8px",
              color: "#856404",
              fontSize: "14px"
            }}>
              ⚠️ Keep this page open to continue streaming. Closing or refreshing will stop the stream.
            </div>
          </>
        )}
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.3;
          }
        }
      `}</style>
    </div>
  );
}