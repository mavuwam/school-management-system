import { useState } from 'react';
import './LoginPage.css';

type UserRole = 'STUDENT' | 'TEACHER' | 'SCHOOL_HEAD' | 'PARENT';

interface LoginPageProps {
  onLogin: (role: UserRole, name: string) => void;
}

function LoginPage({ onLogin }: LoginPageProps) {
  const [selectedRole, setSelectedRole] = useState<UserRole>('STUDENT');
  const [isAnimating, setIsAnimating] = useState(false);

  const demoUsers = {
    STUDENT: { name: 'Alex Johnson', id: 'Computer Science - Year 3', icon: '🎓' },
    TEACHER: { name: 'Dr. Sarah Mitchell', id: 'Professor of Mathematics', icon: '👨‍🏫' },
    SCHOOL_HEAD: { name: 'Dr. Robert Chen', id: 'Dean of Engineering', icon: '👔' },
    PARENT: { name: 'Maria Rodriguez', id: 'Guardian', icon: '👨‍👩‍👧' },
  };

  const handleLogin = () => {
    setIsAnimating(true);
    setTimeout(() => {
      onLogin(selectedRole, demoUsers[selectedRole].name);
    }, 600);
  };

  return (
    <div className="login-page">
      <div className="login-background">
        <div className="gradient-orb orb-1"></div>
        <div className="gradient-orb orb-2"></div>
        <div className="gradient-orb orb-3"></div>
      </div>

      <div className={`login-container ${isAnimating ? 'fade-out' : ''}`}>
        <div className="login-left">
          <div className="brand-section">
            <div className="brand-logo">
              <div className="logo-icon">🎓</div>
              <div className="logo-text">
                <h1>EduPortal</h1>
                <p>University Management System</p>
              </div>
            </div>
            
            <div className="features-list">
              <div className="feature-item">
                <span className="feature-icon">✓</span>
                <span>Comprehensive Academic Tracking</span>
              </div>
              <div className="feature-item">
                <span className="feature-icon">✓</span>
                <span>Research & Project Management</span>
              </div>
              <div className="feature-item">
                <span className="feature-icon">✓</span>
                <span>Digital Library Access</span>
              </div>
              <div className="feature-item">
                <span className="feature-icon">✓</span>
                <span>Career Services Integration</span>
              </div>
            </div>

            <div className="stats-preview">
              <div className="stat-item">
                <div className="stat-number">15K+</div>
                <div className="stat-label">Students</div>
              </div>
              <div className="stat-item">
                <div className="stat-number">500+</div>
                <div className="stat-label">Faculty</div>
              </div>
              <div className="stat-item">
                <div className="stat-number">50+</div>
                <div className="stat-label">Programs</div>
              </div>
            </div>
          </div>
        </div>

        <div className="login-right">
          <div className="login-card">
            <div className="card-header">
              <h2>Welcome Back</h2>
              <p>Select your role to access the portal</p>
            </div>

            <div className="role-grid">
              {Object.entries(demoUsers).map(([role, user]) => (
                <button
                  key={role}
                  className={`role-card ${selectedRole === role ? 'selected' : ''}`}
                  onClick={() => setSelectedRole(role as UserRole)}
                >
                  <div className="role-icon">{user.icon}</div>
                  <div className="role-info">
                    <div className="role-title">{role.replace('_', ' ')}</div>
                    <div className="role-name">{user.name}</div>
                    <div className="role-subtitle">{user.id}</div>
                  </div>
                  <div className="role-check">
                    {selectedRole === role && <span>✓</span>}
                  </div>
                </button>
              ))}
            </div>

            <button className="login-btn" onClick={handleLogin}>
              <span>Continue to Dashboard</span>
              <span className="btn-arrow">→</span>
            </button>

            <div className="login-footer">
              <p>Demo Mode • All data is simulated for demonstration</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
