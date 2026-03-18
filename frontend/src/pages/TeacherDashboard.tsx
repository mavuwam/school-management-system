import { useState } from 'react';
import './ModernDashboard.css';

interface DashboardProps {
  userName: string;
  onLogout: () => void;
}

function TeacherDashboard({ userName, onLogout }: DashboardProps) {
  const [activeTab, setActiveTab] = useState('overview');

  const mockData = {
    semester: 'Spring 2026',
    courses: [
      { code: 'CS401', name: 'Advanced Algorithms', students: 45, avgGrade: 85, attendance: 92 },
      { code: 'CS301', name: 'Data Structures', students: 60, avgGrade: 82, attendance: 88 },
      { code: 'CS501', name: 'Research Seminar', students: 12, avgGrade: 90, attendance: 95 },
    ],
    pendingGrading: [
      { course: 'CS401', title: 'Midterm Exam', count: 45, due: 'Tomorrow', priority: 'high' },
      { course: 'CS301', title: 'Assignment 5', count: 60, due: '3 days', priority: 'medium' },
      { course: 'CS501', title: 'Research Proposals', count: 12, due: '1 week', priority: 'low' },
    ],
    research: {
      phd: 3,
      masters: 5,
      publications: 12,
      grants: 2,
    },
    schedule: [
      { time: '09:00', course: 'CS401', room: 'Hall A-301', type: 'Lecture' },
      { time: '11:00', course: 'CS301', room: 'Lab B-105', type: 'Lab' },
      { time: '14:00', course: 'CS501', room: 'Seminar Room 3', type: 'Seminar' },
      { time: '16:00', title: 'Office Hours', room: 'Office 412', type: 'Office Hours' },
    ],
    analytics: {
      totalStudents: 117,
      avgAttendance: 90,
      avgGrade: 84,
      pendingItems: 117,
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
          <button className={activeTab === 'grading' ? 'active' : ''} onClick={() => setActiveTab('grading')}>
            <span className="nav-icon">📝</span>
            <span>Grading Queue</span>
          </button>
          <button className={activeTab === 'research' ? 'active' : ''} onClick={() => setActiveTab('research')}>
            <span className="nav-icon">🔬</span>
            <span>Research</span>
          </button>
          <button className={activeTab === 'schedule' ? 'active' : ''} onClick={() => setActiveTab('schedule')}>
            <span className="nav-icon">📅</span>
            <span>Schedule</span>
          </button>
          <button className={activeTab === 'analytics' ? 'active' : ''} onClick={() => setActiveTab('analytics')}>
            <span className="nav-icon">📈</span>
            <span>Analytics</span>
          </button>
        </nav>

        <div className="sidebar-footer">
          <div className="user-profile">
            <div className="user-avatar">{userName.split(' ').map(n => n[0]).join('')}</div>
            <div className="user-info">
              <div className="user-name">{userName}</div>
              <div className="user-role">Professor</div>
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
              <span className="notification-badge">5</span>
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
                    <div className="stat-value">{mockData.analytics.totalStudents}</div>
                    <div className="stat-label">Total Students</div>
                  </div>
                </div>
                <div className="stat-card success">
                  <div className="stat-icon">✓</div>
                  <div className="stat-content">
                    <div className="stat-value">{mockData.analytics.avgAttendance}%</div>
                    <div className="stat-label">Avg Attendance</div>
                  </div>
                </div>
                <div className="stat-card warning">
                  <div className="stat-icon">📝</div>
                  <div className="stat-content">
                    <div className="stat-value">{mockData.analytics.pendingItems}</div>
                    <div className="stat-label">Pending Grading</div>
                  </div>
                </div>
                <div className="stat-card info">
                  <div className="stat-icon">📊</div>
                  <div className="stat-content">
                    <div className="stat-value">{mockData.analytics.avgGrade}%</div>
                    <div className="stat-label">Avg Grade</div>
                  </div>
                </div>
              </div>

              <div className="grid-2">
                <div className="card">
                  <h3>My Courses</h3>
                  <div className="course-list">
                    {mockData.courses.map((course, i) => (
                      <div key={i} className="course-item-mini">
                        <div className="course-code">{course.code}</div>
                        <div className="course-details">
                          <div className="course-name">{course.name}</div>
                          <div className="course-meta">{course.students} students • {course.avgGrade}% avg</div>
                        </div>
                        <button className="btn-link">View →</button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="card">
                  <h3>Urgent Grading</h3>
                  <div className="deadline-list">
                    {mockData.pendingGrading.map((item, i) => (
                      <div key={i} className="deadline-item">
                        <div className={`priority-dot ${item.priority}`}></div>
                        <div className="deadline-content">
                          <div className="deadline-title">{item.title}</div>
                          <div className="deadline-meta">{item.course} • {item.count} items • Due {item.due}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="card">
                <h3>Today's Schedule</h3>
                <div className="schedule-timeline">
                  {mockData.schedule.map((item, i) => (
                    <div key={i} className="schedule-item">
                      <div className="schedule-time">{item.time}</div>
                      <div className="schedule-details">
                        <div className="schedule-title">{item.course || item.title}</div>
                        <div className="schedule-meta">{item.room} • {item.type}</div>
                      </div>
                    </div>
                  ))}
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
                    <div className="course-grade-badge">{course.avgGrade}%</div>
                  </div>
                  <h3>{course.name}</h3>
                  <div className="course-stats">
                    <div className="stat-item">
                      <span className="stat-label">Students</span>
                      <span className="stat-value">{course.students}</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-label">Attendance</span>
                      <span className="stat-value">{course.attendance}%</span>
                    </div>
                  </div>
                  <div className="course-footer">
                    <button className="btn-secondary">Gradebook</button>
                    <button className="btn-primary">Manage Course</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'grading' && (
            <div className="assignments-view">
              {mockData.pendingGrading.map((item, i) => (
                <div key={i} className="assignment-card">
                  <div className="assignment-header">
                    <div>
                      <div className="assignment-course">{item.course}</div>
                      <h3>{item.title}</h3>
                    </div>
                    <span className={`priority-badge ${item.priority}`}>
                      {item.priority} priority
                    </span>
                  </div>
                  <div className="assignment-footer">
                    <span>{item.count} submissions</span>
                    <span className="due-date">Due {item.due}</span>
                    <button className="btn-primary">Start Grading</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'research' && (
            <div className="research-view">
              <div className="grid-2">
                <div className="stat-card">
                  <div className="stat-icon">🎓</div>
                  <div className="stat-content">
                    <div className="stat-value">{mockData.research.phd}</div>
                    <div className="stat-label">PhD Students</div>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon">📚</div>
                  <div className="stat-content">
                    <div className="stat-value">{mockData.research.masters}</div>
                    <div className="stat-label">Masters Students</div>
                  </div>
                </div>
              </div>
              <div className="grid-2">
                <div className="stat-card success">
                  <div className="stat-icon">📄</div>
                  <div className="stat-content">
                    <div className="stat-value">{mockData.research.publications}</div>
                    <div className="stat-label">Publications</div>
                  </div>
                </div>
                <div className="stat-card info">
                  <div className="stat-icon">💰</div>
                  <div className="stat-content">
                    <div className="stat-value">{mockData.research.grants}</div>
                    <div className="stat-label">Active Grants</div>
                  </div>
                </div>
              </div>
              <div className="card">
                <h3>Research Activities</h3>
                <div className="career-actions">
                  <button className="action-card">
                    <span className="action-icon">👥</span>
                    <span className="action-title">Supervise Students</span>
                  </button>
                  <button className="action-card">
                    <span className="action-icon">📝</span>
                    <span className="action-title">Submit Paper</span>
                  </button>
                  <button className="action-card">
                    <span className="action-icon">💡</span>
                    <span className="action-title">Grant Proposals</span>
                  </button>
                  <button className="action-card">
                    <span className="action-icon">🔬</span>
                    <span className="action-title">Lab Management</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'schedule' && (
            <div className="card">
              <h3>Weekly Schedule</h3>
              <div className="schedule-timeline">
                {mockData.schedule.map((item, i) => (
                  <div key={i} className="schedule-item">
                    <div className="schedule-time">{item.time}</div>
                    <div className="schedule-details">
                      <div className="schedule-title">{item.course || item.title}</div>
                      <div className="schedule-meta">{item.room} • {item.type}</div>
                    </div>
                    <button className="btn-link">Edit</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'analytics' && (
            <div className="analytics-view">
              <div className="card">
                <h3>Course Performance Analytics</h3>
                <div className="analytics-grid">
                  {mockData.courses.map((course, i) => (
                    <div key={i} className="analytics-card">
                      <h4>{course.code}</h4>
                      <div className="analytics-stats">
                        <div className="analytics-stat">
                          <span>Avg Grade</span>
                          <span className="stat-value">{course.avgGrade}%</span>
                        </div>
                        <div className="analytics-stat">
                          <span>Attendance</span>
                          <span className="stat-value">{course.attendance}%</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default TeacherDashboard;
