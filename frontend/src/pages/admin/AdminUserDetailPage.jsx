import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import Avatar from '../../components/common/Avatar';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import Spinner from '../../components/common/Spinner';
import Modal from '../../components/common/Modal';
import { formatDate } from '../../utils/formatDate';

// --- helpers ------------------------------------------------------------------

const roleBadge = (role) => {
  const map = {
    student:                { label: 'Student',          variant: 'blue'   },
    industry_supervisor:    { label: 'Industry Sup.',    variant: 'purple' },
    institution_supervisor: { label: 'Institution Sup.', variant: 'yellow' },
    admin:                  { label: 'Admin',             variant: 'gray'  },
  };
  return map[role] ?? { label: role, variant: 'gray' };
};

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

const Field = ({ label, value }) => (
  <div>
    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">{label}</p>
    <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
      {value || <span className="italic text-gray-300">·</span>}
    </p>
  </div>
);

// --- Tab button ---------------------------------------------------------------

const Tab = ({ active, onClick, children }) => (
  <button
    onClick={onClick}
    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
      active
        ? 'border-blue-600 text-blue-600'
        : 'border-transparent text-gray-500 hover:text-gray-700'
    }`}
  >
    {children}
  </button>
);

// --- Profile edit form --------------------------------------------------------

const STUDENT_FIELDS = [
  { key: 'phone',               label: 'Phone' },
  { key: 'bio',                 label: 'Bio' },
  { key: 'matricNumber',        label: 'Matric Number' },
  { key: 'university',          label: 'University' },
  { key: 'department',          label: 'Department' },
  { key: 'level',               label: 'Level' },
  { key: 'state',               label: 'State' },
  { key: 'lga',                 label: 'LGA' },
  { key: 'internshipPlace',     label: 'Internship Place / Company' },
  { key: 'internshipWeeks',     label: 'Internship Weeks' },
  { key: 'internshipStartDate', label: 'Internship Start Date', type: 'date' },
  { key: 'internshipEndDate',   label: 'Internship End Date',   type: 'date' },
];

const INDUSTRY_FIELDS = [
  { key: 'phone',         label: 'Phone' },
  { key: 'officeAddress', label: 'Office Address' },
  { key: 'jobTitle',      label: 'Job Title' },
  { key: 'department',    label: 'Department' },
  { key: 'company',       label: 'Company' },
  { key: 'staffId',       label: 'Staff ID' },
];

const INSTITUTION_FIELDS = [
  { key: 'phone',         label: 'Phone' },
  { key: 'officeAddress', label: 'Office Address' },
  { key: 'department',    label: 'Department' },
  { key: 'university',    label: 'University' },
  { key: 'staffId',       label: 'Staff ID' },
];

const profileFieldsFor = (role) => {
  if (role === 'student')                return STUDENT_FIELDS;
  if (role === 'industry_supervisor')    return INDUSTRY_FIELDS;
  if (role === 'institution_supervisor') return INSTITUTION_FIELDS;
  return [];
};

const toDateInput = (val) => {
  if (!val) return '';
  return new Date(val).toISOString().split('T')[0];
};

const ProfileEditTab = ({ user, profile, onSaved }) => {
  const [form, setForm]       = useState({});
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const initial = {
      firstName: user.firstName || '',
      lastName:  user.lastName  || '',
    };
    for (const f of profileFieldsFor(user.role)) {
      if (f.type === 'date') {
        initial[f.key] = toDateInput(profile?.[f.key]);
      } else {
        initial[f.key] = profile?.[f.key] ?? '';
      }
    }
    setForm(initial);
  }, [user, profile]);

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setError('');
    setSuccess('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const { data } = await api.patch(`/admin/users/${user._id}/profile`, form);
      setSuccess('Profile updated successfully.');
      onSaved(data.data);
    } catch (err) {
      setError(err.response?.data?.message ?? 'Failed to save changes.');
    } finally {
      setSaving(false);
    }
  };

  const fields = profileFieldsFor(user.role);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error   && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">{error}</div>}
      {success && <div className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-4 py-3">{success}</div>}

      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Account</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label className="block">
            <span className="text-xs font-semibold text-gray-500 mb-1 block">First Name</span>
            <input
              name="firstName"
              value={form.firstName ?? ''}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-gray-500 mb-1 block">Last Name</span>
            <input
              name="lastName"
              value={form.lastName ?? ''}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </label>
        </div>
      </div>

      {fields.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Profile</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {fields.map((f) => (
              <label key={f.key} className={f.key === 'bio' ? 'sm:col-span-2 block' : 'block'}>
                <span className="text-xs font-semibold text-gray-500 mb-1 block">{f.label}</span>
                {f.key === 'bio' ? (
                  <textarea
                    name={f.key}
                    rows={3}
                    value={form[f.key] ?? ''}
                    onChange={handleChange}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  />
                ) : (
                  <input
                    name={f.key}
                    type={f.type ?? 'text'}
                    value={form[f.key] ?? ''}
                    onChange={handleChange}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                )}
              </label>
            ))}
          </div>
        </div>
      )}

      <div className="flex justify-end pt-2">
        <Button type="submit" loading={saving}>Save Changes</Button>
      </div>
    </form>
  );
};

// --- Supervisors section (student profile tab) --------------------------------

const SupervisorsSection = ({ userId, currentSupervisors, hasInternship, onSaved }) => {
  const [industryList,     setIndustryList]     = useState([]);
  const [institutionList,  setInstitutionList]  = useState([]);
  const [selectedIndustry, setSelectedIndustry] = useState('');
  const [selectedInstitution, setSelectedInstitution] = useState('');
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    Promise.all([
      api.get('/admin/users?role=industry_supervisor&limit=200'),
      api.get('/admin/users?role=institution_supervisor&limit=200'),
    ]).then(([indRes, insRes]) => {
      setIndustryList(indRes.data.data);
      setInstitutionList(insRes.data.data);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    setSelectedIndustry(currentSupervisors?.industry?._id  ?? '');
    setSelectedInstitution(currentSupervisors?.institution?._id ?? '');
  }, [currentSupervisors]);

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const { data } = await api.patch(`/admin/users/${userId}/supervisors`, {
        industrySupervisorId:    selectedIndustry    || null,
        institutionSupervisorId: selectedInstitution || null,
      });
      setSuccess('Supervisors updated successfully.');
      onSaved(data.data.internship);
    } catch (err) {
      setError(err.response?.data?.message ?? 'Failed to update supervisors.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="border-t border-gray-100 pt-6 mt-2">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Supervisors</p>
      {!hasInternship && (
        <p className="text-sm text-gray-400 italic mb-3">No active internship · supervisors can be assigned once an internship exists.</p>
      )}
      {error   && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-3">{error}</div>}
      {success && <div className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-4 py-3 mb-3">{success}</div>}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <label className="block">
          <span className="text-xs font-semibold text-gray-500 mb-1 block">Industry Supervisor</span>
          <select
            value={selectedIndustry}
            onChange={(e) => { setSelectedIndustry(e.target.value); setError(''); setSuccess(''); }}
            disabled={!hasInternship}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-400"
          >
            <option value="">· None ·</option>
            {industryList.map((u) => (
              <option key={u._id} value={u._id}>{u.firstName} {u.lastName} ({u.email})</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-xs font-semibold text-gray-500 mb-1 block">Institution Supervisor</span>
          <select
            value={selectedInstitution}
            onChange={(e) => { setSelectedInstitution(e.target.value); setError(''); setSuccess(''); }}
            disabled={!hasInternship}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-400"
          >
            <option value="">· None ·</option>
            {institutionList.map((u) => (
              <option key={u._id} value={u._id}>{u.firstName} {u.lastName} ({u.email})</option>
            ))}
          </select>
        </label>
      </div>
      <div className="flex justify-end mt-4">
        <Button size="sm" onClick={handleSave} loading={saving} disabled={!hasInternship}>
          Save Supervisors
        </Button>
      </div>
    </div>
  );
};

// --- Attendance tab -----------------------------------------------------------

const ATTENDANCE_STATUSES = ['present', 'absent', 'late', 'half_day'];

const statusColor = (s) => {
  const map = {
    present:  'bg-green-100 text-green-700',
    absent:   'bg-red-100 text-red-700',
    late:     'bg-yellow-100 text-yellow-700',
    half_day: 'bg-orange-100 text-orange-700',
  };
  return map[s] ?? 'bg-gray-100 text-gray-500';
};

const fmtTime = (val) =>
  val ? new Date(val).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—';

const fmtDay = (val) =>
  val ? new Date(val).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const toDatetimeLocal = (val) =>
  val ? new Date(val).toISOString().slice(0, 16) : '';

const AttendanceTab = ({ userId }) => {
  const [records,   setRecords]   = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState('');
  const [editId,    setEditId]    = useState(null);
  const [editForm,  setEditForm]  = useState({});
  const [saving,    setSaving]    = useState(false);
  const [saveError, setSaveError] = useState('');

  useEffect(() => {
    api.get(`/admin/users/${userId}/attendance`)
      .then(({ data: res }) => setRecords(res.data.records))
      .catch(() => setError('Failed to load attendance records.'))
      .finally(() => setLoading(false));
  }, [userId]);

  const openEdit = (record) => {
    setEditId(record._id);
    setEditForm({
      status:       record.status,
      checkInTime:  toDatetimeLocal(record.checkIn?.time),
      checkOutTime: toDatetimeLocal(record.checkOut?.time),
      missedCheckout: record.missedCheckout || false,
    });
    setSaveError('');
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveError('');
    try {
      const { data: res } = await api.patch(
        `/admin/users/${userId}/attendance/${editId}`,
        editForm
      );
      setRecords((prev) => prev.map((r) => r._id === editId ? res.data.record : r));
      setEditId(null);
    } catch (err) {
      setSaveError(err.response?.data?.message ?? 'Failed to save changes.');
    } finally {
      setSaving(false);
    }
  };

  const setField = (key, val) => setEditForm((p) => ({ ...p, [key]: val }));

  if (loading) return <div className="flex justify-center py-12"><Spinner /></div>;
  if (error)   return <div className="text-sm text-red-600 bg-red-50 rounded-lg p-4">{error}</div>;
  if (!records.length) return <div className="text-center py-12 text-sm text-gray-400">No attendance records found.</div>;

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Date</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Check In</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Check Out</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Missed Out</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {records.map((r) => (
              <tr key={r._id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-gray-700 font-medium whitespace-nowrap">{fmtDay(r.date)}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs font-medium px-2 py-1 rounded-full ${statusColor(r.status)}`}>
                    {r.status.replace('_', ' ')}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{fmtTime(r.checkIn?.time)}</td>
                <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{fmtTime(r.checkOut?.time)}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs font-medium ${r.missedCheckout ? 'text-red-600' : 'text-gray-400'}`}>
                    {r.missedCheckout ? 'Yes' : 'No'}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => openEdit(r)}
                    className="text-xs text-blue-600 hover:underline font-medium"
                  >
                    Edit
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal isOpen={!!editId} onClose={() => setEditId(null)} title="Edit Attendance Record">
        <div className="space-y-4">
          {saveError && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">{saveError}</div>
          )}
          <label className="block">
            <span className="text-xs font-semibold text-gray-500 mb-1 block">Status</span>
            <select
              value={editForm.status ?? ''}
              onChange={(e) => setField('status', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {ATTENDANCE_STATUSES.map((s) => (
                <option key={s} value={s}>{s.replace('_', ' ')}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-gray-500 mb-1 block">Check-In Time</span>
            <input
              type="datetime-local"
              value={editForm.checkInTime ?? ''}
              onChange={(e) => setField('checkInTime', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-gray-500 mb-1 block">Check-Out Time</span>
            <input
              type="datetime-local"
              value={editForm.checkOutTime ?? ''}
              onChange={(e) => setField('checkOutTime', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={editForm.missedCheckout ?? false}
              onChange={(e) => setField('missedCheckout', e.target.checked)}
              className="w-4 h-4 accent-blue-600"
            />
            <span className="text-sm text-gray-600">Missed Checkout</span>
          </label>
          <div className="flex gap-3">
            <Button onClick={handleSave} loading={saving}>Save Changes</Button>
            <Button variant="secondary" onClick={() => setEditId(null)}>Cancel</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

// --- Logbook tab --------------------------------------------------------------

const LogbookTab = ({ userId }) => {
  const [data,          setData]          = useState(null);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState('');
  const [activeWeekId,  setActiveWeekId]  = useState(null);
  const [activeDay,     setActiveDay]     = useState('Monday');

  // comment
  const [commentText,   setCommentText]   = useState('');
  const [commenting,    setCommenting]    = useState(false);
  const [commentError,  setCommentError]  = useState('');

  // grade
  const [gradeModal,    setGradeModal]    = useState(false);
  const [gradeScore,    setGradeScore]    = useState('');
  const [gradeNote,     setGradeNote]     = useState('');
  const [grading,       setGrading]       = useState(false);
  const [gradeError,    setGradeError]    = useState('');

  useEffect(() => {
    api.get(`/admin/users/${userId}/logbook`)
      .then(({ data: res }) => {
        setData(res.data);
        if (res.data.weeks.length) {
          setActiveWeekId(res.data.weeks[res.data.weeks.length - 1]._id);
        }
      })
      .catch(() => setError('Failed to load logbook.'))
      .finally(() => setLoading(false));
  }, [userId]);

  const activeWeek = data?.weeks?.find((w) => w._id === activeWeekId);

  const handleComment = async () => {
    if (!commentText.trim()) return;
    setCommenting(true);
    setCommentError('');
    try {
      await api.post(`/admin/users/${userId}/logbook/${activeWeekId}/comment`, { comment: commentText });
      setData((prev) => ({
        ...prev,
        weeks: prev.weeks.map((w) =>
          w._id === activeWeekId
            ? { ...w, supervisorComment: commentText.trim(), commentedAt: new Date().toISOString() }
            : w
        ),
      }));
      setCommentText('');
    } catch (err) {
      setCommentError(err.response?.data?.message ?? 'Failed to save comment.');
    } finally {
      setCommenting(false);
    }
  };

  const handleGrade = async () => {
    setGrading(true);
    setGradeError('');
    try {
      await api.post(`/admin/users/${userId}/grade/${activeWeekId}`, {
        supervisorScore: gradeScore,
        supervisorNote:  gradeNote,
      });
      setGradeModal(false);
      setGradeScore('');
      setGradeNote('');
    } catch (err) {
      setGradeError(err.response?.data?.message ?? 'Failed to submit grade.');
    } finally {
      setGrading(false);
    }
  };

  if (loading) return <div className="flex justify-center py-12"><Spinner /></div>;
  if (error)   return <div className="text-sm text-red-600 bg-red-50 rounded-lg p-4">{error}</div>;
  if (!data)   return null;

  const { weeks } = data;

  if (!weeks.length) {
    return (
      <div className="text-center py-12 text-sm text-gray-400">No logbook weeks found for this student.</div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">

        {/* Week list */}
        <div className="md:col-span-1 space-y-2">
          <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide px-1">Weeks</p>
          {weeks.map((w) => {
            const isActive = w._id === activeWeekId;
            return (
              <button
                key={w._id}
                onClick={() => { setActiveWeekId(w._id); setActiveDay('Monday'); setCommentText(''); setCommentError(''); }}
                className={`w-full text-left px-4 py-3 rounded-xl border transition-colors ${
                  isActive
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white border-gray-100 hover:bg-gray-50 text-gray-700'
                }`}
              >
                <p className="text-sm font-semibold">Week {w.weekNumber}</p>
                <p className={`text-xs mt-0.5 ${isActive ? 'text-blue-200' : 'text-gray-400'}`}>
                  {w.entries?.length ?? 0}/5 entries · {w.isLocked ? 'Locked' : 'Open'}
                </p>
                {w.supervisorComment && (
                  <p className={`text-xs mt-0.5 ${isActive ? 'text-blue-200' : 'text-green-600'}`}>? Commented</p>
                )}
              </button>
            );
          })}
        </div>

        {/* Entry viewer */}
        <div className="md:col-span-3 space-y-4">
          {activeWeek && (
            <>
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-gray-800">Week {activeWeek.weekNumber}</h3>
                    <p className="text-xs text-gray-400">
                      {activeWeek.weekStartDate ? formatDate(activeWeek.weekStartDate) : ''} ·{' '}
                      {activeWeek.weekEndDate   ? formatDate(activeWeek.weekEndDate)   : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-medium px-3 py-1 rounded-full ${activeWeek.isLocked ? 'bg-gray-100 text-gray-500' : 'bg-green-100 text-green-700'}`}>
                      {activeWeek.isLocked ? 'Locked' : 'Open'}
                    </span>
                    <Button size="sm" variant="outline" onClick={() => { setGradeModal(true); setGradeError(''); }}>
                      Grade Week
                    </Button>
                  </div>
                </div>

                {/* Day tabs */}
                <div className="flex gap-1 mb-4">
                  {DAYS.map((day) => {
                    const hasEntry = activeWeek.entries?.some((e) => e.dayOfWeek === day);
                    const skipped  = activeWeek.startDayOffset > 0 && DAYS.indexOf(day) < activeWeek.startDayOffset;
                    return (
                      <button
                        key={day}
                        onClick={() => !skipped && setActiveDay(day)}
                        disabled={skipped}
                        className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-colors ${
                          skipped
                            ? 'bg-gray-50 text-gray-300 cursor-not-allowed'
                            : activeDay === day
                            ? 'bg-blue-600 text-white'
                            : hasEntry
                            ? 'bg-green-100 text-green-700 hover:bg-green-200'
                            : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                        }`}
                      >
                        {day.slice(0, 3)}
                        {hasEntry && activeDay !== day && !skipped && (
                          <span className="block w-1 h-1 bg-green-500 rounded-full mx-auto mt-0.5" />
                        )}
                      </button>
                    );
                  })}
                </div>

                {(() => {
                  const entry = activeWeek.entries?.find((e) => e.dayOfWeek === activeDay);
                  if (!entry) return <div className="text-center py-8 text-sm text-gray-400">No entry for {activeDay}</div>;
                  return (
                    <div className="space-y-4">
                      <Field label="Activities Carried Out"  value={entry.activitiesCarriedOut} />
                      <Field label="Skills Learned"          value={entry.skillsLearned} />
                      <Field label="Challenges Encountered"  value={entry.challenges} />
                      <Field label="Plan for Tomorrow"       value={entry.planForTomorrow} />
                    </div>
                  );
                })()}
              </div>

              {/* Weekly image */}
              {activeWeek.weeklyImage && (
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                  <h3 className="font-semibold text-gray-800 mb-3">Weekly Photo</h3>
                  <img
                    src={activeWeek.weeklyImage}
                    alt={`Week ${activeWeek.weekNumber} photo`}
                    className="w-full max-h-96 object-contain rounded-lg border border-gray-100"
                  />
                  {activeWeek.weeklyImageUploadedAt && (
                    <p className="text-xs text-gray-400 mt-2">Uploaded {formatDate(activeWeek.weeklyImageUploadedAt)}</p>
                  )}
                </div>
              )}

              {/* Existing comment */}
              {activeWeek.supervisorComment && (
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Existing Comment</p>
                  <div className="bg-blue-50 rounded-lg p-3">
                    <p className="text-sm text-gray-700">{activeWeek.supervisorComment}</p>
                    {activeWeek.commentedAt && (
                      <p className="text-xs text-gray-400 mt-1">{formatDate(activeWeek.commentedAt)}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Add / update comment */}
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  {activeWeek.supervisorComment ? 'Update Comment' : 'Add Comment'}
                </p>
                {commentError && (
                  <p className="text-xs text-red-600 mb-2">{commentError}</p>
                )}
                <textarea
                  rows={3}
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Write your comment on this week's work·"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
                <div className="flex justify-end mt-2">
                  <Button size="sm" onClick={handleComment} loading={commenting} disabled={!commentText.trim()}>
                    {activeWeek.supervisorComment ? 'Update Comment' : 'Post Comment'}
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Grade modal */}
      <Modal isOpen={gradeModal} onClose={() => setGradeModal(false)} title={`Grade Week ${activeWeek?.weekNumber}`}>
        <div className="space-y-4">
          {gradeError && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">{gradeError}</div>
          )}
          <label className="block">
            <span className="text-xs font-semibold text-gray-500 mb-1 block">Supervisor Score (0·50)</span>
            <input
              type="number"
              min={0}
              max={50}
              value={gradeScore}
              onChange={(e) => setGradeScore(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-gray-500 mb-1 block">Note (optional)</span>
            <textarea
              rows={3}
              value={gradeNote}
              onChange={(e) => setGradeNote(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </label>
          <div className="flex gap-3">
            <Button onClick={handleGrade} loading={grading} disabled={gradeScore === ''}>
              Submit Grade
            </Button>
            <Button variant="secondary" onClick={() => setGradeModal(false)}>Cancel</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

// --- Grades tab ---------------------------------------------------------------

const GradesTab = ({ dashboardData }) => {
  const { grades } = dashboardData;
  if (!grades?.length) {
    return <div className="text-center py-12 text-sm text-gray-400">No grades yet.</div>;
  }

  const graded   = grades.filter((g) => g.totalScore !== null);
  const avgScore = graded.length
    ? (graded.reduce((s, g) => s + g.totalScore, 0) / graded.length).toFixed(1)
    : null;

  return (
    <div className="space-y-4">
      {avgScore !== null && (
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
            <p className="text-xs font-semibold text-blue-500 uppercase tracking-wide">Average</p>
            <p className="text-2xl font-bold text-blue-700 mt-1">{avgScore}</p>
          </div>
          <div className="bg-green-50 border border-green-100 rounded-xl p-4">
            <p className="text-xs font-semibold text-green-500 uppercase tracking-wide">Highest</p>
            <p className="text-2xl font-bold text-green-700 mt-1">{Math.max(...graded.map((g) => g.totalScore))}</p>
          </div>
          <div className="bg-red-50 border border-red-100 rounded-xl p-4">
            <p className="text-xs font-semibold text-red-500 uppercase tracking-wide">Lowest</p>
            <p className="text-2xl font-bold text-red-700 mt-1">{Math.min(...graded.map((g) => g.totalScore))}</p>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Week</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Attendance</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Logbook</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">System</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Supervisor</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {grades.map((g) => (
              <tr key={g._id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-800">Week {g.weekNumber}</td>
                <td className="px-4 py-3 text-gray-600">{g.attendanceScore ?? '—'}</td>
                <td className="px-4 py-3 text-gray-600">{g.logbookScore ?? '—'}</td>
                <td className="px-4 py-3 text-gray-600">{g.systemScore ?? '—'}</td>
                <td className="px-4 py-3 text-gray-600">{g.supervisorScore ?? '—'}</td>
                <td className="px-4 py-3">
                  {g.totalScore !== null
                    ? <span className="font-semibold text-gray-800">{g.totalScore}</span>
                    : <span className="text-gray-300">·</span>
                  }
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// --- Students list (supervisor view) -----------------------------------------

const StudentsTab = ({ students, role }) => {
  if (!students?.length) {
    return <div className="text-center py-12 text-sm text-gray-400">No students assigned.</div>;
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 border-b border-gray-100">
          <tr>
            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Student</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Company</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Avg Score</th>
            <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">View</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {students.map((s) => (
            <tr key={s._id} className="hover:bg-gray-50">
              <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                  <Avatar user={{ profileImage: s.profileImage, firstName: s.name }} size="sm" />
                  <div>
                    <p className="font-medium text-gray-800">{s.name}</p>
                    <p className="text-xs text-gray-400">{s.matricNumber}</p>
                  </div>
                </div>
              </td>
              <td className="px-4 py-3 text-gray-600">{s.company || '—'}</td>
              <td className="px-4 py-3 text-gray-600">
                {(s.avgScore ?? s.avgGrade) !== null && (s.avgScore ?? s.avgGrade) !== undefined
                  ? ((s.avgScore ?? s.avgGrade)).toFixed(1)
                  : '—'}
              </td>
              <td className="px-4 py-3 text-right">
                <Link
                  to={`/admin/users/${s._id}`}
                  className="text-xs text-blue-600 hover:underline font-medium"
                >
                  View ?
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// --- Main page ----------------------------------------------------------------

const AdminUserDetailPage = () => {
  const { id }       = useParams();
  const navigate     = useNavigate();
  const [data,       setData]       = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState('');
  const [activeTab,  setActiveTab]  = useState('profile');
  const [toggling,   setToggling]   = useState(false);

  useEffect(() => {
    setLoading(true);
    api.get(`/admin/users/${id}/dashboard`)
      .then(({ data: res }) => {
        setData(res.data);
        setActiveTab('profile');
      })
      .catch(() => setError('Failed to load user details.'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleSaved = ({ user, profile }) => {
    setData((prev) => ({ ...prev, user, profile }));
  };

  const handleSupervisorSaved = (updatedInternship) => {
    setData((prev) => ({
      ...prev,
      supervisors: {
        industry:    updatedInternship.industrySupervisor    || null,
        institution: updatedInternship.institutionSupervisor || null,
      },
    }));
  };

  const handleToggleActive = async () => {
    setToggling(true);
    try {
      const { data: res } = await api.patch(`/admin/users/${id}/toggle-active`);
      setData((prev) => ({ ...prev, user: { ...prev.user, isActive: res.data.isActive } }));
    } catch {/* silent */}
    finally { setToggling(false); }
  };

  if (loading) return <Spinner fullScreen />;
  if (error)   return <div className="p-6 text-sm text-red-600 bg-red-50 rounded-xl m-6">{error}</div>;
  if (!data)   return null;

  const { user, role, profile, students } = data;
  const rb = roleBadge(role);
  const isStudent = role === 'student';
  const isSupervisor = role === 'industry_supervisor' || role === 'institution_supervisor';

  const tabs = [
    { id: 'profile', label: 'Profile & Edit' },
    ...(isStudent ? [
      { id: 'logbook',    label: 'Logbook' },
      { id: 'grades',     label: 'Grades' },
      { id: 'attendance', label: 'Attendance' },
    ] : []),
    ...(isSupervisor ? [{ id: 'students', label: `Students (${students?.length ?? 0})` }] : []),
  ];

  return (
    <div className="p-5 space-y-6 max-w-6xl mx-auto">

      {/* Header */}
      <div className="flex items-center gap-3 flex-wrap">
        <button
          onClick={() => navigate('/admin/dashboard')}
          className="text-sm text-blue-600 hover:underline"
        >
          ? Admin Dashboard
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-start gap-4 flex-wrap">
          <Avatar user={user} size="xl" />
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-gray-800">{user.firstName} {user.lastName}</h1>
            <p className="text-sm text-gray-400">{user.email}</p>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <Badge label={rb.label} variant={rb.variant} />
              <Badge label={user.isActive ? 'Active' : 'Inactive'} variant={user.isActive ? 'green' : 'gray'} />
              {user.isOnboardingComplete
                ? <Badge label="Onboarding Complete" variant="green" />
                : <Badge label="Onboarding Pending"  variant="yellow" />
              }
            </div>
            <div className="flex items-center gap-3 mt-3 text-xs text-gray-400 flex-wrap">
              <span>Joined {formatDate(user.createdAt)}</span>
              {user.lastLogin && <span>Last login {formatDate(user.lastLogin)}</span>}
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button
              size="sm"
              variant={user.isActive ? 'secondary' : 'primary'}
              loading={toggling}
              onClick={handleToggleActive}
            >
              {user.isActive ? 'Deactivate' : 'Activate'}
            </Button>
          </div>
        </div>

        {/* Internship summary for students */}
        {isStudent && data.internship && (
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-gray-400 font-semibold uppercase tracking-wide mb-1">Company</p>
              <p className="text-gray-700">{data.internship.company ?? '—'}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-gray-400 font-semibold uppercase tracking-wide mb-1">Start</p>
              <p className="text-gray-700">{data.internship.startDate ? formatDate(data.internship.startDate) : '—'}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-gray-400 font-semibold uppercase tracking-wide mb-1">Attendance</p>
              <p className="text-gray-700">{data.attendanceSummary?.presentDays ?? 0} / {data.attendanceSummary?.totalDays ?? 0} days</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-gray-400 font-semibold uppercase tracking-wide mb-1">Supervisors</p>
              <p className="text-gray-700">
                {data.supervisors?.institution
                  ? `${data.supervisors.institution.firstName} ${data.supervisors.institution.lastName}`
                  : 'None'
                }
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <div className="flex gap-0">
          {tabs.map((t) => (
            <Tab key={t.id} active={activeTab === t.id} onClick={() => setActiveTab(t.id)}>
              {t.label}
            </Tab>
          ))}
        </div>
      </div>

      {/* Tab content */}
      {activeTab === 'profile' && (
        <div>
          <ProfileEditTab user={user} profile={profile} onSaved={handleSaved} />
          {isStudent && (
            <SupervisorsSection
              userId={id}
              currentSupervisors={data.supervisors}
              hasInternship={!!data.internship}
              onSaved={handleSupervisorSaved}
            />
          )}
        </div>
      )}
      {activeTab === 'logbook' && isStudent && (
        <LogbookTab userId={id} />
      )}
      {activeTab === 'grades' && isStudent && (
        <GradesTab dashboardData={data} />
      )}
      {activeTab === 'attendance' && isStudent && (
        <AttendanceTab userId={id} />
      )}
      {activeTab === 'students' && isSupervisor && (
        <StudentsTab students={students} role={role} />
      )}
    </div>
  );
};

export default AdminUserDetailPage;
