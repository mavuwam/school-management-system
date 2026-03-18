import { useState } from 'react';
import './ModernDashboard.css';

interface DashboardProps {
  userName: string;
  onLogout: () => void;
}

function StudentDashboard({ userName, onLogout }: DashboardProps) {
  const [activeTab, setActiveTab] = useState('overview');

  const mockData = {
    semester: 'Spring 2026',
    gpa: 3.85,
    credits: { completed: 78, enrolled: 15, required: 120 },
    courses: [
      { code: 'CS401', name: 'Advanced Algorithms', professor: 'Dr. Smith', grade: 'A', credits: 3, progress: 85 },
      { code: 'CS420', name: 'Machine Learning', professor: 'Dr. Johnson', grade: 'A-', credits: 3, progress: 78 },
      { code: 'CS450', name: 'Database Systems', professor: 'Dr. Lee', grade: 'B+', credits: 3, progress: 82 },
      { code: 'MATH301', name: 'Linear Algebra', professor: 'Dr. Brown', grade: 'A', credits: 3, progress: 90 },
      { code: 'ENG202', name: 'Technical Writing', professor: 'Prof. Davis', grade: 'A-', credits: 3, progress: 88 },
    ],
    assignments: [
      { course: 'CS401', title: 'Algorithm Analysis Project', due: '2 days', status: 'in-progress', priority: 'high' },
      { course: 'CS420', title: 'ML Model Implementation', due: '5 days', status: 'not-started', priority: 'medium' },
      { course: 'CS450', title: 'Database Design', due: 'Tomorrow', status: 'submitted', priority: 'high' },
      { course: 'MATH301', title: 'Problem Set 8', due: '1 week', status: 'not-started', priority: 'low' },
    ],
    research: {
      project: 'Neural Network Optimization',
      advisor: 'Dr. Sarah Mitchell',
      progress: 65,
      nextMeeting: 'March 15, 2026',
    },
    library: {
      borrowed: 3,
      reserved: 1,
      fines: 0,
    },
    career: {
      applications: 5,
      interviews: 2,
      offers: 1,
    },
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
          <button className={activeTab === 'courses' ? 'active' : ''} onClick={() => setActiveTab('courses')}>
            <span className="nav-icon">📚</span>
            <span>My Courses</span>
          </button>
          <button className={activeTab === 'assignments' ? 'active' : ''} onClick={() => setActiveTab('assignments')}>
            <span className="nav-icon">📝</span>
            <span>Assignments</span>
          </button>
          <button className={activeTab === 'research' ? 'active' : ''} onClick={() => setActiveTab('research')}>
            <span className="nav-icon">🔬</span>
            <span>Research</span>
          </button>
          <button className={activeTab === 'library' ? 'active' : ''} onClick={() => setActiveTab('library')}>
            <span className="nav-icon">📖</span>
            <span>Library</span>
          </button>
          <button className={activeTab === 'career' ? 'active' : ''} onClick={() => setActiveTab('career')}>
            <span className="nav-icon">💼</span>
            <span>Career Services</span>
          </button>
        </nav>

        <div className="sidebar-footer">
          <div className="user-profile">
            <div className="user-avatar">{userName.split(' ').map(n => n[0]).join('')}</div>
            <div className="user-info">
              <div className="user-name">{userName}</div>
              <div className="user-role">Student</div>
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
              <span className="notification-badge">3</span>
              🔔
            </button>
            <button className="icon-btn">⚙️</button>
          </div>
        </header>

        <div className="content-area">
          {activeTab === 'overview' && (
            <>
              {/* Stats Cards */}
              <div className="stats-row">
                <div className="stat-card primary">
                  <div className="stat-icon">🎯</div>
                  <div className="stat-content">
                    <div className="stat-value">{mockData.gpa}</div>
                    <div className="stat-label">Current GPA</div>
                  </div>
                </div>
                <div className="stat-card success">
                  <div className="stat-icon">📚</div>
                  <div className="stat-content">
                    <div className="stat-value">{mockData.credits.enrolled}</div>
                    <div className="stat-label">Credits This Semester</div>
                  </div>
                </div>
                <div className="stat-card warning">
                  <div className="stat-icon">⏰</div>
                  <div className="stat-content">
                    <div className="stat-value">{mockData.assignments.filter(a => a.status !== 'submitted').length}</div>
                    <div className="stat-label">Pending Assignments</div>
                  </div>
                </div>
                <div className="stat-card info">
                  <div className="stat-icon">🔬</div>
                  <div className="stat-content">
                    <div className="stat-value">{mockData.research.progress}%</div>
                    <div className="stat-label">Research Progress</div>
                  </div>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="card">
                <h3>Degree Progress</h3>
                <div className="progress-info">
                  <span>{mockData.credits.completed} / {mockData.credits.required} Credits</span>
                  <span>{Math.round((mockData.credits.completed / mockData.credits.required) * 100)}%</span>
                </div>
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${(mockData.credits.completed / mockData.credits.required) * 100}%` }}></div>
                </div>
              </div>

              {/* Two Column Layout */}
              <div className="grid-2">
                <div className="card">
                  <h3>Current Courses</h3>
                  <div className="course-list">
                    {mockData.courses.slice(0, 3).map((course, i) => (
                      <div key={i} className="course-item-mini">
                        <div className="course-code">{course.code}</div>
                        <div className="course-details">
                          <div className="course-name">{course.name}</div>
                          <div className="course-meta">{course.professor}</div>
                        </div>
                        <div className="course-grade">{course.grade}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="card">
                  <h3>Upcoming Deadlines</h3>
                  <div className="deadline-list">
                    {mockData.assignments.filter(a => a.status !== 'submitted').map((assignment, i) => (
                      <div key={i} className="deadline-item">
                        <div className={`priority-dot ${assignment.priority}`}></div>
                        <div className="deadline-content">
                          <div className="deadline-title">{assignment.title}</div>
                          <div className="deadline-meta">{assignment.course} • Due {assignment.due}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}

          {activeTab === 'courses' && (
            <div className="courses-grid">
              {mockData.courses.map((course, i) => (
                <div key={i} className="course-card">
                  <div className="course-header">
                    <div className="course-code-badge">{course.code}</div>
                    <div className="course-grade-badge">{course.grade}</div>
                  </div>
                  <h3>{course.name}</h3>
                  <p className="course-professor">{course.professor}</p>
                  <div className="course-progress">
                    <div className="progress-label">
                      <span>Progress</span>
                      <span>{course.progress}%</span>
                    </div>
                    <div className="progress-bar small">
                      <div className="progress-fill" style={{ width: `${course.progress}%` }}></div>
                    </div>
                  </div>
                  <div className="course-footer">
                    <span>{course.credits} Credits</span>
                    <button className="btn-link">View Details →</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'assignments' && (
            <div className="assignments-view">
              {mockData.assignments.map((assignment, i) => (
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
                    <span className={`priority-badge ${assignment.priority}`}>
                      {assignment.priority} priority
                    </span>
                    <span className="due-date">Due {assignment.due}</span>
                    <button className="btn-primary">View Assignment</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'research' && (
            <div className="research-view">
              <div className="card large">
                <h2>Current Research Project</h2>
                <h3>{mockData.research.project}</h3>
                <p className="research-advisor">Advisor: {mockData.research.advisor}</p>
                <div className="research-progress">
                  <div className="progress-label">
                    <span>Project Progress</span>
                    <span>{mockData.research.progress}%</span>
                  </div>
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: `${mockData.research.progress}%` }}></div>
                  </div>
                </div>
                <div className="research-info">
                  <div className="info-item">
                    <span className="info-label">Next Meeting:</span>
                    <span className="info-value">{mockData.research.nextMeeting}</span>
                  </div>
                </div>
                <div className="action-buttons">
                  <button className="btn-primary">Upload Progress Report</button>
                  <button className="btn-secondary">Schedule Meeting</button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'library' && (
            <div className="library-view">
              <div className="grid-3">
                <div className="stat-card">
                  <div className="stat-icon">📚</div>
                  <div className="stat-content">
                    <div className="stat-value">{mockData.library.borrowed}</div>
                    <div className="stat-label">Books Borrowed</div>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon">🔖</div>
                  <div className="stat-content">
                    <div className="stat-value">{mockData.library.reserved}</div>
                    <div className="stat-label">Reserved Items</div>
                  </div>
                </div>
                <div className="stat-card success">
                  <div className="stat-icon">✓</div>
                  <div className="stat-content">
                    <div className="stat-value">${mockData.library.fines}</div>
                    <div className="stat-label">Outstanding Fines</div>
                  </div>
                </div>
              </div>
              <div className="card">
                <h3>Digital Library Access</h3>
                <div className="library-resources">
                  <button className="resource-btn">📄 Research Papers</button>
                  <button className="resource-btn">📖 E-Books</button>
                  <button className="resource-btn">🎥 Video Lectures</button>
                  <button className="resource-btn">🔬 Lab Resources</button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'career' && (
            <div className="career-view">
              <div className="grid-3">
                <div className="stat-card">
                  <div className="stat-icon">📝</div>
                  <div className="stat-content">
                    <div className="stat-value">{mockData.career.applications}</div>
                    <div className="stat-label">Applications Sent</div>
                  </div>
                </div>
                <div className="stat-card warning">
                  <div className="stat-icon">🗓️</div>
                  <div className="stat-content">
                    <div className="stat-value">{mockData.career.interviews}</div>
                    <div className="stat-label">Scheduled Interviews</div>
                  </div>
                </div>
                <div className="stat-card success">
                  <div className="stat-icon">🎉</div>
                  <div className="stat-content">
                    <div className="stat-value">{mockData.career.offers}</div>
                    <div className="stat-label">Job Offers</div>
                  </div>
                </div>
              </div>
              <div className="card">
                <h3>Career Services</h3>
                <div className="career-actions">
                  <button className="action-card">
                    <span className="action-icon">📄</span>
                    <span className="action-title">Resume Builder</span>
                  </button>
                  <button className="action-card">
                    <span className="action-icon">🔍</span>
                    <span className="action-title">Job Search</span>
                  </button>
                  <button className="action-card">
                    <span className="action-icon">🤝</span>
                    <span className="action-title">Networking Events</span>
                  </button>
                  <button className="action-card">
                    <span className="action-icon">💡</span>
                    <span className="action-title">Career Counseling</span>
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

export default StudentDashboard;
