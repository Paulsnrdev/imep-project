import { Navigate, Outlet } from 'react-router-dom';
import useOnboarding from '../../hooks/useOnboarding';

const OnboardingGate = () => {
  const { onboardingComplete, onboardingPath } = useOnboarding();

  if (!onboardingComplete) {
    return <Navigate to={onboardingPath} replace />;
  }

  return <Outlet />;
};

export default OnboardingGate;
