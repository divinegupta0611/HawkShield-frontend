import React, { useState } from 'react';
import '../style/AuthCSS.css';
import { supabase } from "../SupabaseClient";
import { Link } from 'react-router-dom';
import { GoogleOAuthProvider, useGoogleLogin } from '@react-oauth/google';

// Create a separate component for Google Button
const GoogleButton = () => {
  const googleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      console.log("Google login success, got access token");
      
      try {
        // Get user info directly from Google
        const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${tokenResponse.access_token}` }
        });
        
        const userData = await res.json();
        console.log("User data from Google:", userData);
        
        // Store user data
        localStorage.setItem("hawkshield_user", JSON.stringify({
          email: userData.email,
          name: userData.name,
          picture: userData.picture
        }));
        localStorage.setItem("isLoggedIn", "true");
        
        console.log("Redirecting to home...");
        window.location.href = "/";
        
      } catch (error) {
        console.error("Error fetching user data:", error);
        alert("Login failed. Please try again.");
      }
    },
    onError: (error) => {
      console.error("Google login error:", error);
      alert("Google login failed");
    }
  });

  return (
    <button 
      type="button" 
      onClick={() => googleLogin()} 
      className="social-button google-button"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '10px',
        padding: '10px 20px',
        border: '1px solid #ddd',
        borderRadius: '5px',
        background: 'white',
        cursor: 'pointer',
        width: '100%'
      }}
    >
      <img 
        src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" 
        alt="Google" 
        style={{ width: '20px', height: '20px' }}
      />
      Sign in with Google
    </button>
  );
};

const Login = () => {
  console.log("Client ID:", import.meta.env.VITE_GOOGLE_CLIENT_ID);
  console.log("All env variables:", import.meta.env);
  
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    if (errors[name]) {
      setErrors({ ...errors, [name]: '' });
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    const { data: user, error } = await supabase
      .from("HawkShieldAuth")
      .select("*")
      .eq("Email", formData.email)
      .single();

    if (!user) {
      alert("User not found. Please sign up.");
      return;
    }

    if (user.Password !== formData.password) {
      alert("Incorrect password.");
      return;
    }

    localStorage.setItem("hawkshield_user", JSON.stringify({ name: user.Name, email: user.Email }));
    localStorage.setItem("isLoggedIn", "true");
    alert("Login successful!");
    window.location.href = "/";
  };

  return (
    <div className="auth-container">
      <div className="auth-wrapper login-layout">
        <div className="auth-image-panel">
          <img src="/shield.png" alt="Security Shield" />
          <div className="image-panel-text">
            <h2>Welcome Back!</h2>
            <p>Access your security dashboard</p>
          </div>
        </div>

        <div className="auth-box">
          <div className="auth-header">
            <h1>HawkShield</h1>
            <h2>Welcome Back</h2>
            <p>Login to access your security dashboard</p>
          </div>

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="form-group">
              <label htmlFor="email">Email Address</label>
              <input type="email" id="email" name="email" value={formData.email} onChange={handleChange} placeholder="Enter your email" className={errors.email ? 'error-input' : ''} />
              {errors.email && <span className="error-message">{errors.email}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="password">Password</label>
              <div className="password-input-wrapper">
                <input type={showPassword ? 'text' : 'password'} id="password" name="password" value={formData.password} onChange={handleChange} placeholder="Enter your password" className={errors.password ? 'error-input' : ''} />
                <button type="button" className="toggle-password" onClick={() => setShowPassword(!showPassword)}>
                  {showPassword ? '👁️' : '👁️‍🗨️'}
                </button>
              </div>
              {errors.password && <span className="error-message">{errors.password}</span>}
            </div>

            <div className="form-options">
              <label className="checkbox-label">
                <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} />
                Remember me
              </label>
              <Link to="/forgot-password" className="forgot-link">Forgot Password?</Link>
            </div>

            <button type="submit" className="auth-button">Login</button>

            <div className="divider"><span>OR</span></div>

            <GoogleOAuthProvider clientId="901295510906-4t1cmfsvmuok3p25bg2s0gsc308vg94s.apps.googleusercontent.com">
              <GoogleButton />
            </GoogleOAuthProvider>

          </form>

          <div className="auth-footer">
            <p>Don't have an account? <Link to="/signup">Sign up here</Link></p>
          </div>
        </div>
      </div>
    </div>
  );
};
