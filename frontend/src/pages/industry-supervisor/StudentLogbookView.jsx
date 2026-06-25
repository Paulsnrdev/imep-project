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

const StudentLogbookView = () => {
  const { studentId } = useParams();

  const [data, setData]           = useState(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');
  const [activeWeekId, setActiveWeekId] = useState(null);
  const [activeDay, setActiveDay] = useState('Monday');

  // comment form
  const [comment, setComment]     = useState('');
  const [saving, setSaving]       = useState(false);
  const [saveMsg, setSaveMsg]     = useState('');

  useEffect(() => {
    api.get(`/industry/students/${studentId}/logbook`)
      .then(({ data: res }) => {
        setData(res.data);
        if (res.data.weeks.length) {
          const latest = res.data.weeks[res.data.weeks.length - 1];
          setActiveWeekId(latest._id);
          setComment(latest.supervisorComment || '');
        }
      })
      .catch(() => setError('Failed to load logbook. Please try again.'))
      .finally(() => setLoading(false));
  }, [studentId]);

  const activeWeek = data?.weeks?.find((w) => w._id === activeWeekId);

  const switchWeek = (week) => {
    setActiveWeekId(week._id);
    setComment(week.supervisorComment || '');
    setSaveMsg('');
  };

  const saveComment = async () => {
    if (!comment.trim() || !activeWeekId) return;
    setSaving(true);
    setSaveMsg('');
    try {
      await api.post(`/industry/students/${studentId}/logbook/${activeWeekId}/comment`, { comment });
      setData((prev) => ({
        ...prev,
        weeks: prev.weeks.map((w) =>
          w._id === activeWeekId ? { ...w, supervisorComment: comment, commentedAt: new Date().toISOString() } : w
        ),
      }));
      setSaveMsg('Comment saved.');
    } catch {
      setSaveMsg('Failed to save comment.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>;
  if (error)   return <div className="p-6 text-sm text-red-600 bg-red-50 rounded-xl">{error}</div>;
  if (!data)   return null;

  const { student, weeks } = data;

  return (
    <div className="space-y-6 pb-20 lg:pb-0">

      {/* ── Header ── */}
      <div className="flex items-center gap-3 flex-wrap">
        <Link to="/industry/students" className="text-sm text-blue-600 hover:underline shrink-0">← Back</Link>
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <Avatar name={student.name} src={student.profileImage} size="lg" />
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-gray-800 truncate">{student.name}</h1>
            <p className="text-sm text-gray-400 truncate">{student.matricNumber} · {student.department}</p>
          </div>
        </div>
        <Link
          to={`/industry/grading/${studentId}`}
          className="shrink-0 text-sm text-blue-600 font-medium border border-blue-200 px-4 py-2 rounded-lg hover:bg-blue-50"
        >
          Grade Student →
        </Link>
      </div>

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
                if (w) switchWeek(w);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
            >
              {weeks.map((w) => (
                <option key={w._id} value={w._id}>
                  Week {w.weekNumber} · {w.entries?.length ?? 0}/5 entries{w.supervisorComment ? ' ✓' : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">

          {/* Week list — desktop only */}
          <div className="hidden md:block md:col-span-1 space-y-2">
            <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide px-1">Weeks</p>
            {weeks.map((w) => {
              const entryCount = w.entries?.length ?? 0;
              const isActive   = w._id === activeWeekId;
              return (
                <button
                  key={w._id}
                  onClick={() => switchWeek(w)}
                  className={`w-full text-left px-4 py-3 rounded-xl border transition-colors ${
                    isActive
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white border-gray-100 hover:bg-gray-50 text-gray-700'
                  }`}
                >
                  <p className="text-sm font-semibold">Week {w.weekNumber}</p>
                  <p className={`text-xs mt-0.5 ${isActive ? 'text-blue-200' : 'text-gray-400'}`}>
                    {entryCount}/5 entries · {w.isLocked ? 'Locked' : 'Open'}
                  </p>
                  {w.supervisorComment && (
                    <p className={`text-xs mt-1 ${isActive ? 'text-blue-200' : 'text-green-500'}`}>✓ Commented</p>
                  )}
                </button>
              );
            })}
          </div>

          {/* Week content */}
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

                  {/* Day tabs */}
                  <div className="flex gap-1 mb-4">
                    {DAYS.map((day) => {
                      const hasEntry = activeWeek.entries?.some((e) => e.dayOfWeek === day);
                      return (
                        <button
                          key={day}
                          onClick={() => setActiveDay(day)}
                          className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-colors ${
                            activeDay === day
                              ? 'bg-blue-600 text-white'
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

                  {/* Day entry */}
                  {(() => {
                    const entry = activeWeek.entries?.find((e) => e.dayOfWeek === activeDay);
                    if (!entry) {
                      return (
                        <div className="text-center py-8 text-sm text-gray-400">
                          No entry for {activeDay}
                        </div>
                      );
                    }
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

                {/* Weekly image */}
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

                {/* Supervisor comment */}
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                  <h3 className="font-semibold text-gray-800 mb-3">Supervisor Comment</h3>
                  {activeWeek.supervisorComment && (
                    <div className="mb-3 p-3 bg-blue-50 rounded-lg">
                      <p className="text-sm text-gray-700">{activeWeek.supervisorComment}</p>
                      {activeWeek.commentedAt && (
                        <p className="text-xs text-gray-400 mt-1">{formatDate(activeWeek.commentedAt)}</p>
                      )}
                    </div>
                  )}
                  <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    rows={3}
                    placeholder="Add feedback for the student about this week..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none resize-none focus:ring-2 focus:ring-blue-500"
                  />
                  <div className="flex items-center justify-between mt-3">
                    {saveMsg ? (
                      <p className={`text-xs ${saveMsg.includes('Failed') ? 'text-red-500' : 'text-green-600'}`}>{saveMsg}</p>
                    ) : <span />}
                    <button
                      onClick={saveComment}
                      disabled={saving || !comment.trim()}
                      className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    >
                      {saving ? 'Saving...' : 'Save Comment'}
                    </button>
                  </div>
                </div>
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
