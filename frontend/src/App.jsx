import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

// Guards
import ProtectedRoute from './components/auth/ProtectedRoute';
import OnboardingGate from './components/auth/OnboardingGate';
import AppLayout from './components/layout/AppLayout';

// Auth pages
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';
import ResetPasswordPage from './pages/auth/ResetPasswordPage';

// Onboarding pages
import StudentOnboarding from './pages/onboarding/StudentOnboarding';
import IndustrySupervisorOnboarding from './pages/onboarding/IndustrySupervisorOnboarding';
import InstitutionSupervisorOnboarding from './pages/onboarding/InstitutionSupervisorOnboarding';

// Student pages
import StudentDashboard from './pages/student/StudentDashboard';
import LogbookPage from './pages/student/LogbookPage';
import AttendancePage from './pages/student/AttendancePage';
import GradesPage from './pages/student/GradesPage';
import StudentMessages from './pages/student/MessagesPage';

// Industry Supervisor pages
import IndustryDashboard from './pages/industry-supervisor/IndustryDashboard';
import IndustryStudents from './pages/industry-supervisor/MyStudentsPage';
import IndustryStudentLogbook from './pages/industry-supervisor/StudentLogbookView';
import GradingPage from './pages/industry-supervisor/GradingPage';
import IndustryMessages from './pages/industry-supervisor/MessagesPage';

// Institution Supervisor pages
import InstitutionDashboard from './pages/institution-supervisor/InstitutionDashboard';
import InstitutionStudents from './pages/institution-supervisor/MyStudentsPage';
import InstitutionStudentLogbook from './pages/institution-supervisor/StudentLogbookView';
import GradesOverviewPage from './pages/institution-supervisor/GradesOverviewPage';
import LeaderboardPage from './pages/institution-supervisor/LeaderboardPage';
import InstitutionMessages from './pages/institution-supervisor/MessagesPage';
import AssignInternshipPage from './pages/institution-supervisor/AssignInternshipPage';

// Admin pages
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminUserDetailPage from './pages/admin/AdminUserDetailPage';

// Shared pages
import NotFoundPage from './pages/shared/NotFoundPage';
import UnauthorizedPage from './pages/shared/UnauthorizedPage';
import ServerErrorPage from './pages/shared/ServerErrorPage';
import ProfilePage from './pages/shared/ProfilePage';
import SecurityPage from './pages/shared/SecurityPage';

import { ROLES } from './utils/roles';

const App = () => (
  <BrowserRouter>
    <Routes>
      {/* Public */}
      <Route path="/login"                        element={<LoginPage />} />
      <Route path="/register"                     element={<RegisterPage />} />
      <Route path="/forgot-password"              element={<ForgotPasswordPage />} />
      <Route path="/reset-password/:token"        element={<ResetPasswordPage />} />
      <Route path="/unauthorized"                 element={<UnauthorizedPage />} />
      <Route path="/500"                          element={<ServerErrorPage />} />

      {/* Onboarding � auth required, any role */}
      <Route element={<ProtectedRoute />}>
        <Route path="/onboarding/student" element={<StudentOnboarding />} />
        <Route path="/onboarding/industry" element={<IndustrySupervisorOnboarding />} />
        <Route path="/onboarding/institution" element={<InstitutionSupervisorOnboarding />} />
      </Route>

      {/* Student routes */}
      <Route element={<ProtectedRoute roles={[ROLES.STUDENT]} />}>
        <Route element={<OnboardingGate />}>
          <Route element={<AppLayout />}>
            <Route path="/student/dashboard" element={<StudentDashboard />} />
            <Route path="/student/logbook" element={<LogbookPage />} />
            <Route path="/student/logbook/:weekId" element={<LogbookPage />} />
            <Route path="/student/attendance" element={<AttendancePage />} />
            <Route path="/student/grades" element={<GradesPage />} />
            <Route path="/student/messages" element={<StudentMessages />} />
            <Route path="/student/messages/:conversationId" element={<StudentMessages />} />
            <Route path="/student/profile"   element={<ProfilePage />} />
            <Route path="/student/security"  element={<SecurityPage />} />
          </Route>
        </Route>
      </Route>

      {/* Industry Supervisor routes */}
      <Route element={<ProtectedRoute roles={[ROLES.INDUSTRY_SUPERVISOR]} />}>
        <Route element={<OnboardingGate />}>
          <Route element={<AppLayout />}>
            <Route path="/industry/dashboard" element={<IndustryDashboard />} />
            <Route path="/industry/students" element={<IndustryStudents />} />
            <Route path="/industry/students/:studentId/logbook" element={<IndustryStudentLogbook />} />
            <Route path="/industry/grading" element={<GradingPage />} />
            <Route path="/industry/grading/:studentId" element={<GradingPage />} />
            <Route path="/industry/messages" element={<IndustryMessages />} />
            <Route path="/industry/messages/:conversationId" element={<IndustryMessages />} />
            <Route path="/industry/profile"   element={<ProfilePage />} />
            <Route path="/industry/security"  element={<SecurityPage />} />
          </Route>
        </Route>
      </Route>

      {/* Institution Supervisor routes */}
      <Route element={<ProtectedRoute roles={[ROLES.INSTITUTION_SUPERVISOR]} />}>
        <Route element={<OnboardingGate />}>
          <Route element={<AppLayout />}>
            <Route path="/institution/dashboard" element={<InstitutionDashboard />} />
            <Route path="/institution/students" element={<InstitutionStudents />} />
            <Route path="/institution/students/:studentId/logbook" element={<InstitutionStudentLogbook />} />
            <Route path="/institution/grades" element={<GradesOverviewPage />} />
            <Route path="/institution/leaderboard" element={<LeaderboardPage />} />
            <Route path="/institution/messages" element={<InstitutionMessages />} />
            <Route path="/institution/messages/:conversationId" element={<InstitutionMessages />} />
            <Route path="/institution/assign" element={<AssignInternshipPage />} />
            <Route path="/institution/profile"   element={<ProfilePage />} />
            <Route path="/institution/security"  element={<SecurityPage />} />
          </Route>
        </Route>
      </Route>

      {/* Admin routes */}
      <Route element={<ProtectedRoute roles={[ROLES.ADMIN]} />}>
        <Route element={<AppLayout />}>
          <Route path="/admin/dashboard"     element={<AdminDashboard />} />
          <Route path="/admin/users/:id"     element={<AdminUserDetailPage />} />
        </Route>
      </Route>

      {/* Default redirect */}
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  </BrowserRouter>
);

export default App;
