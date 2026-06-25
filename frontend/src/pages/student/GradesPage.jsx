import { useState, useEffect } from 'react';
import api from '../../services/api';
import { formatDate } from '../../utils/formatDate';
import {
  getLetterGrade, getGradeClassification, getGradeBadgeColor,
  getGradeColor, formatScore,
} from '../../utils/gradeHelpers';
import EmptyState from '../../components/common/EmptyState';

const ScoreBox = ({ label, value, max, color = 'bg-gray-50' }) => (
  <div className={`${color} rounded-lg p-3 text-center`}>
    <p className="text-xs text-gray-500 mb-1">{label}</p>
    <p className="text-lg font-bold text-gray-700">
      {value != null ? `${value}/${max}` : '—'}
    </p>
  </div>
);

const GradeCard = ({ grade }) => {
  const isFullyGraded  = grade.totalScore !== null;
  const isSystemGraded = grade.isSystemCalculated;
  const letter  = isFullyGraded ? getLetterGrade(grade.totalScore)         : null;
  const classif = isFullyGraded ? getGradeClassification(grade.totalScore) : null;

  const badge = isFullyGraded
    ? { label: 'Graded',        cls: 'bg-green-100 text-green-700' }
    : isSystemGraded
    ? { label: 'System Graded', cls: 'bg-blue-100 text-blue-700' }
    : { label: 'Pending',       cls: 'bg-yellow-100 text-yellow-700' };

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="font-semibold text-gray-800">Week {grade.weekNumber}</h3>
          {grade.weekStartDate && (
            <p className="text-xs text-gray-400 mt-0.5">
              {formatDate(grade.weekStartDate)} – {formatDate(grade.weekEndDate)}
            </p>
          )}
        </div>
        <span className={`text-xs font-medium px-3 py-1 rounded-full ${badge.cls}`}>
          {badge.label}
        </span>
      </div>

      {/* Score breakdown */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* System score with sub-breakdown */}
        <div className="bg-gray-50 rounded-lg p-3 text-center">
          <p className="text-xs text-gray-500 mb-1">System Score</p>
          <p className="text-lg font-bold text-gray-700">
            {isSystemGraded ? `${grade.systemScore}/50` : '—'}
          </p>
          {isSystemGraded && (
            <p className="text-xs text-gray-400 mt-0.5">
              Att {grade.attendanceScore}/20 · Log {grade.logbookScore}/30
            </p>
          )}
        </div>

        {/* Supervisor score */}
        <div className="bg-blue-50 rounded-lg p-3 text-center">
          <p className="text-xs text-gray-500 mb-1">Supervisor Score</p>
          {grade.supervisorScore != null ? (
            <p className="text-lg font-bold text-gray-700">{grade.supervisorScore}/50</p>
          ) : (
            <>
              <p className="text-lg font-bold text-gray-300">—</p>
              <p className="text-xs text-gray-400 mt-0.5">Awaiting review</p>
            </>
          )}
        </div>

        {/* Total */}
        <div className={`${isFullyGraded ? 'bg-green-50' : 'bg-gray-50'} rounded-lg p-3 text-center`}>
          <p className="text-xs text-gray-500 mb-1">Total Score</p>
          {isFullyGraded ? (
            <p className="text-lg font-bold text-gray-700">{grade.totalScore}/100</p>
          ) : (
            <>
              <p className="text-lg font-bold text-gray-300">—/100</p>
              {isSystemGraded && <p className="text-xs text-gray-400 mt-0.5">Supervisor pending</p>}
            </>
          )}
        </div>

        {/* Letter grade */}
        <div className="bg-gray-50 rounded-lg p-3 text-center">
          <p className="text-xs text-gray-500 mb-1">Grade</p>
          {isFullyGraded ? (
            <div>
              <p className={`text-lg font-bold ${getGradeColor(grade.totalScore)}`}>{letter}</p>
              <p className={`text-xs ${getGradeColor(grade.totalScore)}`}>{classif}</p>
            </div>
          ) : (
            <p className="text-lg font-bold text-gray-300">—</p>
          )}
        </div>
      </div>

      {grade.supervisorNote && (
        <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
          <p className="text-xs font-medium text-blue-700 mb-1">Supervisor Note</p>
          <p className="text-sm text-blue-600 leading-relaxed">{grade.supervisorNote}</p>
        </div>
      )}
    </div>
  );
};

const GradesPage = () => {
  const [grades, setGrades]     = useState([]);
  const [summary, setSummary]   = useState(null);
  const [loading, setLoading]   = useState(true);
  const [filter, setFilter]     = useState('all'); // all | graded | pending

  useEffect(() => {
    api.get('/student/grades')
      .then(({ data }) => {
        setGrades(data.data.grades);
        setSummary(data.data.summary);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = grades.filter((g) => {
    if (filter === 'graded')  return g.totalScore !== null;
    if (filter === 'pending') return g.totalScore === null;
    return true;
  });

  const pendingCount = grades.filter((g) => g.totalScore === null).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20 lg:pb-0">

      <div>
        <h1 className="text-2xl font-bold text-gray-800">My Grades</h1>
        <p className="text-gray-500 text-sm mt-0.5">
          {summary?.totalGraded ?? 0} week{summary?.totalGraded !== 1 ? 's' : ''} graded
          {pendingCount > 0 ? ` · ${pendingCount} pending` : ''}
        </p>
      </div>

      {/* Summary cards */}
      {summary && summary.totalGraded > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 text-center">
            <p className="text-xs text-gray-500 mb-1">Average Score</p>
            {summary.avgScore != null ? (
              <>
                <p className={`text-2xl font-bold ${getGradeColor(summary.avgScore)}`}>
                  {formatScore(summary.avgScore)}
                </p>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${getGradeBadgeColor(summary.avgScore)}`}>
                  Grade {getLetterGrade(summary.avgScore)}
                </span>
              </>
            ) : <p className="text-2xl font-bold text-gray-300">—</p>}
          </div>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 text-center">
            <p className="text-xs text-gray-500 mb-1">Highest Score</p>
            <p className={`text-2xl font-bold ${summary.highestScore != null ? getGradeColor(summary.highestScore) : 'text-gray-300'}`}>
              {summary.highestScore != null ? summary.highestScore : '—'}
            </p>
            {summary.highestScore != null && (
              <p className="text-xs text-gray-400">out of 100</p>
            )}
          </div>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 text-center">
            <p className="text-xs text-gray-500 mb-1">Lowest Score</p>
            <p className={`text-2xl font-bold ${summary.lowestScore != null ? getGradeColor(summary.lowestScore) : 'text-gray-300'}`}>
              {summary.lowestScore != null ? summary.lowestScore : '—'}
            </p>
            {summary.lowestScore != null && (
              <p className="text-xs text-gray-400">out of 100</p>
            )}
          </div>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 text-center">
            <p className="text-xs text-gray-500 mb-1">Classification</p>
            {summary.avgScore != null ? (
              <>
                <p className={`text-lg font-bold ${getGradeColor(summary.avgScore)}`}>
                  {getGradeClassification(summary.avgScore)}
                </p>
                <p className="text-xs text-gray-400">{summary.totalGraded} weeks</p>
              </>
            ) : <p className="text-lg font-bold text-gray-300">—</p>}
          </div>
        </div>
      )}

      {/* Filter tabs */}
      {grades.length > 0 && (
        <div className="flex gap-2">
          {['all', 'graded', 'pending'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors capitalize ${
                filter === f
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'
              }`}
            >
              {f} {f === 'pending' && pendingCount > 0 ? `(${pendingCount})` : ''}
            </button>
          ))}
        </div>
      )}

      {/* Grade list */}
      {grades.length === 0 ? (
        <EmptyState
          title="No grades yet"
          description="Your system score (attendance + logbook) will appear as soon as you start filling your weekly logbook."
        />
      ) : filtered.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-12">No {filter} grades.</p>
      ) : (
        <div className="space-y-4">
          {filtered.map((grade) => (
            <GradeCard key={grade._id} grade={grade} />
          ))}
        </div>
      )}
    </div>
  );
};

export default GradesPage;
