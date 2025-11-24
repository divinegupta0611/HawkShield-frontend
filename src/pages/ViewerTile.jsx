// // ViewerTile.jsx
// import React, { useRef, useEffect } from 'react';

// export default function ViewerTile({ camera }) {
//   const remoteVideoRef = useRef();

//   useEffect(() => {
//     let pc;
//     const startView = async () => {
//       pc = new RTCPeerConnection({ iceServers: [{urls:'stun:stun.l.google.com:19302'}] });

//       pc.ontrack = (evt) => {
//         remoteVideoRef.current.srcObject = evt.streams[0];
//       };

//       const offer = await pc.createOffer();
//       await pc.setLocalDescription(offer);
//       const resp = await fetch('https://your-webrtc-server/view', {
//         method: 'POST',
//         headers: {'Content-Type':'application/json'},
//         body: JSON.stringify({ camera_id: camera.id, sdp: offer.sdp, type: offer.type })
//       });
//       const answer = await resp.json();
//       await pc.setRemoteDescription({ type: answer.type, sdp: answer.sdp });
//     };

//     startView();

//     return () => {
//       if (pc) pc.close();
//     };
//   }, [camera.id]);

//   return <div style={{width:240, height:160}}>
//     <video ref={remoteVideoRef} autoPlay playsInline style={{width:'100%', height:'100%'}} />
//   </div>;
// }

import React from 'react'

const ViewerTile = () => {
  return (
    <div>
      <h1>Hello</h1>
    </div>
  )
}

export default ViewerTile
