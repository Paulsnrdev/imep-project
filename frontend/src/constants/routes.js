export const ROUTES = {
  // Public
  LOGIN: '/login',
  REGISTER: '/register',
  FORGOT_PASSWORD: '/forgot-password',
  RESET_PASSWORD: '/reset-password/:token',

  // Onboarding
  ONBOARDING_STUDENT: '/onboarding/student',
  ONBOARDING_INDUSTRY: '/onboarding/industry',
  ONBOARDING_INSTITUTION: '/onboarding/institution',

  // Student
  STUDENT_DASHBOARD: '/student/dashboard',
  STUDENT_LOGBOOK: '/student/logbook',
  STUDENT_ATTENDANCE: '/student/attendance',
  STUDENT_GRADES: '/student/grades',

  // Industry Supervisor
  INDUSTRY_DASHBOARD: '/industry/dashboard',
  INDUSTRY_STUDENTS: '/industry/students',
  INDUSTRY_GRADING: '/industry/grading',
  INDUSTRY_MESSAGES: '/industry/messages',

  // Institution Supervisor
  INSTITUTION_DASHBOARD: '/institution/dashboard',
  INSTITUTION_STUDENTS: '/institution/students',
  INSTITUTION_GRADES: '/institution/grades',
  INSTITUTION_LEADERBOARD: '/institution/leaderboard',
  INSTITUTION_MESSAGES: '/institution/messages',

  // Shared
  STUDENT_SECURITY:      '/student/security',
  INDUSTRY_SECURITY:     '/industry/security',
  INSTITUTION_SECURITY:  '/institution/security',
  UNAUTHORIZED: '/unauthorized',
  NOT_FOUND: '*',
  SERVER_ERROR: '/500',
};
