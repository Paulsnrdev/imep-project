import { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';
import { formatDateTime, timeAgo } from '../../utils/formatDate';

const Field = ({ label, value, onChange, type = 'text', hint }) => (
  <div className="flex flex-col gap-1">
    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</label>
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
    />
    {hint && <p className="text-xs text-gray-400">{hint}</p>}
  </div>
);

const Section = ({ title, children }) => (
  <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-4">
    <h2 className="text-base font-semibold text-gray-800 border-b border-gray-100 pb-3">{title}</h2>
    {children}
  </div>
);

const DeviceIcon = ({ isCurrent }) => (
  <svg
    className={`w-4 h-4 ${isCurrent ? 'text-green-600' : 'text-gray-400'}`}
    fill="none" stroke="currentColor" viewBox="0 0 24 24"
  >
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
  </svg>
);

const SecurityPage = () => {
  // ── Change password ────────────────────────────────────────────────────────
  const [pwForm, setPwForm]       = useState({ current: '', next: '', confirm: '' });
  const [pwSaving, setPwSaving]   = useState(false);
  const [pwError, setPwError]     = useState('');
  const [pwSuccess, setPwSuccess] = useState('');

  // ── Sessions ───────────────────────────────────────────────────────────────
  const [sessions, setSessions]           = useState([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [sessionsError, setSessionsError] = useState('');
  const [revoking, setRevoking]           = useState(null);
  const [revokingOthers, setRevokingOthers] = useState(false);

  const loadSessions = useCallback(() => {
    setSessionsLoading(true);
    setSessionsError('');
    api.get('/me/sessions')
      .then(({ data }) => setSessions(data.data.sessions))
      .catch(() => setSessionsError('Failed to load sessions.'))
      .finally(() => setSessionsLoading(false));
  }, []);

  useEffect(() => { loadSessions(); }, [loadSessions]);

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPwError('');
    setPwSuccess('');
    if (pwForm.next !== pwForm.confirm) { setPwError('New passwords do not match.'); return; }
    if (pwForm.next.length < 8) { setPwError('New password must be at least 8 characters.'); return; }
    setPwSaving(true);
    try {
      await api.patch('/me/password', { currentPassword: pwForm.current, newPassword: pwForm.next });
      setPwSuccess('Password changed successfully.');
      setPwForm({ current: '', next: '', confirm: '' });
    } catch (err) {
      setPwError(err.response?.data?.message ?? 'Failed to change password.');
    } finally {
      setPwSaving(false);
    }
  };

  const handleRevokeSession = async (sessionId) => {
    setRevoking(sessionId);
    try {
      await api.delete(`/me/sessions/${sessionId}`);
      setSessions((prev) => prev.filter((s) => s._id !== sessionId));
    } catch {
      setSessionsError('Failed to sign out that session.');
    } finally {
      setRevoking(null);
    }
  };

  const handleRevokeOthers = async () => {
    setRevokingOthers(true);
    try {
      await api.delete('/me/sessions');
      setSessions((prev) => prev.filter((s) => s.isCurrent));
    } catch {
      setSessionsError('Failed to sign out other sessions.');
    } finally {
      setRevokingOthers(false);
    }
  };

  const otherSessions = sessions.filter((s) => !s.isCurrent);

  return (
    <div className="space-y-6 pb-20 lg:pb-0 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Security</h1>
        <p className="text-gray-500 text-sm mt-0.5">Manage your password and active login sessions.</p>
      </div>

      {/* ── Change Password ── */}
      <Section title="Change Password">
        <form onSubmit={handleChangePassword} className="space-y-4">
          <Field
            label="Current Password" type="password"
            value={pwForm.current} onChange={(v) => setPwForm((p) => ({ ...p, current: v }))}
          />
          <Field
            label="New Password" type="password"
            value={pwForm.next} onChange={(v) => setPwForm((p) => ({ ...p, next: v }))}
            hint="At least 8 characters"
          />
          <Field
            label="Confirm New Password" type="password"
            value={pwForm.confirm} onChange={(v) => setPwForm((p) => ({ ...p, confirm: v }))}
          />

          {pwError   && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{pwError}</p>}
          {pwSuccess && <p className="text-sm text-green-600 bg-green-50 border border-green-200 rounded-lg px-3 py-2">{pwSuccess}</p>}

          <button
            type="submit"
            disabled={pwSaving || !pwForm.current || !pwForm.next || !pwForm.confirm}
            className="px-6 py-2.5 bg-gray-800 hover:bg-gray-900 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-50"
          >
            {pwSaving ? 'Changing…' : 'Change Password'}
          </button>
        </form>
      </Section>

      {/* ── Active Sessions ── */}
      <Section title="Active Sessions">
        <p className="text-sm text-gray-500">
          These are devices and browsers currently signed in to your account. Sign out any sessions you don&apos;t recognise.
        </p>

        {sessionsError && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{sessionsError}</p>
        )}

        {otherSessions.length > 1 && (
          <div className="flex justify-end">
            <button
              onClick={handleRevokeOthers}
              disabled={revokingOthers}
              className="text-sm text-red-600 hover:underline disabled:opacity-50 font-medium"
            >
              {revokingOthers ? 'Signing out…' : 'Sign out from all other devices'}
            </button>
          </div>
        )}

        {sessionsLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-6 h-6 border-4 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
          </div>
        ) : sessionsError ? null : sessions.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">No active sessions found.</p>
        ) : (
          <div className="space-y-3">
            {sessions.map((session) => (
              <div
                key={session._id}
                className={`flex items-center justify-between gap-4 p-4 rounded-xl border ${
                  session.isCurrent
                    ? 'border-green-200 bg-green-50'
                    : 'border-gray-100 bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                    session.isCurrent ? 'bg-green-100' : 'bg-gray-200'
                  }`}>
                    <DeviceIcon isCurrent={session.isCurrent} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-800 flex items-center gap-2">
                      {session.deviceInfo}
                      {session.isCurrent && (
                        <span className="text-xs font-semibold text-green-600 bg-green-100 px-2 py-0.5 rounded-full">
                          This device
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-gray-400 truncate">
                      {session.ipAddress ? `${session.ipAddress} · ` : ''}
                      Signed in {formatDateTime(session.createdAt)} · Active {timeAgo(session.lastUsedAt)}
                    </p>
                  </div>
                </div>

                {!session.isCurrent && (
                  <button
                    onClick={() => handleRevokeSession(session._id)}
                    disabled={revoking === session._id}
                    className="text-xs text-red-500 hover:text-red-700 px-3 py-1.5 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50 shrink-0 font-medium"
                  >
                    {revoking === session._id ? 'Signing out…' : 'Sign out'}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </Section>
    </div>
  );
};

export default SecurityPage;
