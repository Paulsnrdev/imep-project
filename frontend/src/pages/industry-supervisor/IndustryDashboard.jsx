import { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import api from '../../services/api';
import { getLetterGrade, getGradeBadgeColor, formatScore } from '../../utils/gradeHelpers';
import { timeAgo } from '../../utils/formatDate';
import Badge from '../../components/common/Badge';
import Avatar from '../../components/common/Avatar';
import EmptyState from '../../components/common/EmptyState';

// ─── Mini progress bar ───────────────────────────────────────────────────────

const MiniBar = ({ value, color = 'bg-blue-500' }) => {
  const pct = Math.min(Math.max(value ?? 0, 0), 100);
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-gray-500 w-8 text-right">{pct}%</span>
    </div>
  );
};

// ─── Attendance Toast ─────────────────────────────────────────────────────────

const AttendanceToast = ({ toasts, onDismiss }) => {
  if (!toasts.length) return null;
  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-xs w-full pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`flex items-start gap-3 bg-white border rounded-xl shadow-lg px-4 py-3 pointer-events-auto
            ${t.type === 'attendance_checkin' ? 'border-green-200' : 'border-blue-200'}`}
        >
          <span className="text-xl shrink-0 mt-0.5">
            {t.type === 'attendance_checkin' ? '📍' : '🏁'}
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-800">{t.title}</p>
            <p className="text-xs text-gray-500 mt-0.5 leading-snug">{t.body}</p>
          </div>
          <button
            onClick={() => onDismiss(t.id)}
            className="text-gray-300 hover:text-gray-500 text-lg leading-none shrink-0 mt-0.5"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
};

// ─── Stat Card ────────────────────────────────────────────────────────────────

const StatCard = ({ label, value, sub, icon, accent = 'blue' }) => {
  const accents = {
    blue:   'bg-blue-50 border-blue-100 text-blue-600',
    green:  'bg-green-50 border-green-100 text-green-600',
    yellow: 'bg-yellow-50 border-yellow-100 text-yellow-600',
    red:    'bg-red-50 border-red-100 text-red-600',
    purple: 'bg-purple-50 border-purple-100 text-purple-600',
  };
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-start gap-3">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg shrink-0 border ${accents[accent]}`}>
        {icon}
      </div>
      <div>
        <p className="text-xs text-gray-500 font-medium">{label}</p>
        <p className="text-xl font-bold text-gray-800 leading-tight mt-0.5">{value ?? '—'}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
};

// ─── Student Row ──────────────────────────────────────────────────────────────

const StudentRow = ({ student }) => {
  const entries  = student.currentWeekEntries ?? 0;
  const grade    = student.latestGrade;
  const checkedIn = student.checkedInToday;

  return (
    <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors group">
      <Avatar name={student.name} src={student.profileImage} size="md" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-800 truncate">{student.name}</p>
        <p className="text-xs text-gray-400">{student.matricNumber || 'No matric'}</p>
      </div>
      <div className="hidden sm:flex flex-col items-center min-w-[60px]">
        <span className={`text-xs font-semibold ${entries === 5 ? 'text-green-600' : entries > 0 ? 'text-yellow-600' : 'text-red-500'}`}>
          {entries}/5
        </span>
        <span className="text-xs text-gray-400">Logbook</span>
      </div>
      <div className="hidden sm:flex flex-col items-center min-w-[60px]">
        <span className={`text-xs font-semibold ${checkedIn ? 'text-green-600' : 'text-gray-400'}`}>
          {checkedIn ? '✓ In' : '✗ Out'}
        </span>
        <span className="text-xs text-gray-400">Today</span>
      </div>
      <div className="min-w-[70px] text-right">
        {grade != null ? (
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${getGradeBadgeColor(grade)}`}>
            {grade}/100
          </span>
        ) : (
          <span className="text-xs text-gray-300">No grade</span>
        )}
      </div>
      <Link
        to={`/industry/students/${student._id}/logbook`}
        className="text-xs text-blue-600 font-medium opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap ml-2"
      >
        View →
      </Link>
    </div>
  );
};

// ─── Pending Action Card ──────────────────────────────────────────────────────

const PendingCard = ({ icon, label, count, path, accent }) => {
  const colors = {
    yellow: 'bg-yellow-50 border-yellow-200 text-yellow-700',
    red:    'bg-red-50 border-red-200 text-red-700',
    blue:   'bg-blue-50 border-blue-200 text-blue-700',
  };
  return (
    <Link to={path} className={`flex items-center gap-3 p-3 rounded-xl border transition-colors hover:opacity-80 ${colors[accent]}`}>
      <span className="text-xl">{icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold">{label}</p>
      </div>
      <span className="text-lg font-bold">{count}</span>
    </Link>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

const IndustryDashboard = () => {
  const { user } = useAuth();

  const [loading, setLoading]             = useState(true);
  const [students, setStudents]           = useState([]);
  const [stats, setStats]                 = useState({ totalStudents: 0, checkedInToday: 0, pendingGrades: 0, avgGrade: null });
  const [conversations, setConversations] = useState([]);
  const [toasts, setToasts]               = useState([]);
  const [attendanceFeed, setAttendanceFeed] = useState([]);

  const lastNotifRef    = useRef(null); // ISO timestamp of last seen notification
  const toastTimerRef   = useRef({});

  const dismissToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    clearTimeout(toastTimerRef.current[id]);
  }, []);

  const addToast = useCallback((notif) => {
    const id = notif._id;
    setToasts((prev) => [{ id, title: notif.title, body: notif.body, type: notif.type }, ...prev.slice(0, 4)]);
    setAttendanceFeed((prev) => [notif, ...prev].slice(0, 20));
    toastTimerRef.current[id] = setTimeout(() => dismissToast(id), 6000);
  }, [dismissToast]);

  // Poll notifications every 30 s; show toast for new attendance events
  useEffect(() => {
    const pollNotifications = async () => {
      try {
        const since = lastNotifRef.current ? `&since=${lastNotifRef.current}` : '';
        const { data } = await api.get(`/notifications?unread=true&limit=10${since}`);
        const notifs = data.data.notifications ?? [];
        const attendanceNotifs = notifs.filter(
          (n) => n.type === 'attendance_checkin' || n.type === 'attendance_checkout'
        );
        if (attendanceNotifs.length) {
          attendanceNotifs.forEach(addToast);
          setAttendanceFeed((prev) => {
            const existingIds = new Set(prev.map((n) => n._id));
            const newOnes = attendanceNotifs.filter((n) => !existingIds.has(n._id));
            return newOnes.length ? [...newOnes, ...prev] : prev;
          });
          attendanceNotifs.forEach((n) => api.patch(`/notifications/${n._id}/read`).catch(() => {}));
        }
        if (notifs.length) {
          lastNotifRef.current = notifs[0].createdAt;
        }
      } catch { /* ignore */ }
    };

    // Initial load: seed feed, show toasts for any unread attendance notifications
    api.get('/notifications?limit=10').then(({ data }) => {
      const allNotifs = data.data.notifications ?? [];
      const feed = allNotifs.filter(
        (n) => n.type === 'attendance_checkin' || n.type === 'attendance_checkout'
      );
      setAttendanceFeed(feed);
      if (allNotifs.length) {
        lastNotifRef.current = allNotifs[0].createdAt;
      }
      // Toast any unread attendance notifications found in the seed (missed while dashboard was closed)
      const unread = feed.filter((n) => !n.isRead);
      unread.forEach(addToast);
      unread.forEach((n) => api.patch(`/notifications/${n._id}/read`).catch(() => {}));
      pollNotifications();
    }).catch(() => { pollNotifications(); });

    const interval = setInterval(pollNotifications, 30_000);
    return () => {
      clearInterval(interval);
      Object.values(toastTimerRef.current).forEach(clearTimeout);
    };
  }, [addToast]);

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await api.get('/industry/dashboard');
        setStudents(data.data.students);
        setStats(data.data.stats);
        setConversations(data.data.conversations || []);
      } catch {
        // leave defaults — empty state shows
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const { totalStudents, checkedInToday, pendingGrades, avgGrade } = stats;
  const needsComment = students.filter((s) => s.currentWeekEntries === 5).length;
  const atRisk       = students.filter((s) => s.currentWeekEntries === 0).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20 lg:pb-0">
      <AttendanceToast toasts={toasts} onDismiss={dismissToast} />

      {/* ── Header ── */}
      <div>
        <h1 className="text-2xl font-bold text-gray-800">
          {getGreeting()}, {user?.firstName ?? 'Supervisor'} 👋
        </h1>
        <p className="text-gray-500 text-sm mt-0.5">
          {totalStudents > 0
            ? `Here's an overview of your ${totalStudents} assigned student${totalStudents !== 1 ? 's' : ''}`
            : 'No students assigned yet'}
        </p>
      </div>

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon="👥" label="Total Students"   value={totalStudents}    sub="Assigned to you"                    accent="blue"   />
        <StatCard icon="📍" label="Checked In Today" value={checkedInToday}   sub={`${totalStudents - checkedInToday} absent`} accent="green"  />
        <StatCard icon="⏳" label="Pending Grades"   value={pendingGrades}    sub="Awaiting your grade"                accent="yellow" />
        <StatCard icon="📊" label="Average Grade"
          value={avgGrade != null ? `${formatScore(avgGrade)}/100` : '—'}
          sub={avgGrade != null ? `Grade ${getLetterGrade(avgGrade)}` : 'No grades yet'}
          accent="purple"
        />
      </div>

      {/* ── Pending actions ── */}
      {(pendingGrades > 0 || atRisk > 0) && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h2 className="font-semibold text-gray-800 mb-3">Pending Actions</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {pendingGrades > 0 && <PendingCard icon="📝" label="Students needing grade"       count={pendingGrades} path="/industry/grading"  accent="yellow" />}
            {needsComment  > 0 && <PendingCard icon="💬" label="Logbooks awaiting comment"    count={needsComment}  path="/industry/students" accent="blue"   />}
            {atRisk        > 0 && <PendingCard icon="⚠️" label="No entries this week"         count={atRisk}        path="/industry/students" accent="red"    />}
          </div>
        </div>
      )}

      {/* ── Students + Messages row ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

        {/* Student list — 2/3 */}
        <div className="md:col-span-2 bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-1">
            <h2 className="font-semibold text-gray-800">My Students</h2>
            <Link to="/industry/students" className="text-xs text-blue-600 hover:underline">View all</Link>
          </div>
          <div className="flex items-center gap-3 px-3 py-2 text-xs text-gray-400 font-medium border-b border-gray-100 mb-1">
            <span className="flex-1">Student</span>
            <span className="hidden sm:block min-w-[60px] text-center">Logbook</span>
            <span className="hidden sm:block min-w-[60px] text-center">Today</span>
            <span className="min-w-[70px] text-right">Last Grade</span>
          </div>
          {students.length === 0 ? (
            <EmptyState title="No students assigned" description="Students will appear here once assigned to your profile." />
          ) : (
            <div className="divide-y divide-gray-50">
              {students.slice(0, 5).map((s) => <StudentRow key={s._id} student={s} />)}
            </div>
          )}
        </div>

        {/* Messages — 1/3 */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-800">Messages</h2>
            {conversations.filter((c) => c.unreadCount?.industrySupervisor > 0).length > 0 && (
              <span className="bg-red-500 text-white text-xs rounded-full px-2 py-0.5 font-semibold">
                {conversations.filter((c) => c.unreadCount?.industrySupervisor > 0).length} new
              </span>
            )}
          </div>

          {conversations.length === 0 ? (
            <EmptyState title="No messages" description="Conversations with institution supervisors appear here." />
          ) : (
            <div className="space-y-2 flex-1">
              {conversations.map((conv) => {
                const other   = conv.institutionSupervisor;
                const isUnread = (conv.unreadCount?.industrySupervisor ?? 0) > 0;
                return (
                  <Link
                    key={conv._id}
                    to={`/industry/messages/${conv._id}`}
                    className={`block p-3 rounded-xl transition-colors hover:bg-gray-50 ${isUnread ? 'bg-blue-50' : ''}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-xs font-semibold text-gray-700 truncate">
                        {other ? `${other.firstName} ${other.lastName}` : 'Supervisor'}
                      </p>
                      <span className="text-xs text-gray-400 shrink-0">{timeAgo(conv.lastMessageAt)}</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1 line-clamp-2">{conv.lastMessage || 'No messages yet'}</p>
                    {isUnread && <div className="mt-1.5 w-2 h-2 rounded-full bg-blue-500" />}
                  </Link>
                );
              })}
            </div>
          )}

          <Link
            to="/industry/messages"
            className="mt-4 block text-center text-sm text-blue-600 font-medium border border-blue-200 rounded-lg py-2 hover:bg-blue-50 transition-colors"
          >
            Open Messages
          </Link>
        </div>
      </div>

      {/* ── Weekly overview table ── */}
      {students.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-800">This Week&apos;s Overview</h2>
            {students[0]?.weekNumber && (
              <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-full">
                Week {students[0].weekNumber}
              </span>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-400 font-medium border-b border-gray-100">
                  <th className="text-left pb-3 pr-4">Student</th>
                  <th className="text-center pb-3 px-3">Logbook</th>
                  <th className="text-center pb-3 px-3">Today</th>
                  <th className="pb-3 px-3 w-28">Attend.</th>
                  <th className="text-center pb-3 px-3">Last Grade</th>
                  <th className="text-center pb-3 px-3">Status</th>
                  <th className="pb-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {students.map((s) => {
                  const status = s.currentWeekEntries === 0
                    ? { label: 'At Risk',     variant: 'red'    }
                    : s.currentWeekEntries === 5
                    ? { label: 'Complete',    variant: 'green'  }
                    : { label: 'In Progress', variant: 'yellow' };
                  return (
                    <tr key={s._id} className="hover:bg-gray-50">
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-2">
                          <Avatar name={s.name} size="sm" />
                          <div>
                            <p className="font-medium text-gray-800 text-sm">{s.name}</p>
                            <p className="text-xs text-gray-400">{s.matricNumber}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className={`font-semibold text-sm ${s.currentWeekEntries === 5 ? 'text-green-600' : s.currentWeekEntries > 0 ? 'text-yellow-600' : 'text-red-500'}`}>
                          {s.currentWeekEntries}/5
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className={`text-sm font-medium ${s.checkedInToday ? 'text-green-600' : 'text-red-400'}`}>
                          {s.checkedInToday ? '✓' : '✗'}
                        </span>
                      </td>
                      <td className="py-3 px-3 w-28">
                        <MiniBar
                          value={s.attendanceRate ?? 0}
                          color={s.attendanceRate >= 80 ? 'bg-green-500' : s.attendanceRate >= 60 ? 'bg-yellow-400' : 'bg-red-400'}
                        />
                      </td>
                      <td className="py-3 px-3 text-center">
                        {s.latestGrade != null ? (
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${getGradeBadgeColor(s.latestGrade)}`}>
                            {s.latestGrade}
                          </span>
                        ) : <span className="text-xs text-gray-300">—</span>}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <Badge label={status.label} variant={status.variant} />
                      </td>
                      <td className="py-3 text-right">
                        <Link to={`/industry/grading/${s._id}`} className="text-xs text-blue-600 hover:underline font-medium">
                          Grade →
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

      {/* ── Live Attendance Feed ── */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-gray-800">Attendance Activity</h2>
          <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">Live · 30s refresh</span>
        </div>
        {attendanceFeed.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">No check-in activity yet today.</p>
        ) : (
          <div className="space-y-2">
            {attendanceFeed.map((n) => (
              <div key={n._id} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                <span className="text-lg shrink-0">
                  {n.type === 'attendance_checkin' ? '📍' : '🏁'}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-800 leading-snug">{n.body}</p>
                </div>
                <span className="text-xs text-gray-400 shrink-0">{timeAgo(n.createdAt)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
};

const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
};

export default IndustryDashboard;
