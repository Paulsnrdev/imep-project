import { useSelector } from 'react-redux';
import { selectOnboardingComplete, selectUserRole } from '../features/auth/authSlice';
import { getRoleOnboardingPath } from '../utils/roles';

const useOnboarding = () => {
  const onboardingComplete = useSelector(selectOnboardingComplete);
  const role = useSelector(selectUserRole);

  return {
    onboardingComplete,
    onboardingPath: getRoleOnboardingPath(role),
    needsOnboarding: !onboardingComplete,
  };
};

export default useOnboarding;
