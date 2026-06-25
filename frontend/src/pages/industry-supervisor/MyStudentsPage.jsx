import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { getGradeBadgeColor } from '../../utils/gradeHelpers';
import Avatar from '../../components/common/Avatar';
import Badge from '../../components/common/Badge';
import EmptyState from '../../components/common/EmptyState';

const MiniBar = ({ value, color = 'bg-blue-500' }) => {
  const pct = Math.min(Math.max(value, 0), 100);
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-gray-500 w-8 text-right">{pct}%</span>
    </div>
  );
};

const MyStudentsPage = () => {
  const [students, setStudents] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');

  useEffect(() => {
    api.get('/industry/students')
      .then(({ data }) => setStudents(data.data.students))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = students.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.matricNumber.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20 lg:pb-0">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">My Students</h1>
          <p className="text-gray-500 text-sm mt-0.5">{students.length} assigned student{students.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      {students.length > 0 && (
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or matric number..."
          className="w-full max-w-sm px-4 py-2 border border-gray-300 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
        />
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
                  <th className="text-center px-3 py-3 hidden sm:table-cell">Logbook</th>
                  <th className="text-center px-3 py-3 hidden sm:table-cell">Today</th>
                  <th className="px-3 py-3 hidden sm:table-cell">Attend.</th>
                  <th className="text-center px-3 py-3">Grade</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((s) => {
                  const status = s.currentWeekEntries === 0
                    ? { label: 'At Risk',     variant: 'red'    }
                    : s.currentWeekEntries === 5
                    ? { label: 'Complete',    variant: 'green'  }
                    : { label: 'In Progress', variant: 'yellow' };

                  return (
                    <tr key={s._id} className="hover:bg-gray-50">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <Avatar name={s.name} src={s.profileImage} size="md" />
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-gray-800 truncate">{s.name}</p>
                            <p className="text-xs text-gray-400">{s.matricNumber || 'No matric'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3 hidden sm:table-cell">
                        <div className="flex flex-col items-center">
                          <span className={`text-xs font-semibold ${s.currentWeekEntries === 5 ? 'text-green-600' : s.currentWeekEntries > 0 ? 'text-yellow-600' : 'text-red-500'}`}>
                            {s.currentWeekEntries}/5
                          </span>
                          <Badge label={status.label} variant={status.variant} size="xs" />
                        </div>
                      </td>
                      <td className="px-3 py-3 hidden sm:table-cell">
                        <div className="flex flex-col items-center">
                          <span className={`text-sm font-semibold ${s.checkedInToday ? 'text-green-600' : 'text-red-400'}`}>
                            {s.checkedInToday ? '✓' : '✗'}
                          </span>
                          <span className="text-xs text-gray-400">Today</span>
                        </div>
                      </td>
                      <td className="px-3 py-3 hidden sm:table-cell">
                        <div className="w-24">
                          <MiniBar
                            value={s.attendanceRate ?? 0}
                            color={s.attendanceRate >= 80 ? 'bg-green-500' : s.attendanceRate >= 60 ? 'bg-yellow-400' : 'bg-red-400'}
                          />
                        </div>
                      </td>
                      <td className="px-3 py-3 text-center">
                        {s.latestGrade != null ? (
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${getGradeBadgeColor(s.latestGrade)}`}>
                            {s.latestGrade}/100
                          </span>
                        ) : (
                          <span className="text-xs text-gray-300">No grade</span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <Link
                          to={`/industry/students/${s._id}/logbook`}
                          className="text-xs text-blue-600 font-medium hover:underline whitespace-nowrap"
                        >
                          Logbook
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

export default MyStudentsPage;
