import { useState, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import api from '../../services/api';
import { updateProfile, selectCurrentUser } from '../../features/auth/authSlice';

// ─── small helpers ────────────────────────────────────────────────────────────

const Field = ({ label, value, onChange, type = 'text', readOnly = false, hint }) => (
  <div className="flex flex-col gap-1">
    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</label>
    {readOnly ? (
      <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700">
        {value || <span className="text-gray-400">—</span>}
      </div>
    ) : (
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      />
    )}
    {hint && <p className="text-xs text-gray-400">{hint}</p>}
  </div>
);

const Section = ({ title, children }) => (
  <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-4">
    <h2 className="text-base font-semibold text-gray-800 border-b border-gray-100 pb-3">{title}</h2>
    {children}
  </div>
);

// ─── role-specific profile fields ────────────────────────────────────────────

const StudentFields = ({ profile, form, onChange }) => (
  <>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <Field label="Matric Number"    value={profile?.matricNumber}  readOnly />
      <Field label="Level"            value={profile?.level}         readOnly />
      <Field label="University"       value={profile?.university}    readOnly hint="Set during onboarding" />
      <Field label="Department"       value={profile?.department}    readOnly />
      <Field label="State"            value={profile?.state}         readOnly />
      <Field label="LGA"              value={profile?.lga}           readOnly />
    </div>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-gray-50">
      <Field label="Phone"           value={form.phone}          onChange={(v) => onChange('phone', v)} />
      <Field label="Internship Place" value={form.internshipPlace} onChange={(v) => onChange('internshipPlace', v)} />
      <Field label="Internship Start" value={form.internshipStartDate} type="date" onChange={(v) => onChange('internshipStartDate', v)} />
      <Field label="Internship End"   value={form.internshipEndDate}   type="date" onChange={(v) => onChange('internshipEndDate', v)} />
    </div>
    <div className="flex flex-col gap-1">
      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Work Schedule</label>
      <div className="grid grid-cols-2 gap-3">
        {[
          { value: '8-16', label: '8:00 AM – 4:00 PM' },
          { value: '9-17', label: '9:00 AM – 5:00 PM' },
        ].map((s) => (
          <button
            key={s.value}
            type="button"
            onClick={() => onChange('workShift', s.value)}
            className={`py-2 rounded-lg text-sm font-medium border transition
              ${form.workShift === s.value
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400'}`}
          >
            {s.label}
          </button>
        ))}
      </div>
    </div>
    <div className="flex flex-col gap-1">
      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Bio</label>
      <textarea
        value={form.bio}
        onChange={(e) => onChange('bio', e.target.value)}
        rows={3}
        className="px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none resize-none focus:ring-2 focus:ring-blue-500"
        placeholder="A short bio..."
      />
    </div>
  </>
);

const InstitutionFields = ({ profile, form, onChange }) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
    <Field label="Staff ID"    value={profile?.staffId}    readOnly hint="Set during onboarding" />
    <Field label="University"  value={profile?.university}  readOnly hint="Set during onboarding" />
    <Field label="State"       value={profile?.state}       readOnly />
    <Field label="LGA"         value={profile?.lga}         readOnly />
    <Field label="Department"  value={form.department}      onChange={(v) => onChange('department', v)} />
    <Field label="Phone"       value={form.phone}           onChange={(v) => onChange('phone', v)} />
    <div className="sm:col-span-2 flex flex-col gap-1">
      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Office Address</label>
      <textarea
        value={form.officeAddress}
        onChange={(e) => onChange('officeAddress', e.target.value)}
        rows={2}
        className="px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none resize-none focus:ring-2 focus:ring-blue-500"
        placeholder="Office location..."
      />
    </div>
  </div>
);

const IndustryFields = ({ profile, form, onChange }) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
    <Field label="Staff ID"  value={profile?.staffId}  readOnly hint="Set during onboarding" />
    <Field label="Company"   value={profile?.company}   readOnly hint="Set during onboarding" />
    <Field label="Job Title"  value={form.jobTitle}    onChange={(v) => onChange('jobTitle', v)} />
    <Field label="Department" value={form.department}  onChange={(v) => onChange('department', v)} />
    <Field label="Phone"      value={form.phone}       onChange={(v) => onChange('phone', v)} />
    <div className="sm:col-span-2 flex flex-col gap-1">
      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Office Address</label>
      <textarea
        value={form.officeAddress}
        onChange={(e) => onChange('officeAddress', e.target.value)}
        rows={2}
        className="px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none resize-none focus:ring-2 focus:ring-blue-500"
        placeholder="Office location..."
      />
    </div>
  </div>
);

// ─── Main component ───────────────────────────────────────────────────────────

const ProfilePage = () => {
  const dispatch   = useDispatch();
  const authUser   = useSelector(selectCurrentUser);
  const { role }   = useAuth();

  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [profile, setProfile]   = useState(null);
  const [success, setSuccess]   = useState('');
  const [error, setError]       = useState('');

  // Basic info form
  const [basicForm, setBasicForm] = useState({ firstName: '', lastName: '' });

  // Role-specific form
  const [roleForm, setRoleForm] = useState({
    phone: '', bio: '', internshipPlace: '', internshipStartDate: '', internshipEndDate: '',
    workShift: '8-16', department: '', officeAddress: '', jobTitle: '',
  });

  // Photo upload
  const fileRef = useRef(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [photoFile, setPhotoFile]       = useState(null);

  useEffect(() => {
    api.get('/me').then(({ data }) => {
      const { user, profile: p } = data.data;
      setBasicForm({ firstName: user.firstName, lastName: user.lastName });
      setProfile(p);
      if (p) {
        setRoleForm({
          phone:               p.phone               || '',
          bio:                 p.bio                 || '',
          internshipPlace:     p.internshipPlace     || '',
          internshipStartDate: p.internshipStartDate ? p.internshipStartDate.slice(0, 10) : '',
          internshipEndDate:   p.internshipEndDate   ? p.internshipEndDate.slice(0, 10)   : '',
          workShift:           p.workShift           || '8-16',
          department:          p.department          || '',
          officeAddress:       p.officeAddress       || '',
          jobTitle:            p.jobTitle            || '',
        });
      }
    }).catch(() => setError('Failed to load profile.'))
      .finally(() => setLoading(false));
  }, []);

  const handlePhotoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const fd = new FormData();
      fd.append('firstName', basicForm.firstName);
      fd.append('lastName',  basicForm.lastName);
      if (photoFile) fd.append('profilePhoto', photoFile);
      Object.entries(roleForm).forEach(([k, v]) => { if (v) fd.append(k, v); });

      const { data } = await api.patch('/me', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      dispatch(updateProfile(data.data.user));
      setProfile(data.data.profile);
      setPhotoFile(null);
      setSuccess('Profile updated successfully.');
    } catch (err) {
      setError(err.response?.data?.message ?? 'Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const initials = `${authUser?.firstName?.[0] ?? ''}${authUser?.lastName?.[0] ?? ''}`;
  const photoSrc = photoPreview || authUser?.profileImage;

  const accentByRole = {
    student:                'blue',
    institution_supervisor: 'purple',
    industry_supervisor:    'green',
  };
  const accent = accentByRole[role] ?? 'blue';
  const accentClass = {
    blue:   'bg-blue-600',
    purple: 'bg-purple-600',
    green:  'bg-green-600',
  }[accent];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className={`w-8 h-8 border-4 border-${accent}-500 border-t-transparent rounded-full animate-spin`} />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20 lg:pb-0 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">My Profile</h1>
        <p className="text-gray-500 text-sm mt-0.5">View and update your account information.</p>
      </div>

      {/* ── Photo + name ── */}
      <Section title="Account">
        <div className="flex items-center gap-5">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="relative shrink-0 group"
            title="Click to change photo"
          >
            <div className={`w-20 h-20 rounded-full overflow-hidden flex items-center justify-center text-white text-2xl font-bold ${accentClass}`}>
              {photoSrc
                ? <img src={photoSrc} alt="avatar" className="w-full h-full object-cover" />
                : initials}
            </div>
            <div className="absolute inset-0 rounded-full bg-black bg-opacity-0 group-hover:bg-opacity-30 flex items-center justify-center transition-all">
              <span className="text-white text-xs opacity-0 group-hover:opacity-100 font-medium">Change</span>
            </div>
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
          <div className="flex-1 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Field label="First Name" value={basicForm.firstName}
                onChange={(v) => setBasicForm((p) => ({ ...p, firstName: v }))} />
              <Field label="Last Name"  value={basicForm.lastName}
                onChange={(v) => setBasicForm((p) => ({ ...p, lastName: v }))} />
            </div>
            <Field label="Email" value={authUser?.email} readOnly hint="Email cannot be changed" />
          </div>
        </div>
      </Section>

      {/* ── Role-specific info ── */}
      <Section title={
        role === 'student' ? 'Academic & Internship Info' :
        role === 'institution_supervisor' ? 'Academic Info' :
        'Professional Info'
      }>
        {role === 'student' && (
          <StudentFields profile={profile} form={roleForm}
            onChange={(k, v) => setRoleForm((p) => ({ ...p, [k]: v }))} />
        )}
        {role === 'institution_supervisor' && (
          <InstitutionFields profile={profile} form={roleForm}
            onChange={(k, v) => setRoleForm((p) => ({ ...p, [k]: v }))} />
        )}
        {role === 'industry_supervisor' && (
          <IndustryFields profile={profile} form={roleForm}
            onChange={(k, v) => setRoleForm((p) => ({ ...p, [k]: v }))} />
        )}
      </Section>

      {/* ── Save button ── */}
      {error   && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">{error}</div>}
      {success && <div className="bg-green-50 border border-green-200 text-green-700 text-sm rounded-xl px-4 py-3">{success}</div>}

      <button
        onClick={handleSave}
        disabled={saving}
        className={`w-full py-3 rounded-xl text-white text-sm font-semibold transition-colors disabled:opacity-60 ${accentClass} hover:opacity-90`}
      >
        {saving ? 'Saving...' : 'Save Changes'}
      </button>

      {/* ── Security link ── */}
      {(() => {
        const securityPath = {
          student:                '/student/security',
          industry_supervisor:    '/industry/security',
          institution_supervisor: '/institution/security',
        }[role];
        return securityPath ? (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-800">Password &amp; Sessions</p>
              <p className="text-xs text-gray-400 mt-0.5">Change your password and manage active login sessions.</p>
            </div>
            <Link to={securityPath} className="text-sm font-semibold text-blue-600 hover:underline shrink-0">
              Go to Security →
            </Link>
          </div>
        ) : null;
      })()}
    </div>
  );
};

export default ProfilePage;
