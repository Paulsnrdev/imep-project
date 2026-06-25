import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { loginThunk } from '../../features/auth/authThunks';
import useAuth from '../../hooks/useAuth';
import { getRoleDashboardPath } from '../../utils/roles';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import ErrorAlert from '../../components/common/ErrorAlert';

const LoginPage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { isAuthenticated, role, onboardingComplete } = useAuth();

  const [form, setForm] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      if (!onboardingComplete) {
        navigate(`/onboarding/${roleToPath(role)}`, { replace: true });
      } else {
        navigate(getRoleDashboardPath(role), { replace: true });
      }
    }
  }, [isAuthenticated, role, onboardingComplete, navigate]);

  const roleToPath = (r) => {
    if (r === 'industry_supervisor') return 'industry';
    if (r === 'institution_supervisor') return 'institution';
    return 'student';
  };

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.email.trim() || !form.password.trim()) {
      setError('Email and password are required.');
      return;
    }
    setLoading(true);
    try {
      await dispatch(loginThunk(form)).unwrap();
    } catch (err) {
      setError(err ?? 'Login failed. Check your credentials and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">

        {/* Logo / Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-blue-600 rounded-2xl mb-4 shadow-lg">
            <span className="text-white font-bold text-2xl">I</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-800">IMEP Portal</h1>
          <p className="text-gray-500 text-sm mt-1">Internship Management & Evaluation</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-1">Welcome back</h2>
          <p className="text-gray-500 text-sm mb-6">Sign in to your account to continue</p>

          <ErrorAlert message={error} onDismiss={() => setError('')} />

          <form onSubmit={handleSubmit} className="space-y-4 mt-4" noValidate>
            <Input
              label="Email Address"
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              placeholder="you@example.com"
              required
              disabled={loading}
            />

            <div className="flex flex-col gap-1">
              <label htmlFor="password" className="text-sm font-medium text-gray-700">
                Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={handleChange}
                  placeholder="Enter your password"
                  required
                  disabled={loading}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none pr-10
                    focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                    disabled:bg-gray-50 disabled:cursor-not-allowed"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs"
                  tabIndex={-1}
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            <div className="flex justify-end">
              <Link to="/forgot-password" className="text-xs text-blue-600 hover:underline">
                Forgot password?
              </Link>
            </div>

            <Button type="submit" fullWidth loading={loading} size="lg">
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            Don&apos;t have an account?{' '}
            <Link to="/register" className="text-blue-600 font-medium hover:underline">
              Create one
            </Link>
          </p>
        </div>

        {/* Role hint */}
        <div className="mt-6 bg-white bg-opacity-60 rounded-xl p-4 text-xs text-gray-500 text-center space-y-1">
          <p className="font-medium text-gray-600">Available roles</p>
          <div className="flex justify-center gap-4 mt-1">
            <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">Student</span>
            <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Industry Supervisor</span>
            <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">Institution Supervisor</span>
          </div>
        </div>

      </div>
    </div>
  );
};

export default LoginPage;
