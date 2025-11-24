import React, { useEffect, useState } from 'react';
import "../style/NavBarCSS.css";
import { Link } from 'react-router-dom';

export default function NavBar() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const savedUser = localStorage.getItem("hawkshield_user");
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("hawkshield_user");
    setUser(null);
    window.location.href = "/";
  };

  return (
    <div>
      <nav className="navbar">
        <div className="navbar-content">
          <div className="logo">HawkShield</div>

          <ul className="nav-links">
            <li><Link to="/">Home</Link></li>
            <li><Link to="/about">About</Link></li>
            <li><Link to="/contact">Contact Us</Link></li>
            <li><Link to="/detect">Detect</Link></li>
            <li><Link to="/dashboard">Dashboard</Link></li>
            <li><Link to="/detect">Detect</Link></li>
            {!user ? (
              <li><Link to="/signup">Signup</Link></li>
            ) : (
              <li onClick={handleLogout} className="logout-btn">Logout</li>
            )}
          </ul>

          <div className="user-circle">
            {(user?.email?.charAt(0)?.toUpperCase()) || "?"}
          </div>
        </div>
      </nav>
    </div>
  );
}
