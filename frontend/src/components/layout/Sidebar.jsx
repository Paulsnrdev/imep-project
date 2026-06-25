import { NavLink } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { selectSidebarOpen, closeMobileSidebar, selectMobileSidebarOpen } from '../../features/ui/uiSlice';
import useAuth from '../../hooks/useAuth';
import { ROLES } from '../../utils/roles';

const studentNav = [
  { label: 'Dashboard', path: '/student/dashboard', icon: '▪' },
  { label: 'Logbook',   path: '/student/logbook',   icon: '▪' },
  { label: 'Attendance',path: '/student/attendance', icon: '▪' },
  { label: 'Grades',    path: '/student/grades',     icon: '▪' },
  { label: 'Messages',  path: '/student/messages',   icon: '▪' },
  { label: 'Profile',   path: '/student/profile',    icon: '▪' },
];

const industryNav = [
  { label: 'Dashboard', path: '/industry/dashboard', icon: '▪' },
  { label: 'My Students', path: '/industry/students', icon: '▪' },
  { label: 'Grading', path: '/industry/grading', icon: '▪' },
  { label: 'Messages', path: '/industry/messages', icon: '▪' },
  { label: 'Profile', path: '/industry/profile', icon: '▪' },
];

const institutionNav = [
  { label: 'Dashboard',   path: '/institution/dashboard',  icon: '▪' },
  { label: 'My Students', path: '/institution/students',   icon: '▪' },
  { label: 'Assign',      path: '/institution/assign',     icon: '▪' },
  { label: 'Grades',      path: '/institution/grades',     icon: '▪' },
  { label: 'Leaderboard', path: '/institution/leaderboard', icon: '▪' },
  { label: 'Messages',    path: '/institution/messages',   icon: '▪' },
  { label: 'Profile',     path: '/institution/profile',   icon: '▪' },
];

const adminNav = [
  { label: 'Dashboard', path: '/admin/dashboard', icon: '▪' },
];

const navByRole = {
  [ROLES.STUDENT]: studentNav,
  [ROLES.INDUSTRY_SUPERVISOR]: industryNav,
  [ROLES.INSTITUTION_SUPERVISOR]: institutionNav,
  [ROLES.ADMIN]: adminNav,
};

const Sidebar = () => {
  const dispatch = useDispatch();
  const sidebarOpen = useSelector(selectSidebarOpen);
  const mobileSidebarOpen = useSelector(selectMobileSidebarOpen);
  const { role, user } = useAuth();
  const navItems = navByRole[role] ?? [];

  const NavItems = () => (
    <nav className="flex-1 px-3 py-4 space-y-1">
      {navItems.map((item) => (
        <NavLink
          key={item.path}
          to={item.path}
          onClick={() => dispatch(closeMobileSidebar())}
          className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
            ${isActive ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`
          }
        >
          <span>{item.icon}</span>
          {(sidebarOpen || mobileSidebarOpen) && <span>{item.label}</span>}
        </NavLink>
      ))}
    </nav>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className={`hidden lg:flex flex-col bg-white border-r border-gray-200 h-screen sticky top-0 transition-all duration-200 ${sidebarOpen ? 'w-56' : 'w-16'}`}>
        <div className="p-4 border-b border-gray-200">
          {sidebarOpen ? (
            <span className="font-bold text-blue-600 text-lg">IMEP</span>
          ) : (
            <span className="font-bold text-blue-600">I</span>
          )}
        </div>
        <NavItems />
        <div className="p-3 border-t border-gray-200 text-xs text-gray-400">
          {sidebarOpen && user?.firstName}
        </div>
      </aside>

      {/* Mobile drawer */}
      {mobileSidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-40 flex">
          <div className="absolute inset-0 bg-black bg-opacity-40" onClick={() => dispatch(closeMobileSidebar())} />
          <aside className="relative w-56 bg-white h-full flex flex-col shadow-xl">
            <div className="p-4 border-b font-bold text-blue-600 text-lg">IMEP</div>
            <NavItems />
          </aside>
        </div>
      )}
    </>
  );
};

export default Sidebar;
