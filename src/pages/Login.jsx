import React, { useState } from 'react';
import '../style/AuthCSS.css';
import { supabase } from "../SupabaseClient";
import { Link, useNavigate } from 'react-router-dom';

// Google OAuth Button
const GoogleButton = () => {
  const handleGoogleSignIn = async () => {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth-success`
        }
      });

      if (error) {
        console.error("Google OAuth error:", error);
        return;
      }

      // No user yet → Supabase will redirect
    } catch (err) {
      console.error("Unexpected OAuth error:", err);
    }
  };

  return (
    <button 
      type="button" 
      onClick={handleGoogleSignIn} 
      className="social-button google-button"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '10px',
        padding: '12px 20px',
        border: '1px solid #ddd',
        borderRadius: '5px',
        background: 'white',
        cursor: 'pointer',
        width: '100%',
        fontSize: '14px',
        fontWeight: '500'
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
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

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

    setIsLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      });

      if (error) {
        console.error('Login error:', error);
        alert(error.message || 'Login failed');
        setIsLoading(false);
        return;
      }

      console.log('Login successful:', data);
      console.log('Login successful:', data);

      const user = data.user;

      // Build a unified login object
      const hawkUser = {
        isLoggedIn: true,
        name: user.user_metadata.full_name || "",
        email: user.email || "",
        phone: user.user_metadata.phone || "",
        avatar_url: user.user_metadata.avatar_url || "", 
        provider: "email"
      };

      // Save in ONE place exactly like GoogleLogin
      localStorage.setItem("hawkshield_user", JSON.stringify(hawkUser));
      localStorage.setItem("isLoggedIn", "true");

      alert("Login successful!");
      navigate("/");

    } catch (err) {
      console.error('Unexpected login error:', err);
      alert('Login failed. Please try again.');
      setIsLoading(false);
    }
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
              <input 
                type="email" 
                id="email" 
                name="email" 
                value={formData.email} 
                onChange={handleChange} 
                placeholder="Enter your email" 
                className={errors.email ? 'error-input' : ''} 
                disabled={isLoading}
              />
              {errors.email && <span className="error-message">{errors.email}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="password">Password</label>
              <div className="password-input-wrapper">
                <input 
                  type={showPassword ? 'text' : 'password'} 
                  id="password" 
                  name="password" 
                  value={formData.password} 
                  onChange={handleChange} 
                  placeholder="Enter your password" 
                  className={errors.password ? 'error-input' : ''} 
                  disabled={isLoading}
                />
                <button 
                  type="button" 
                  className="toggle-password" 
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isLoading}
                >
                  {showPassword ? '👁️' : '👁️‍🗨️'}
                </button>
              </div>
              {errors.password && <span className="error-message">{errors.password}</span>}
            </div>

            <div className="form-options">
              <label className="checkbox-label">
                <input 
                  type="checkbox" 
                  checked={rememberMe} 
                  onChange={(e) => setRememberMe(e.target.checked)}
                  disabled={isLoading}
                />
                Remember me
              </label>
              <Link to="/forgot-password" className="forgot-link">Forgot Password?</Link>
            </div>

            <button 
              type="submit" 
              className="auth-button"
              disabled={isLoading}
            >
              {isLoading ? 'Logging in...' : 'Login'}
            </button>

            <div className="divider"><span>OR</span></div>

            <GoogleButton />
          </form>

          <div className="auth-footer">
            <p>Don't have an account? <Link to="/signup">Sign up here</Link></p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;