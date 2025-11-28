import React from 'react';
import NavBar from '../components/NavBar';
import '../style/AboutCSS.css';

const About = () => {
  return (
    <div className="about-container">
      <NavBar />

      {/* Hero Section */}
      <section className="about-hero">
        <div className="about-hero-content">
          <h1>About HawkShield</h1>
          <p className="subtitle">
            Next-Generation AI-Powered Surveillance & Threat Detection System
          </p>
        </div>
      </section>

      {/* Overview Section */}
      <section className="overview-section">
        <div className="section-wrapper">
          <h2 className="section-title">What is HawkShield?</h2>
          <p className="section-description">
            HawkShield is an advanced AI-powered surveillance and threat-detection system 
            built for real-time security monitoring. It combines cutting-edge computer vision 
            with intelligent analytics to protect what matters most.
          </p>

          <div className="overview-grid">
            <div className="overview-card">
              <span className="overview-icon">🎯</span>
              <h3>Real-Time Detection</h3>
              <p>
                Streams live camera feeds and analyzes each frame using advanced deep 
                learning models to identify potential threats instantly.
              </p>
            </div>

            <div className="overview-card">
              <span className="overview-icon">🧠</span>
              <h3>AI-Powered Intelligence</h3>
              <p>
                Integrates computer vision models to detect guns, knives, masks, and 
                suspicious emotions with exceptional accuracy.
              </p>
            </div>

            <div className="overview-card">
              <span className="overview-icon">⚡</span>
              <h3>Instant Detection</h3>
              <p>
                Immediately identifies potential threats and classifies them based on 
                severity and type for rapid response.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Technology Stack */}
      <section className="tech-section">
        <div className="section-wrapper">
          <h2 className="section-title">Powered by Advanced Technology</h2>
          <p className="section-description">
            Built on a robust technology stack combining artificial intelligence, 
            cloud computing, and modern web frameworks.
          </p>

          <div className="tech-grid">
            <div className="tech-card">
              <div className="tech-icon">🤖</div>
              <h4>Deep Learning Models</h4>
              <p>State-of-the-art neural networks trained on millions of images for accurate threat detection</p>
            </div>

            <div className="tech-card">
              <div className="tech-icon">👁️</div>
              <h4>Computer Vision</h4>
              <p>Advanced image processing algorithms analyze every frame in real-time</p>
            </div>

            <div className="tech-card">
              <div className="tech-icon">☁️</div>
              <h4>Scalable Backend</h4>
              <p>Cloud infrastructure stores camera metadata, detection logs, and alerts securely</p>
            </div>

            <div className="tech-card">
              <div className="tech-icon">⚛️</div>
              <h4>Modern Dashboard</h4>
              <p>React-powered interface displays live detections, threat history, and camera activity</p>
            </div>
          </div>
        </div>
      </section>

      {/* Key Features */}
      <section className="features-section">
        <div className="section-wrapper">
          <h2 className="section-title">Key Features</h2>
          <p className="section-description">
            Comprehensive security capabilities designed for maximum protection and ease of use.
          </p>

          <div className="features-list">
            <div className="feature-item">
              <div className="feature-icon-wrapper">🔌</div>
              <div className="feature-content">
                <h4>Plug-and-Play Integration</h4>
                <p>
                  Connect cameras effortlessly with our plug-and-play system for easy 
                  deployment across multiple locations.
                </p>
              </div>
            </div>

            <div className="feature-item">
              <div className="feature-icon-wrapper">🚨</div>
              <div className="feature-content">
                <h4>Automatic Alerts</h4>
                <p>
                  Receive instant notifications when threats or abnormal behaviors are 
                  detected, enabling rapid response.
                </p>
              </div>
            </div>

            <div className="feature-item">
              <div className="feature-icon-wrapper">📊</div>
              <div className="feature-content">
                <h4>Comprehensive Logging</h4>
                <p>
                  Store and analyze detection logs with detailed timestamps and threat 
                  classifications for audit trails.
                </p>
              </div>
            </div>

            <div className="feature-item">
              <div className="feature-icon-wrapper">🎭</div>
              <div className="feature-content">
                <h4>Emotion Detection</h4>
                <p>
                  Advanced facial analysis identifies suspicious emotions and behavioral 
                  patterns before incidents occur.
                </p>
              </div>
            </div>

            <div className="feature-item">
              <div className="feature-icon-wrapper">🔫</div>
              <div className="feature-content">
                <h4>Weapon Recognition</h4>
                <p>
                  Detects guns, knives, and other dangerous objects with industry-leading 
                  accuracy and speed.
                </p>
              </div>
            </div>

            <div className="feature-item">
              <div className="feature-icon-wrapper">📈</div>
              <div className="feature-content">
                <h4>Scalable Architecture</h4>
                <p>
                  Grows with your needs—from single-location monitoring to enterprise-wide 
                  smart city deployments.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Use Cases */}
      <section className="usecases-section">
        <div className="section-wrapper">
          <h2 className="section-title">Where HawkShield Makes a Difference</h2>
          <p className="section-description">
            Designed for diverse environments requiring proactive, automated, and intelligent threat prevention.
          </p>

          <div className="usecases-grid">
            <div className="usecase-card">
              <div className="usecase-icon">🏫</div>
              <h4>Schools & Universities</h4>
              <p>Protect students and staff with 24/7 monitoring and instant threat alerts</p>
            </div>

            <div className="usecase-card">
              <div className="usecase-icon">🏢</div>
              <h4>Corporate Offices</h4>
              <p>Secure your workplace with intelligent surveillance and access monitoring</p>
            </div>

            <div className="usecase-card">
              <div className="usecase-icon">🏛️</div>
              <h4>Public Spaces</h4>
              <p>Monitor parks, transit hubs, and gathering areas for public safety</p>
            </div>

            <div className="usecase-card">
              <div className="usecase-icon">🏙️</div>
              <h4>Smart Cities</h4>
              <p>Deploy city-wide surveillance networks with centralized monitoring</p>
            </div>

            <div className="usecase-card">
              <div className="usecase-icon">🏪</div>
              <h4>Retail Stores</h4>
              <p>Prevent theft and ensure customer safety with intelligent detection</p>
            </div>

            <div className="usecase-card">
              <div className="usecase-icon">🏥</div>
              <h4>Healthcare Facilities</h4>
              <p>Maintain secure environments in hospitals and medical centers</p>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="stats-section">
        <div className="stats-content">
          <h2>HawkShield by the Numbers</h2>
          <div className="stats-grid">
            <div className="stat-item">
              <div className="stat-number">99.2%</div>
              <div className="stat-label">Detection Accuracy</div>
            </div>
            <div className="stat-item">
              <div className="stat-number">&lt;2s</div>
              <div className="stat-label">Response Time</div>
            </div>
            <div className="stat-item">
              <div className="stat-number">50K+</div>
              <div className="stat-label">Cameras Connected</div>
            </div>
            <div className="stat-item">
              <div className="stat-number">24/7</div>
              <div className="stat-label">Active Monitoring</div>
            </div>
          </div>
        </div>
      </section>

      {/* Mission Section */}
      <section className="mission-section">
        <div className="section-wrapper">
          <h2 className="section-title">Our Mission</h2>
          
          <div className="mission-content">
            <p className="mission-text">
              At HawkShield, our goal is to provide proactive, automated, and intelligent 
              threat prevention for safer environments. We believe that advanced security 
              technology should be accessible to everyone—from small businesses to large 
              institutions.
            </p>
            
            <p className="mission-text">
              By combining artificial intelligence with human expertise, we're creating 
              a world where threats are detected before they become incidents, where 
              response times are measured in seconds, and where safety is never compromised.
            </p>

            <div className="mission-highlight">
              <p>
                "We're not just building a surveillance system—we're building peace of mind. 
                Every alert prevented, every threat detected, and every life protected brings 
                us closer to our vision of a safer tomorrow."
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section">
        <div className="cta-content">
          <h2>Ready to Secure Your Space?</h2>
          <p>
            Join thousands of organizations worldwide that trust HawkShield 
            for their security needs. Get started today.
          </p>
          <div className="cta-buttons">
            <a href="/" className="cta-button-primary">Get Started</a>
            <a href="/dashboard" className="cta-button-secondary">View Dashboard</a>
          </div>
        </div>
      </section>
    </div>
  );
};

export default About