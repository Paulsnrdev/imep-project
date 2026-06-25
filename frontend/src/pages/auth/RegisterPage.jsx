import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { registerThunk } from '../../features/auth/authThunks';
import useAuth from '../../hooks/useAuth';
import { ROLES, getRoleOnboardingPath } from '../../utils/roles';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import ErrorAlert from '../../components/common/ErrorAlert';

// --- Role selector cards ----------------------------------------------------

const ROLE_OPTIONS = [
  {
    value: ROLES.STUDENT,
    label: 'Student',
    description: 'SIWES / IT student undergoing industrial training',
    icon: '🎓',
    color: 'border-blue-400 bg-blue-50',
    activeColor: 'ring-2 ring-blue-500',
    badge: 'bg-blue-100 text-blue-700',
  },
  {
    value: ROLES.INDUSTRY_SUPERVISOR,
    label: 'Industry Supervisor',
    description: 'Company representative supervising interns on-site',
    icon: '💼',
    color: 'border-green-400 bg-green-50',
    activeColor: 'ring-2 ring-green-500',
    badge: 'bg-green-100 text-green-700',
  },
  {
    value: ROLES.INSTITUTION_SUPERVISOR,
    label: 'Institution Supervisor',
    description: 'University staff monitoring students remotely',
    icon: '🏛️',
    color: 'border-purple-400 bg-purple-50',
    activeColor: 'ring-2 ring-purple-500',
    badge: 'bg-purple-100 text-purple-700',
  },
];

const ROLE_FIELDS = {
  [ROLES.STUDENT]: [
    { name: 'matricNumber', label: 'Matric / Registration Number', placeholder: 'e.g. BU22CSC1001', type: 'text', required: true },
    { name: 'phone', label: 'Phone Number', placeholder: 'e.g. 08012345678', type: 'tel', required: false },
  ],
  [ROLES.INDUSTRY_SUPERVISOR]: [
    { name: 'companyName', label: 'Company Name', placeholder: 'e.g. Chevron Nigeria Ltd', type: 'text', required: true },
    { name: 'designation', label: 'Job Title / Designation', placeholder: 'e.g. Senior Engineer', type: 'text', required: false },
  ],
  [ROLES.INSTITUTION_SUPERVISOR]: [
    { name: 'staffId', label: 'Staff ID', placeholder: 'e.g. BOWEN/STAFF/001', type: 'text', required: true },
    { name: 'department', label: 'Department', placeholder: 'e.g. Computer Science', type: 'text', required: false },
  ],
};

// --- Password strength -------------------------------------------------------

const getPasswordStrength = (password) => {
  if (!password) return { level: 0, label: '', color: '' };
  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  const map = [
    { level: 0, label: '', color: '' },
    { level: 1, label: 'Weak', color: 'bg-red-400' },
    { level: 2, label: 'Fair', color: 'bg-yellow-400' },
    { level: 3, label: 'Good', color: 'bg-blue-400' },
    { level: 4, label: 'Strong', color: 'bg-green-500' },
  ];
  return map[score];
};

// --- Photo Upload Component --------------------------------------------------

const PhotoUpload = ({ file, onFileChange }) => {
  const fileRef = useRef(null);
  const preview = file ? URL.createObjectURL(file) : null;

  return (
    <div className="flex flex-col items-center gap-3">
      <div
        onClick={() => fileRef.current?.click()}
        className="w-24 h-24 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center cursor-pointer overflow-hidden hover:border-blue-400 transition-colors bg-gray-50"
      >
        {preview ? (
          <img src={preview} alt="Preview" className="w-full h-full object-cover" />
        ) : (
          <div className="text-center p-2">
            <div className="text-2xl mb-1">📷</div>
            <p className="text-xs text-gray-400">Upload photo</p>
          </div>
        )}
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp"
        className="hidden"
        onChange={(e) => onFileChange(e.target.files[0] ?? null)}
      />
      {file ? (
        <div className="text-center">
          <p className="text-xs text-green-600 font-medium">{file.name}</p>
          <button
            type="button"
            onClick={() => onFileChange(null)}
            className="text-xs text-red-500 hover:underline mt-0.5"
          >
            Remove
          </button>
        </div>
      ) : (
        <p className="text-xs text-gray-400">
          JPEG / PNG / WebP, max 5 MB <span className="text-gray-300">(optional)</span>
        </p>
      )}
    </div>
  );
};

// --- Main Component ----------------------------------------------------------

const RegisterPage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { isAuthenticated, role: authRole } = useAuth();

  const [step, setStep]           = useState(1);
  const [selectedRole, setSelectedRole] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm]   = useState(false);
  const [error, setError]         = useState('');
  const [loading, setLoading]     = useState(false);
  const [profilePhoto, setProfilePhoto] = useState(null);

  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    // role-specific
    matricNumber: '',
    phone: '',
    companyName: '',
    designation: '',
    staffId: '',
    department: '',
  });

  const [fieldErrors, setFieldErrors] = useState({});

  useEffect(() => {
    if (isAuthenticated) {
      navigate(getRoleOnboardingPath(authRole), { replace: true });
    }
  }, [isAuthenticated, authRole, navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setFieldErrors((prev) => ({ ...prev, [name]: '' }));
    if (error) setError('');
  };

  const handleRoleSelect = (roleValue) => setSelectedRole(roleValue);

  const handleRoleContinue = () => {
    if (!selectedRole) { setError('Please select a role to continue.'); return; }
    setError('');
    setStep(2);
  };

  const validate = () => {
    const errors = {};
    if (!form.firstName.trim()) errors.firstName = 'First name is required';
    if (!form.lastName.trim())  errors.lastName  = 'Last name is required';
    if (!form.email.trim())     errors.email     = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(form.email)) errors.email = 'Enter a valid email';
    if (!form.password)         errors.password  = 'Password is required';
    else if (form.password.length < 8) errors.password = 'Password must be at least 8 characters';
    if (!form.confirmPassword)  errors.confirmPassword = 'Please confirm your password';
    else if (form.password !== form.confirmPassword) errors.confirmPassword = 'Passwords do not match';

    if (selectedRole === ROLES.STUDENT && !form.matricNumber.trim())
      errors.matricNumber = 'Matric number is required';
    if (selectedRole === ROLES.INDUSTRY_SUPERVISOR && !form.companyName.trim())
      errors.companyName = 'Company name is required';
    if (selectedRole === ROLES.INSTITUTION_SUPERVISOR && !form.staffId.trim())
      errors.staffId = 'Staff ID is required';

    return errors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errors = validate();
    if (Object.keys(errors).length > 0) { setFieldErrors(errors); return; }

    const payload = {
      firstName: form.firstName.trim(),
      lastName:  form.lastName.trim(),
      email:     form.email.trim().toLowerCase(),
      password:  form.password,
      role:      selectedRole,
      ...(selectedRole === ROLES.STUDENT && {
        matricNumber: form.matricNumber.trim(),
        phone:        form.phone.trim(),
      }),
      ...(selectedRole === ROLES.INDUSTRY_SUPERVISOR && {
        companyName: form.companyName.trim(),
        designation: form.designation.trim(),
      }),
      ...(selectedRole === ROLES.INSTITUTION_SUPERVISOR && {
        staffId:    form.staffId.trim(),
        department: form.department.trim(),
      }),
      // profilePhoto is a File object � authThunk appends it to FormData
      ...(profilePhoto && { profilePhoto }),
    };

    setLoading(true);
    try {
      await dispatch(registerThunk(payload)).unwrap();
    } catch (err) {
      setError(err ?? 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const strength    = getPasswordStrength(form.password);
  const roleFields  = ROLE_FIELDS[selectedRole] ?? [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">

        {/* Brand */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-600 rounded-2xl mb-3 shadow-lg">
            <span className="text-white font-bold text-xl">I</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-800">Create your IMEP account</h1>
          <p className="text-gray-500 text-sm mt-1">Internship Management & Evaluation Portal</p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-3 mb-6">
          {[1, 2].map((s) => (
            <div key={s} className="flex items-center gap-2 flex-1">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-semibold shrink-0
                ${step >= s ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'}`}>
                {step > s ? '?' : s}
              </div>
              <span className={`text-xs font-medium ${step >= s ? 'text-blue-600' : 'text-gray-400'}`}>
                {s === 1 ? 'Select Role' : 'Your Details'}
              </span>
              {s < 2 && <div className={`flex-1 h-0.5 ${step > s ? 'bg-blue-600' : 'bg-gray-200'}`} />}
            </div>
          ))}
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-6">
          <ErrorAlert message={error} onDismiss={() => setError('')} />

          {/* -- STEP 1: Role Selection -- */}
          {step === 1 && (
            <div className="mt-2">
              <h2 className="text-lg font-semibold text-gray-800 mb-1">Choose your role</h2>
              <p className="text-sm text-gray-500 mb-4">Select the role that best describes you.</p>

              <div className="space-y-3">
                {ROLE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => handleRoleSelect(opt.value)}
                    className={`w-full text-left p-4 rounded-xl border-2 transition-all
                      ${selectedRole === opt.value
                        ? `${opt.color} ${opt.activeColor}`
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{opt.icon}</span>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-gray-800 text-sm">{opt.label}</span>
                          {selectedRole === opt.value && (
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${opt.badge}`}>Selected</span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">{opt.description}</p>
                      </div>
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0
                        ${selectedRole === opt.value ? 'border-blue-600 bg-blue-600' : 'border-gray-300'}`}>
                        {selectedRole === opt.value && <div className="w-2 h-2 rounded-full bg-white" />}
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              <Button onClick={handleRoleContinue} fullWidth size="lg" className="mt-6" disabled={!selectedRole}>
                Continue ?
              </Button>
            </div>
          )}

          {/* -- STEP 2: Registration Form -- */}
          {step === 2 && (
            <div className="mt-2">
              <div className="flex items-center gap-3 mb-4">
                <button
                  type="button"
                  onClick={() => { setStep(1); setError(''); setFieldErrors({}); }}
                  className="text-gray-400 hover:text-gray-600 text-sm"
                >
                  ? Back
                </button>
                <div>
                  <h2 className="text-lg font-semibold text-gray-800 leading-tight">
                    {ROLE_OPTIONS.find((r) => r.value === selectedRole)?.icon}{' '}
                    {ROLE_OPTIONS.find((r) => r.value === selectedRole)?.label}
                  </h2>
                  <p className="text-xs text-gray-400">Fill in your details below</p>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4" noValidate>

                {/* Profile photo � all roles */}
                <div className="flex flex-col items-center pb-4 border-b border-gray-100">
                  <p className="text-sm font-medium text-gray-700 mb-3">Profile Photo</p>
                  <PhotoUpload file={profilePhoto} onFileChange={setProfilePhoto} />
                </div>

                {/* Name row */}
                <div className="grid grid-cols-2 gap-3">
                  <Input label="First Name" name="firstName" value={form.firstName} onChange={handleChange}
                    placeholder="Femi" required disabled={loading} error={fieldErrors.firstName} />
                  <Input label="Last Name" name="lastName" value={form.lastName} onChange={handleChange}
                    placeholder="Martins" required disabled={loading} error={fieldErrors.lastName} />
                </div>

                <Input label="Email Address" name="email" type="email" value={form.email} onChange={handleChange}
                  placeholder="you@example.com" required disabled={loading} error={fieldErrors.email} />

                {/* Role-specific fields */}
                {roleFields.map((field) => (
                  <Input
                    key={field.name}
                    label={field.label}
                    name={field.name}
                    type={field.type}
                    value={form[field.name]}
                    onChange={handleChange}
                    placeholder={field.placeholder}
                    required={field.required}
                    disabled={loading}
                    error={fieldErrors[field.name]}
                  />
                ))}

                {/* Password */}
                <div className="flex flex-col gap-1">
                  <label htmlFor="password" className="text-sm font-medium text-gray-700">
                    Password <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      id="password" name="password"
                      type={showPassword ? 'text' : 'password'}
                      value={form.password} onChange={handleChange}
                      placeholder="Min. 8 characters" disabled={loading}
                      className={`w-full px-3 py-2 border rounded-lg text-sm outline-none pr-12
                        focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50
                        ${fieldErrors.password ? 'border-red-400' : 'border-gray-300'}`}
                    />
                    <button type="button" onClick={() => setShowPassword((v) => !v)} tabIndex={-1}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs">
                      {showPassword ? 'Hide' : 'Show'}
                    </button>
                  </div>
                  {form.password && (
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex gap-1 flex-1">
                        {[1, 2, 3, 4].map((i) => (
                          <div key={i} className={`h-1 flex-1 rounded-full transition-colors
                            ${strength.level >= i ? strength.color : 'bg-gray-200'}`} />
                        ))}
                      </div>
                      <span className="text-xs text-gray-500">{strength.label}</span>
                    </div>
                  )}
                  {fieldErrors.password && <p className="text-xs text-red-500">{fieldErrors.password}</p>}
                </div>

                {/* Confirm password */}
                <div className="flex flex-col gap-1">
                  <label htmlFor="confirmPassword" className="text-sm font-medium text-gray-700">
                    Confirm Password <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      id="confirmPassword" name="confirmPassword"
                      type={showConfirm ? 'text' : 'password'}
                      value={form.confirmPassword} onChange={handleChange}
                      placeholder="Re-enter password" disabled={loading}
                      className={`w-full px-3 py-2 border rounded-lg text-sm outline-none pr-12
                        focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50
                        ${fieldErrors.confirmPassword ? 'border-red-400' : 'border-gray-300'}
                        ${form.confirmPassword && form.password === form.confirmPassword ? 'border-green-400' : ''}`}
                    />
                    <button type="button" onClick={() => setShowConfirm((v) => !v)} tabIndex={-1}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs">
                      {showConfirm ? 'Hide' : 'Show'}
                    </button>
                  </div>
                  {form.confirmPassword && form.password === form.confirmPassword && (
                    <p className="text-xs text-green-600">Passwords match</p>
                  )}
                  {fieldErrors.confirmPassword && (
                    <p className="text-xs text-red-500">{fieldErrors.confirmPassword}</p>
                  )}
                </div>

                <p className="text-xs text-gray-400 leading-relaxed">
                  By creating an account, you agree to IMEP&apos;s terms of use and privacy policy.
                </p>

                <Button type="submit" fullWidth size="lg" loading={loading}>
                  {loading ? 'Creating account...' : 'Create Account'}
                </Button>
              </form>
            </div>
          )}
        </div>

        <p className="text-center text-sm text-gray-500 mt-4">
          Already have an account?{' '}
          <Link to="/login" className="text-blue-600 font-medium hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  );
};

export default RegisterPage;
