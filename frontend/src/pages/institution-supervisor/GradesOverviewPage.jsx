import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { formatDate } from '../../utils/formatDate';
import {
  getLetterGrade, getGradeClassification, getGradeBadgeColor,
  getGradeColor, formatScore,
} from '../../utils/gradeHelpers';
import Avatar from '../../components/common/Avatar';
import EmptyState from '../../components/common/EmptyState';

const WeekBadge = ({ grade }) => {
  if (grade.totalScore === null) {
    return <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-400">W{grade.weekNumber}: —</span>;
  }
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getGradeBadgeColor(grade.totalScore)}`}>
      W{grade.weekNumber}: {grade.totalScore}
    </span>
  );
};

const GradesOverviewPage = () => {
  const [students, setStudents] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    api.get('/institution/grades')
      .then(({ data }) => setStudents(data.data.students))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = students.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.matricNumber.toLowerCase().includes(search.toLowerCase()) ||
    s.company?.toLowerCase().includes(search.toLowerCase())
  );

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
        <h1 className="text-2xl font-bold text-gray-800">Grades Overview</h1>
        <p className="text-gray-500 text-sm mt-0.5">
          {students.length} student{students.length !== 1 ? 's' : ''} · weekly grade breakdown
        </p>
      </div>

      {students.length > 0 && (
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, matric, or company..."
          className="w-full max-w-sm px-4 py-2 border border-gray-300 rounded-xl text-sm outline-none focus:ring-2 focus:ring-purple-500"
        />
      )}

      {students.length === 0 ? (
        <EmptyState
          title="No grade data yet"
          description="Grades appear here after logbook weeks are locked and reviewed by industry supervisors."
        />
      ) : filtered.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-12">No students match your search.</p>
      ) : (
        <div className="space-y-3">
          {filtered.map((student) => {
            const isOpen    = expanded === student._id;
            const graded    = student.grades.filter((g) => g.totalScore !== null);
            const hasGrades = graded.length > 0;

            return (
              <div key={student._id} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">

                {/* Student header row */}
                <button
                  className="w-full text-left p-4 flex items-center gap-4 hover:bg-gray-50 transition-colors"
                  onClick={() => setExpanded(isOpen ? null : student._id)}
                >
                  <Avatar name={student.name} src={student.profileImage} size="md" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-gray-800">{student.name}</p>
                      <p className="text-xs text-gray-400">{student.matricNumber}</p>
                      {student.company && (
                        <span className="text-xs text-gray-400 hidden sm:inline">· {student.company}</span>
                      )}
                    </div>
                    <div className="flex gap-1.5 mt-1.5 flex-wrap">
                      {student.grades.slice(0, 6).map((g) => (
                        <WeekBadge key={g.weekNumber} grade={g} />
                      ))}
                      {student.grades.length > 6 && (
                        <span className="text-xs text-gray-400">+{student.grades.length - 6} more</span>
                      )}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    {hasGrades ? (
                      <>
                        <span className={`text-sm font-bold px-2 py-0.5 rounded-full ${getGradeBadgeColor(student.avgScore)}`}>
                          {formatScore(student.avgScore)}/100
                        </span>
                        <p className={`text-xs mt-1 ${getGradeColor(student.avgScore)}`}>
                          {getLetterGrade(student.avgScore)} · {getGradeClassification(student.avgScore)}
                        </p>
                      </>
                    ) : (
                      <span className="text-xs text-gray-300">No grades</span>
                    )}
                  </div>
                  <span className="text-gray-300 text-xs ml-2">{isOpen ? '▲' : '▼'}</span>
                </button>

                {/* Expanded week details */}
                {isOpen && (
                  <div className="border-t border-gray-100 p-4">
                    {student.grades.length === 0 ? (
                      <p className="text-sm text-gray-400 text-center py-4">No grades recorded yet.</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="text-xs text-gray-400 font-medium border-b border-gray-100">
                              <th className="text-left py-2 pr-4">Week</th>
                              <th className="text-left py-2 pr-4 hidden sm:table-cell">Period</th>
                              <th className="text-center py-2 pr-4">System</th>
                              <th className="text-center py-2 pr-4">Supervisor</th>
                              <th className="text-center py-2 pr-4">Total</th>
                              <th className="text-center py-2">Grade</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-50">
                            {student.grades.map((g) => (
                              <tr key={g.weekNumber} className="hover:bg-gray-50">
                                <td className="py-2 pr-4 font-medium text-gray-700">Week {g.weekNumber}</td>
                                <td className="py-2 pr-4 text-gray-400 hidden sm:table-cell">
                                  {g.weekStartDate
                                    ? `${formatDate(g.weekStartDate)} – ${formatDate(g.weekEndDate)}`
                                    : '—'}
                                </td>
                                <td className="py-2 pr-4 text-center text-gray-600">
                                  {g.systemScore != null ? `${g.systemScore}/50` : '—'}
                                </td>
                                <td className="py-2 pr-4 text-center text-gray-600">
                                  {g.supervisorScore != null ? `${g.supervisorScore}/50` : '—'}
                                </td>
                                <td className="py-2 pr-4 text-center">
                                  {g.totalScore != null ? (
                                    <span className={`font-bold ${getGradeColor(g.totalScore)}`}>
                                      {g.totalScore}/100
                                    </span>
                                  ) : <span className="text-gray-300">Pending</span>}
                                </td>
                                <td className="py-2 text-center">
                                  {g.totalScore != null ? (
                                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${getGradeBadgeColor(g.totalScore)}`}>
                                      {getLetterGrade(g.totalScore)}
                                    </span>
                                  ) : '—'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                    <div className="mt-3 flex justify-end">
                      <Link
                        to={`/institution/students/${student._id}/logbook`}
                        className="text-xs text-purple-600 hover:underline font-medium"
                      >
                        View logbook →
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default GradesOverviewPage;
