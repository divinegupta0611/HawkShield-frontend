import React, { useRef, useState, useEffect } from "react";

export default function Stream() {
  const videoRef = useRef(null);
  const [pc, setPc] = useState(null);
  const [localStream, setLocalStream] = useState(null);

  // -------------------------
  // SHOW CAMERA IMMEDIATELY
  // -------------------------
  useEffect(() => {
    const enableCameraPreview = async () => {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: false,
      });

      setLocalStream(stream);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    };

    enableCameraPreview();
  }, []);

  const startStream = async (cameraName) => {
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
    } catch (err) {
      console.error("Streaming error:", err);
      alert("Error starting stream");
    }
  };

  return (
    <div style={{ padding: "20px" }}>
      <h2>Start Live Stream</h2>

      <input
        id="camName"
        placeholder="Camera Name"
        style={{ padding: "10px", marginRight: "10px" }}
      />

      <button
        onClick={() =>
          startStream(document.getElementById("camName").value)
        }
        style={{
          padding: "10px 20px",
          background: "green",
          color: "white",
        }}
      >
        Start Stream
      </button>

      <div style={{ marginTop: "20px" }}>
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          style={{
            width: "500px",
            borderRadius: "10px",
            border: "2px solid #333",
          }}
        ></video>
      </div>
    </div>
  );
}
