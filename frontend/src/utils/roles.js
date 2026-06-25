export const ROLES = {
  STUDENT: 'student',
  INDUSTRY_SUPERVISOR: 'industry_supervisor',
  INSTITUTION_SUPERVISOR: 'institution_supervisor',
  ADMIN: 'admin',
};

export const getRoleDisplayName = (role) => {
  const map = {
    [ROLES.STUDENT]: 'Student',
    [ROLES.INDUSTRY_SUPERVISOR]: 'Industry Supervisor',
    [ROLES.INSTITUTION_SUPERVISOR]: 'Institution Supervisor',
    [ROLES.ADMIN]: 'Admin',
  };
  return map[role] ?? role;
};

export const getRoleOnboardingPath = (role) => {
  const map = {
    [ROLES.STUDENT]: '/onboarding/student',
    [ROLES.INDUSTRY_SUPERVISOR]: '/onboarding/industry',
    [ROLES.INSTITUTION_SUPERVISOR]: '/onboarding/institution',
  };
  return map[role] ?? '/login';
};

export const getRoleDashboardPath = (role) => {
  const map = {
    [ROLES.STUDENT]: '/student/dashboard',
    [ROLES.INDUSTRY_SUPERVISOR]: '/industry/dashboard',
    [ROLES.INSTITUTION_SUPERVISOR]: '/institution/dashboard',
    [ROLES.ADMIN]: '/admin/dashboard',
  };
  return map[role] ?? '/login';
};
