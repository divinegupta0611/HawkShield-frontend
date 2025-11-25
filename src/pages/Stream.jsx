import React, { useRef, useState } from "react";

export default function Stream() {
  const videoRef = useRef(null);
  const [cameraName, setCameraName] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [stream, setStream] = useState(null);

  const startStream = async () => {
    if (!cameraName.trim()) {
      alert("Please enter a camera name");
      return;
    }

    try {
      // Request access to webcam
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: false,
      });

      setStream(mediaStream);
      setIsStreaming(true);

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      console.error("Error starting stream:", err);
      alert("Error starting stream. Make sure your camera is available and permissions are allowed.");
    }
  };

  const stopStream = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
    }

    setIsStreaming(false);
    setStream(null);
    setCameraName("");
  };

  return (
    <div style={{ padding: "30px", textAlign: "center" }}>
      {!isStreaming && (
        <>
          <h2>Start Your Camera Stream</h2>
          <input
            value={cameraName}
            onChange={(e) => setCameraName(e.target.value)}
            placeholder="Enter Camera Name"
            style={{
              padding: "10px",
              width: "250px",
              marginRight: "10px",
              borderRadius: "6px",
              border: "1px solid #555",
            }}
          />
          <button
            onClick={startStream}
            style={{
              padding: "10px 20px",
              background: "green",
              color: "white",
              borderRadius: "6px",
              cursor: "pointer",
            }}
          >
            Start Streaming
          </button>
        </>
      )}

      {isStreaming && (
        <div style={{ marginTop: "20px" }}>
          <h3>Camera: {cameraName}</h3>
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            style={{
              width: "60%",
              borderRadius: "12px",
              border: "3px solid #222",
            }}
          ></video>
          <br />
          <button
            onClick={stopStream}
            style={{
              marginTop: "20px",
              padding: "10px 20px",
              background: "red",
              color: "white",
              borderRadius: "6px",
              cursor: "pointer",
            }}
          >
            Stop Streaming
          </button>
        </div>
      )}
    </div>
  );
}
