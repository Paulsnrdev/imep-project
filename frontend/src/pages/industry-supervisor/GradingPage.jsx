import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../../services/api';
import { formatDate } from '../../utils/formatDate';
import { getGradeBadgeColor, formatScore } from '../../utils/gradeHelpers';
import Avatar from '../../components/common/Avatar';
import EmptyState from '../../components/common/EmptyState';

const GradeRow = ({ item, onSave }) => {
  const [score, setScore]     = useState(item.supervisorScore != null ? String(item.supervisorScore) : '');
  const [note, setNote]       = useState(item.supervisorNote || '');
  const [saving, setSaving]   = useState(false);
  const [msg, setMsg]         = useState('');

  const handleSave = async () => {
    const val = Number(score);
    if (isNaN(val) || val < 0 || val > 50) { setMsg('Score must be 0–50'); return; }
    setSaving(true);
    setMsg('');
    try {
      await api.post(`/industry/grading/${item.student._id}/week/${item.weekId}`, {
        supervisorScore: val,
        supervisorNote:  note,
      });
      setMsg('Saved!');
      onSave(item.weekId, val);
    } catch (err) {
      setMsg(err.response?.data?.message ?? 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="border border-gray-100 rounded-xl p-5 space-y-4">
      {/* Row header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Avatar name={item.student.name} src={item.student.profileImage} size="md" />
          <div>
            <p className="text-sm font-semibold text-gray-800">{item.student.name}</p>
            <p className="text-xs text-gray-400">{item.student.matricNumber}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm font-semibold text-gray-700">Week {item.weekNumber}</p>
          <p className="text-xs text-gray-400">
            {item.weekStartDate ? formatDate(item.weekStartDate) : ''} – {item.weekEndDate ? formatDate(item.weekEndDate) : ''}
          </p>
        </div>
      </div>

      {/* Scores */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-gray-50 rounded-lg p-3 text-center">
          <p className="text-xs text-gray-400 mb-1">System Score</p>
          <p className="text-lg font-bold text-gray-700">
            {item.systemScore != null ? `${item.systemScore}/50` : '—'}
          </p>
        </div>
        <div className="bg-blue-50 rounded-lg p-3 text-center">
          <p className="text-xs text-blue-500 mb-1">Your Score (0–50)</p>
          <input
            type="number"
            min="0"
            max="50"
            value={score}
            onChange={(e) => { setScore(e.target.value); setMsg(''); }}
            className="w-full text-center text-lg font-bold text-blue-700 bg-transparent outline-none"
            placeholder="—"
          />
        </div>
        <div className="bg-gray-50 rounded-lg p-3 text-center">
          <p className="text-xs text-gray-400 mb-1">Total (projected)</p>
          <p className="text-lg font-bold text-gray-700">
            {item.systemScore != null && score !== '' ? `${item.systemScore + Number(score)}/100` : '—'}
          </p>
        </div>
        <div className="bg-gray-50 rounded-lg p-3 text-center">
          <p className="text-xs text-gray-400 mb-1">Status</p>
          <span className={`text-xs font-bold px-2 py-1 rounded-full ${item.isGraded ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
            {item.isGraded ? 'Graded' : 'Pending'}
          </span>
        </div>
      </div>

      {/* Note */}
      <div>
        <label className="text-xs font-medium text-gray-600 mb-1 block">Grading Note (optional)</label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          placeholder="Add a note about this grade..."
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none resize-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="flex items-center justify-between">
        {msg ? (
          <p className={`text-xs ${msg === 'Saved!' ? 'text-green-600' : 'text-red-500'}`}>{msg}</p>
        ) : (
          <Link to={`/industry/students/${item.student._id}/logbook`} className="text-xs text-blue-600 hover:underline">
            View logbook →
          </Link>
        )}
        <button
          onClick={handleSave}
          disabled={saving || score === ''}
          className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? 'Saving...' : item.isGraded ? 'Update Grade' : 'Submit Grade'}
        </button>
      </div>
    </div>
  );
};

const GradingPage = () => {
  const { studentId } = useParams();

  const [items, setItems]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter]   = useState('all'); // all | pending | graded

  useEffect(() => {
    api.get('/industry/grading')
      .then(({ data }) => {
        let grades = data.data.grades;
        if (studentId) grades = grades.filter((g) => g.student._id === studentId);
        setItems(grades);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [studentId]);

  const handleSave = (weekId, score) => {
    setItems((prev) =>
      prev.map((item) =>
        item.weekId === weekId ? { ...item, supervisorScore: score, isGraded: true } : item
      )
    );
  };

  const filtered = items.filter((item) => {
    if (filter === 'pending') return !item.isGraded;
    if (filter === 'graded')  return item.isGraded;
    return true;
  });

  const pendingCount = items.filter((i) => !i.isGraded).length;

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6 pb-20 lg:pb-0">
      <div className="flex items-center gap-4">
        {studentId && <Link to="/industry/grading" className="text-sm text-blue-600 hover:underline">← All students</Link>}
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Grading</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {pendingCount > 0 ? `${pendingCount} week${pendingCount !== 1 ? 's' : ''} pending your grade` : 'All weeks graded'}
          </p>
        </div>
      </div>

      {items.length > 0 && (
        <div className="flex gap-2">
          {['all', 'pending', 'graded'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors capitalize ${
                filter === f ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'
              }`}
            >
              {f} {f === 'pending' ? `(${pendingCount})` : ''}
            </button>
          ))}
        </div>
      )}

      {items.length === 0 ? (
        <EmptyState
          title="Nothing to grade yet"
          description="Logbook weeks will appear here after they are locked on Friday evenings."
        />
      ) : filtered.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-12">No {filter} items.</p>
      ) : (
        <div className="space-y-4">
          {filtered.map((item) => (
            <GradeRow key={`${item.student._id}-${item.weekNumber}`} item={item} onSave={handleSave} />
          ))}
        </div>
      )}
    </div>
  );
};

export default GradingPage;
