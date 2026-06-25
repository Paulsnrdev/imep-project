import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import {
  getLetterGrade, getGradeClassification, getGradeBadgeColor,
  getGradeColor, formatScore,
} from '../../utils/gradeHelpers';
import Avatar from '../../components/common/Avatar';
import EmptyState from '../../components/common/EmptyState';

const RankBadge = ({ rank }) => {
  if (rank === 1) return <span className="text-xl">🥇</span>;
  if (rank === 2) return <span className="text-xl">🥈</span>;
  if (rank === 3) return <span className="text-xl">🥉</span>;
  return (
    <span className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 text-sm font-semibold shrink-0">
      {rank}
    </span>
  );
};

const MiniBar = ({ value, color = 'bg-purple-500' }) => (
  <div className="flex items-center gap-2">
    <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
      <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.min(value, 100)}%` }} />
    </div>
    <span className="text-xs text-gray-400 w-7 text-right">{value}%</span>
  </div>
);

const LeaderboardPage = () => {
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [search, setSearch]           = useState('');

  useEffect(() => {
    api.get('/institution/leaderboard')
      .then(({ data }) => setLeaderboard(data.data.leaderboard))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = leaderboard.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.matricNumber.toLowerCase().includes(search.toLowerCase()) ||
    s.company?.toLowerCase().includes(search.toLowerCase())
  );

  const withScores    = leaderboard.filter((s) => s.avgScore !== null);
  const topAvg        = withScores.length ? withScores[0].avgScore : null;
  const cohortAvg     = withScores.length
    ? withScores.reduce((s, x) => s + x.avgScore, 0) / withScores.length
    : null;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20 lg:pb-0">

      <div>
        <h1 className="text-2xl font-bold text-gray-800">Leaderboard</h1>
        <p className="text-gray-500 text-sm mt-0.5">
          {leaderboard.length} student{leaderboard.length !== 1 ? 's' : ''} ranked by average score
        </p>
      </div>

      {/* Cohort summary */}
      {withScores.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 text-center">
            <p className="text-xs text-gray-500 mb-1">Cohort Average</p>
            <p className={`text-2xl font-bold ${cohortAvg != null ? getGradeColor(cohortAvg) : 'text-gray-300'}`}>
              {cohortAvg != null ? formatScore(cohortAvg) : '—'}
            </p>
            {cohortAvg != null && (
              <p className="text-xs text-gray-400">{getGradeClassification(cohortAvg)}</p>
            )}
          </div>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 text-center">
            <p className="text-xs text-gray-500 mb-1">Top Score</p>
            <p className={`text-2xl font-bold ${topAvg != null ? getGradeColor(topAvg) : 'text-gray-300'}`}>
              {topAvg != null ? formatScore(topAvg) : '—'}
            </p>
            {topAvg != null && (
              <p className="text-xs text-gray-400">Grade {getLetterGrade(topAvg)}</p>
            )}
          </div>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 text-center col-span-2 sm:col-span-1">
            <p className="text-xs text-gray-500 mb-1">Students Graded</p>
            <p className="text-2xl font-bold text-gray-800">{withScores.length}</p>
            <p className="text-xs text-gray-400">of {leaderboard.length} total</p>
          </div>
        </div>
      )}

      {leaderboard.length > 0 && (
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, matric, or company..."
          className="w-full max-w-sm px-4 py-2 border border-gray-300 rounded-xl text-sm outline-none focus:ring-2 focus:ring-purple-500"
        />
      )}

      {leaderboard.length === 0 ? (
        <EmptyState
          title="No data yet"
          description="Students will appear here once they have been graded by their industry supervisors."
        />
      ) : filtered.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-12">No students match your search.</p>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-400 font-medium border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-4 py-3">Rank</th>
                  <th className="text-left px-3 py-3">Student</th>
                  <th className="text-left px-3 py-3 hidden sm:table-cell">Company</th>
                  <th className="text-center px-3 py-3">Avg Score</th>
                  <th className="text-left px-3 py-3 w-32 hidden md:table-cell">Attendance</th>
                  <th className="text-center px-3 py-3">Weeks</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((student) => {
                  const hasScore = student.avgScore !== null;
                  return (
                    <tr
                      key={student._id}
                      className={`hover:bg-gray-50 ${student.rank <= 3 && hasScore ? 'bg-amber-50/30' : ''}`}
                    >
                      <td className="px-4 py-3">
                        <RankBadge rank={student.rank} />
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar name={student.name} src={student.profileImage} size="md" />
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-gray-800 truncate">{student.name}</p>
                            <p className="text-xs text-gray-400">{student.matricNumber || '—'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3 hidden sm:table-cell">
                        <p className="text-xs text-gray-500 truncate max-w-[120px]">{student.company || '—'}</p>
                      </td>
                      <td className="px-3 py-3 text-center">
                        {hasScore ? (
                          <div>
                            <span className={`text-sm font-bold px-2 py-0.5 rounded-full ${getGradeBadgeColor(student.avgScore)}`}>
                              {formatScore(student.avgScore)}
                            </span>
                            <p className={`text-xs mt-0.5 ${getGradeColor(student.avgScore)}`}>
                              {getLetterGrade(student.avgScore)}
                            </p>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-300">No grades</span>
                        )}
                      </td>
                      <td className="px-3 py-3 hidden md:table-cell">
                        <div className="w-24">
                          <MiniBar
                            value={student.attendanceRate}
                            color={student.attendanceRate >= 80 ? 'bg-green-500' : student.attendanceRate >= 60 ? 'bg-yellow-400' : 'bg-red-400'}
                          />
                        </div>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span className="text-xs text-gray-500">{student.totalGraded} graded</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          to={`/institution/students/${student._id}/logbook`}
                          className="text-xs text-purple-600 hover:underline font-medium"
                        >
                          View →
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default LeaderboardPage;
