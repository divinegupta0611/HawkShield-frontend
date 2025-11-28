import React, { useState } from 'react';
import { useNavigate } from "react-router-dom";
import '../style/ContactCSS.css';
import NavBar from '../components/NavBar.jsx';

const Contact = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState(null);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Simulate form submission
    setTimeout(() => {
      setIsSubmitting(false);
      setSubmitStatus('success');
      setFormData({ name: '', email: '', subject: '', message: '' });
      
      // Clear success message after 5 seconds
      setTimeout(() => setSubmitStatus(null), 5000);
    }, 1500);
  };

  return (
    <div className="contact-container">
      <NavBar />
      
      {/* Hero Section */}
      <section className="contact-hero">
        <div className="contact-hero-content">
          <h1>Get In Touch</h1>
          <p>We're here to help and answer any question you might have</p>
        </div>
      </section>

      {/* Contact Content */}
      <section className="contact-main">
        <div className="contact-content">
          {/* Contact Form */}
          <div className="contact-form-section">
            <h2>Send Us a Message</h2>
            <p className="form-description">Fill out the form below and we'll get back to you as soon as possible</p>
            
            {submitStatus === 'success' && (
              <div className="success-message">
                <span className="success-icon">✓</span>
                Thank you for reaching out! We'll respond within 24 hours.
              </div>
            )}

            <form onSubmit={handleSubmit} className="contact-form">
              <div className="form-group">
                <label htmlFor="name">Full Name</label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="John Doe"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="email">Email Address</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="john@example.com"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="subject">Subject</label>
                <input
                  type="text"
                  id="subject"
                  name="subject"
                  value={formData.subject}
                  onChange={handleChange}
                  placeholder="How can we help you?"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="message">Message</label>
                <textarea
                  id="message"
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  placeholder="Tell us more about your inquiry..."
                  rows="6"
                  required
                ></textarea>
              </div>

              <button 
                type="submit" 
                className="submit-button"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Sending...' : 'Send Message'}
              </button>
            </form>
          </div>

          {/* Contact Information */}
          <div className="contact-info-section">
            <h2>Contact Information</h2>
            <p className="info-description">Reach out to us through any of these channels</p>

            <div className="contact-cards">
              <div className="info-card">
                <div className="info-icon">📧</div>
                <h3>Email Us</h3>
                <p>support@hawkshield.com</p>
                <p>sales@hawkshield.com</p>
              </div>

              <div className="info-card">
                <div className="info-icon">📞</div>
                <h3>Call Us</h3>
                <p>+1 (555) 123-4567</p>
                <p>Mon-Fri, 9AM-6PM EST</p>
              </div>

              <div className="info-card">
                <div className="info-icon">📍</div>
                <h3>Visit Us</h3>
                <p>123 Security Avenue</p>
                <p>Tech City, TC 12345</p>
              </div>

              <div className="info-card">
                <div className="info-icon">💬</div>
                <h3>Live Chat</h3>
                <p>Available 24/7</p>
                <p>Instant support</p>
              </div>
            </div>

            {/* Social Media */}
            <div className="social-section">
              <h3>Follow Us</h3>
              <div className="social-icons">
                <a href="#facebook" className="social-icon">
                  <span>f</span>
                </a>
                <a href="#twitter" className="social-icon">
                  <span>𝕏</span>
                </a>
                <a href="#linkedin" className="social-icon">
                  <span>in</span>
                </a>
                <a href="#instagram" className="social-icon">
                  <span>📷</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="faq-section">
        <div className="faq-content">
          <h2>Frequently Asked Questions</h2>
          <div className="faq-grid">
            <div className="faq-card">
              <h3>What are your response times?</h3>
              <p>We typically respond to all inquiries within 24 hours during business days.</p>
            </div>
            <div className="faq-card">
              <h3>Do you offer technical support?</h3>
              <p>Yes! Our technical support team is available 24/7 to assist with any issues.</p>
            </div>
            <div className="faq-card">
              <h3>Can I schedule a demo?</h3>
              <p>Absolutely! Contact us to schedule a personalized demo of our platform.</p>
            </div>
            <div className="faq-card">
              <h3>How do I report a bug?</h3>
              <p>Please email support@hawkshield.com with details and we'll investigate immediately.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="footer-content">
          <div className="footer-section">
            <h3>HawkShield</h3>
            <p>Next-generation surveillance technology</p>
          </div>
          <div className="footer-section">
            <h4>Quick Links</h4>
            <ul>
              <li><a href="/">Home</a></li>
              <li><a href="/dashboard">Dashboard</a></li>
              <li><a href="/contact">Contact</a></li>
              <li><a href="/pricing">Pricing</a></li>
            </ul>
          </div>
          <div className="footer-section">
            <h4>Contact Us</h4>
            <p>Email: support@hawkshield.com</p>
            <p>Phone: +1 (555) 123-4567</p>
            <p>Address: 123 Security Ave, Tech City</p>
          </div>
          <div className="footer-section">
            <h4>Follow Us</h4>
            <div className="social-links">
              <a href="#facebook">Facebook</a>
              <a href="#twitter">Twitter</a>
              <a href="#linkedin">LinkedIn</a>
            </div>
          </div>
        </div>
        <div className="footer-bottom">
          <p>&copy; 2024 HawkShield. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default Contact;