import React, { useEffect, useRef, useState, useCallback } from "react";
import NavBar from "../components/NavBar";
import '../style/DashboardCSS.css';
import ViewerTile from "./ViewerTile";
export default function Dashboard() {
  return(
    <div>
      <NavBar />
      <ViewerTile/>
    </div>
  );
}