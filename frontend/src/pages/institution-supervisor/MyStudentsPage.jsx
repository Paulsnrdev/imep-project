import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { getGradeBadgeColor, formatScore } from '../../utils/gradeHelpers';
import Avatar from '../../components/common/Avatar';
import EmptyState from '../../components/common/EmptyState';

const MiniBar = ({ value, color = 'bg-blue-500' }) => (
  <div className="flex items-center gap-2">
    <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
      <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.min(value, 100)}%` }} />
    </div>
    <span className="text-xs text-gray-400 w-7 text-right">{value}%</span>
  </div>
);

const MyStudentsPage = () => {
  const [students, setStudents] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');
  const [sortBy, setSortBy]     = useState('name');

  useEffect(() => {
    api.get('/institution/students')
      .then(({ data }) => setStudents(data.data.students))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = students
    .filter((s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.matricNumber.toLowerCase().includes(search.toLowerCase()) ||
      s.company?.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => {
      if (sortBy === 'score')      return (b.avgScore ?? -1) - (a.avgScore ?? -1);
      if (sortBy === 'attendance') return b.attendanceRate - a.attendanceRate;
      return a.name.localeCompare(b.name);
    });

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6 pb-20 lg:pb-0">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">My Students</h1>
        <p className="text-gray-500 text-sm mt-0.5">{students.length} assigned student{students.length !== 1 ? 's' : ''}</p>
      </div>

      {students.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, matric, or company..."
            className="flex-1 max-w-sm px-4 py-2 border border-gray-300 rounded-xl text-sm outline-none focus:ring-2 focus:ring-purple-500"
          />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-xl text-sm outline-none focus:ring-2 focus:ring-purple-500 bg-white"
          >
            <option value="name">Sort: Name</option>
            <option value="score">Sort: Score</option>
            <option value="attendance">Sort: Attendance</option>
          </select>
        </div>
      )}

      {students.length === 0 ? (
        <EmptyState
          title="No students assigned"
          description="Students assigned to you will appear here. Contact your admin to link students to your profile."
        />
      ) : filtered.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-12">No students match your search.</p>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-400 font-medium border-b border-gray-100">
                  <th className="text-left px-5 py-3">Student</th>
                  <th className="text-left px-3 py-3 hidden sm:table-cell">Company</th>
                  <th className="text-center px-3 py-3">Attendance</th>
                  <th className="text-center px-3 py-3">Logbook</th>
                  <th className="text-center px-3 py-3">Avg Score</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((s, i) => (
                  <tr key={s._id} className="hover:bg-gray-50">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-gray-300 w-4 shrink-0">{i + 1}</span>
                        <Avatar name={s.name} src={s.profileImage} size="md" />
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-gray-800 truncate">{s.name}</p>
                          <p className="text-xs text-gray-400">{s.matricNumber || 'No matric'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3 hidden sm:table-cell">
                      <p className="text-xs text-gray-500 truncate max-w-[130px]">{s.company || '—'}</p>
                    </td>
                    <td className="px-3 py-3">
                      <div className="w-20">
                        <MiniBar value={s.attendanceRate}
                          color={s.attendanceRate >= 80 ? 'bg-green-500' : s.attendanceRate >= 60 ? 'bg-yellow-400' : 'bg-red-400'}
                        />
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <div className="w-20">
                        <MiniBar value={s.logbookRate}
                          color={s.logbookRate === 100 ? 'bg-green-500' : s.logbookRate > 0 ? 'bg-yellow-400' : 'bg-red-400'}
                        />
                      </div>
                    </td>
                    <td className="px-3 py-3 text-center">
                      {s.avgScore != null ? (
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${getGradeBadgeColor(s.avgScore)}`}>
                          {formatScore(s.avgScore)}/100
                        </span>
                      ) : <span className="text-xs text-gray-300">No grades</span>}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <Link
                        to={`/institution/students/${s._id}/logbook`}
                        className="text-xs text-blue-600 font-medium hover:underline"
                      >
                        Logbook →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyStudentsPage;
