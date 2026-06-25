import { useState, useRef, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, Link } from 'react-router-dom';
import { toggleSidebar, toggleMobileSidebar } from '../../features/ui/uiSlice';
import { selectUnreadCount } from '../../features/notifications/notificationSlice';
import { selectUnreadTotal } from '../../features/messaging/messagingSlice';
import { logoutThunk } from '../../features/auth/authThunks';
import useAuth from '../../hooks/useAuth';
import Avatar from '../common/Avatar';
import { getRoleDisplayName } from '../../utils/roles';

const getRoleProfilePath = (role) => ({
  student:                '/student/profile',
  industry_supervisor:    '/industry/profile',
  institution_supervisor: '/institution/profile',
}[role] ?? null);

const getRoleSecurityPath = (role) => ({
  student:                '/student/security',
  industry_supervisor:    '/industry/security',
  institution_supervisor: '/institution/security',
}[role] ?? null);

const IconUser = () => (
  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
);

const IconShield = () => (
  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
  </svg>
);

const IconSignOut = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
  </svg>
);

const IconChevron = () => (
  <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
  </svg>
);

const Header = () => {
  const dispatch    = useDispatch();
  const navigate    = useNavigate();
  const { user, role } = useAuth();
  const notifUnread = useSelector(selectUnreadCount);
  const msgUnread   = useSelector(selectUnreadTotal);

  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

  const profilePath  = getRoleProfilePath(role);
  const securityPath = getRoleSecurityPath(role);
  const fullName     = `${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim();

  useEffect(() => {
    const onOutsideClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onOutsideClick);
    return () => document.removeEventListener('mousedown', onOutsideClick);
  }, []);

  const handleLogout = async () => {
    setOpen(false);
    await dispatch(logoutThunk());
    navigate('/login');
  };

  return (
    <header className="bg-white border-b border-gray-200 h-14 flex items-center px-4 gap-4 sticky top-0 z-30">
      {/* Mobile: opens the drawer overlay */}
      <button
        onClick={() => dispatch(toggleMobileSidebar())}
        className="lg:hidden text-gray-500 hover:text-gray-700"
        aria-label="Open menu"
      >
        &#9776;
      </button>
      {/* Desktop: collapses/expands the sidebar rail */}
      <button
        onClick={() => dispatch(toggleSidebar())}
        className="hidden lg:block text-gray-500 hover:text-gray-700"
        aria-label="Toggle sidebar"
      >
        &#9776;
      </button>

      <span className="font-semibold text-blue-600 text-base lg:hidden">IMEP</span>

      <div className="ml-auto flex items-center gap-3">
        {/* Notification bell */}
        <button className="relative text-gray-500 hover:text-gray-700 p-1" aria-label="Notifications">
          &#128276;
          {notifUnread > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
              {notifUnread > 9 ? '9+' : notifUnread}
            </span>
          )}
        </button>

        {msgUnread > 0 && (
          <span className="text-xs bg-blue-600 text-white rounded-full px-2 py-0.5">
            {msgUnread} msg
          </span>
        )}

        {/* Profile dropdown */}
        <div ref={menuRef} className="relative">
          <button
            onClick={() => setOpen((o) => !o)}
            className="flex items-center gap-2 rounded-lg hover:bg-gray-50 px-2 py-1 transition-colors"
            aria-haspopup="true"
            aria-expanded={open}
          >
            <Avatar src={user?.profileImage} name={fullName} size="sm" />
            <div className="hidden lg:block text-left">
              <p className="text-sm font-medium text-gray-800 leading-tight">{fullName}</p>
              <p className="text-xs text-gray-400">{getRoleDisplayName(role)}</p>
            </div>
            <span className="hidden lg:block"><IconChevron /></span>
          </button>

          {open && (
            <div className="absolute right-0 top-11 bg-white border border-gray-200 rounded-xl shadow-xl w-60 z-50 overflow-hidden">
              {/* User identity header */}
              <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
                <Avatar src={user?.profileImage} name={fullName} size="md" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-800 truncate">{fullName}</p>
                  <p className="text-xs text-gray-400 truncate">{user?.email}</p>
                </div>
              </div>

              {/* Nav links */}
              {(profilePath || securityPath) && (
                <div className="py-1">
                  {profilePath && (
                    <Link
                      to={profilePath}
                      onClick={() => setOpen(false)}
                      className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      <IconUser />
                      Profile
                    </Link>
                  )}
                  {securityPath && (
                    <Link
                      to={securityPath}
                      onClick={() => setOpen(false)}
                      className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      <IconShield />
                      Security
                    </Link>
                  )}
                </div>
              )}

              {/* Sign out */}
              <div className="border-t border-gray-100 py-1">
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                >
                  <IconSignOut />
                  Sign out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
