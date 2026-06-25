import { useState, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { updateProfile, setOnboardingComplete, selectCurrentUser } from '../../features/auth/authSlice';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import ErrorAlert from '../../components/common/ErrorAlert';

const STEPS = [
  { id: 1, label: 'Professional Info' },
  { id: 2, label: 'Office & Location' },
  { id: 3, label: 'Review & Submit' },
];

const StepBar = ({ current }) => (
  <div className="flex items-center gap-2 mb-8">
    {STEPS.map((step, i) => (
      <div key={step.id} className="flex items-center gap-2 flex-1">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold shrink-0
          ${current > step.id ? 'bg-green-600 text-white' : current === step.id ? 'bg-green-600 text-white ring-4 ring-green-100' : 'bg-gray-200 text-gray-500'}`}>
          {current > step.id ? '?' : step.id}
        </div>
        <span className={`text-xs font-medium hidden sm:block ${current >= step.id ? 'text-green-600' : 'text-gray-400'}`}>
          {step.label}
        </span>
        {i < STEPS.length - 1 && (
          <div className={`flex-1 h-0.5 ${current > step.id ? 'bg-green-600' : 'bg-gray-200'}`} />
        )}
      </div>
    ))}
  </div>
);

const AutoSuggest = ({
  label, name, value, onChange, endpoint, placeholder, required, error,
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
          focus:ring-2 focus:ring-green-500 focus:border-green-500
          ${error ? 'border-red-400' : 'border-gray-300'}`}
        autoComplete="off"
      />
      {open && suggestions.length > 0 && (
        <ul className="absolute z-50 top-full mt-1 left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
          {suggestions.map((s) => (
            <li key={s} onMouseDown={() => handleSelect(s)}
              className="px-3 py-2 text-sm text-gray-700 hover:bg-green-50 cursor-pointer">{s}</li>
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

const IndustrySupervisorOnboarding = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const user     = useSelector(selectCurrentUser);

  const [step, setStep]       = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  const [form, setForm] = useState({
    staffId:        '',
    company:        '',
    jobTitle:       '',
    department:     '',
    state:          '',
    lga:            '',
    phone:          '',
    officeAddress:  '',
    geofenceLat:    '',
    geofenceLng:    '',
    geofenceRadius: '200',
    geofenceAddress: '',
  });

  const [locating, setLocating] = useState(false);

  const set = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setFieldErrors((prev) => ({ ...prev, [field]: '' }));
    if (error) setError('');
  };
  const handleChange = (e) => set(e.target.name, e.target.value);

  const validateStep1 = () => {
    const errors = {};
    if (!form.staffId.trim()) errors.staffId = 'Required';
    if (!form.company.trim()) errors.company = 'Required';
    return errors;
  };

  const handleNext = () => {
    if (step === 1) {
      const errors = validateStep1();
      if (Object.keys(errors).length) { setFieldErrors(errors); return; }
    }
    setStep((s) => s + 1);
  };

  const handleBack = () => setStep((s) => s - 1);

  const useMyLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser.');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        set('geofenceLat', pos.coords.latitude.toFixed(6));
        set('geofenceLng', pos.coords.longitude.toFixed(6));
        setLocating(false);
      },
      () => { setError('Could not get your location. Enter coordinates manually.'); setLocating(false); }
    );
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError('');
    try {
      const payload = {
        staffId:       form.staffId.trim(),
        company:       form.company.trim(),
        jobTitle:      form.jobTitle.trim()       || undefined,
        department:    form.department.trim()     || undefined,
        state:         form.state.trim()          || undefined,
        lga:           form.lga.trim()            || undefined,
        phone:         form.phone.trim()          || undefined,
        officeAddress: form.officeAddress.trim()  || undefined,
      };

      if (form.geofenceLat && form.geofenceLng) {
        payload.geofence = {
          latitude:  parseFloat(form.geofenceLat),
          longitude: parseFloat(form.geofenceLng),
          radius:    parseInt(form.geofenceRadius, 10) || 200,
          address:   form.geofenceAddress.trim() || undefined,
        };
      }

      const { data } = await api.post('/industry/onboarding', payload);
      dispatch(updateProfile(data.data.user));
      dispatch(setOnboardingComplete());
      navigate('/industry/dashboard', { replace: true });
    } catch (err) {
      setError(err.response?.data?.message ?? 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const hasGeofence = form.geofenceLat && form.geofenceLng;

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
      <div className="w-full max-w-xl">

        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-green-600 rounded-2xl mb-3 shadow-lg">
            <span className="text-white font-bold text-xl">I</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-800">Set up your supervisor profile</h1>
          <p className="text-gray-500 text-sm mt-1">
            Welcome, {user?.firstName}! Complete your profile to start supervising students.
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8">
          <StepBar current={step} />
          <ErrorAlert message={error} onDismiss={() => setError('')} />

          {/* -- STEP 1: Professional Info -- */}
          {step === 1 && (
            <div className="space-y-4">
              <h2 className="text-base font-semibold text-gray-800 mb-4">Professional Information</h2>

              <Input
                label="Staff ID / Employee Number"
                name="staffId"
                value={form.staffId}
                onChange={handleChange}
                placeholder="e.g. ENG/2024/001"
                required
                error={fieldErrors.staffId}
              />
              <AutoSuggest
                label="Company / Organisation"
                name="company"
                value={form.company}
                onChange={(v) => set('company', v)}
                endpoint="companies"
                placeholder="e.g. Chevron Nigeria Ltd"
                minLength={0}
                required
                error={fieldErrors.company}
              />
              <Input
                label="Job Title"
                name="jobTitle"
                value={form.jobTitle}
                onChange={handleChange}
                placeholder="e.g. Senior Software Engineer"
              />
              <AutoSuggest
                label="Department"
                name="department"
                value={form.department}
                onChange={(v) => set('department', v)}
                endpoint="departments"
                placeholder="e.g. Information Technology"
                minLength={0}
              />

              <Button onClick={handleNext} fullWidth size="lg" className="mt-6 !bg-green-600 hover:!bg-green-700">
                Continue ?
              </Button>
            </div>
          )}

          {/* -- STEP 2: Office & Location -- */}
          {step === 2 && (
            <div className="space-y-4">
              <h2 className="text-base font-semibold text-gray-800 mb-4">Office & Contact</h2>

              <AutoSuggest label="State" name="state"
                value={form.state}
                onChange={(v) => {
                  setForm((prev) => ({ ...prev, state: v, lga: v !== prev.state ? '' : prev.lga }));
                  setFieldErrors((prev) => ({ ...prev, state: '', lga: '' }));
                  if (error) setError('');
                }}
                endpoint="states" placeholder="e.g. Lagos State" minLength={0} />

              <AutoSuggest label="Local Government Area (LGA)" name="lga"
                value={form.lga} onChange={(v) => set('lga', v)}
                endpoint="lgas" placeholder="e.g. Victoria Island"
                stateFilter={form.state} minLength={0} />

              <Input
                label="Phone Number"
                name="phone"
                type="tel"
                value={form.phone}
                onChange={handleChange}
                placeholder="e.g. 08012345678"
              />
              <Input
                label="Office Address"
                name="officeAddress"
                value={form.officeAddress}
                onChange={handleChange}
                placeholder="e.g. 14 Ahmadu Bello Way, Victoria Island, Lagos"
              />

              {/* Geofence section */}
              <div className="border border-gray-200 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-700">Attendance Geofence</p>
                    <p className="text-xs text-gray-400 mt-0.5">Students must be within this radius to check in</p>
                  </div>
                  <button
                    type="button"
                    onClick={useMyLocation}
                    disabled={locating}
                    className="text-xs text-green-600 font-medium border border-green-300 px-3 py-1.5 rounded-lg hover:bg-green-50 disabled:opacity-50 whitespace-nowrap"
                  >
                    {locating ? 'Locating...' : '📍 Use My Location'}
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">Latitude</label>
                    <input
                      name="geofenceLat"
                      value={form.geofenceLat}
                      onChange={handleChange}
                      placeholder="e.g. 6.4281"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">Longitude</label>
                    <input
                      name="geofenceLng"
                      value={form.geofenceLng}
                      onChange={handleChange}
                      placeholder="e.g. 3.4219"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">Radius (metres)</label>
                    <input
                      name="geofenceRadius"
                      type="number"
                      min="50"
                      max="1000"
                      value={form.geofenceRadius}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">Location Name</label>
                    <input
                      name="geofenceAddress"
                      value={form.geofenceAddress}
                      onChange={handleChange}
                      placeholder="e.g. Head Office"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                </div>

                {!hasGeofence && (
                  <p className="text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2">
                    Without a geofence, student attendance check-ins will not require location verification.
                  </p>
                )}
                {hasGeofence && (
                  <p className="text-xs text-green-600 bg-green-50 rounded-lg px-3 py-2">
                    Geofence set � students must check in within {form.geofenceRadius}m of this location.
                  </p>
                )}
              </div>

              <div className="flex gap-3 mt-6">
                <Button variant="outline" onClick={handleBack} className="flex-1">? Back</Button>
                <Button onClick={handleNext} className="flex-1 !bg-green-600 hover:!bg-green-700">Continue ?</Button>
              </div>
            </div>
          )}

          {/* -- STEP 3: Review & Submit -- */}
          {step === 3 && (
            <div className="space-y-4">
              <h2 className="text-base font-semibold text-gray-800 mb-4">Review & Submit</h2>

              <div className="bg-gray-50 rounded-xl p-4 space-y-3 text-sm">
                <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                  <ReviewRow label="Name"       value={`${user?.firstName} ${user?.lastName}`} />
                  <ReviewRow label="Email"      value={user?.email} />
                  <ReviewRow label="Staff ID"   value={form.staffId} />
                  <ReviewRow label="Company"    value={form.company} />
                  <ReviewRow label="Job Title"  value={form.jobTitle} />
                  <ReviewRow label="Department" value={form.department} />
                  <ReviewRow label="State"      value={form.state} />
                  <ReviewRow label="LGA"        value={form.lga} />
                  <ReviewRow label="Phone"      value={form.phone} />
                  <ReviewRow label="Address"    value={form.officeAddress} />
                </div>

                {hasGeofence && (
                  <div className="pt-2 border-t border-gray-200">
                    <p className="text-gray-500 mb-1">Geofence</p>
                    <p className="text-gray-700 text-xs">
                      {form.geofenceLat}, {form.geofenceLng} � {form.geofenceRadius}m radius
                      {form.geofenceAddress && ` � ${form.geofenceAddress}`}
                    </p>
                  </div>
                )}
              </div>

              <div className="flex gap-3 mt-6">
                <Button variant="outline" onClick={handleBack} disabled={loading} className="flex-1">? Back</Button>
                <Button onClick={handleSubmit} loading={loading} className="flex-1 !bg-green-600 hover:!bg-green-700">
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

export default IndustrySupervisorOnboarding;
