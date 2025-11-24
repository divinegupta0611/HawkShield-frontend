import React, { useEffect, useRef, useState } from "react";
import NavBar from "../components/NavBar";
import '../style/DashboardCSS.css';

/**
 * StreamCamera Component
 * This component should be used on Laptop 1 and Laptop 2
 * to stream their local webcams to the backend
 */
export default function StreamCamera() {
  const [cameraName, setCameraName] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [status, setStatus] = useState("Not streaming");
  const [cameraId, setCameraId] = useState(null);
  
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const detectionIntervalRef = useRef(null);
  const heartbeatIntervalRef = useRef(null);
  const frameUploadIntervalRef = useRef(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
      stopStreaming();
    };
  }, []);

  const getDeviceId = () => {
    let deviceId = localStorage.getItem('deviceId');
    if (!deviceId) {
      deviceId = 'device_' + Math.random().toString(36).substr(2, 9);
      localStorage.setItem('deviceId', deviceId);
    }
    return deviceId;
  };

  const startStreaming = async () => {
    if (!cameraName.trim()) {
      alert("Please enter a camera name");
      return;
    }

    try {
      setStatus("Starting webcam...");

      // Get webcam access
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720 }
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      // Generate unique camera ID
      const newCameraId = `cam_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const deviceId = getDeviceId();

      setStatus("Registering camera...");

      // Register camera with backend
      const response = await fetch("https://hawkshield-backend-6.onrender.com/api/cameras/add/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cameraId: newCameraId,
          cameraName: cameraName,
          sourceDeviceId: deviceId,
          hasRemoteStream: true,
          people: 0,
          threats: 0
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to register camera");
      }

      setCameraId(newCameraId);
      setIsStreaming(true);
      setStatus("🔴 Streaming live");

      // Start uploading frames every 200ms for smooth streaming
      frameUploadIntervalRef.current = setInterval(() => {
        if (mountedRef.current && streamRef.current) {
          uploadFrame(newCameraId);
        }
      }, 200); // 5 FPS

      // Start sending frames for detection every 5 seconds
      detectionIntervalRef.current = setInterval(() => {
        if (mountedRef.current && streamRef.current) {
          sendFrameForDetection(newCameraId);
        }
      }, 5000);

      // Send heartbeat every 10 seconds to keep camera active
      heartbeatIntervalRef.current = setInterval(() => {
        sendHeartbeat(newCameraId);
      }, 10000);

    } catch (error) {
      console.error("Error starting stream:", error);
      setStatus(`Error: ${error.message}`);
      stopStreaming();
    }
  };

  const stopStreaming = async () => {
    // Stop webcam
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    // Clear intervals
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current);
      detectionIntervalRef.current = null;
    }

    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }

    if (frameUploadIntervalRef.current) {
      clearInterval(frameUploadIntervalRef.current);
      frameUploadIntervalRef.current = null;
    }

    // Remove camera from backend
    if (cameraId) {
      try {
        await fetch(`https://hawkshield-backend-6.onrender.com/api/cameras/delete/${cameraId}/`, {
          method: "DELETE"
        });
      } catch (error) {
        console.error("Error removing camera:", error);
      }
    }

    setIsStreaming(false);
    setStatus("Not streaming");
    setCameraId(null);
  };

  const captureFrame = () => {
    const video = videoRef.current;
    if (!video || video.readyState !== 4) return null;

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    return new Promise((resolve) => {
      canvas.toBlob((blob) => resolve(blob), "image/jpeg", 0.8);
    });
  };

  const uploadFrame = async (camId) => {
    const frame = await captureFrame();
    if (!frame) return;

    const formData = new FormData();
    formData.append("frame", frame, "frame.jpg");

    try {
      await fetch(`https://hawkshield-backend-6.onrender.com/api/cameras/frame/${camId}/upload/`, {
        method: "POST",
        body: formData
      });
    } catch (error) {
      console.error("Frame upload error:", error);
    }
  };

  const sendFrameForDetection = async (camId) => {
    if (!mountedRef.current || !streamRef.current) return;

    const frame = await captureFrame();
    if (!frame) return;

    const formData = new FormData();
    formData.append("image", frame, "frame.jpg");
    formData.append("cameraId", camId);
    formData.append("cameraName", cameraName);

    try {
      const response = await fetch("https://hawkshield-backend-6.onrender.com/api/detection/threats/", {
        method: "POST",
        body: formData
      });

      if (response.ok) {
        const data = await response.json();
        console.log("Detection result:", data);
      }
    } catch (error) {
      console.error("Detection error:", error);
    }
  };

  const sendHeartbeat = async (camId) => {
    try {
      await fetch(`https://hawkshield-backend-6.onrender.com/api/cameras/update/${camId}/`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "active"
        })
      });
    } catch (error) {
      console.error("Heartbeat error:", error);
    }
  };

  return (
    <div className="dashboard-container">
      <NavBar />

      <div style={{ maxWidth: '800px', margin: '2rem auto', padding: '2rem' }}>
        <h1 style={{ marginBottom: '1rem' }}>Stream Your Camera</h1>
        <p style={{ marginBottom: '2rem', color: '#666' }}>
          Use this page to stream your laptop's webcam to the central monitoring dashboard
        </p>

        {!isStreaming ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <input
              type="text"
              placeholder="Enter camera name (e.g., 'Entrance Camera')"
              value={cameraName}
              onChange={(e) => setCameraName(e.target.value)}
              style={{
                padding: '0.75rem',
                fontSize: '1rem',
                border: '2px solid #ddd',
                borderRadius: '8px'
              }}
            />
            <button
              onClick={startStreaming}
              style={{
                padding: '0.75rem 1.5rem',
                fontSize: '1rem',
                backgroundColor: '#22c55e',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer'
              }}
            >
              Start Streaming
            </button>
          </div>
        ) : (
          <div>
            <div style={{ 
              padding: '1rem', 
              backgroundColor: '#dcfce7', 
              borderRadius: '8px', 
              marginBottom: '1rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <strong>{cameraName}</strong>
                <div style={{ fontSize: '0.875rem', color: '#16a34a' }}>{status}</div>
                <div style={{ fontSize: '0.75rem', color: '#666' }}>ID: {cameraId}</div>
              </div>
              <button
                onClick={stopStreaming}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: '#ef4444',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
              >
                Stop Streaming
              </button>
            </div>

            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              style={{
                width: '100%',
                borderRadius: '8px',
                backgroundColor: '#000'
              }}
            />
          </div>
        )}

        <div style={{ marginTop: '2rem', padding: '1rem', backgroundColor: '#f3f4f6', borderRadius: '8px' }}>
          <h3 style={{ marginBottom: '0.5rem' }}>Instructions:</h3>
          <ol style={{ paddingLeft: '1.5rem' }}>
            <li>Enter a descriptive name for your camera</li>
            <li>Click "Start Streaming" and allow webcam access</li>
            <li>Your camera feed will appear on the central dashboard</li>
            <li>Keep this page open to continue streaming</li>
            <li>Click "Stop Streaming" when done</li>
          </ol>
        </div>
      </div>
    </div>
  );
}