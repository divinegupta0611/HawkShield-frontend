import React, { useState } from 'react';
import '../style/AuthCSS.css';
import { supabase } from "../SupabaseClient";
import { Link, useNavigate } from 'react-router-dom';

const Signup = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    organization: ''
  });

  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    if (errors[name]) {
      setErrors({ ...errors, [name]: '' });
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.fullName.trim()) newErrors.fullName = 'Full name is required';
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
    if (formData.phone && !/^\d{10}$/.test(formData.phone.replace(/\D/g, ''))) {
      newErrors.phone = 'Please enter a valid 10-digit phone number';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

 const handleSubmit = async (e) => {
  e.preventDefault();
  if (!validateForm()) return;

  console.log("Attempting signup with:", formData);

  try {
    const { data, error } = await supabase.auth.signUp({
      email: formData.email.toLowerCase(), // Supabase stores lowercase emails
      password: formData.password,
      options: {
        data: {
          full_name: formData.fullName,
          phone: formData.phone,
          organization: formData.organization
        }
      }
    });

    console.log("Supabase signup data:", data);
    console.log("Supabase signup error:", error);

    if (error) {
      alert("Signup error: " + error.message);
      return;
    }

    alert(
      "Account created! Check your email for verification before logging in."
    );

    // Optional: navigate to login page
    navigate("/login");
  } catch (err) {
    console.error("Unexpected error:", err);
  }
};


  return (
    <div className="auth-container">
      <div className="auth-wrapper signup-layout">
        {/* Image Panel - Left Side */}
        <div className="auth-image-panel">
          <img src="/shield.png" alt="Security Shield" />
          <div className="image-panel-text">
            <h2>Join HawkShield</h2>
            <p>Your security journey starts here</p>
          </div>
        </div>

        {/* Form Panel - Right Side */}
        <div className="auth-box">
          <div className="auth-header">
            <h1>HawkShield</h1>
            <h2>Create Your Account</h2>
            <p>Join us to secure what matters most</p>
          </div>

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="form-group">
              <label htmlFor="fullName">Full Name *</label>
              <input type="text" id="fullName" name="fullName" value={formData.fullName} onChange={handleChange} placeholder="Enter your full name" className={errors.fullName ? 'error-input' : ''} />
              {errors.fullName && <span className="error-message">{errors.fullName}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="email">Email Address *</label>
              <input type="email" id="email" name="email" value={formData.email} onChange={handleChange} placeholder="Enter your email" className={errors.email ? 'error-input' : ''} />
              {errors.email && <span className="error-message">{errors.email}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="phone">Phone Number</label>
              <input type="tel" id="phone" name="phone" value={formData.phone} onChange={handleChange} placeholder="Enter your phone number" className={errors.phone ? 'error-input' : ''} />
              {errors.phone && <span className="error-message">{errors.phone}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="organization">Organization (Optional)</label>
              <input type="text" id="organization" name="organization" value={formData.organization} onChange={handleChange} placeholder="Enter your organization name" />
            </div>

            <div className="form-group">
              <label htmlFor="password">Password *</label>
              <div className="password-input-wrapper">
                <input type={showPassword ? 'text' : 'password'} id="password" name="password" value={formData.password} onChange={handleChange} placeholder="Create a password" className={errors.password ? 'error-input' : ''} />
                <button type="button" className="toggle-password" onClick={() => setShowPassword(!showPassword)}>
                  {showPassword ? '👁️' : '👁️‍🗨️'}
                </button>
              </div>
              {errors.password && <span className="error-message">{errors.password}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="confirmPassword">Confirm Password *</label>
              <input type={showPassword ? 'text' : 'password'} id="confirmPassword" name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} placeholder="Confirm your password" className={errors.confirmPassword ? 'error-input' : ''} />
              {errors.confirmPassword && <span className="error-message">{errors.confirmPassword}</span>}
            </div>

            <button type="submit" className="auth-button">Create Account</button>
          </form>

          <div className="auth-footer">
            <p>Already have an account? <Link to="/login">Login here</Link></p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Signup;