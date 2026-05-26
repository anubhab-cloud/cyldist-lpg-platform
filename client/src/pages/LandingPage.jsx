import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Flame, ShieldCheck, Map, Truck, Zap, Activity, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function LandingPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // If already logged in, redirect them to their respective dashboard
  useEffect(() => {
    if (user) {
      if (user.role === 'admin') navigate('/admin');
      else if (user.role === 'agent') navigate('/agent');
      else navigate('/customer');
    }
  }, [user, navigate]);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-base)', position: 'relative', overflowX: 'hidden' }}>
      
      {/* 3D Background */}
      <div style={{ 
        position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 0, 
        pointerEvents: 'none', opacity: 0.8, mixBlendMode: 'screen' 
      }}>
        <div style={{ position: 'absolute', top: '-20%', left: '-10%', width: '600px', height: '600px', background: 'var(--primary)', filter: 'blur(100px)', opacity: 0.15, borderRadius: '50%' }}></div>
        <div style={{ position: 'absolute', bottom: '-20%', right: '-10%', width: '600px', height: '600px', background: 'var(--accent)', filter: 'blur(100px)', opacity: 0.15, borderRadius: '50%' }}></div>
        <model-viewer
          src="/models/cylinder.glb"
          auto-rotate
          rotation-per-second="20deg"
          camera-controls
          tone-mapping="commerce"
          exposure="1.2"
          shadow-intensity="1.5"
          style={{ width: '100%', height: '100%', background: 'transparent' }}
        ></model-viewer>
        <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: 'linear-gradient(to bottom, rgba(22, 23, 29, 0.4) 0%, rgba(22, 23, 29, 0.8) 100%)' }}></div>
      </div>

      {/* Navigation */}
      <nav style={{ 
        position: 'fixed', top: 0, left: 0, width: '100%', zIndex: 50, 
        padding: '1.5rem 5%', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        background: 'rgba(22, 23, 29, 0.6)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(255,255,255,0.05)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: 'linear-gradient(135deg, var(--primary), var(--accent))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', boxShadow: '0 4px 15px rgba(99, 102, 241, 0.4)' }}>
            🛢
          </div>
          <span style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.5px' }}>
            Cyl<span style={{ color: 'var(--primary)' }}>Dist</span>
          </span>
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <Link to="/login" style={{ color: 'var(--text-primary)', fontWeight: 600, textDecoration: 'none', transition: 'color 0.2s' }}>Login</Link>
          <Link to="/register" className="btn btn-primary" style={{ padding: '0.5rem 1.25rem', borderRadius: 20 }}>Get Started</Link>
        </div>
      </nav>

      {/* Hero Content */}
      <main style={{ position: 'relative', zIndex: 10, paddingTop: '12rem', paddingBottom: '6rem', paddingLeft: '5%', paddingRight: '5%', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
        
        <motion.div 
          initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', background: 'rgba(99, 102, 241, 0.1)', border: '1px solid rgba(99, 102, 241, 0.2)', borderRadius: 30, color: 'var(--primary)', fontWeight: 600, fontSize: '0.9rem', marginBottom: '2rem' }}
        >
          <Zap size={16} fill="currentColor" /> The Next Generation of LPG Logistics
        </motion.div>

        <motion.h1 
          initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.1 }}
          style={{ fontSize: 'clamp(3rem, 6vw, 5.5rem)', fontWeight: 800, lineHeight: 1.1, letterSpacing: '-2px', marginBottom: '1.5rem', maxWidth: '800px' }}
        >
          Fueling the Future with <span className="gradient-text">Smart Delivery</span>
        </motion.h1>

        <motion.p 
          initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.2 }}
          style={{ fontSize: '1.25rem', color: 'var(--text-muted)', maxWidth: '600px', marginBottom: '3rem', lineHeight: 1.6 }}
        >
          Experience lightning-fast, highly secure, and AI-predicted LPG cylinder deliveries. Join thousands of satisfied households and businesses.
        </motion.p>

        <motion.div 
          initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.3 }}
          style={{ display: 'flex', gap: '1rem' }}
        >
          <Link to="/register" className="btn btn-primary" style={{ padding: '1rem 2rem', fontSize: '1.1rem', borderRadius: 30 }}>
            Book a Cylinder <ArrowRight size={20} style={{ marginLeft: 8 }} />
          </Link>
          <a href="#features" className="btn btn-ghost" style={{ padding: '1rem 2rem', fontSize: '1.1rem', borderRadius: 30, border: '1px solid var(--border)' }}>
            Learn More
          </a>
        </motion.div>

        {/* Feature Grid */}
        <div id="features" style={{ marginTop: '8rem', width: '100%', maxWidth: '1200px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem', textAlign: 'left' }}>
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.1 }}
            style={{ padding: '2rem', background: 'rgba(30, 32, 40, 0.6)', backdropFilter: 'blur(10px)', borderRadius: 24, border: '1px solid rgba(255,255,255,0.05)', boxShadow: '0 10px 30px rgba(0,0,0,0.2)' }}
          >
            <div style={{ width: 50, height: 50, borderRadius: 16, background: 'rgba(99, 102, 241, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem', color: 'var(--primary)' }}>
              <Map size={24} />
            </div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.75rem' }}>Real-time GPS Tracking</h3>
            <p style={{ color: 'var(--text-muted)', lineHeight: 1.6 }}>Track your delivery agent live on the map from the warehouse to your doorstep with minute-by-minute ETA updates.</p>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.2 }}
            style={{ padding: '2rem', background: 'rgba(30, 32, 40, 0.6)', backdropFilter: 'blur(10px)', borderRadius: 24, border: '1px solid rgba(255,255,255,0.05)', boxShadow: '0 10px 30px rgba(0,0,0,0.2)' }}
          >
            <div style={{ width: 50, height: 50, borderRadius: 16, background: 'rgba(170, 59, 255, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem', color: 'var(--accent)' }}>
              <Activity size={24} />
            </div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.75rem' }}>AI Usage Prediction</h3>
            <p style={{ color: 'var(--text-muted)', lineHeight: 1.6 }}>Our intelligent algorithms track your historical usage and notify you exactly when you need a refill before you run out of gas.</p>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.3 }}
            style={{ padding: '2rem', background: 'rgba(30, 32, 40, 0.6)', backdropFilter: 'blur(10px)', borderRadius: 24, border: '1px solid rgba(255,255,255,0.05)', boxShadow: '0 10px 30px rgba(0,0,0,0.2)' }}
          >
            <div style={{ width: 50, height: 50, borderRadius: 16, background: 'rgba(16, 185, 129, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem', color: 'var(--success)' }}>
              <ShieldCheck size={24} />
            </div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.75rem' }}>ISI Certified Safety</h3>
            <p style={{ color: 'var(--text-muted)', lineHeight: 1.6 }}>Every cylinder and accessory undergoes rigorous 5-point safety checks. Premium products you can trust in your kitchen.</p>
          </motion.div>

        </div>
      </main>
      
      {/* Footer */}
      <footer style={{ position: 'relative', zIndex: 10, padding: '2rem 5%', textAlign: 'center', borderTop: '1px solid rgba(255,255,255,0.05)', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
        © {new Date().getFullYear()} CylDist Platform. All rights reserved.
      </footer>
    </div>
  );
}
