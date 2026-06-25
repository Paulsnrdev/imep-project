import { NavLink } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import { ROLES } from '../../utils/roles';

const navByRole = {
  [ROLES.STUDENT]: [
    { label: 'Home',    path: '/student/dashboard' },
    { label: 'Logbook', path: '/student/logbook' },
    { label: 'Attend.', path: '/student/attendance' },
    { label: 'Grades',  path: '/student/grades' },
    { label: 'Msgs',    path: '/student/messages' },
  ],
  [ROLES.INDUSTRY_SUPERVISOR]: [
    { label: 'Home',     path: '/industry/dashboard' },
    { label: 'Students', path: '/industry/students' },
    { label: 'Grading',  path: '/industry/grading' },
    { label: 'Messages', path: '/industry/messages' },
    { label: 'Profile',  path: '/industry/profile' },
  ],
  [ROLES.INSTITUTION_SUPERVISOR]: [
    { label: 'Home',     path: '/institution/dashboard' },
    { label: 'Students', path: '/institution/students' },
    { label: 'Assign',   path: '/institution/assign' },
    { label: 'Messages', path: '/institution/messages' },
    { label: 'Profile',  path: '/institution/profile' },
  ],
};

const MobileNav = () => {
  const { role } = useAuth();
  const items = navByRole[role] ?? [];

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex z-30">
      {items.map((item) => (
        <NavLink
          key={item.path}
          to={item.path}
          className={({ isActive }) =>
            `flex-1 flex flex-col items-center py-2 text-xs font-medium
            ${isActive ? 'text-blue-600' : 'text-gray-500'}`
          }
        >
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
};

export default MobileNav;
