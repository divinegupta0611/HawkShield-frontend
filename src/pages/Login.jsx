import React, { useState } from 'react';
import '../style/AuthCSS.css';
import { supabase } from "../SupabaseClient";
import { Link } from 'react-router-dom';

const Login = () => {
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
        {/* Image Panel - Right Side (due to flex-direction: row-reverse) */}
        <div className="auth-image-panel">
          <img src="/Auth.jpeg" alt="Security Shield" />
          <div className="image-panel-text">
            <h2>Welcome Back!</h2>
            <p>Access your security dashboard</p>
          </div>
        </div>

        {/* Form Panel - Left Side */}
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

            <button type="button" className="social-button google-button">
              <span className="social-icon">🔍</span>
              Continue with Google
            </button>

            <button type="button" className="social-button microsoft-button">
              <span className="social-icon">🪟</span>
              Continue with Microsoft
            </button>
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