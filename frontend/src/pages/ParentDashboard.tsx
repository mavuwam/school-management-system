import { useState } from 'react';
import './ModernDashboard.css';

interface DashboardProps {
  userName: string;
  onLogout: () => void;
}

function ParentDashboard({ userName, onLogout }: DashboardProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedChild, setSelectedChild] = useState(0);

  const mockData = {
    semester: 'Spring 2026',
    children: [
      {
        name: 'Emma Brown',
        year: 'Junior',
        major: 'Computer Science',
        gpa: 3.8,
        attendance: 95,
        credits: { completed: 78, enrolled: 15 },
        courses: [
          { code: 'CS401', name: 'Advanced Algorithms', grade: 'A' },
          { code: 'CS420', name: 'Machine Learning', grade: 'A-' },
          { code: 'MATH301', name: 'Linear Algebra', grade: 'A' },
        ],
        assignments: [
          { title: 'Algorithm Analysis Project', course: 'CS401', due: '2 days', status: 'in-progress' },
          { title: 'ML Model Implementation', course: 'CS420', due: '5 days', status: 'not-started' },
        ],
        financials: {
          tuition: 18500,
          paid: 12000,
          balance: 6500,
          dueDate: 'March 15, 2026',
        },
      },
      {
        name: 'Lucas Brown',
        year: 'Freshman',
        major: 'Engineering',
        gpa: 3.5,
        attendance: 92,
        credits: { completed: 15, enrolled: 16 },
        courses: [
          { code: 'ENG101', name: 'Engineering Fundamentals', grade: 'B+' },
          { code: 'MATH201', name: 'Calculus II', grade: 'A-' },
          { code: 'PHYS201', name: 'Physics I', grade: 'B+' },
        ],
        assignments: [
          { title: 'Engineering Design Project', course: 'ENG101', due: 'Tomorrow', status: 'submitted' },
          { title: 'Calculus Problem Set', course: 'MATH201', due: '1 week', status: 'not-started' },
        ],
        financials: {
          tuition: 18500,
          paid: 15000,
          balance: 3500,
          dueDate: 'March 15, 2026',
        },
      },
    ],
  };

  const currentChild = mockData.children[selectedChild];
  const totalBalance = mockData.children.reduce((sum, child) => sum + child.financials.balance, 0);
  const avgGPA = (mockData.children.reduce((sum, child) => sum + child.gpa, 0) / mockData.children.length).toFixed(2);

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
          <button className={activeTab === 'academic' ? 'active' : ''} onClick={() => setActiveTab('academic')}>
            <span className="nav-icon">📚</span>
            <span>Academic Progress</span>
          </button>
          <button className={activeTab === 'assignments' ? 'active' : ''} onClick={() => setActiveTab('assignments')}>
            <span className="nav-icon">📝</span>
            <span>Assignments</span>
          </button>
          <button className={activeTab === 'financials' ? 'active' : ''} onClick={() => setActiveTab('financials')}>
            <span className="nav-icon">💰</span>
            <span>Financials</span>
          </button>
          <button className={activeTab === 'support' ? 'active' : ''} onClick={() => setActiveTab('support')}>
            <span className="nav-icon">🤝</span>
            <span>Support Services</span>
          </button>
          <button className={activeTab === 'communication' ? 'active' : ''} onClick={() => setActiveTab('communication')}>
            <span className="nav-icon">💬</span>
            <span>Communication</span>
          </button>
        </nav>

        <div className="sidebar-footer">
          <div className="user-profile">
            <div className="user-avatar">{userName.split(' ').map(n => n[0]).join('')}</div>
            <div className="user-info">
              <div className="user-name">{userName}</div>
              <div className="user-role">Parent</div>
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
              <span className="notification-badge">4</span>
              🔔
            </button>
            <button className="icon-btn">⚙️</button>
          </div>
        </header>

        <div className="content-area">
          {/* Child Selector */}
          <div className="child-selector">
            {mockData.children.map((child, i) => (
              <button
                key={i}
                className={`child-tab ${selectedChild === i ? 'active' : ''}`}
                onClick={() => setSelectedChild(i)}
              >
                <div className="child-avatar">{child.name.split(' ')[0][0]}</div>
                <div className="child-info">
                  <div className="child-name">{child.name}</div>
                  <div className="child-year">{child.year} • {child.major}</div>
                </div>
              </button>
            ))}
          </div>

          {activeTab === 'overview' && (
            <>
              <div className="stats-row">
                <div className="stat-card primary">
                  <div className="stat-icon">🎯</div>
                  <div className="stat-content">
                    <div className="stat-value">{currentChild.gpa}</div>
                    <div className="stat-label">Current GPA</div>
                  </div>
                </div>
                <div className="stat-card success">
                  <div className="stat-icon">✓</div>
                  <div className="stat-content">
                    <div className="stat-value">{currentChild.attendance}%</div>
                    <div className="stat-label">Attendance</div>
                  </div>
                </div>
                <div className="stat-card info">
                  <div className="stat-icon">📚</div>
                  <div className="stat-content">
                    <div className="stat-value">{currentChild.credits.enrolled}</div>
                    <div className="stat-label">Credits This Semester</div>
                  </div>
                </div>
                <div className="stat-card warning">
                  <div className="stat-icon">💰</div>
                  <div className="stat-content">
                    <div className="stat-value">${currentChild.financials.balance.toLocaleString()}</div>
                    <div className="stat-label">Balance Due</div>
                  </div>
                </div>
              </div>

              <div className="grid-2">
                <div className="card">
                  <h3>Current Courses</h3>
                  <div className="course-list">
                    {currentChild.courses.map((course, i) => (
                      <div key={i} className="course-item-mini">
                        <div className="course-code">{course.code}</div>
                        <div className="course-details">
                          <div className="course-name">{course.name}</div>
                        </div>
                        <div className="course-grade">{course.grade}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="card">
                  <h3>Upcoming Assignments</h3>
                  <div className="deadline-list">
                    {currentChild.assignments.map((assignment, i) => (
                      <div key={i} className="deadline-item">
                        <div className={`priority-dot ${assignment.status === 'submitted' ? 'low' : 'high'}`}></div>
                        <div className="deadline-content">
                          <div className="deadline-title">{assignment.title}</div>
                          <div className="deadline-meta">{assignment.course} • Due {assignment.due}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="card">
                <h3>Family Summary</h3>
                <div className="stats-list">
                  <div className="stat-row">
                    <span>Children Enrolled</span>
                    <span className="stat-value">{mockData.children.length}</span>
                  </div>
                  <div className="stat-row">
                    <span>Average GPA</span>
                    <span className="stat-value">{avgGPA}</span>
                  </div>
                  <div className="stat-row">
                    <span>Total Balance Due</span>
                    <span className="stat-value warning">${totalBalance.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </>
          )}

          {activeTab === 'academic' && (
            <div className="academic-view">
              <div className="card">
                <h3>Academic Progress</h3>
                <div className="progress-info">
                  <span>{currentChild.credits.completed} / 120 Credits</span>
                  <span>{Math.round((currentChild.credits.completed / 120) * 100)}%</span>
                </div>
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${(currentChild.credits.completed / 120) * 100}%` }}></div>
                </div>
              </div>

              <div className="card">
                <h3>Course Grades</h3>
                <div className="grades-table">
                  {currentChild.courses.map((course, i) => (
                    <div key={i} className="grade-row">
                      <div className="grade-course">
                        <span className="course-code">{course.code}</span>
                        <span className="course-name">{course.name}</span>
                      </div>
                      <span className="grade-badge">{course.grade}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'assignments' && (
            <div className="assignments-view">
              {currentChild.assignments.map((assignment, i) => (
                <div key={i} className={`assignment-card ${assignment.status}`}>
                  <div className="assignment-header">
                    <div>
                      <div className="assignment-course">{assignment.course}</div>
                      <h3>{assignment.title}</h3>
                    </div>
                    <span className={`status-badge ${assignment.status}`}>
                      {assignment.status.replace('-', ' ')}
                    </span>
                  </div>
                  <div className="assignment-footer">
                    <span className="due-date">Due {assignment.due}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'financials' && (
            <div className="financials-view">
              <div className="card">
                <h3>{currentChild.name} - Financial Summary</h3>
                <div className="stats-list">
                  <div className="stat-row">
                    <span>Tuition & Fees</span>
                    <span className="stat-value">${currentChild.financials.tuition.toLocaleString()}</span>
                  </div>
                  <div className="stat-row">
                    <span>Amount Paid</span>
                    <span className="stat-value success">${currentChild.financials.paid.toLocaleString()}</span>
                  </div>
                  <div className="stat-row">
                    <span>Balance Due</span>
                    <span className="stat-value warning">${currentChild.financials.balance.toLocaleString()}</span>
                  </div>
                  <div className="stat-row">
                    <span>Due Date</span>
                    <span className="stat-value">{currentChild.financials.dueDate}</span>
                  </div>
                </div>
                <button className="btn-primary">Make Payment</button>
              </div>

              <div className="card">
                <h3>All Children - Total Balance</h3>
                <div className="balance-list">
                  {mockData.children.map((child, i) => (
                    <div key={i} className="balance-item">
                      <span className="child-name">{child.name}</span>
                      <span className="balance-amount">${child.financials.balance.toLocaleString()}</span>
                    </div>
                  ))}
                  <div className="balance-total">
                    <span>Total Due</span>
                    <span className="total-amount">${totalBalance.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'support' && (
            <div className="support-view">
              <div className="card">
                <h3>Student Support Services</h3>
                <div className="career-actions">
                  <button className="action-card">
                    <span className="action-icon">💰</span>
                    <span className="action-title">Financial Aid</span>
                  </button>
                  <button className="action-card">
                    <span className="action-icon">🎓</span>
                    <span className="action-title">Academic Counseling</span>
                  </button>
                  <button className="action-card">
                    <span className="action-icon">💼</span>
                    <span className="action-title">Career Services</span>
                  </button>
                  <button className="action-card">
                    <span className="action-icon">🏥</span>
                    <span className="action-title">Health Services</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'communication' && (
            <div className="communication-view">
              <div className="card">
                <h3>Contact Faculty</h3>
                <div className="career-actions">
                  <button className="action-card">
                    <span className="action-icon">📧</span>
                    <span className="action-title">Message Professors</span>
                  </button>
                  <button className="action-card">
                    <span className="action-icon">📅</span>
                    <span className="action-title">Schedule Meeting</span>
                  </button>
                  <button className="action-card">
                    <span className="action-icon">📞</span>
                    <span className="action-title">Contact Advisor</span>
                  </button>
                  <button className="action-card">
                    <span className="action-icon">💬</span>
                    <span className="action-title">View Messages</span>
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

export default ParentDashboard;
