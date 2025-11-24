import React, { useState } from 'react';
import '../style/AuthCSS.css';
import { supabase } from "../SupabaseClient";
import { Link } from 'react-router-dom';


// Use Supabase OAuth for Google sign-in
const GoogleButton = () => {
  const handleGoogleSignIn = async () => {
    try {
      const redirectTo = import.meta.env.VITE_SUPABASE_REDIRECT || (typeof window !== 'undefined' ? `${window.location.origin}/` : undefined);
      console.log('Initiating Supabase Google OAuth, redirectTo:', redirectTo);
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: redirectTo ? { redirectTo } : undefined,
      });
      if (error) {
        console.error('Supabase signInWithOAuth error:', error);
        alert(error.message || 'Google sign-in failed');
        return;
      }
      console.log('Supabase signInWithOAuth data:', data);
      // In most flows Supabase will redirect the browser to the provider.
      // If it returns a url, you can navigate to it manually:
      if (data?.url) window.location.href = data.url;
    } catch (err) {
      console.error('Unexpected OAuth error:', err);
      alert('Google sign-in failed. Check console for details.');
    }
  };

  return (
    <button type="button" onClick={handleGoogleSignIn} className="social-button google-button" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', padding: '10px 20px', border: '1px solid #ddd', borderRadius: '5px', background: 'white', cursor: 'pointer', width: '100%' }}>
      <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" style={{ width: '20px', height: '20px' }} />
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
    try {
      // Use Supabase Auth to sign in with email and password
      const { data, error } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      });

      if (error) {
        console.error('Supabase signIn error:', error);
        alert(error.message || 'Login failed');
        return;
      }

      console.log('Supabase signIn data:', data);
      // data.session.user may contain user info depending on your Supabase settings
      const userInfo = data?.user || { email: formData.email };
      localStorage.setItem("hawkshield_user", JSON.stringify({ name: userInfo.user_metadata?.fullName || userInfo.email, email: userInfo.email }));
      localStorage.setItem("isLoggedIn", "true");
      alert("Login successful!");
      window.location.href = "/";
    } catch (err) {
      console.error('Unexpected login error:', err);
      alert('Login failed. Please try again.');
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

export default Login