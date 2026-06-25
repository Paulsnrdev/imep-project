import { useState, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { updateProfile, setOnboardingComplete, selectCurrentUser } from '../../features/auth/authSlice';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import ErrorAlert from '../../components/common/ErrorAlert';

const STEPS = [
  { id: 1, label: 'Academic Info' },
  { id: 2, label: 'Location' },
  { id: 3, label: 'Contact' },
  { id: 4, label: 'Review & Submit' },
];

const StepBar = ({ current }) => (
  <div className="flex items-center gap-2 mb-8 overflow-x-auto">
    {STEPS.map((step, i) => (
      <div key={step.id} className="flex items-center gap-2 flex-1 min-w-0">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold shrink-0
          ${current > step.id ? 'bg-purple-600 text-white' : current === step.id ? 'bg-purple-600 text-white ring-4 ring-purple-100' : 'bg-gray-200 text-gray-500'}`}>
          {current > step.id ? '?' : step.id}
        </div>
        <span className={`text-xs font-medium hidden sm:block truncate ${current >= step.id ? 'text-purple-600' : 'text-gray-400'}`}>
          {step.label}
        </span>
        {i < STEPS.length - 1 && (
          <div className={`flex-1 h-0.5 shrink-0 ${current > step.id ? 'bg-purple-600' : 'bg-gray-200'}`} />
        )}
      </div>
    ))}
  </div>
);

// --- Auto-suggest input ------------------------------------------------------

const AutoSuggest = ({
  label, name, value, onChange, endpoint, placeholder, required, error,
  accent = 'purple',
  stateFilter = '',
  minLength = 1,
}) => {
  const [suggestions, setSuggestions] = useState([]);
  const [open, setOpen]               = useState(false);
  const timer                         = useRef(null);
  const wrapRef                       = useRef(null);

  const buildUrl = (q) => {
    const params = new URLSearchParams({ q });
    if (stateFilter) params.set('state', stateFilter);
    return `/search/${endpoint}?${params.toString()}`;
  };

  const fetchSuggestions = async (q) => {
    if (q.length < minLength) { setSuggestions([]); setOpen(false); return; }
    try {
      const { data } = await api.get(buildUrl(q));
      const list = data.data ?? [];
      setSuggestions(list);
      setOpen(list.length > 0);
    } catch {
      setSuggestions([]);
    }
  };

  const handleChange = (e) => {
    const q = e.target.value;
    onChange(q);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => fetchSuggestions(q), 300);
  };

  const handleFocus = () => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => fetchSuggestions(value || ''), 150);
  };

  const handleSelect = (val) => { onChange(val); setSuggestions([]); setOpen(false); };

  useEffect(() => {
    setSuggestions([]);
    setOpen(false);
  }, [stateFilter]);

  useEffect(() => {
    const handler = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={wrapRef} className="relative flex flex-col gap-1">
      <label className="text-sm font-medium text-gray-700">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <input
        name={name} value={value} onChange={handleChange} onFocus={handleFocus}
        placeholder={placeholder}
        className={`w-full px-3 py-2 border rounded-lg text-sm outline-none
          focus:ring-2 focus:ring-${accent}-500 focus:border-${accent}-500
          ${error ? 'border-red-400' : 'border-gray-300'}`}
        autoComplete="off"
      />
      {open && suggestions.length > 0 && (
        <ul className="absolute z-50 top-full mt-1 left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
          {suggestions.map((s) => (
            <li key={s} onMouseDown={() => handleSelect(s)}
              className="px-3 py-2 text-sm text-gray-700 hover:bg-purple-50 cursor-pointer">{s}</li>
          ))}
        </ul>
      )}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
};

const ReviewRow = ({ label, value }) =>
  value ? (
    <>
      <span className="text-gray-500">{label}</span>
      <span className="font-medium text-gray-800">{value}</span>
    </>
  ) : null;

// --- Main Component -----------------------------------------------------------

const InstitutionSupervisorOnboarding = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const user     = useSelector(selectCurrentUser);

  const [step, setStep]       = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  const [form, setForm] = useState({
    staffId:       '',
    university:    '',
    department:    '',
    state:         '',
    lga:           '',
    phone:         '',
    officeAddress: '',
  });

  const set = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setFieldErrors((prev) => ({ ...prev, [field]: '' }));
    if (error) setError('');
  };
  const handleChange = (e) => set(e.target.name, e.target.value);

  const validateStep1 = () => {
    const errors = {};
    if (!form.staffId.trim())    errors.staffId    = 'Required';
    if (!form.university.trim()) errors.university = 'Required';
    return errors;
  };

  const validateStep2 = () => {
    const errors = {};
    if (!form.state.trim()) errors.state = 'State is required for supervisor allocation';
    if (!form.lga.trim())   errors.lga   = 'LGA is required for supervisor allocation';
    return errors;
  };

  const handleNext = () => {
    if (step === 1) {
      const errors = validateStep1();
      if (Object.keys(errors).length) { setFieldErrors(errors); return; }
    }
    if (step === 2) {
      const errors = validateStep2();
      if (Object.keys(errors).length) { setFieldErrors(errors); return; }
    }
    setStep((s) => s + 1);
  };

  const handleBack = () => setStep((s) => s - 1);

  const handleSubmit = async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.post('/institution/onboarding', {
        staffId:       form.staffId.trim(),
        university:    form.university.trim(),
        department:    form.department.trim()    || undefined,
        state:         form.state.trim()         || undefined,
        lga:           form.lga.trim()           || undefined,
        phone:         form.phone.trim()         || undefined,
        officeAddress: form.officeAddress.trim() || undefined,
      });

      dispatch(updateProfile(data.data.user));
      dispatch(setOnboardingComplete());
      navigate('/institution/dashboard', { replace: true });
    } catch (err) {
      setError(err.response?.data?.message ?? 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-violet-100 flex items-center justify-center p-4">
      <div className="w-full max-w-xl">

        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-purple-600 rounded-2xl mb-3 shadow-lg">
            <span className="text-white font-bold text-xl">I</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-800">Complete your academic profile</h1>
          <p className="text-gray-500 text-sm mt-1">
            Welcome, {user?.firstName}! Set up your profile to start monitoring students.
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8">
          <StepBar current={step} />
          <ErrorAlert message={error} onDismiss={() => setError('')} />

          {/* -- STEP 1: Academic Info -- */}
          {step === 1 && (
            <div className="space-y-4">
              <h2 className="text-base font-semibold text-gray-800 mb-4">Academic Information</h2>

              <Input label="Staff ID / Staff Number" name="staffId" value={form.staffId}
                onChange={handleChange} placeholder="e.g. LASU/STAFF/2024/001"
                required error={fieldErrors.staffId} />

              <AutoSuggest label="University / Institution" name="university"
                value={form.university} onChange={(v) => set('university', v)}
                endpoint="universities" placeholder="e.g. Lagos State University"
                minLength={0} required error={fieldErrors.university} />

              <AutoSuggest label="Department" name="department"
                value={form.department} onChange={(v) => set('department', v)}
                endpoint="departments" placeholder="e.g. Computer Science"
                minLength={0} />

              <Button onClick={handleNext} fullWidth size="lg" className="mt-6 !bg-purple-600 hover:!bg-purple-700">
                Continue ?
              </Button>
            </div>
          )}

          {/* -- STEP 2: Location (State & LGA) � used for student allocation -- */}
          {step === 2 && (
            <div className="space-y-4">
              <h2 className="text-base font-semibold text-gray-800 mb-1">Location</h2>
              <p className="text-xs text-gray-400 mb-4">
                Your state and LGA are used to automatically allocate students in your area to you.
              </p>

              <AutoSuggest label="State" name="state"
                value={form.state}
                onChange={(v) => {
                  setForm((prev) => ({ ...prev, state: v, lga: v !== prev.state ? '' : prev.lga }));
                  setFieldErrors((prev) => ({ ...prev, state: '', lga: '' }));
                  if (error) setError('');
                }}
                endpoint="states" placeholder="e.g. Lagos State"
                minLength={0} required error={fieldErrors.state} />

              <AutoSuggest label="Local Government Area (LGA)" name="lga"
                value={form.lga} onChange={(v) => set('lga', v)}
                endpoint="lgas" placeholder="e.g. Kosofe"
                stateFilter={form.state} minLength={0} required error={fieldErrors.lga} />

              <div className="flex gap-3 mt-6">
                <Button variant="outline" onClick={handleBack} className="flex-1">? Back</Button>
                <Button onClick={handleNext} className="flex-1 !bg-purple-600 hover:!bg-purple-700">Continue ?</Button>
              </div>
            </div>
          )}

          {/* -- STEP 3: Contact -- */}
          {step === 3 && (
            <div className="space-y-4">
              <h2 className="text-base font-semibold text-gray-800 mb-4">Contact Information</h2>

              <Input label="Phone Number" name="phone" type="tel" value={form.phone}
                onChange={handleChange} placeholder="e.g. 08012345678" />

              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-700">
                  Office Address <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <textarea name="officeAddress" value={form.officeAddress} onChange={handleChange} rows={2}
                  placeholder="e.g. Faculty of Science, Block B, Room 201"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none resize-none focus:ring-2 focus:ring-purple-500" />
              </div>

              <div className="flex gap-3 mt-6">
                <Button variant="outline" onClick={handleBack} className="flex-1">? Back</Button>
                <Button onClick={handleNext} className="flex-1 !bg-purple-600 hover:!bg-purple-700">Continue ?</Button>
              </div>
            </div>
          )}

          {/* -- STEP 4: Review & Submit -- */}
          {step === 4 && (
            <div className="space-y-4">
              <h2 className="text-base font-semibold text-gray-800 mb-4">Review & Submit</h2>

              <div className="bg-gray-50 rounded-xl p-4 space-y-3 text-sm">
                <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                  <ReviewRow label="Name"          value={`${user?.firstName} ${user?.lastName}`} />
                  <ReviewRow label="Email"         value={user?.email} />
                  <ReviewRow label="Staff ID"      value={form.staffId} />
                  <ReviewRow label="University"    value={form.university} />
                  <ReviewRow label="Department"    value={form.department} />
                  <ReviewRow label="State"         value={form.state} />
                  <ReviewRow label="LGA"           value={form.lga} />
                  <ReviewRow label="Phone"         value={form.phone} />
                  <ReviewRow label="Office Address" value={form.officeAddress} />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <Button variant="outline" onClick={handleBack} disabled={loading} className="flex-1">? Back</Button>
                <Button onClick={handleSubmit} loading={loading} className="flex-1 !bg-purple-600 hover:!bg-purple-700">
                  {loading ? 'Saving...' : 'Complete Setup'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default InstitutionSupervisorOnboarding;
