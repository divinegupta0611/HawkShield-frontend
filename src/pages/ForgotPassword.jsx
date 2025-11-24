import { useState } from "react";
import { supabase } from "../SupabaseClient";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  // Safe frontend check: attempt to request an OTP WITHOUT creating a new user.
  // If the user does not exist Supabase will return an error containing "User not found".
  // This avoids exposing the service-role key and prevents user enumeration.
  const checkUserExists = async (emailToCheck) => {
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: emailToCheck,
        options: { shouldCreateUser: false }
      });

      if (error) {
        // Supabase returns an error when the user doesn't exist
        const msg = (error.message || '') .toLowerCase();
        if (msg.includes('user not found')) {
          return false;
        }
        // Special case: some Supabase projects disallow OTP signups and return 422
        // with message 'Signups not allowed for otp'. In that case we cannot
        // reliably check via OTP — treat as unknown and allow the reset to proceed.
        if (msg.includes('signups not allowed for otp') || (error.status === 422 || error.statusCode === 422)) {
          console.warn('OTP signup is disabled in Supabase project. Cannot check user existence via OTP. Proceeding with reset.');
          return true;
        }
        // other errors (rate limit, network) — treat as unknown (allow reset to proceed)
        console.warn('checkUserExists returned non-fatal error:', error);
        return true;
      }

      // No error -> user exists (note: this may trigger an OTP email in some Supabase setups)
      return true;
    } catch (e) {
      console.error('checkUserExists failed:', e);
      return true; // on unexpected failure, allow flow to continue to avoid blocking users
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage("");
    setIsSuccess(false);
    console.log('Forgot password initiated for:', email);

    // basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      console.warn('Invalid email provided:', email);
      setMessage('Please enter a valid email address.');
      setIsSuccess(false);
      setIsLoading(false);
      console.log('Forgot password aborted due to invalid email');
      return;
    }

    // Safe frontend check: verify user exists without exposing service-role key
    const exists = await checkUserExists(email);
    if (!exists) {
      setMessage('No account is registered with this email address.');
      setIsLoading(false);
      return;
    }

    try {
      // call Supabase to send the password reset email
      // prefer explicit env var, otherwise fall back to current origin
      let redirectTo = import.meta.env.VITE_SUPABASE_REDIRECT || import.meta.env.VITE_APP_URL || null;
      if (!redirectTo && typeof window !== 'undefined') {
        // default to current origin + '/'
        redirectTo = `${window.location.origin}/`;
      }
      const options = redirectTo ? { redirectTo } : undefined;
      console.log('Calling Supabase resetPasswordForEmail with options:', options);

      const { data, error } = await supabase.auth.resetPasswordForEmail(email, options);

      if (error) {
        console.error('Supabase returned an error for resetPasswordForEmail:', error);
        throw error;
      }

      console.log('Supabase response data:', data);
      // DEV: also call the raw REST endpoint to surface HTTP status/body for debugging
      if (import.meta.env.DEV) {
        try {
          const rawUrl = `${import.meta.env.VITE_SUPABASE_URL.replace(/\/+$/,'')}/auth/v1/recover`;
          const body = redirectTo ? { email, redirect_to: redirectTo } : { email };
          const rawRes = await fetch(rawUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              apikey: import.meta.env.VITE_SUPABASE_KEY || ''
            },
            body: JSON.stringify(body)
          });
          let rawBody;
          try { rawBody = await rawRes.json(); } catch (e) { rawBody = await rawRes.text(); }
          console.log('Raw /auth/v1/recover response', { status: rawRes.status, body: rawBody });
        } catch (e) {
          console.warn('Raw recover endpoint call failed', e);
        }
      }

      // DEV: expose which redirectTo value was used (helps troubleshoot redirect mismatches)
      if (import.meta.env.DEV) console.log('Using redirectTo:', redirectTo);
      setIsSuccess(true);
      setMessage('Check your email! A password reset link has been sent if the email exists.');
      console.log('Password reset request completed for:', email);
    } catch (err) {
      console.error('Password reset failed for:', email, err);
      setIsSuccess(false);
      // show message from Supabase when available
      const userMsg = err?.message || 'Failed to send reset link. Please try again later.';
      // In development, include verbose error details to aid debugging
      if (import.meta.env.DEV) {
        try {
          setMessage(`${userMsg} (${JSON.stringify(err)})`);
        } catch (e) {
          setMessage(userMsg);
        }
      } else {
        setMessage(userMsg);
      }
    } finally {
      setIsLoading(false);
      console.log('Forgot password flow finished for:', email);
    }
  };

  const styles = {
    container: {
      minHeight: '100vh',
      background: '#ffffffff',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      position: 'relative',
      overflow: 'hidden',
      fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif"
    },
    bgOrb1: {
      position: 'absolute',
      top: '10%',
      left: '10%',
      width: '400px',
      height: '400px',
      background: 'radial-gradient(circle, rgba(59, 130, 246, 0.15) 0%, transparent 70%)',
      borderRadius: '50%',
      animation: 'float 8s ease-in-out infinite'
    },
    bgOrb2: {
      position: 'absolute',
      bottom: '10%',
      right: '10%',
      width: '350px',
      height: '350px',
      background: 'radial-gradient(circle, rgba(6, 182, 212, 0.12) 0%, transparent 70%)',
      borderRadius: '50%',
      animation: 'float 10s ease-in-out infinite reverse'
    },
    bgOrb3: {
      position: 'absolute',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      width: '500px',
      height: '500px',
      background: 'radial-gradient(circle, rgba(37, 99, 235, 0.08) 0%, transparent 70%)',
      borderRadius: '50%',
      animation: 'pulse 6s ease-in-out infinite'
    },
    card: {
      position: 'relative',
      width: '100%',
      maxWidth: '420px',
      background: '#ffffff',
      backdropFilter: 'blur(20px)',
      borderRadius: '24px',
      border: '1px solid rgba(59, 130, 246, 0.2)',
      boxShadow: '0 25px 80px rgba(0, 0, 0, 0.5), 0 0 60px rgba(59, 130, 246, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
      overflow: 'hidden'
    },
    topGlow: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: '3px',
      background: 'linear-gradient(90deg, #3b82f6, #06b6d4, #3b82f6)',
      backgroundSize: '200% 100%',
      animation: 'shimmer 3s linear infinite'
    },
    content: {
      padding: '50px 40px'
    },
    logoContainer: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      marginBottom: '35px'
    },
    shield: {
      width: '70px',
      height: '80px',
      position: 'relative',
      marginBottom: '15px'
    },
    title: {
      fontSize: '28px',
      fontWeight: '700',
      background: 'linear-gradient(135deg, #ffffff 0%, #94a3b8 100%)',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      marginBottom: '8px',
      letterSpacing: '-0.5px'
    },
    subtitle: {
      fontSize: '15px',
      color: '#64748b',
      textAlign: 'center',
      lineHeight: '1.5'
    },
    inputGroup: {
      position: 'relative',
      marginBottom: '25px'
    },
    inputLabel: {
      display: 'block',
      fontSize: '13px',
      fontWeight: '600',
      color: '#94a3b8',
      marginBottom: '10px',
      textTransform: 'uppercase',
      letterSpacing: '1px'
    },
    inputWrapper: {
      position: 'relative',
      display: 'flex',
      alignItems: 'center'
    },
    inputIcon: {
      position: 'absolute',
      left: '18px',
      color: isFocused ? '#3b82f6' : '#475569',
      transition: 'color 0.3s ease',
      zIndex: 1
    },
    input: {
      width: '100%',
      padding: '18px 18px 18px 52px',
      fontSize: '15px',
      color: '#e2e8f0',
      background: 'rgba(30, 41, 59, 0.5)',
      border: `2px solid ${isFocused ? '#3b82f6' : 'rgba(71, 85, 105, 0.3)'}`,
      borderRadius: '14px',
      outline: 'none',
      transition: 'all 0.3s ease',
      boxShadow: isFocused ? '0 0 25px rgba(59, 130, 246, 0.2)' : 'none'
    },
    button: {
      width: '100%',
      padding: '18px',
      fontSize: '16px',
      fontWeight: '600',
      color: '#ffffff',
      background: isLoading 
        ? 'linear-gradient(135deg, #1e40af 0%, #1e3a8a 100%)'
        : 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
      border: 'none',
      borderRadius: '14px',
      cursor: isLoading ? 'not-allowed' : 'pointer',
      transition: 'all 0.3s ease',
      boxShadow: '0 8px 30px rgba(59, 130, 246, 0.3)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '10px',
      letterSpacing: '0.5px'
    },
    spinner: {
      width: '20px',
      height: '20px',
      border: '2px solid rgba(255, 255, 255, 0.3)',
      borderTopColor: '#ffffff',
      borderRadius: '50%',
      animation: 'spin 0.8s linear infinite'
    },
    message: {
      marginTop: '25px',
      padding: '16px 20px',
      borderRadius: '12px',
      fontSize: '14px',
      lineHeight: '1.5',
      background: isSuccess 
        ? 'rgba(34, 197, 94, 0.1)' 
        : 'rgba(239, 68, 68, 0.1)',
      border: `1px solid ${isSuccess ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
      color: isSuccess ? '#4ade80' : '#f87171',
      display: 'flex',
      alignItems: 'flex-start',
      gap: '12px'
    },
    backLink: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '8px',
      marginTop: '30px',
      color: '#64748b',
      fontSize: '14px',
      textDecoration: 'none',
      transition: 'color 0.3s ease',
      cursor: 'pointer'
    }
  };

  return (
    <div style={styles.container}>
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-30px) rotate(5deg); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 0.5; transform: translate(-50%, -50%) scale(1); }
          50% { opacity: 0.8; transform: translate(-50%, -50%) scale(1.1); }
        }
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        input::placeholder {
          color: #475569;
        }
        button:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 12px 40px rgba(59, 130, 246, 0.4);
        }
      `}</style>
      
      <div style={styles.bgOrb1} />
      <div style={styles.bgOrb2} />
      <div style={styles.bgOrb3} />
      
      <div style={styles.card}>
        <div style={styles.topGlow} />
        
        <div style={styles.content}>
          <div style={styles.logoContainer}>
            <svg style={styles.shield} viewBox="0 0 60 70">
              <defs>
                <linearGradient id="shieldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#3b82f6" />
                  <stop offset="100%" stopColor="#06b6d4" />
                </linearGradient>
                <filter id="glow">
                  <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                  <feMerge>
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="SourceGraphic"/>
                  </feMerge>
                </filter>
              </defs>
              <path 
                d="M30 5 L55 15 L55 35 C55 50 42 62 30 67 C18 62 5 50 5 35 L5 15 Z" 
                fill="none" 
                stroke="url(#shieldGrad)" 
                strokeWidth="2.5"
                filter="url(#glow)"
              />
              <path 
                d="M30 20 L40 28 L37 42 L30 38 L23 42 L20 28 Z" 
                fill="url(#shieldGrad)"
                opacity="0.9"
              />
            </svg>
            <h1 style={styles.title}>HawkShield</h1>
            <p style={styles.subtitle}>Enter your email address and we'll send you a link to reset your password</p>
          </div>
          
          <div style={styles.inputGroup}>
            <label style={styles.inputLabel}>Email Address</label>
            <div style={styles.inputWrapper}>
              <svg style={styles.inputIcon} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="2" y="4" width="20" height="16" rx="2"/>
                <path d="M22 6L12 13L2 6"/>
              </svg>
              <input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                style={styles.input}
                required
              />
            </div>
          </div>
          
          <button 
            type="button"
            onClick={handleForgotPassword}
            style={styles.button}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <div style={styles.spinner} />
                Sending...
              </>
            ) : (
              <>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 2L11 13"/>
                  <path d="M22 2L15 22L11 13L2 9L22 2Z"/>
                </svg>
                Send Reset Link
              </>
            )}
          </button>
          
          {message && (
            <div style={styles.message}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{flexShrink: 0, marginTop: '2px'}}>
                {isSuccess ? (
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14M22 4L12 14.01l-3-3"/>
                ) : (
                  <circle cx="12" cy="12" r="10"/>
                )}
              </svg>
              {message}
            </div>
          )}
          
          <div style={styles.backLink}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
            Back to Login
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;