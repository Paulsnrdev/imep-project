import { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import api from '../../services/api';
import { getLetterGrade, getGradeBadgeColor, formatScore, getGradeClassification } from '../../utils/gradeHelpers';
import { timeAgo } from '../../utils/formatDate';
import Avatar from '../../components/common/Avatar';
import EmptyState from '../../components/common/EmptyState';

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

// ─── Progress bar ─────────────────────────────────────────────────────────────

const MiniBar = ({ value, max, color = 'bg-blue-500' }) => {
  const pct = max > 0 ? Math.min(Math.round((value / max) * 100), 100) : 0;
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-gray-400 w-7 text-right">{pct}%</span>
    </div>
  );
};

// ─── Main component ───────────────────────────────────────────────────────────

const InstitutionDashboard = () => {
  const { user } = useAuth();

  const [loading, setLoading]             = useState(true);
  const [students, setStudents]           = useState([]);
  const [stats, setStats]                 = useState({ totalStudents: 0, avgScore: null, avgAttendance: 0, weeklySubmitted: 0 });
  const [conversations, setConversations] = useState([]);
  const [toasts, setToasts]               = useState([]);
  const [attendanceFeed, setAttendanceFeed] = useState([]);

  const lastNotifRef  = useRef(null);
  const toastTimerRef = useRef({});

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
          attendanceNotifs.forEach((n) => api.patch(`/notifications/${n._id}/read`).catch(() => {}));
        }
        if (notifs.length) lastNotifRef.current = notifs[0].createdAt;
      } catch { /* ignore */ }
    };

    api.get('/notifications?limit=10').then(({ data }) => {
      const allNotifs = data.data.notifications ?? [];
      const feed = allNotifs.filter(
        (n) => n.type === 'attendance_checkin' || n.type === 'attendance_checkout'
      );
      setAttendanceFeed(feed);
      if (allNotifs.length) lastNotifRef.current = allNotifs[0].createdAt;
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
        const { data } = await api.get('/institution/dashboard');
        setStudents(data.data.students);
        setStats(data.data.stats);
        setConversations(data.data.conversations || []);
      } catch {
        // leave defaults
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const { totalStudents, avgScore, avgAttendance, weeklySubmitted } = stats;
  const atRisk   = students.filter((s) => s.avgScore != null && s.avgScore < 50);
  const topThree = [...students].sort((a, b) => (b.avgScore ?? 0) - (a.avgScore ?? 0)).slice(0, 3);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20 lg:pb-0">
      <AttendanceToast toasts={toasts} onDismiss={dismissToast} />

      {/* ── Header ── */}
      <div>
        <h1 className="text-2xl font-bold text-gray-800">
          Good {getGreeting()}, {user?.firstName ?? 'Supervisor'} 👋
        </h1>
        <p className="text-gray-500 text-sm mt-0.5">
          {totalStudents > 0 ? `Monitoring ${totalStudents} student${totalStudents !== 1 ? 's' : ''}` : 'No students assigned yet'}
        </p>
      </div>

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon="👥" label="Total Students"   value={totalStudents}  sub="Assigned to you"  accent="blue"   />
        <StatCard icon="📊" label="Average Score"
          value={avgScore != null ? `${formatScore(avgScore)}/100` : '—'}
          sub={avgScore != null ? `Grade ${getLetterGrade(avgScore)} · ${getGradeClassification(avgScore)}` : 'No grades yet'}
          accent="purple"
        />
        <StatCard icon="📍" label="Avg Attendance"   value={`${avgAttendance}%`}  sub="All time"          accent="green"  />
        <StatCard icon="📓" label="Full Submissions"
          value={`${weeklySubmitted}/${totalStudents}`}
          sub="Logbook complete"
          accent={weeklySubmitted === totalStudents && totalStudents > 0 ? 'green' : 'yellow'}
        />
      </div>

      {/* ── At-risk alert ── */}
      {atRisk.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-red-500 text-lg">⚠️</span>
            <h2 className="font-semibold text-red-700">At-Risk Students ({atRisk.length})</h2>
            <span className="text-xs text-red-500 ml-auto">Score below 50</span>
          </div>
          <div className="space-y-2">
            {atRisk.map((s) => (
              <div key={s._id} className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-red-100">
                <div className="flex items-center gap-2">
                  <Avatar name={s.name} size="sm" />
                  <div>
                    <p className="text-sm font-medium text-gray-800">{s.name}</p>
                    <p className="text-xs text-gray-400">{s.company}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-sm font-bold px-2 py-0.5 rounded-full ${getGradeBadgeColor(s.avgScore)}`}>
                    {formatScore(s.avgScore)}/100
                  </span>
                  <Link to={`/institution/students/${s._id}/logbook`} className="text-xs text-red-600 hover:underline font-medium">
                    Review →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Main row ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

        {/* Student table — 2/3 */}
        <div className="md:col-span-2 bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-800">All Students</h2>
            <Link to="/institution/students" className="text-xs text-blue-600 hover:underline">View all</Link>
          </div>

          {students.length === 0 ? (
            <EmptyState title="No students assigned" description="Students will appear here once assigned to your profile." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-gray-400 font-medium border-b border-gray-100">
                    <th className="text-left pb-3 pr-3">Student</th>
                    <th className="text-left pb-3 pr-3 hidden sm:table-cell">Company</th>
                    <th className="text-center pb-3 px-2">Today</th>
                    <th className="text-center pb-3 px-2">Attend.</th>
                    <th className="text-center pb-3 px-2">Logbook</th>
                    <th className="text-center pb-3 px-2">Score</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {students.map((s, i) => (
                    <tr key={s._id} className="hover:bg-gray-50 group">
                      <td className="py-3 pr-3">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-300 w-4 shrink-0">{i + 1}</span>
                          <Avatar name={s.name} size="sm" />
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-800 truncate">{s.name}</p>
                            <p className="text-xs text-gray-400">{s.matricNumber}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 pr-3 hidden sm:table-cell">
                        <p className="text-xs text-gray-500 truncate max-w-[120px]">{s.company || <span className="text-amber-500">Pending</span>}</p>
                      </td>
                      <td className="py-3 px-2 text-center">
                        <span className={`text-sm font-medium ${s.checkedInToday ? 'text-green-600' : 'text-red-400'}`}>
                          {s.checkedInToday ? '✓' : '✗'}
                        </span>
                      </td>
                      <td className="py-3 px-2">
                        <div className="w-16">
                          <MiniBar value={s.attendanceRate} max={100}
                            color={s.attendanceRate >= 80 ? 'bg-green-500' : s.attendanceRate >= 60 ? 'bg-yellow-400' : 'bg-red-400'}
                          />
                        </div>
                      </td>
                      <td className="py-3 px-2">
                        <div className="w-16">
                          <MiniBar value={s.logbookRate} max={100}
                            color={s.logbookRate === 100 ? 'bg-green-500' : s.logbookRate > 0 ? 'bg-yellow-400' : 'bg-red-400'}
                          />
                        </div>
                      </td>
                      <td className="py-3 px-2 text-center">
                        {s.avgScore != null ? (
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${getGradeBadgeColor(s.avgScore)}`}>
                            {formatScore(s.avgScore)}
                          </span>
                        ) : <span className="text-xs text-gray-300">—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right column — 1/3 */}
        <div className="space-y-4">

          {/* Top performers */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-800">Top Performers</h2>
              <Link to="/institution/leaderboard" className="text-xs text-blue-600 hover:underline">Full board</Link>
            </div>
            {topThree.filter((s) => s.avgScore != null).length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-4">No grades yet</p>
            ) : (
              <div className="space-y-3">
                {topThree.filter((s) => s.avgScore != null).map((s, i) => (
                  <div key={s._id} className="flex items-center gap-3">
                    <span className="text-base font-bold w-6 shrink-0">
                      {i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'}
                    </span>
                    <Avatar name={s.name} size="sm" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{s.name}</p>
                      <p className="text-xs text-gray-400">{getGradeClassification(s.avgScore)}</p>
                    </div>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full shrink-0 ${getGradeBadgeColor(s.avgScore)}`}>
                      {formatScore(s.avgScore)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Messages */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-800">Messages</h2>
              {conversations.filter((c) => (c.unreadCount?.institutionSupervisor ?? 0) > 0).length > 0 && (
                <span className="bg-red-500 text-white text-xs rounded-full px-2 py-0.5 font-semibold">
                  {conversations.filter((c) => (c.unreadCount?.institutionSupervisor ?? 0) > 0).length} new
                </span>
              )}
            </div>

            {conversations.length === 0 ? (
              <EmptyState title="No messages" description="Conversations with industry supervisors appear here." />
            ) : (
              <div className="space-y-2">
                {conversations.map((conv) => {
                  const other   = conv.industrySupervisor;
                  const isUnread = (conv.unreadCount?.institutionSupervisor ?? 0) > 0;
                  return (
                    <Link
                      key={conv._id}
                      to={`/institution/messages/${conv._id}`}
                      className={`block p-3 rounded-xl transition-colors hover:bg-gray-50 ${isUnread ? 'bg-blue-50' : ''}`}
                    >
                      <div className="flex justify-between gap-2">
                        <p className="text-xs font-semibold text-gray-700 truncate">
                          {other ? `${other.firstName} ${other.lastName}` : 'Industry Supervisor'}
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
              to="/institution/messages"
              className="mt-3 block text-center text-sm text-blue-600 font-medium border border-blue-200 rounded-lg py-2 hover:bg-blue-50 transition-colors"
            >
              Open Messages
            </Link>
          </div>

        </div>
      </div>

      {/* ── Live Attendance Feed ── */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-gray-800">Attendance Activity</h2>
          <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">Live · 30s refresh</span>
        </div>
        {attendanceFeed.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">No check-in activity yet.</p>
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
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
};

export default InstitutionDashboard;
