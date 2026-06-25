import { useState, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { updateProfile, setOnboardingComplete, selectCurrentUser } from '../../features/auth/authSlice';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import ErrorAlert from '../../components/common/ErrorAlert';

const LEVELS         = ['100', '200', '300', '400', '500'];
const WEEKS_OPTIONS  = [12, 24, 48, 52];

const STEPS = [
  { id: 1, label: 'Academic Info' },
  { id: 2, label: 'Internship Details' },
  { id: 3, label: 'Personal Details' },
  { id: 4, label: 'Review & Submit' },
];

// --- Auto-suggest input ------------------------------------------------------

const AutoSuggest = ({
  label, name, value, onChange, endpoint, placeholder, required, error,
  stateFilter = '',  // when set, appends &state=<stateFilter> to the request
  minLength = 1,     // minimum chars before suggestions appear (0 = show on focus)
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

  const handleSelect = (val) => {
    onChange(val);
    setSuggestions([]);
    setOpen(false);
  };

  // Clear suggestions when state filter changes (LGA field reacts to state change)
  useEffect(() => {
    setSuggestions([]);
    setOpen(false);
  }, [stateFilter]);

  // Close dropdown on outside click
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
        name={name}
        value={value}
        onChange={handleChange}
        onFocus={handleFocus}
        placeholder={placeholder}
        className={`w-full px-3 py-2 border rounded-lg text-sm outline-none
          focus:ring-2 focus:ring-blue-500 focus:border-blue-500
          ${error ? 'border-red-400' : 'border-gray-300'}`}
        autoComplete="off"
      />
      {open && suggestions.length > 0 && (
        <ul className="absolute z-50 top-full mt-1 left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
          {suggestions.map((s) => (
            <li
              key={s}
              onMouseDown={() => handleSelect(s)}
              className="px-3 py-2 text-sm text-gray-700 hover:bg-blue-50 cursor-pointer"
            >
              {s}
            </li>
          ))}
        </ul>
      )}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
};

// --- Skill tag input ----------------------------------------------------------

const SkillInput = ({ skills, onChange }) => {
  const [input, setInput] = useState('');
  const add    = () => { const v = input.trim(); if (v && !skills.includes(v)) onChange([...skills, v]); setInput(''); };
  const remove = (s) => onChange(skills.filter((x) => x !== s));

  return (
    <div>
      <label className="text-sm font-medium text-gray-700 mb-1 block">
        Skills <span className="text-gray-400 font-normal">(optional)</span>
      </label>
      <div className="flex gap-2">
        <input value={input} onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
          placeholder="e.g. Python, AutoCAD, Excel..."
          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button type="button" onClick={add} disabled={!input.trim()}
          className="px-3 py-2 text-sm bg-blue-50 text-blue-600 rounded-lg border border-blue-200 hover:bg-blue-100 disabled:opacity-40">
          Add
        </button>
      </div>
      {skills.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {skills.map((s) => (
            <span key={s} className="flex items-center gap-1 bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded-full">
              {s}
              <button type="button" onClick={() => remove(s)} className="hover:text-blue-900 font-bold">�</button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

// --- Step indicator -----------------------------------------------------------

const StepBar = ({ current }) => (
  <div className="flex items-center gap-2 mb-8 overflow-x-auto">
    {STEPS.map((step, i) => (
      <div key={step.id} className="flex items-center gap-2 flex-1 min-w-0">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold shrink-0
          ${current > step.id ? 'bg-blue-600 text-white' : current === step.id ? 'bg-blue-600 text-white ring-4 ring-blue-100' : 'bg-gray-200 text-gray-500'}`}>
          {current > step.id ? '?' : step.id}
        </div>
        <span className={`text-xs font-medium hidden sm:block truncate ${current >= step.id ? 'text-blue-600' : 'text-gray-400'}`}>
          {step.label}
        </span>
        {i < STEPS.length - 1 && (
          <div className={`flex-1 h-0.5 shrink-0 ${current > step.id ? 'bg-blue-600' : 'bg-gray-200'}`} />
        )}
      </div>
    ))}
  </div>
);

// --- Main Component -----------------------------------------------------------

const StudentOnboarding = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const user     = useSelector(selectCurrentUser);

  const [step, setStep]       = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  const [form, setForm] = useState({
    // Step 1 � Academic
    matricNumber:    '',
    university:      '',
    department:      '',
    level:           '',
    state:           '',
    lga:             '',
    // Step 2 � Internship
    internshipPlace:     '',
    internshipStartDate: '',
    internshipEndDate:   '',
    internshipWeeks:     '',
    workShift:           '8-16',
    // Step 3 � Personal
    phone:           '',
    bio:             '',
    skills:          [],
  });

  const [fieldErrors, setFieldErrors] = useState({});

  const set = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setFieldErrors((prev) => ({ ...prev, [field]: '' }));
    if (error) setError('');
  };

  const handleChange = (e) => set(e.target.name, e.target.value);

  // Auto-calculate end date when start date + weeks are both set
  useEffect(() => {
    if (!form.internshipStartDate || !form.internshipWeeks) return;
    const start = new Date(form.internshipStartDate + 'T00:00:00');
    const end = new Date(start);
    end.setDate(start.getDate() + Number(form.internshipWeeks) * 7 - 1);
    const y = end.getFullYear();
    const m = String(end.getMonth() + 1).padStart(2, '0');
    const d = String(end.getDate()).padStart(2, '0');
    setForm((prev) => ({ ...prev, internshipEndDate: `${y}-${m}-${d}` }));
    setFieldErrors((prev) => ({ ...prev, internshipEndDate: '' }));
  }, [form.internshipStartDate, form.internshipWeeks]);

  // -- Validation --
  const validateStep1 = () => {
    const errors = {};
    if (!form.matricNumber.trim()) errors.matricNumber = 'Required';
    if (!form.university.trim())   errors.university   = 'Required';
    if (!form.department.trim())   errors.department   = 'Required';
    if (!form.level)               errors.level        = 'Required';
    return errors;
  };

  const validateStep2 = () => {
    const errors = {};
    if (form.internshipStartDate && form.internshipEndDate) {
      if (new Date(form.internshipStartDate) >= new Date(form.internshipEndDate)) {
        errors.internshipEndDate = 'End date must be after start date';
      }
    }
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

  // -- Submit --
  const handleSubmit = async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.post('/student/onboarding', {
        matricNumber:        form.matricNumber.trim(),
        university:          form.university.trim(),
        department:          form.department.trim(),
        level:               form.level,
        state:               form.state.trim(),
        lga:                 form.lga.trim(),
        phone:               form.phone.trim(),
        bio:                 form.bio.trim(),
        skills:              form.skills,
        internshipPlace:     form.internshipPlace.trim(),
        internshipStartDate: form.internshipStartDate || undefined,
        internshipEndDate:   form.internshipEndDate   || undefined,
        internshipWeeks:     form.internshipWeeks     || undefined,
        workShift:           form.workShift           || '8-16',
      });

      dispatch(updateProfile(data.data.user));
      dispatch(setOnboardingComplete());
      navigate('/student/dashboard', { replace: true });
    } catch (err) {
      setError(err.response?.data?.message ?? 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-xl">

        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-600 rounded-2xl mb-3 shadow-lg">
            <span className="text-white font-bold text-xl">I</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-800">Complete your profile</h1>
          <p className="text-gray-500 text-sm mt-1">
            Welcome, {user?.firstName}! A few more details to get you started.
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8">
          <StepBar current={step} />
          <ErrorAlert message={error} onDismiss={() => setError('')} />

          {/* -- STEP 1: Academic Info -- */}
          {step === 1 && (
            <div className="space-y-4">
              <h2 className="text-base font-semibold text-gray-800 mb-4">Academic Information</h2>

              <Input label="Matric / Registration Number" name="matricNumber"
                value={form.matricNumber} onChange={handleChange}
                placeholder="e.g. BU22CSC1001" required error={fieldErrors.matricNumber} />

              <AutoSuggest label="University / Institution" name="university"
                value={form.university} onChange={(v) => set('university', v)}
                endpoint="universities" placeholder="e.g. Bowen University"
                minLength={0} required error={fieldErrors.university} />

              <AutoSuggest label="Department" name="department"
                value={form.department} onChange={(v) => set('department', v)}
                endpoint="departments" placeholder="e.g. Computer Science"
                minLength={0} required error={fieldErrors.department} />

              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-700">
                  Current Level <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-2 flex-wrap">
                  {LEVELS.map((lvl) => (
                    <button key={lvl} type="button" onClick={() => set('level', lvl)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium border transition
                        ${form.level === lvl
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400'}`}>
                      {lvl}L
                    </button>
                  ))}
                </div>
                {fieldErrors.level && <p className="text-xs text-red-500 mt-1">{fieldErrors.level}</p>}
              </div>

              <AutoSuggest label="State" name="state"
                value={form.state}
                onChange={(v) => {
                  setForm((prev) => ({ ...prev, state: v, lga: v !== prev.state ? '' : prev.lga }));
                  setFieldErrors((prev) => ({ ...prev, state: '', lga: '' }));
                  if (error) setError('');
                }}
                endpoint="states" placeholder="e.g. Oyo State"
                minLength={0} error={fieldErrors.state} />

              <AutoSuggest label="Local Government Area (LGA)" name="lga"
                value={form.lga} onChange={(v) => set('lga', v)}
                endpoint="lgas" placeholder="e.g. Ibadan North"
                stateFilter={form.state} minLength={0} error={fieldErrors.lga} />

              <Button onClick={handleNext} fullWidth size="lg" className="mt-6">Continue ?</Button>
            </div>
          )}

          {/* -- STEP 2: Internship Details -- */}
          {step === 2 && (
            <div className="space-y-4">
              <h2 className="text-base font-semibold text-gray-800 mb-4">Internship Details</h2>
              <p className="text-xs text-gray-400 -mt-2 mb-2">These details can be updated later from your profile.</p>

              <AutoSuggest label="Internship Place / Company" name="internshipPlace"
                value={form.internshipPlace} onChange={(v) => set('internshipPlace', v)}
                endpoint="companies" placeholder="e.g. Dangote Cement Plc, Lagos"
                minLength={0} />

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium text-gray-700">Start Date</label>
                  <input type="date" name="internshipStartDate"
                    value={form.internshipStartDate} onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium text-gray-700">
                    End Date
                    {form.internshipWeeks && form.internshipStartDate && (
                      <span className="ml-1.5 text-xs text-blue-500 font-normal">(auto-calculated)</span>
                    )}
                  </label>
                  <input type="date" name="internshipEndDate"
                    value={form.internshipEndDate} onChange={handleChange}
                    min={form.internshipStartDate}
                    className={`w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500
                      ${fieldErrors.internshipEndDate ? 'border-red-400' : 'border-gray-300'}`} />
                  {fieldErrors.internshipEndDate && (
                    <p className="text-xs text-red-500">{fieldErrors.internshipEndDate}</p>
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-700">Work Schedule</label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { value: '8-16', label: '8:00 AM � 4:00 PM' },
                    { value: '9-17', label: '9:00 AM � 5:00 PM' },
                  ].map((s) => (
                    <button key={s.value} type="button"
                      onClick={() => set('workShift', s.value)}
                      className={`py-2.5 rounded-lg text-sm font-medium border transition
                        ${form.workShift === s.value
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400'}`}>
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-700">Duration (weeks)</label>
                <div className="grid grid-cols-4 gap-2">
                  {WEEKS_OPTIONS.map((w) => (
                    <button key={w} type="button"
                      onClick={() => set('internshipWeeks', form.internshipWeeks === w ? '' : w)}
                      className={`py-2 rounded-lg text-sm font-medium border transition
                        ${form.internshipWeeks === w
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400'}`}>
                      {w} wks
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <Button variant="outline" onClick={handleBack} className="flex-1">? Back</Button>
                <Button onClick={handleNext} className="flex-1">Continue ?</Button>
              </div>
            </div>
          )}

          {/* -- STEP 3: Personal Details -- */}
          {step === 3 && (
            <div className="space-y-4">
              <h2 className="text-base font-semibold text-gray-800 mb-4">Personal Details</h2>

              <Input label="Phone Number" name="phone" type="tel"
                value={form.phone} onChange={handleChange} placeholder="e.g. 08012345678" />

              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-700">
                  Short Bio <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <textarea name="bio" value={form.bio} onChange={handleChange} rows={3}
                  placeholder="Tell your supervisors a bit about yourself..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none resize-none focus:ring-2 focus:ring-blue-500" />
              </div>

              <SkillInput skills={form.skills} onChange={(skills) => set('skills', skills)} />

              <div className="flex gap-3 mt-6">
                <Button variant="outline" onClick={handleBack} className="flex-1">? Back</Button>
                <Button onClick={handleNext} className="flex-1">Continue ?</Button>
              </div>
            </div>
          )}

          {/* -- STEP 4: Review & Submit -- */}
          {step === 4 && (
            <div className="space-y-4">
              <h2 className="text-base font-semibold text-gray-800 mb-4">Review & Submit</h2>

              <div className="bg-gray-50 rounded-xl p-4 space-y-3 text-sm">
                <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                  <span className="text-gray-500">Name</span>
                  <span className="font-medium text-gray-800">{user?.firstName} {user?.lastName}</span>

                  <span className="text-gray-500">Email</span>
                  <span className="font-medium text-gray-800">{user?.email}</span>

                  <span className="text-gray-500">Matric No.</span>
                  <span className="font-medium text-gray-800">{form.matricNumber}</span>

                  <span className="text-gray-500">University</span>
                  <span className="font-medium text-gray-800">{form.university}</span>

                  <span className="text-gray-500">Department</span>
                  <span className="font-medium text-gray-800">{form.department}</span>

                  <span className="text-gray-500">Level</span>
                  <span className="font-medium text-gray-800">{form.level}L</span>

                  {form.state && (<><span className="text-gray-500">State</span><span className="font-medium text-gray-800">{form.state}</span></>)}
                  {form.lga   && (<><span className="text-gray-500">LGA</span><span className="font-medium text-gray-800">{form.lga}</span></>)}

                  {form.internshipPlace && (<><span className="text-gray-500">Internship Place</span><span className="font-medium text-gray-800">{form.internshipPlace}</span></>)}
                  {form.internshipStartDate && (<><span className="text-gray-500">Start Date</span><span className="font-medium text-gray-800">{form.internshipStartDate}</span></>)}
                  {form.internshipEndDate   && (<><span className="text-gray-500">End Date</span><span className="font-medium text-gray-800">{form.internshipEndDate}</span></>)}
                  {form.internshipWeeks     && (<><span className="text-gray-500">Duration</span><span className="font-medium text-gray-800">{form.internshipWeeks} weeks</span></>)}
                  {form.workShift           && (<><span className="text-gray-500">Work Schedule</span><span className="font-medium text-gray-800">{form.workShift === '8-16' ? '8:00 AM � 4:00 PM' : '9:00 AM � 5:00 PM'}</span></>)}
                  {form.phone               && (<><span className="text-gray-500">Phone</span><span className="font-medium text-gray-800">{form.phone}</span></>)}
                </div>

                {form.skills.length > 0 && (
                  <div className="pt-2 border-t border-gray-200">
                    <p className="text-gray-500 mb-1">Skills</p>
                    <div className="flex flex-wrap gap-1">
                      {form.skills.map((s) => (
                        <span key={s} className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full">{s}</span>
                      ))}
                    </div>
                  </div>
                )}

                {form.bio && (
                  <div className="pt-2 border-t border-gray-200">
                    <p className="text-gray-500 mb-1">Bio</p>
                    <p className="text-gray-700 text-xs leading-relaxed">{form.bio}</p>
                  </div>
                )}
              </div>

              <div className="bg-blue-50 rounded-lg p-3 text-xs text-blue-700">
                After completing this step, you will be automatically assigned to an institution supervisor in your area.
              </div>

              <div className="flex gap-3 mt-6">
                <Button variant="outline" onClick={handleBack} disabled={loading} className="flex-1">? Back</Button>
                <Button onClick={handleSubmit} loading={loading} className="flex-1">
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

export default StudentOnboarding;
