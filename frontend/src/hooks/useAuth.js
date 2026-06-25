import { useSelector } from 'react-redux';
import {
  selectCurrentUser,
  selectIsAuthenticated,
  selectUserRole,
  selectOnboardingComplete,
  selectAuthLoading,
} from '../features/auth/authSlice';
import { ROLES } from '../utils/roles';

const useAuth = () => {
  const user = useSelector(selectCurrentUser);
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const role = useSelector(selectUserRole);
  const onboardingComplete = useSelector(selectOnboardingComplete);
  const loading = useSelector(selectAuthLoading);

  return {
    user,
    role,
    isAuthenticated,
    onboardingComplete,
    loading,
    isStudent: role === ROLES.STUDENT,
    isIndustrySupervisor: role === ROLES.INDUSTRY_SUPERVISOR,
    isInstitutionSupervisor: role === ROLES.INSTITUTION_SUPERVISOR,
    isAdmin: role === ROLES.ADMIN,
  };
};

export default useAuth;
