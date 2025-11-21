import React, { useEffect, useRef, useState } from "react";
import NavBar from "../components/NavBar";
import '../style/DashboardCSS.css';

export default function Detect() {
  const [isDetecting, setIsDetecting] = useState(false);
  const [detectionResults, setDetectionResults] = useState({
    knife: [],
    gun: [],
    mask: [],
    emotion: [],
    angry_emotions: [],
    has_threat: false
  });
  const [detectionHistory, setDetectionHistory] = useState([]);
  const [error, setError] = useState(null);

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const detectionIntervalRef = useRef(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
      stopDetection();
    };
  }, []);

  const startDetection = async () => {
    try {
      setError(null);
      setIsDetecting(true);

      // Get webcam access
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720 }
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      // Start detection every 2 seconds
      detectionIntervalRef.current = setInterval(() => {
        if (mountedRef.current && streamRef.current) {
          performDetection();
        }
      }, 2000); // Detect every 2 seconds

      // Perform first detection immediately
      performDetection();

    } catch (error) {
      console.error("Error starting camera:", error);
      setError(`Camera access error: ${error.message}`);
      setIsDetecting(false);
    }
  };

  const stopDetection = () => {
    // Stop webcam
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    // Clear detection interval
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current);
      detectionIntervalRef.current = null;
    }

    setIsDetecting(false);
  };

  const captureFrame = () => {
    const video = videoRef.current;
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

  const performDetection = async () => {
    const frame = await captureFrame();
    if (!frame) return;

    const formData = new FormData();
    formData.append("image", frame, "frame.jpg");

    try {
      const response = await fetch("https://hawkshield-backend-6.onrender.com/api/detection/threats/", {
        method: "POST",
        body: formData
      });

      if (!response.ok) {
        throw new Error(`Detection failed: ${response.status}`);
      }

      const data = await response.json();

      // Debug logging
      console.log("=== DETECTION RESULTS ===");
      console.log("Full response:", data);
      console.log("Summary:", {
        knife: data.knife?.length || 0,
        gun: data.gun?.length || 0,
        mask: data.mask?.length || 0,
        emotion: data.emotion?.length || 0,
        angry: data.angry_emotions?.length || 0,
        has_threat: data.has_threat
      });
      if (data.mask && data.mask.length > 0) {
        console.log("Mask detections:", data.mask);
      } else {
        console.log("No masks detected in response");
      }

      if (mountedRef.current) {
        setDetectionResults({
          knife: data.knife || [],
          gun: data.gun || [],
          mask: data.mask || [],
          emotion: data.emotion || [],
          angry_emotions: data.angry_emotions || [],
          has_threat: data.has_threat || false
        });

        // Add to history if threat detected
        if (data.has_threat) {
          const timestamp = new Date().toLocaleTimeString();
          const threatTypes = [];
          if (data.knife?.length > 0) threatTypes.push(`Knife (${data.knife.length})`);
          if (data.gun?.length > 0) threatTypes.push(`Gun (${data.gun.length})`);
          if (data.mask?.length > 0) threatTypes.push(`Face Mask (${data.mask.length})`);
          if (data.angry_emotions?.length > 0) threatTypes.push(`Angry Person (${data.angry_emotions.length})`);

          setDetectionHistory(prev => [
            {
              timestamp,
              threats: threatTypes,
              detections: {
                knife: data.knife?.length || 0,
                gun: data.gun?.length || 0,
                mask: data.mask?.length || 0,
                angry: data.angry_emotions?.length || 0
              }
            },
            ...prev.slice(0, 19) // Keep last 20 entries
          ]);
        }
      }
    } catch (err) {
      console.error("Detection error:", err);
      if (mountedRef.current) {
        setError(`Detection error: ${err.message}`);
        // Still show current results even if there's an error
        console.log("Current detection state:", detectionResults);
      }
    }
  };

  return (
    <div className="dashboard-container">
      <NavBar />

      <div style={{ maxWidth: '1400px', margin: '2rem auto', padding: '2rem' }}>
        <h1 style={{ marginBottom: '1rem', textAlign: 'center' }}>Real-Time Threat Detection</h1>
        <p style={{ marginBottom: '2rem', textAlign: 'center', color: '#666' }}>
          Open your camera to detect knives, guns, face masks, and angry emotions in real-time
        </p>

        {/* Error Message */}
        {error && (
          <div style={{
            padding: '1rem',
            backgroundColor: '#fee2e2',
            color: '#dc2626',
            borderRadius: '8px',
            marginBottom: '1rem',
            textAlign: 'center'
          }}>
            {error}
          </div>
        )}

        {/* Control Buttons */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginBottom: '2rem' }}>
          {!isDetecting ? (
            <button
              onClick={startDetection}
              style={{
                padding: '0.75rem 2rem',
                fontSize: '1.1rem',
                backgroundColor: '#22c55e',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: 'bold'
              }}
            >
              🎥 Start Detection
            </button>
          ) : (
            <button
              onClick={stopDetection}
              style={{
                padding: '0.75rem 2rem',
                fontSize: '1.1rem',
                backgroundColor: '#ef4444',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: 'bold'
              }}
            >
              ⏹️ Stop Detection
            </button>
          )}
        </div>

        {/* Main Content Grid */}
        {isDetecting && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
            {/* Left: Camera Feed */}
            <div>
              <div style={{
                backgroundColor: '#1e293b',
                borderRadius: '16px',
                padding: '1rem',
                border: '2px solid #334155'
              }}>
                <h3 style={{ color: 'white', marginBottom: '1rem', textAlign: 'center' }}>
                  Camera Feed
                  {detectionResults.has_threat && (
                    <span style={{ marginLeft: '1rem', color: '#ef4444' }}>⚠️ THREAT DETECTED</span>
                  )}
                </h3>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  style={{
                    width: '100%',
                    borderRadius: '8px',
                    backgroundColor: '#000',
                    border: detectionResults.has_threat ? '3px solid #ef4444' : '2px solid #334155'
                  }}
                />
              </div>

              {/* Current Detection Results */}
              <div style={{
                marginTop: '1rem',
                backgroundColor: '#f8fafc',
                borderRadius: '16px',
                padding: '1.5rem',
                border: '2px solid #e2e8f0'
              }}>
                <h3 style={{ marginBottom: '1rem' }}>Current Detection Results</h3>
                
                <div style={{ display: 'grid', gap: '1rem' }}>
                  {/* Knife Detection */}
                  <div style={{
                    padding: '1rem',
                    borderRadius: '8px',
                    backgroundColor: detectionResults.knife.length > 0 ? '#fee2e2' : '#f0fdf4',
                    border: `2px solid ${detectionResults.knife.length > 0 ? '#ef4444' : '#22c55e'}`
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>
                        🔪 Knife Detection
                      </span>
                      <span style={{
                        fontSize: '1.2rem',
                        fontWeight: 'bold',
                        color: detectionResults.knife.length > 0 ? '#dc2626' : '#16a34a'
                      }}>
                        {detectionResults.knife.length}
                      </span>
                    </div>
                  </div>

                  {/* Gun Detection */}
                  <div style={{
                    padding: '1rem',
                    borderRadius: '8px',
                    backgroundColor: detectionResults.gun.length > 0 ? '#fee2e2' : '#f0fdf4',
                    border: `2px solid ${detectionResults.gun.length > 0 ? '#ef4444' : '#22c55e'}`
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>
                        🔫 Gun Detection
                      </span>
                      <span style={{
                        fontSize: '1.2rem',
                        fontWeight: 'bold',
                        color: detectionResults.gun.length > 0 ? '#dc2626' : '#16a34a'
                      }}>
                        {detectionResults.gun.length}
                      </span>
                    </div>
                  </div>

                  {/* Mask Detection */}
                  <div style={{
                    padding: '1rem',
                    borderRadius: '8px',
                    backgroundColor: detectionResults.mask.length > 0 ? '#fee2e2' : '#f0fdf4',
                    border: `2px solid ${detectionResults.mask.length > 0 ? '#ef4444' : '#22c55e'}`
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>
                        😷 Face Mask Detection
                      </span>
                      <span style={{
                        fontSize: '1.2rem',
                        fontWeight: 'bold',
                        color: detectionResults.mask.length > 0 ? '#dc2626' : '#16a34a'
                      }}>
                        {detectionResults.mask.length}
                      </span>
                    </div>
                    {detectionResults.mask.length > 0 && (
                      <div style={{ marginTop: '0.5rem', fontSize: '0.9rem', color: '#991b1b' }}>
                        {detectionResults.mask.map((mask, idx) => {
                          const confidence = (mask.confidence || mask.confidence_score || 0) * 100;
                          return (
                            <div key={idx}>
                              Mask detected (Confidence: {confidence.toFixed(1)}%)
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Angry Emotion Detection */}
                  <div style={{
                    padding: '1rem',
                    borderRadius: '8px',
                    backgroundColor: detectionResults.angry_emotions.length > 0 ? '#fee2e2' : '#f0fdf4',
                    border: `2px solid ${detectionResults.angry_emotions.length > 0 ? '#ef4444' : '#22c55e'}`
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>
                        😠 Angry Person Detection
                      </span>
                      <span style={{
                        fontSize: '1.2rem',
                        fontWeight: 'bold',
                        color: detectionResults.angry_emotions.length > 0 ? '#dc2626' : '#16a34a'
                      }}>
                        {detectionResults.angry_emotions.length}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Overall Status */}
                <div style={{
                  marginTop: '1.5rem',
                  padding: '1rem',
                  borderRadius: '8px',
                  backgroundColor: detectionResults.has_threat ? '#fee2e2' : '#dcfce7',
                  border: `2px solid ${detectionResults.has_threat ? '#ef4444' : '#22c55e'}`,
                  textAlign: 'center'
                }}>
                  <div style={{
                    fontSize: '1.3rem',
                    fontWeight: 'bold',
                    color: detectionResults.has_threat ? '#dc2626' : '#16a34a'
                  }}>
                    {detectionResults.has_threat ? '⚠️ THREAT DETECTED' : '✓ ALL CLEAR'}
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Detection History */}
            <div>
              <div style={{
                backgroundColor: '#1e293b',
                borderRadius: '16px',
                padding: '1.5rem',
                border: '2px solid #334155',
                height: '600px',
                overflowY: 'auto'
              }}>
                <h3 style={{ color: 'white', marginBottom: '1rem' }}>Detection History</h3>
                
                {detectionHistory.length === 0 ? (
                  <div style={{
                    textAlign: 'center',
                    color: '#94a3b8',
                    marginTop: '3rem',
                    fontSize: '1.1rem'
                  }}>
                    No threats detected yet...
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {detectionHistory.map((entry, index) => (
                      <div
                        key={index}
                        style={{
                          backgroundColor: '#334155',
                          padding: '1rem',
                          borderRadius: '8px',
                          border: '2px solid #475569'
                        }}
                      >
                        <div style={{ color: '#ef4444', fontWeight: 'bold', marginBottom: '0.5rem' }}>
                          ⚠️ Threat Detected - {entry.timestamp}
                        </div>
                        <div style={{ color: '#cbd5e1', marginBottom: '0.5rem' }}>
                          <strong>Threats:</strong> {entry.threats.join(', ')}
                        </div>
                        <div style={{ color: '#94a3b8', fontSize: '0.9rem' }}>
                          🔪 Knife: {entry.detections.knife} | 
                          🔫 Gun: {entry.detections.gun} | 
                          😷 Mask: {entry.detections.mask} | 
                          😠 Angry: {entry.detections.angry}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Instructions when not detecting */}
        {!isDetecting && (
          <div style={{
            marginTop: '2rem',
            padding: '2rem',
            backgroundColor: '#f3f4f6',
            borderRadius: '8px',
            textAlign: 'center'
          }}>
            <h3 style={{ marginBottom: '1rem' }}>How to Use</h3>
            <ol style={{ textAlign: 'left', maxWidth: '600px', margin: '0 auto', lineHeight: '2' }}>
              <li>Click "Start Detection" to open your camera</li>
              <li>Allow camera access when prompted</li>
              <li>The system will automatically detect threats every 2 seconds</li>
              <li>View real-time detection results on the left</li>
              <li>Threat history will appear on the right when threats are detected</li>
              <li>Click "Stop Detection" when done</li>
            </ol>
          </div>
        )}
      </div>
    </div>
  );
}

