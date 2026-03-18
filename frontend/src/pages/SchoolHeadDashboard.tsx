import { useState } from 'react';
import './ModernDashboard.css';

interface DashboardProps {
  userName: string;
  onLogout: () => void;
}

function SchoolHeadDashboard({ userName, onLogout }: DashboardProps) {
  const [activeTab, setActiveTab] = useState('overview');

  const mockData = {
    semester: 'Spring 2026',
    institution: {
      students: 4500,
      faculty: 320,
      departments: 12,
      programs: 45,
    },
    academics: {
      avgGPA: 3.6,
      graduationRate: 87,
      retention: 92,
      atRisk: 145,
    },
    financials: {
      revenue: 45.2,
      expenses: 38.7,
      outstanding: 2.3,
      budget: 50.0,
    },
    departments: [
      { name: 'Computer Science', faculty: 45, students: 680, budget: 4.2, utilization: 95 },
      { name: 'Engineering', faculty: 52, students: 750, budget: 5.1, utilization: 92 },
      { name: 'Business', faculty: 38, students: 620, budget: 3.8, utilization: 88 },
      { name: 'Medicine', faculty: 65, students: 450, budget: 8.5, utilization: 98 },
    ],
    recentActivities: [
      { title: 'New faculty hired: Dr. Sarah Chen', time: '2 hours ago', type: 'faculty' },
      { title: 'Department budget approved: Engineering', time: '5 hours ago', type: 'budget' },
      { title: 'Research grant awarded: $2.5M', time: '1 day ago', type: 'research' },
      { title: 'New program launched: AI & Ethics', time: '2 days ago', type: 'academic' },
    ],
  };

  return (
    <div className="modern-dashboard">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="logo">
            <div className="logo-icon">🎓</div>
            <span>EduPortal</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          <button className={activeTab === 'overview' ? 'active' : ''} onClick={() => setActiveTab('overview')}>
            <span className="nav-icon">📊</span>
            <span>Overview</span>
          </button>
          <button className={activeTab === 'academics' ? 'active' : ''} onClick={() => setActiveTab('academics')}>
            <span className="nav-icon">🎓</span>
            <span>Academics</span>
          </button>
          <button className={activeTab === 'departments' ? 'active' : ''} onClick={() => setActiveTab('departments')}>
            <span className="nav-icon">🏢</span>
            <span>Departments</span>
          </button>
          <button className={activeTab === 'financials' ? 'active' : ''} onClick={() => setActiveTab('financials')}>
            <span className="nav-icon">💰</span>
            <span>Financials</span>
          </button>
          <button className={activeTab === 'faculty' ? 'active' : ''} onClick={() => setActiveTab('faculty')}>
            <span className="nav-icon">👥</span>
            <span>Faculty</span>
          </button>
          <button className={activeTab === 'reports' ? 'active' : ''} onClick={() => setActiveTab('reports')}>
            <span className="nav-icon">📈</span>
            <span>Reports</span>
          </button>
        </nav>

        <div className="sidebar-footer">
          <div className="user-profile">
            <div className="user-avatar">{userName.split(' ').map(n => n[0]).join('')}</div>
            <div className="user-info">
              <div className="user-name">{userName}</div>
              <div className="user-role">Dean</div>
            </div>
          </div>
          <button className="logout-button" onClick={onLogout}>
            <span>🚪</span>
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        <header className="top-bar">
          <div className="page-title">
            <h1>{activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}</h1>
            <p>{mockData.semester}</p>
          </div>
          <div className="top-actions">
            <button className="icon-btn">
              <span className="notification-badge">8</span>
              🔔
            </button>
            <button className="icon-btn">⚙️</button>
          </div>
        </header>

        <div className="content-area">
          {activeTab === 'overview' && (
            <>
              <div className="stats-row">
                <div className="stat-card primary">
                  <div className="stat-icon">👥</div>
                  <div className="stat-content">
                    <div className="stat-value">{mockData.institution.students.toLocaleString()}</div>
                    <div className="stat-label">Total Students</div>
                  </div>
                </div>
                <div className="stat-card success">
                  <div className="stat-icon">👨‍🏫</div>
                  <div className="stat-content">
                    <div className="stat-value">{mockData.institution.faculty}</div>
                    <div className="stat-label">Faculty Members</div>
                  </div>
                </div>
                <div className="stat-card info">
                  <div className="stat-icon">🏢</div>
                  <div className="stat-content">
                    <div className="stat-value">{mockData.institution.departments}</div>
                    <div className="stat-label">Departments</div>
                  </div>
                </div>
                <div className="stat-card warning">
                  <div className="stat-icon">📚</div>
                  <div className="stat-content">
                    <div className="stat-value">{mockData.institution.programs}</div>
                    <div className="stat-label">Programs</div>
                  </div>
                </div>
              </div>

              <div className="grid-2">
                <div className="card">
                  <h3>Academic Performance</h3>
                  <div className="stats-list">
                    <div className="stat-row">
                      <span>Average GPA</span>
                      <span className="stat-value">{mockData.academics.avgGPA}</span>
                    </div>
                    <div className="stat-row">
                      <span>Graduation Rate</span>
                      <span className="stat-value">{mockData.academics.graduationRate}%</span>
                    </div>
                    <div className="stat-row">
                      <span>Retention Rate</span>
                      <span className="stat-value">{mockData.academics.retention}%</span>
                    </div>
                    <div className="stat-row">
                      <span>Students At Risk</span>
                      <span className="stat-value warning">{mockData.academics.atRisk}</span>
                    </div>
                  </div>
                </div>

                <div className="card">
                  <h3>Financial Overview</h3>
                  <div className="stats-list">
                    <div className="stat-row">
                      <span>Total Revenue</span>
                      <span className="stat-value success">${mockData.financials.revenue}M</span>
                    </div>
                    <div className="stat-row">
                      <span>Total Expenses</span>
                      <span className="stat-value">${mockData.financials.expenses}M</span>
                    </div>
                    <div className="stat-row">
                      <span>Outstanding Fees</span>
                      <span className="stat-value warning">${mockData.financials.outstanding}M</span>
                    </div>
                    <div className="stat-row">
                      <span>Annual Budget</span>
                      <span className="stat-value">${mockData.financials.budget}M</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="card">
                <h3>Recent Activities</h3>
                <div className="deadline-list">
                  {mockData.recentActivities.map((activity, i) => (
                    <div key={i} className="deadline-item">
                      <div className={`priority-dot ${activity.type === 'budget' ? 'high' : activity.type === 'research' ? 'medium' : 'low'}`}></div>
                      <div className="deadline-content">
                        <div className="deadline-title">{activity.title}</div>
                        <div className="deadline-meta">{activity.time}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {activeTab === 'academics' && (
            <div className="academics-view">
              <div className="stats-row">
                <div className="stat-card">
                  <div className="stat-icon">🎯</div>
                  <div className="stat-content">
                    <div className="stat-value">{mockData.academics.avgGPA}</div>
                    <div className="stat-label">Average GPA</div>
                  </div>
                </div>
                <div className="stat-card success">
                  <div className="stat-icon">🎓</div>
                  <div className="stat-content">
                    <div className="stat-value">{mockData.academics.graduationRate}%</div>
                    <div className="stat-label">Graduation Rate</div>
                  </div>
                </div>
                <div className="stat-card info">
                  <div className="stat-icon">✓</div>
                  <div className="stat-content">
                    <div className="stat-value">{mockData.academics.retention}%</div>
                    <div className="stat-label">Retention Rate</div>
                  </div>
                </div>
                <div className="stat-card warning">
                  <div className="stat-icon">⚠️</div>
                  <div className="stat-content">
                    <div className="stat-value">{mockData.academics.atRisk}</div>
                    <div className="stat-label">At-Risk Students</div>
                  </div>
                </div>
              </div>
              <div className="card">
                <h3>Academic Programs</h3>
                <div className="career-actions">
                  <button className="action-card">
                    <span className="action-icon">📚</span>
                    <span className="action-title">Program Management</span>
                  </button>
                  <button className="action-card">
                    <span className="action-icon">📊</span>
                    <span className="action-title">Accreditation</span>
                  </button>
                  <button className="action-card">
                    <span className="action-icon">🎯</span>
                    <span className="action-title">Curriculum Review</span>
                  </button>
                  <button className="action-card">
                    <span className="action-icon">📈</span>
                    <span className="action-title">Quality Assurance</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'departments' && (
            <div className="departments-view">
              {mockData.departments.map((dept, i) => (
                <div key={i} className="card">
                  <div className="department-header">
                    <h3>{dept.name}</h3>
                    <span className="utilization-badge">{dept.utilization}% Capacity</span>
                  </div>
                  <div className="department-stats">
                    <div className="stat-item">
                      <span className="stat-label">Faculty</span>
                      <span className="stat-value">{dept.faculty}</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-label">Students</span>
                      <span className="stat-value">{dept.students}</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-label">Budget</span>
                      <span className="stat-value">${dept.budget}M</span>
                    </div>
                  </div>
                  <button className="btn-primary">View Details</button>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'financials' && (
            <div className="financials-view">
              <div className="grid-2">
                <div className="card">
                  <h3>Revenue Breakdown</h3>
                  <div className="stats-list">
                    <div className="stat-row">
                      <span>Tuition Fees</span>
                      <span className="stat-value">${(mockData.financials.revenue * 0.65).toFixed(1)}M</span>
                    </div>
                    <div className="stat-row">
                      <span>Research Grants</span>
                      <span className="stat-value">${(mockData.financials.revenue * 0.20).toFixed(1)}M</span>
                    </div>
                    <div className="stat-row">
                      <span>Endowments</span>
                      <span className="stat-value">${(mockData.financials.revenue * 0.10).toFixed(1)}M</span>
                    </div>
                    <div className="stat-row">
                      <span>Other Income</span>
                      <span className="stat-value">${(mockData.financials.revenue * 0.05).toFixed(1)}M</span>
                    </div>
                  </div>
                </div>

                <div className="card">
                  <h3>Expense Breakdown</h3>
                  <div className="stats-list">
                    <div className="stat-row">
                      <span>Salaries & Benefits</span>
                      <span className="stat-value">${(mockData.financials.expenses * 0.60).toFixed(1)}M</span>
                    </div>
                    <div className="stat-row">
                      <span>Operations</span>
                      <span className="stat-value">${(mockData.financials.expenses * 0.20).toFixed(1)}M</span>
                    </div>
                    <div className="stat-row">
                      <span>Infrastructure</span>
                      <span className="stat-value">${(mockData.financials.expenses * 0.15).toFixed(1)}M</span>
                    </div>
                    <div className="stat-row">
                      <span>Other Expenses</span>
                      <span className="stat-value">${(mockData.financials.expenses * 0.05).toFixed(1)}M</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="card">
                <h3>Budget Utilization by Department</h3>
                <div className="budget-list">
                  {mockData.departments.map((dept, i) => (
                    <div key={i} className="budget-item">
                      <div className="budget-info">
                        <span className="budget-name">{dept.name}</span>
                        <span className="budget-amount">${dept.budget}M</span>
                      </div>
                      <div className="progress-bar small">
                        <div className="progress-fill" style={{ width: `${dept.utilization}%` }}></div>
                      </div>
                      <span className="budget-percent">{dept.utilization}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'faculty' && (
            <div className="faculty-view">
              <div className="card">
                <h3>Faculty Management</h3>
                <div className="career-actions">
                  <button className="action-card">
                    <span className="action-icon">👥</span>
                    <span className="action-title">View All Faculty</span>
                  </button>
                  <button className="action-card">
                    <span className="action-icon">➕</span>
                    <span className="action-title">Recruitment</span>
                  </button>
                  <button className="action-card">
                    <span className="action-icon">📊</span>
                    <span className="action-title">Performance Reviews</span>
                  </button>
                  <button className="action-card">
                    <span className="action-icon">🎓</span>
                    <span className="action-title">Professional Development</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'reports' && (
            <div className="reports-view">
              <div className="card">
                <h3>Generate Reports</h3>
                <div className="career-actions">
                  <button className="action-card">
                    <span className="action-icon">📊</span>
                    <span className="action-title">Academic Report</span>
                  </button>
                  <button className="action-card">
                    <span className="action-icon">💰</span>
                    <span className="action-title">Financial Report</span>
                  </button>
                  <button className="action-card">
                    <span className="action-icon">👥</span>
                    <span className="action-title">Enrollment Report</span>
                  </button>
                  <button className="action-card">
                    <span className="action-icon">🔬</span>
                    <span className="action-title">Research Report</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default SchoolHeadDashboard;
