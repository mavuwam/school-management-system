import { useState } from 'react';
import LoginPage from './pages/LoginPage';
import StudentDashboard from './pages/StudentDashboard';
import TeacherDashboard from './pages/TeacherDashboard';
import SchoolHeadDashboard from './pages/SchoolHeadDashboard';
import ParentDashboard from './pages/ParentDashboard';

type UserRole = 'STUDENT' | 'TEACHER' | 'SCHOOL_HEAD' | 'PARENT' | null;

function App() {
  const [userRole, setUserRole] = useState<UserRole>(null);
  const [userName, setUserName] = useState('');

  const handleLogin = (role: UserRole, name: string) => {
    setUserRole(role);
    setUserName(name);
  };

  const handleLogout = () => {
    setUserRole(null);
    setUserName('');
  };

  if (!userRole) {
    return <LoginPage onLogin={handleLogin} />;
  }

  return (
    <div>
      {userRole === 'STUDENT' && <StudentDashboard userName={userName} onLogout={handleLogout} />}
      {userRole === 'TEACHER' && <TeacherDashboard userName={userName} onLogout={handleLogout} />}
      {userRole === 'SCHOOL_HEAD' && <SchoolHeadDashboard userName={userName} onLogout={handleLogout} />}
      {userRole === 'PARENT' && <ParentDashboard userName={userName} onLogout={handleLogout} />}
    </div>
  );
}

export default App;
