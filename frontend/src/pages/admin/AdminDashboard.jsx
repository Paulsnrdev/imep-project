import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import Avatar from '../../components/common/Avatar';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import Spinner from '../../components/common/Spinner';
import EmptyState from '../../components/common/EmptyState';
import Modal from '../../components/common/Modal';
import { getRoleDisplayName } from '../../utils/roles';
import { formatDate } from '../../utils/formatDate';

// --- Stat card ----------------------------------------------------------------

const StatCard = ({ label, value, accent = 'blue' }) => {
  const colors = {
    blue:   'bg-blue-50 border-blue-100 text-blue-700',
    green:  'bg-green-50 border-green-100 text-green-700',
    purple: 'bg-purple-50 border-purple-100 text-purple-700',
    yellow: 'bg-yellow-50 border-yellow-100 text-yellow-700',
    gray:   'bg-gray-50 border-gray-200 text-gray-700',
    red:    'bg-red-50 border-red-100 text-red-700',
  };
  return (
    <div className={`rounded-xl border p-4 ${colors[accent]}`}>
      <p className="text-xs font-semibold uppercase tracking-wide opacity-70">{label}</p>
      <p className="text-3xl font-bold mt-1">{value ?? '—'}</p>
    </div>
  );
};

// --- Role badge variant -------------------------------------------------------

const roleBadge = (role) => {
  const map = {
    student:                { label: 'Student',         variant: 'blue'   },
    industry_supervisor:    { label: 'Industry Sup.',   variant: 'purple' },
    institution_supervisor: { label: 'Institution Sup.', variant: 'yellow' },
    admin:                  { label: 'Admin',            variant: 'gray'  },
  };
  return map[role] ?? { label: role, variant: 'gray' };
};

// --- Main ---------------------------------------------------------------------

const ROLES_FILTER = [
  { value: '', label: 'All Roles' },
  { value: 'student', label: 'Students' },
  { value: 'industry_supervisor', label: 'Industry Supervisors' },
  { value: 'institution_supervisor', label: 'Institution Supervisors' },
  { value: 'admin', label: 'Admins' },
];

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [stats,       setStats]       = useState(null);
  const [users,       setUsers]       = useState([]);
  const [pagination,  setPagination]  = useState({ total: 0, page: 1, pages: 1 });
  const [loading,     setLoading]     = useState(true);
  const [tableLoading, setTableLoading] = useState(false);
  const [search,      setSearch]      = useState('');
  const [roleFilter,  setRoleFilter]  = useState('');
  const [page,        setPage]        = useState(1);

  // Detail modal (kept for quick-view; full edit goes to detail page)
  const [selectedUser, setSelectedUser] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailData,   setDetailData]  = useState(null);

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting,     setDeleting]    = useState(false);

  // Sync logbook
  const [syncing, setSyncing] = useState(null);
  const [apiError, setApiError] = useState(null);

  // -- Fetch stats -------------------------------------------------------------
  useEffect(() => {
    api.get('/admin/stats')
      .then(({ data }) => setStats(data.data))
      .catch(() => {/* silent · stats are non-critical */});
  }, []);

  // -- Fetch users -------------------------------------------------------------
  const fetchUsers = useCallback(async (p = page) => {
    setTableLoading(true);
    try {
      const params = new URLSearchParams({ page: p, limit: 15 });
      if (search)     params.set('search', search);
      if (roleFilter) params.set('role', roleFilter);
      const { data } = await api.get(`/admin/users?${params}`);
      setUsers(data.data);
      setPagination(data.pagination);
      setApiError(null);
    } catch {
      setApiError('Failed to load users. Please refresh the page.');
    } finally {
      setTableLoading(false);
      setLoading(false);
    }
  }, [page, search, roleFilter]);

  useEffect(() => { fetchUsers(page); }, [page]);

  // reset to page 1 when filters change
  const handleSearch = (e) => {
    setSearch(e.target.value);
    setPage(1);
  };
  const handleRoleFilter = (e) => {
    setRoleFilter(e.target.value);
    setPage(1);
  };

  useEffect(() => {
    if (page === 1) fetchUsers(1);
  }, [search, roleFilter]);

  // -- Toggle active ------------------------------------------------------------
  const handleToggleActive = async (userId) => {
    try {
      const { data } = await api.patch(`/admin/users/${userId}/toggle-active`);
      setUsers((prev) => prev.map((u) => u._id === userId ? { ...u, isActive: data.data.isActive } : u));
      if (detailData?.user?._id === userId) {
        setDetailData((prev) => ({ ...prev, user: { ...prev.user, isActive: data.data.isActive } }));
      }
    } catch {/* silent */}
  };

  // -- Delete -------------------------------------------------------------------
  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/admin/users/${deleteTarget._id}`);
      setUsers((prev) => prev.filter((u) => u._id !== deleteTarget._id));
      setStats((prev) => prev ? { ...prev, totalUsers: prev.totalUsers - 1 } : prev);
      setDeleteTarget(null);
      if (selectedUser?._id === deleteTarget._id) setSelectedUser(null);
    } catch {/* silent */}
    finally { setDeleting(false); }
  };

  // -- View detail --------------------------------------------------------------
  const handleViewUser = async (user) => {
    setSelectedUser(user);
    setDetailLoading(true);
    setDetailData(null);
    try {
      const { data } = await api.get(`/admin/users/${user._id}`);
      setDetailData(data.data);
    } catch {/* silent */}
    finally { setDetailLoading(false); }
  };

  // -- Sync logbook -------------------------------------------------------------
  const handleSync = async (userId) => {
    setSyncing(userId);
    try {
      const { data } = await api.post(`/admin/sync-logbook-weeks/${userId}`);
      alert(data.message);
    } catch (err) {
      alert(err.response?.data?.message ?? 'Sync failed.');
    } finally {
      setSyncing(null);
    }
  };

  // -- Recover logbook entries ---------------------------------------------------
  const handleRecover = async (userId) => {
    setSyncing(userId + '_recover');
    try {
      const { data } = await api.post(`/admin/recover-logbook/${userId}`);
      alert(data.message);
    } catch (err) {
      alert(err.response?.data?.message ?? 'Recovery failed.');
    } finally {
      setSyncing(null);
    }
  };

  if (loading) return <Spinner fullScreen />;

  return (
    <div className="p-5 space-y-6 max-w-7xl mx-auto">

      {/* -- Header -- */}
      <div>
        <h1 className="text-xl font-bold text-gray-800">Admin Dashboard</h1>
        <p className="text-sm text-gray-400 mt-0.5">Manage users and oversee platform activity.</p>
      </div>

      {/* -- API Error banner -- */}
      {apiError && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm font-mono">
          {apiError}
        </div>
      )}

      {/* -- Stats -- */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <StatCard label="Total Users"         value={stats.totalUsers}          accent="blue"   />
          <StatCard label="Students"            value={stats.totalStudents}       accent="green"  />
          <StatCard label="Industry Sups."      value={stats.totalIndustry}       accent="purple" />
          <StatCard label="Institution Sups."   value={stats.totalInstitution}    accent="yellow" />
          <StatCard label="Active Internships"  value={stats.activeInternships}   accent="gray"   />
          <StatCard label="Logbook Entries"     value={stats.totalLogbookEntries} accent="red"    />
        </div>
      )}

      {/* -- Filters -- */}
      <div className="flex flex-wrap gap-3 items-center">
        <input
          type="text"
          placeholder="Search name or email·"
          value={search}
          onChange={handleSearch}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 w-64"
        />
        <select
          value={roleFilter}
          onChange={handleRoleFilter}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
        >
          {ROLES_FILTER.map((r) => (
            <option key={r.value} value={r.value}>{r.label}</option>
          ))}
        </select>
        <span className="text-xs text-gray-400 ml-auto">{pagination.total} user{pagination.total !== 1 ? 's' : ''}</span>
      </div>

      {/* -- Table -- */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {tableLoading ? (
          <div className="flex justify-center py-12"><Spinner /></div>
        ) : users.length === 0 ? (
          <EmptyState title="No users found" description="Try adjusting your search or filter." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">User</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Role</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Joined</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {users.map((user) => {
                  const rb = roleBadge(user.role);
                  return (
                    <tr key={user._id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar user={user} size="sm" />
                          <div>
                            <p className="font-medium text-gray-800">{user.firstName} {user.lastName}</p>
                            <p className="text-xs text-gray-400">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge label={rb.label} variant={rb.variant} />
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          label={user.isActive ? 'Active' : 'Inactive'}
                          variant={user.isActive ? 'green' : 'gray'}
                        />
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">
                        {formatDate(user.createdAt)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => navigate(`/admin/users/${user._id}`)}
                            className="text-xs text-blue-600 hover:underline font-medium"
                          >
                            View / Edit
                          </button>
                          <button
                            onClick={() => handleToggleActive(user._id)}
                            className={`text-xs font-medium hover:underline ${user.isActive ? 'text-yellow-600' : 'text-green-600'}`}
                          >
                            {user.isActive ? 'Deactivate' : 'Activate'}
                          </button>
                          {user.role === 'student' && (
                            <>
                              <button
                                onClick={() => handleSync(user._id)}
                                disabled={!!syncing}
                                className="text-xs text-purple-600 hover:underline font-medium disabled:opacity-50"
                              >
                                {syncing === user._id ? 'Syncing·' : 'Sync'}
                              </button>
                              <button
                                onClick={() => handleRecover(user._id)}
                                disabled={!!syncing}
                                className="text-xs text-orange-500 hover:underline font-medium disabled:opacity-50"
                              >
                                {syncing === user._id + '_recover' ? 'Recovering·' : 'Recover'}
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => setDeleteTarget(user)}
                            className="text-xs text-red-500 hover:underline font-medium"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="text-sm text-gray-600 hover:text-gray-900 disabled:opacity-40"
            >
              ? Previous
            </button>
            <span className="text-xs text-gray-400">
              Page {page} of {pagination.pages}
            </span>
            <button
              disabled={page >= pagination.pages}
              onClick={() => setPage((p) => p + 1)}
              className="text-sm text-gray-600 hover:text-gray-900 disabled:opacity-40"
            >
              Next ?
            </button>
          </div>
        )}
      </div>

      {/* -- User detail modal -- */}
      {selectedUser && (
        <Modal
          isOpen={!!selectedUser}
          onClose={() => { setSelectedUser(null); setDetailData(null); }}
          title={`${selectedUser.firstName} ${selectedUser.lastName}`}
          size="lg"
        >
          {detailLoading ? (
            <div className="flex justify-center py-8"><Spinner /></div>
          ) : detailData ? (
            <div className="space-y-4 text-sm">
              {/* Basic info */}
              <div className="flex items-center gap-4">
                <Avatar user={detailData.user} size="lg" />
                <div>
                  <p className="font-semibold text-gray-800">{detailData.user.firstName} {detailData.user.lastName}</p>
                  <p className="text-gray-500">{detailData.user.email}</p>
                  <div className="flex gap-2 mt-1">
                    <Badge label={roleBadge(detailData.user.role).label} variant={roleBadge(detailData.user.role).variant} />
                    <Badge
                      label={detailData.user.isActive ? 'Active' : 'Inactive'}
                      variant={detailData.user.isActive ? 'green' : 'gray'}
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-gray-400 uppercase tracking-wide font-semibold mb-1">Joined</p>
                  <p className="text-gray-700">{formatDate(detailData.user.createdAt)}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-gray-400 uppercase tracking-wide font-semibold mb-1">Last Login</p>
                  <p className="text-gray-700">{detailData.user.lastLogin ? formatDate(detailData.user.lastLogin) : '—'}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-gray-400 uppercase tracking-wide font-semibold mb-1">Onboarding</p>
                  <p className="text-gray-700">{detailData.user.isOnboardingComplete ? 'Complete' : 'Pending'}</p>
                </div>
                {detailData.user.role === 'student' && detailData.profile && (
                  <>
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-gray-400 uppercase tracking-wide font-semibold mb-1">Matric No.</p>
                      <p className="text-gray-700">{detailData.profile.matricNumber ?? '—'}</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-gray-400 uppercase tracking-wide font-semibold mb-1">University</p>
                      <p className="text-gray-700">{detailData.profile.university ?? '—'}</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-gray-400 uppercase tracking-wide font-semibold mb-1">Department</p>
                      <p className="text-gray-700">{detailData.profile.department ?? '—'}</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-gray-400 uppercase tracking-wide font-semibold mb-1">Company</p>
                      <p className="text-gray-700">{detailData.profile.internshipPlace ?? '—'}</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-gray-400 uppercase tracking-wide font-semibold mb-1">Start Date</p>
                      <p className="text-gray-700">{detailData.profile.internshipStartDate ? formatDate(detailData.profile.internshipStartDate) : '—'}</p>
                    </div>
                  </>
                )}
              </div>

              {/* Internship info for students */}
              {detailData.internship && (
                <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-xs space-y-1">
                  <p className="font-semibold text-blue-700 mb-2">Active Internship</p>
                  <p><span className="text-gray-500">Institution Supervisor:</span> {detailData.internship.institutionSupervisor ? `${detailData.internship.institutionSupervisor.firstName} ${detailData.internship.institutionSupervisor.lastName}` : '—'}</p>
                  <p><span className="text-gray-500">Industry Supervisor:</span> {detailData.internship.industrySupervisor ? `${detailData.internship.industrySupervisor.firstName} ${detailData.internship.industrySupervisor.lastName}` : '—'}</p>
                  <p><span className="text-gray-500">Company:</span> {detailData.internship.company ?? '—'}</p>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-2 border-t border-gray-100 flex-wrap">
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => navigate(`/admin/users/${detailData.user._id}`)}
                >
                  View Full Profile / Edit
                </Button>
                <Button
                  size="sm"
                  variant={detailData.user.isActive ? 'secondary' : 'primary'}
                  onClick={() => handleToggleActive(detailData.user._id)}
                >
                  {detailData.user.isActive ? 'Deactivate' : 'Activate'}
                </Button>
                {detailData.user.role === 'student' && (
                  <>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => handleSync(detailData.user._id)}
                      loading={syncing === detailData.user._id}
                    >
                      Sync Logbook
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => handleRecover(detailData.user._id)}
                      loading={syncing === detailData.user._id + '_recover'}
                    >
                      Recover Entries
                    </Button>
                  </>
                )}
                <Button
                  size="sm"
                  variant="danger"
                  onClick={() => { setDeleteTarget(detailData.user); setSelectedUser(null); }}
                >
                  Delete User
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-400 py-4 text-center">Failed to load user details.</p>
          )}
        </Modal>
      )}

      {/* -- Delete confirm modal -- */}
      {deleteTarget && (
        <Modal
          isOpen={!!deleteTarget}
          onClose={() => setDeleteTarget(null)}
          title="Delete User"
        >
          <p className="text-sm text-gray-600 mb-4">
            Permanently delete <strong>{deleteTarget.firstName} {deleteTarget.lastName}</strong>?
            {deleteTarget.role === 'student' && ' All their logbook entries, attendance, and grades will also be removed.'}
            {' '}This cannot be undone.
          </p>
          <div className="flex gap-3">
            <Button variant="danger" onClick={handleDelete} loading={deleting}>
              Yes, Delete
            </Button>
            <Button variant="secondary" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
          </div>
        </Modal>
      )}

    </div>
  );
};

export default AdminDashboard;
