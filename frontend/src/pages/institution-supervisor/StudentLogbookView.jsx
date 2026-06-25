import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../../services/api';
import { formatDate } from '../../utils/formatDate';
import Avatar from '../../components/common/Avatar';
import EmptyState from '../../components/common/EmptyState';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

const EntryField = ({ label, value }) => (
  <div>
    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">{label}</p>
    <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
      {value || <span className="text-gray-300 italic">Not filled in</span>}
    </p>
  </div>
);

const IndustrySupervisorCard = ({ supervisor, nominated }) => {
  if (supervisor) {
    return (
      <div className="bg-white rounded-xl border border-green-100 shadow-sm p-4">
        <p className="text-xs font-semibold text-green-600 uppercase tracking-wide mb-2">Industry Supervisor (Linked)</p>
        <div className="flex items-center gap-3">
          <Avatar name={supervisor.name} src={supervisor.profileImage} size="md" />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-800">{supervisor.name}</p>
            {supervisor.jobTitle && (
              <p className="text-xs text-gray-500">{supervisor.jobTitle}{supervisor.company ? ` · ${supervisor.company}` : ''}</p>
            )}
            {supervisor.email && <p className="text-xs text-gray-400">{supervisor.email}</p>}
            {supervisor.phone && <p className="text-xs text-gray-400">{supervisor.phone}</p>}
            {supervisor.staffId && <p className="text-xs text-gray-300">Staff ID: {supervisor.staffId}</p>}
          </div>
        </div>
      </div>
    );
  }
  if (nominated?.name) {
    return (
      <div className="bg-white rounded-xl border border-yellow-100 shadow-sm p-4">
        <p className="text-xs font-semibold text-yellow-600 uppercase tracking-wide mb-2">Industry Supervisor (Nominated — Pending Link)</p>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-gray-800">{nominated.name}</p>
          {nominated.jobTitle && (
            <p className="text-xs text-gray-500">{nominated.jobTitle}{nominated.company ? ` · ${nominated.company}` : ''}</p>
          )}
          {nominated.email && <p className="text-xs text-gray-400">{nominated.email}</p>}
          {nominated.phone && <p className="text-xs text-gray-400">{nominated.phone}</p>}
        </div>
        <p className="text-xs text-yellow-600 mt-2">Student submitted this info — assign via the Assign page to formally link.</p>
      </div>
    );
  }
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Industry Supervisor</p>
      <p className="text-sm text-gray-400">Not yet assigned.</p>
    </div>
  );
};

const StudentLogbookView = () => {
  const { studentId } = useParams();

  const [data, setData]           = useState(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');
  const [activeWeekId, setActiveWeekId] = useState(null);
  const [activeDay, setActiveDay] = useState('Monday');

  useEffect(() => {
    api.get(`/institution/students/${studentId}/logbook`)
      .then(({ data: res }) => {
        setData(res.data);
        if (res.data.weeks.length) {
          setActiveWeekId(res.data.weeks[res.data.weeks.length - 1]._id);
        }
      })
      .catch(() => setError('Failed to load logbook. Please try again.'))
      .finally(() => setLoading(false));
  }, [studentId]);

  const activeWeek = data?.weeks?.find((w) => w._id === activeWeekId);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" /></div>;
  if (error)   return <div className="p-6 text-sm text-red-600 bg-red-50 rounded-xl">{error}</div>;
  if (!data)   return null;

  const { student, weeks, industrySupervisor, nominatedSupervisorInfo } = data;

  return (
    <div className="space-y-6 pb-20 lg:pb-0">

      <div className="flex items-center gap-3 flex-wrap">
        <Link to="/institution/students" className="text-sm text-blue-600 hover:underline shrink-0">← Back</Link>
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <Avatar name={student.name} src={student.profileImage} size="lg" />
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-gray-800 truncate">{student.name}</h1>
            <p className="text-sm text-gray-400 truncate">{student.matricNumber} · {student.department}</p>
          </div>
        </div>
      </div>

      <IndustrySupervisorCard supervisor={industrySupervisor} nominated={nominatedSupervisorInfo} />

      {weeks.length === 0 ? (
        <EmptyState title="No logbook entries yet" description="The student has not started their logbook." />
      ) : (
        <div>
          {/* Mobile: week dropdown */}
          <div className="md:hidden mb-4">
            <select
              value={activeWeekId ?? ''}
              onChange={(e) => {
                const w = weeks.find((wk) => wk._id === e.target.value);
                if (w) { setActiveWeekId(w._id); setActiveDay('Monday'); }
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm outline-none focus:ring-2 focus:ring-purple-500"
            >
              {weeks.map((w) => (
                <option key={w._id} value={w._id}>
                  Week {w.weekNumber} · {w.entries?.length ?? 0}/5 entries{w.supervisorComment ? ' ✓' : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">

          <div className="hidden md:block md:col-span-1 space-y-2">
            <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide px-1">Weeks</p>
            {weeks.map((w) => {
              const entryCount = w.entries?.length ?? 0;
              const isActive   = w._id === activeWeekId;
              return (
                <button
                  key={w._id}
                  onClick={() => { setActiveWeekId(w._id); setActiveDay('Monday'); }}
                  className={`w-full text-left px-4 py-3 rounded-xl border transition-colors ${
                    isActive
                      ? 'bg-purple-600 text-white border-purple-600'
                      : 'bg-white border-gray-100 hover:bg-gray-50 text-gray-700'
                  }`}
                >
                  <p className="text-sm font-semibold">Week {w.weekNumber}</p>
                  <p className={`text-xs mt-0.5 ${isActive ? 'text-purple-200' : 'text-gray-400'}`}>
                    {entryCount}/5 entries · {w.isLocked ? 'Locked' : 'Open'}
                  </p>
                  {w.supervisorComment && (
                    <p className={`text-xs mt-1 ${isActive ? 'text-purple-200' : 'text-blue-500'}`}>✓ Commented</p>
                  )}
                </button>
              );
            })}
          </div>

          <div className="md:col-span-3 space-y-4">
            {activeWeek && (
              <>
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="font-semibold text-gray-800">Week {activeWeek.weekNumber}</h2>
                      <p className="text-xs text-gray-400">
                        {activeWeek.weekStartDate ? formatDate(activeWeek.weekStartDate) : ''} –{' '}
                        {activeWeek.weekEndDate   ? formatDate(activeWeek.weekEndDate)   : ''}
                      </p>
                    </div>
                    <span className={`text-xs font-medium px-3 py-1 rounded-full ${activeWeek.isLocked ? 'bg-gray-100 text-gray-500' : 'bg-green-100 text-green-700'}`}>
                      {activeWeek.isLocked ? 'Locked' : 'Open'}
                    </span>
                  </div>

                  <div className="flex gap-1 mb-4">
                    {DAYS.map((day) => {
                      const hasEntry = activeWeek.entries?.some((e) => e.dayOfWeek === day);
                      return (
                        <button
                          key={day}
                          onClick={() => setActiveDay(day)}
                          className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-colors ${
                            activeDay === day
                              ? 'bg-purple-600 text-white'
                              : hasEntry
                              ? 'bg-green-100 text-green-700 hover:bg-green-200'
                              : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                          }`}
                        >
                          {day.slice(0, 3)}
                          {hasEntry && activeDay !== day && <span className="block w-1 h-1 bg-green-500 rounded-full mx-auto mt-0.5" />}
                        </button>
                      );
                    })}
                  </div>

                  {(() => {
                    const entry = activeWeek.entries?.find((e) => e.dayOfWeek === activeDay);
                    if (!entry) return <div className="text-center py-8 text-sm text-gray-400">No entry for {activeDay}</div>;
                    return (
                      <div className="space-y-4">
                        <EntryField label="Activities Carried Out"  value={entry.activitiesCarriedOut} />
                        <EntryField label="Skills Learned"          value={entry.skillsLearned} />
                        <EntryField label="Challenges Encountered"  value={entry.challenges} />
                        <EntryField label="Plan for Tomorrow"       value={entry.planForTomorrow} />
                      </div>
                    );
                  })()}
                </div>

                {activeWeek.weeklyImage && (
                  <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                    <h3 className="font-semibold text-gray-800 mb-3">Weekly Photo / Diagram</h3>
                    <img
                      src={activeWeek.weeklyImage}
                      alt={`Week ${activeWeek.weekNumber} logbook photo`}
                      className="w-full max-h-96 object-contain rounded-lg border border-gray-100"
                    />
                    {activeWeek.weeklyImageUploadedAt && (
                      <p className="text-xs text-gray-400 mt-2">
                        Uploaded {formatDate(activeWeek.weeklyImageUploadedAt)}
                      </p>
                    )}
                  </div>
                )}

                {activeWeek.supervisorComment && (
                  <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                    <h3 className="font-semibold text-gray-800 mb-3">Industry Supervisor Comment</h3>
                    <div className="p-3 bg-blue-50 rounded-lg">
                      <p className="text-sm text-gray-700">{activeWeek.supervisorComment}</p>
                      {activeWeek.commentedAt && (
                        <p className="text-xs text-gray-400 mt-1">{formatDate(activeWeek.commentedAt)}</p>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentLogbookView;
