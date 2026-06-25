import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import useAuth from '../../hooks/useAuth';
import api from '../../services/api';
import { setProfile, setInternship, setSupervisors } from '../../features/student/studentSlice';
import { setTodayRecord, setSummary } from '../../features/attendance/attendanceSlice';
import { setCurrentWeek } from '../../features/logbook/logbookSlice';
import { setMyGrades } from '../../features/grading/gradingSlice';
import { setNotifications } from '../../features/notifications/notificationSlice';
import { selectStudentProfile, selectInternship, selectSupervisors } from '../../features/student/studentSlice';
import { selectTodayRecord, selectAttendanceSummary } from '../../features/attendance/attendanceSlice';
import { selectCurrentWeek } from '../../features/logbook/logbookSlice';
import { selectMyGrades } from '../../features/grading/gradingSlice';
import { selectNotifications } from '../../features/notifications/notificationSlice';
import { getLetterGrade, getGradeBadgeColor, formatScore } from '../../utils/gradeHelpers';
import { formatTime, timeAgo } from '../../utils/formatDate';
import Badge from '../../components/common/Badge';

const StatCard = ({ label, value, sub, accent = 'blue', icon }) => {
  const accents = {
    blue:   'bg-blue-50 border-blue-100 text-blue-600',
    green:  'bg-green-50 border-green-100 text-green-600',
    yellow: 'bg-yellow-50 border-yellow-100 text-yellow-600',
    red:    'bg-red-50 border-red-100 text-red-600',
    purple: 'bg-purple-50 border-purple-100 text-purple-600',
    gray:   'bg-gray-50 border-gray-100 text-gray-500',
  };
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-start gap-3">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg shrink-0 border ${accents[accent] ?? accents.blue}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs text-gray-500 font-medium">{label}</p>
        <p className="text-xl font-bold text-gray-800 leading-tight mt-0.5 break-words">{value ?? '—'}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
};

const ProgressBar = ({ value, max, color = 'bg-blue-600' }) => {
  const pct = max > 0 ? Math.min(Math.round((value / max) * 100), 100) : 0;
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-gray-500 w-8 text-right">{pct}%</span>
    </div>
  );
};

const DayPill = ({ day, filled }) => (
  <div className="flex-1 flex flex-col items-center gap-1">
    <span className="text-xs text-gray-400">{day.slice(0, 3)}</span>
    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold
      ${filled ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-400'}`}>
      {filled ? '✓' : '○'}
    </div>
  </div>
);

const useDebounce = (value, delay = 400) => {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
};

// ─── Nomination card (student submits industry supervisor info) ────────────────

const NominationCard = ({ internshipId, initial, onSaved }) => {
  const [view, setView]   = useState(initial ? 'saved' : 'form');
  const [saved, setSaved] = useState(initial);

  // search
  const [query, setQuery]           = useState('');
  const debouncedQ                  = useDebounce(query);
  const [results, setResults]       = useState([]);
  const [searching, setSearching]   = useState(false);
  const [selected, setSelected]     = useState(null);

  // form fields
  const [form, setForm] = useState({ name: '', email: '', phone: '', company: '', jobTitle: '' });
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState('');

  useEffect(() => {
    if (!debouncedQ) { setResults([]); return; }
    setSearching(true);
    api.get(`/student/search/supervisors?q=${encodeURIComponent(debouncedQ)}`)
      .then(({ data }) => setResults(data.data.supervisors))
      .catch(() => {})
      .finally(() => setSearching(false));
  }, [debouncedQ]);

  const pickSupervisor = (s) => {
    setSelected(s);
    setForm({ name: s.name, email: s.email || '', phone: '', company: s.company || '', jobTitle: s.jobTitle || '' });
    setQuery('');
    setResults([]);
  };

  const handleSubmit = async () => {
    if (!selected && !form.name.trim()) {
      setError('Enter your supervisor\'s name or search and select them above.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const payload = selected ? { supervisorId: selected._id, ...form } : form;
      const { data } = await api.post('/student/nominate-supervisor', payload);
      const info = data.data.nominatedSupervisorInfo;
      setSaved(info);
      setView('saved');
      onSaved?.(info);
    } catch (err) {
      setError(err.response?.data?.message ?? 'Failed to save. Try again.');
    } finally {
      setSaving(false);
    }
  };

  const startEdit = () => {
    setForm({
      name:     saved?.name     || '',
      email:    saved?.email    || '',
      phone:    saved?.phone    || '',
      company:  saved?.company  || '',
      jobTitle: saved?.jobTitle || '',
    });
    setSelected(null);
    setQuery('');
    setResults([]);
    setError('');
    setView('form');
  };

  if (view === 'saved' && saved) {
    return (
      <div className="bg-white rounded-xl border border-green-100 shadow-sm p-5">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold text-green-600 uppercase tracking-wide">Industry Supervisor (Submitted)</p>
          <button onClick={startEdit} className="text-xs text-gray-400 hover:text-gray-600 underline">Edit</button>
        </div>
        <div className="space-y-1 text-sm">
          <p className="font-semibold text-gray-800">{saved.name}</p>
          {saved.jobTitle && <p className="text-xs text-gray-500">{saved.jobTitle}{saved.company ? ` · ${saved.company}` : ''}</p>}
          {!saved.jobTitle && saved.company && <p className="text-xs text-gray-500">{saved.company}</p>}
          {saved.email   && <p className="text-xs text-gray-400">{saved.email}</p>}
          {saved.phone   && <p className="text-xs text-gray-400">{saved.phone}</p>}
        </div>
        <p className="text-xs text-gray-400 mt-3 bg-yellow-50 border border-yellow-100 rounded-lg px-3 py-2">
          Your institution supervisor will review and formally link you.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-3">
      <p className="text-xs font-semibold text-green-600 uppercase tracking-wide">Industry Supervisor</p>
      <p className="text-xs text-gray-400">Search if your supervisor is registered, or enter their details manually.</p>

      {/* Search box */}
      {!selected ? (
        <div className="relative">
          <input
            type="text"
            placeholder="Search by name or company..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-green-400"
          />
          {searching && (
            <div className="absolute right-3 top-2.5">
              <div className="w-4 h-4 border-2 border-green-400 border-t-transparent rounded-full animate-spin" />
            </div>
          )}
          {results.length > 0 && (
            <div className="absolute z-20 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-40 overflow-y-auto">
              {results.map((s) => (
                <button
                  key={s._id}
                  type="button"
                  onClick={() => pickSupervisor(s)}
                  className="w-full text-left px-3 py-2.5 hover:bg-gray-50 border-b border-gray-50 last:border-0"
                >
                  <p className="text-sm font-medium text-gray-800">{s.name}</p>
                  <p className="text-xs text-gray-400">{s.company} {s.jobTitle ? `· ${s.jobTitle}` : ''}</p>
                </button>
              ))}
            </div>
          )}
          {query && !searching && results.length === 0 && (
            <p className="text-xs text-gray-400 mt-1">Not found — fill in details below manually.</p>
          )}
        </div>
      ) : (
        <div className="flex items-center justify-between bg-green-50 border border-green-100 rounded-lg px-3 py-2">
          <div>
            <p className="text-sm font-semibold text-gray-800">{selected.name}</p>
            <p className="text-xs text-gray-400">{selected.company}</p>
          </div>
          <button
            type="button"
            onClick={() => { setSelected(null); setForm(f => ({ ...f, name: '', email: '', company: '', jobTitle: '' })); }}
            className="text-xs text-red-400 hover:underline ml-2"
          >
            Clear
          </button>
        </div>
      )}

      {/* Manual fields */}
      <div className="grid grid-cols-2 gap-2">
        {[
          { key: 'name',     label: 'Full Name *', placeholder: 'e.g. John Doe' },
          { key: 'email',    label: 'Email',       placeholder: 'supervisor@company.com' },
          { key: 'phone',    label: 'Phone',       placeholder: '+234...' },
          { key: 'company',  label: 'Company',     placeholder: 'Company name' },
          { key: 'jobTitle', label: 'Job Title',   placeholder: 'e.g. Senior Engineer' },
        ].map(({ key, label, placeholder }) => (
          <div key={key} className={key === 'name' ? 'col-span-2' : ''}>
            <label className="text-xs text-gray-400 font-medium">{label}</label>
            <input
              type="text"
              value={form[key]}
              onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
              placeholder={placeholder}
              className="mt-0.5 w-full px-2.5 py-1.5 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-green-400"
            />
          </div>
        ))}
      </div>

      {error && <p className="text-xs text-red-500">{error}</p>}

      <button
        type="button"
        onClick={handleSubmit}
        disabled={saving}
        className="w-full py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
      >
        {saving ? 'Saving...' : 'Submit Supervisor Info'}
      </button>
    </div>
  );
};

const StudentDashboard = () => {
  const dispatch     = useDispatch();
  const { user }     = useAuth();
  const profile      = useSelector(selectStudentProfile);
  const internship   = useSelector(selectInternship);
  const supervisors  = useSelector(selectSupervisors);
  const todayRecord  = useSelector(selectTodayRecord);
  const summary      = useSelector(selectAttendanceSummary);
  const currentWeek  = useSelector(selectCurrentWeek);
  const grades       = useSelector(selectMyGrades);
  const notifications = useSelector(selectNotifications);

  useEffect(() => {
    api.get('/student/dashboard').then(({ data }) => {
      const d = data.data;
      if (d.profile)           dispatch(setProfile(d.profile));
      if (d.internship)        dispatch(setInternship(d.internship));
      if (d.supervisors)       dispatch(setSupervisors(d.supervisors));
      if (d.todayAttendance)   dispatch(setTodayRecord(d.todayAttendance));
      if (d.currentWeek)       dispatch(setCurrentWeek(d.currentWeek));
      if (d.grades)            dispatch(setMyGrades(d.grades));
      if (d.notifications)     dispatch(setNotifications(d.notifications));
      if (d.internship?.nominatedSupervisorInfo) setNominatedInfo(d.internship.nominatedSupervisorInfo);
    }).catch(() => {});

    // Fetch attendance summary from the dedicated endpoint — it calculates correctly
    api.get('/attendance/summary').then(({ data }) => {
      const s = data.data;
      dispatch(setSummary({ presentDays: s.presentDays, totalWorkingDays: s.totalWorkingDays }));
    }).catch(() => {});
  }, [dispatch]);

  const [nominatedInfo, setNominatedInfo] = useState(null);

  const firstName = user?.firstName ?? 'Student';

  const totalWeeks     = internship?.totalWeeks ?? 0;
  const currentWeekNum = currentWeek?.weekNumber ?? 0;
  const internshipPct  = totalWeeks > 0 ? Math.round((currentWeekNum / totalWeeks) * 100) : 0;

  const checkedIn  = !!todayRecord?.checkIn?.time;
  const checkedOut = !!todayRecord?.checkOut?.time;
  const attendanceRate = summary
    ? `${Math.round((summary.presentDays / Math.max(summary.totalWorkingDays, 1)) * 100)}%`
    : '—';

  const weekEntries = currentWeek?.entries?.length ?? 0;
  const DAYS        = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  const DAY_ABBR    = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
  const filledDays  = currentWeek?.entries?.map((e) => e.dayOfWeek) ?? [];

  const finalizedGrades = grades.filter((g) => g.totalScore !== null);
  const avgScore = finalizedGrades.length
    ? finalizedGrades.reduce((s, g) => s + g.totalScore, 0) / finalizedGrades.length
    : null;
  const letterGrade = avgScore != null ? getLetterGrade(avgScore) : null;

  const recentNotifs = notifications.slice(0, 4);

  const attendanceBadge = () => {
    if (!checkedIn)               return { label: 'Not checked in', variant: 'gray' };
    if (checkedIn && !checkedOut) return { label: 'Checked in', variant: 'green' };
    return { label: 'Checked out', variant: 'blue' };
  };
  const { label: attLabel, variant: attVariant } = attendanceBadge();

  return (
    <div className="space-y-6 pb-20 lg:pb-0">

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">
            Good {getGreeting()}, {firstName} 👋
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {internship?.company
              ? `Week ${currentWeekNum} of ${totalWeeks} · ${internship.company}`
              : internship
              ? 'Internship pending industry supervisor'
              : 'No active internship yet'}
          </p>
        </div>
        {internship && totalWeeks > 0 && (
          <div className="bg-white border border-gray-200 rounded-xl px-4 py-2 text-sm shadow-sm min-w-[180px]">
            <div className="flex justify-between mb-1.5">
              <span className="text-gray-500 text-xs font-medium">Internship Progress</span>
              <span className="text-blue-600 text-xs font-semibold">{internshipPct}%</span>
            </div>
            <ProgressBar value={currentWeekNum} max={totalWeeks} />
            <p className="text-xs text-gray-400 mt-1.5">{totalWeeks - currentWeekNum} weeks remaining</p>
          </div>
        )}
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 stagger-children">
        <StatCard
          label="Today's Attendance"
          value={checkedIn ? formatTime(todayRecord?.checkIn?.time) : 'Not In'}
          sub={attLabel}
          accent={checkedIn ? 'green' : 'gray'}
          icon="📍"
        />
        <StatCard
          label="Attendance Rate"
          value={attendanceRate}
          sub={summary ? `${summary.presentDays} / ${summary.totalWorkingDays} days` : 'No data yet'}
          accent="blue"
          icon="📊"
        />
        <StatCard
          label="Logbook This Week"
          value={`${weekEntries} / 5`}
          sub={currentWeek?.isLocked ? 'Week locked' : 'Entries submitted'}
          accent={weekEntries === 5 ? 'green' : 'yellow'}
          icon="📓"
        />
        <StatCard
          label="Overall Grade"
          value={avgScore != null ? `${formatScore(avgScore)}/100` : 'Pending'}
          sub={letterGrade ? `Grade ${letterGrade}` : `${finalizedGrades.length} weeks graded`}
          accent={avgScore != null && avgScore >= 70 ? 'green' : avgScore != null && avgScore >= 50 ? 'blue' : 'gray'}
          icon="🏆"
        />
      </div>

      {/* Middle row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* Attendance card */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-800">Today&apos;s Attendance</h2>
            <Badge label={attLabel} variant={attVariant} />
          </div>

          {checkedIn ? (
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Check-in</span>
                <span className="font-medium text-gray-800">{formatTime(todayRecord.checkIn.time)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Within geofence</span>
                <span className={`font-medium ${!todayRecord.isGeofenceViolation ? 'text-green-600' : 'text-red-500'}`}>
                  {!todayRecord.isGeofenceViolation ? 'Yes ✓' : 'No ✗'}
                </span>
              </div>
              {todayRecord.checkIn?.isLate && (
                <div className="bg-yellow-50 border border-yellow-100 rounded-lg px-3 py-2 text-xs text-yellow-700">
                  Late arrival recorded
                </div>
              )}
              {checkedOut ? (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Check-out</span>
                  <span className="font-medium text-gray-800">{formatTime(todayRecord.checkOut?.time)}</span>
                </div>
              ) : (
                <Link
                  to="/student/attendance"
                  className="block w-full text-center bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2 rounded-lg transition-colors"
                >
                  Check Out →
                </Link>
              )}
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-gray-400 text-sm mb-4">You haven&apos;t checked in today.</p>
              <Link
                to="/student/attendance"
                className="inline-block bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-6 py-2.5 rounded-lg transition-colors"
              >
                Check In Now
              </Link>
            </div>
          )}
        </div>

        {/* Logbook card */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-semibold text-gray-800">
                {currentWeek ? `Week ${currentWeekNum} Logbook` : 'Logbook'}
              </h2>
              {currentWeek && (
                <p className="text-xs text-gray-400 mt-0.5">
                  {currentWeek.isLocked ? '🔒 Locked' : '✏️ Open for editing'}
                </p>
              )}
            </div>
            <Badge
              label={weekEntries === 5 ? 'Complete' : `${weekEntries}/5`}
              variant={weekEntries === 5 ? 'green' : weekEntries > 0 ? 'yellow' : 'gray'}
            />
          </div>

          {currentWeek ? (
            <>
              <div className="flex gap-2 mb-4">
                {DAY_ABBR.map((abbr, i) => (
                  <DayPill key={abbr} day={DAYS[i]} filled={filledDays.includes(abbr)} />
                ))}
              </div>
              <ProgressBar value={weekEntries} max={5} color={weekEntries === 5 ? 'bg-green-500' : 'bg-blue-600'} />
              <div className="mt-4">
                {currentWeek.isLocked ? (
                  <Link
                    to={`/student/logbook/${currentWeek._id}`}
                    className="block w-full text-center border border-gray-200 text-gray-600 text-sm font-medium py-2 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    View Logbook
                  </Link>
                ) : (
                  <Link
                    to="/student/logbook"
                    className="block w-full text-center bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2 rounded-lg transition-colors"
                  >
                    {weekEntries === 0 ? 'Start Writing' : 'Continue Writing →'}
                  </Link>
                )}
              </div>
              {currentWeek.supervisorComment && (
                <div className="mt-3 bg-purple-50 border border-purple-100 rounded-lg p-3">
                  <p className="text-xs font-medium text-purple-700 mb-1">Supervisor Comment</p>
                  <p className="text-xs text-purple-600 leading-relaxed">{currentWeek.supervisorComment}</p>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-6">
              <p className="text-sm text-gray-400">No active logbook week yet.</p>
              <p className="text-xs text-gray-300 mt-1">Weeks are created when your internship starts.</p>
            </div>
          )}
        </div>
      </div>

      {/* Supervisors row */}
      {(supervisors?.institution || supervisors?.industry || internship) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

          {supervisors?.institution ? (
            <div className="bg-white rounded-xl border border-purple-100 shadow-sm p-5">
              <p className="text-xs font-semibold text-purple-600 uppercase tracking-wide mb-3">Institution Supervisor</p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-700 font-bold text-sm shrink-0">
                  {supervisors.institution.firstName?.[0]}{supervisors.institution.lastName?.[0]}
                </div>
                <div>
                  <p className="font-semibold text-gray-800 text-sm">
                    {supervisors.institution.firstName} {supervisors.institution.lastName}
                  </p>
                  <p className="text-xs text-gray-400">Assigned to you automatically</p>
                </div>
              </div>
            </div>
          ) : internship ? (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 text-lg shrink-0">🏛️</div>
              <div>
                <p className="text-sm font-medium text-gray-600">Institution Supervisor</p>
                <p className="text-xs text-gray-400">Being assigned based on your location</p>
              </div>
            </div>
          ) : null}

          {supervisors?.industry ? (
            <div className="bg-white rounded-xl border border-green-100 shadow-sm p-5">
              <p className="text-xs font-semibold text-green-600 uppercase tracking-wide mb-3">Industry Supervisor</p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-bold text-sm shrink-0">
                  {supervisors.industry.firstName?.[0]}{supervisors.industry.lastName?.[0]}
                </div>
                <div>
                  <p className="font-semibold text-gray-800 text-sm">
                    {supervisors.industry.firstName} {supervisors.industry.lastName}
                  </p>
                  <p className="text-xs text-gray-400">{internship?.company || 'Your company supervisor'}</p>
                </div>
              </div>
            </div>
          ) : internship ? (
            <NominationCard
              internshipId={internship._id}
              initial={nominatedInfo}
              onSaved={setNominatedInfo}
            />
          ) : null}

        </div>
      )}

      {/* Bottom row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* Recent grades */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-800">Recent Grades</h2>
            <Link to="/student/grades" className="text-xs text-blue-600 hover:underline">View all</Link>
          </div>

          {finalizedGrades.length === 0 ? (
            <p className="text-sm text-gray-400 py-4 text-center">No grades released yet.</p>
          ) : (
            <div className="space-y-3">
              {finalizedGrades.slice(0, 4).map((grade) => (
                <div key={grade._id} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-700">Week {grade.weekNumber}</p>
                    <p className="text-xs text-gray-400">
                      System {grade.systemScore ?? '—'} + Supervisor {grade.supervisorScore ?? '—'}
                    </p>
                  </div>
                  <span className={`text-sm font-bold px-2 py-0.5 rounded-full ${getGradeBadgeColor(grade.totalScore)}`}>
                    {grade.totalScore}/100
                  </span>
                </div>
              ))}
              {avgScore != null && (
                <div className="pt-3 border-t border-gray-100 flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-700">Average</span>
                  <span className={`font-bold text-lg px-3 py-0.5 rounded-full ${getGradeBadgeColor(avgScore)}`}>
                    {formatScore(avgScore)}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Notifications */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-800">Recent Notifications</h2>
            <span className="text-xs text-gray-400">{recentNotifs.length} new</span>
          </div>

          {recentNotifs.length === 0 ? (
            <p className="text-sm text-gray-400 py-4 text-center">No notifications yet.</p>
          ) : (
            <div className="space-y-3">
              {recentNotifs.map((notif) => (
                <div key={notif._id} className={`flex gap-3 p-2.5 rounded-lg ${!notif.isRead ? 'bg-blue-50' : ''}`}>
                  <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${!notif.isRead ? 'bg-blue-500' : 'bg-gray-300'}`} />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-700 leading-tight">{notif.title}</p>
                    <p className="text-xs text-gray-400 mt-0.5 leading-relaxed line-clamp-2">{notif.body}</p>
                    <p className="text-xs text-gray-300 mt-1">{timeAgo(notif.createdAt)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* Quick links */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <h2 className="font-semibold text-gray-800 mb-3">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Write Today's Log",  path: '/student/logbook',    icon: '📝', color: 'bg-blue-50 text-blue-700 hover:bg-blue-100' },
            { label: 'Mark Attendance',    path: '/student/attendance', icon: '📍', color: 'bg-green-50 text-green-700 hover:bg-green-100' },
            { label: 'View Grades',        path: '/student/grades',     icon: '📊', color: 'bg-purple-50 text-purple-700 hover:bg-purple-100' },
            { label: 'All Logbook Weeks',  path: '/student/logbook',    icon: '📚', color: 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100' },
          ].map((action) => (
            <Link
              key={action.label}
              to={action.path}
              className={`flex flex-col items-center gap-1.5 px-3 py-3 rounded-xl text-xs font-medium text-center transition-colors sm:flex-row sm:gap-2 sm:px-4 sm:text-sm sm:text-left ${action.color}`}
            >
              <span className="text-xl sm:text-base">{action.icon}</span>
              <span className="leading-tight">{action.label}</span>
            </Link>
          ))}
        </div>
      </div>

    </div>
  );
};

const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
};

export default StudentDashboard;
