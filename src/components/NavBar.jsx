import React, { useEffect, useState } from 'react';
import "../style/NavBarCSS.css";
import { Link } from 'react-router-dom';
import { supabase } from "../SupabaseClient";

export default function NavBar() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const savedUser = localStorage.getItem("hawkshield_user");
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
  }, []);

  const handleLogout = async () => {
    try {
      // Sign out from Supabase
      await supabase.auth.signOut();
      
      // Clear localStorage
      localStorage.removeItem("hawkshield_user");
      localStorage.clear();
      setUser(null);
      
      // Redirect to home
      window.location.href = "/";
    } catch (error) {
      console.error('Logout error:', error);
      // Still clear local data even if Supabase logout fails
      localStorage.removeItem("hawkshield_user");
      
      setUser(null);
      window.location.href = "/";
    }
  };

  const getInitials = () => {
    if (user?.name) {
      // Get first letter of first and last name if available
      const nameParts = user.name.split(' ');
      if (nameParts.length > 1) {
        return (nameParts[0].charAt(0) + nameParts[nameParts.length - 1].charAt(0)).toUpperCase();
      }
      return user.name.charAt(0).toUpperCase();
    }
    if (user?.email) {
      return user.email.charAt(0).toUpperCase();
    }
    return "?";
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
            <li><Link to="/stream">Stream</Link></li>
            <li><Link to="/dashboard">Dashboard</Link></li>
            {!user ? (
              <li><Link to="/signup">Signup</Link></li>
            ) : (
              <li onClick={handleLogout} className="logout-btn">Logout</li>
            )}
          </ul>

          <div className="user-circle" title={user?.name || user?.email || "User"}>
            {user?.avatar_url ? (
              <img 
                src={user.avatar_url} 
                alt={user.name || "User"} 
                style={{
                  width: '100%',
                  height: '100%',
                  borderRadius: '50%',
                  objectFit: 'cover'
                }}
              />
            ) : (
              getInitials()
            )}
          </div>
        </div>
      </nav>
    </div>
  );
}