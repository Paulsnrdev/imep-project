const User                          = require('../models/user');
const StudentProfile                = require('../models/StudentProfile');
const InstitutionSupervisorProfile  = require('../models/InstitutionSupervisorProfile');
const IndustrySupervisorProfile     = require('../models/IndustrySupervisorProfile');
const NIGERIA_STATES_LGAS           = require('../data/nigeria-states-lgas');
const NIGERIA_UNIVERSITIES          = require('../data/nigeria-universities');
const NIGERIA_DEPARTMENTS           = require('../data/nigeria-departments');
const NIGERIA_COMPANIES             = require('../data/nigeria-companies');

const LIMIT = 10;

const STATE_NAMES = Object.keys(NIGERIA_STATES_LGAS).sort();
const ALL_LGAS    = [...new Set(Object.values(NIGERIA_STATES_LGAS).flat())].sort();

// Build case-insensitive prefix regex for auto-suggest
const prefixRegex = (q) => ({ $regex: `^${q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, $options: 'i' });

// Merge master-list matches with DB matches, deduplicate, cap at LIMIT.
// Master list goes first so known/standard names always appear.
const mergeResults = (fromMaster, fromDB) => {
  const seen = new Set(fromMaster.map((s) => s.toLowerCase()));
  const extra = fromDB.filter((s) => !seen.has(s.toLowerCase()));
  return [...fromMaster, ...extra].slice(0, LIMIT);
};

// Search a sorted string array: startsWith matches first, then contains matches.
const searchList = (list, q, limit = LIMIT) => {
  if (!q) return list.slice(0, limit);
  const qLow = q.toLowerCase();
  const starts   = list.filter((s) => s.toLowerCase().startsWith(qLow));
  const contains = list.filter((s) => !s.toLowerCase().startsWith(qLow) && s.toLowerCase().includes(qLow));
  return [...starts, ...contains].slice(0, limit);
};

// ── University auto-suggest ───────────────────────────────────────────────────

const suggestUniversities = async (q) => {
  const fromMaster = searchList(NIGERIA_UNIVERSITIES, q);

  // Also pull any user-entered university not in the master list
  if (q && q.length >= 2) {
    const [fromStudents, fromSupervisors] = await Promise.all([
      StudentProfile.distinct('university', { university: prefixRegex(q) }),
      InstitutionSupervisorProfile.distinct('university', { university: prefixRegex(q) }),
    ]);
    return mergeResults(fromMaster, [...fromStudents, ...fromSupervisors]);
  }

  return fromMaster;
};

// ── Department auto-suggest ───────────────────────────────────────────────────

const suggestDepartments = async (q) => {
  const fromMaster = searchList(NIGERIA_DEPARTMENTS, q);

  if (q && q.length >= 2) {
    const [fromStudents, fromSupervisors] = await Promise.all([
      StudentProfile.distinct('department', { department: prefixRegex(q) }),
      InstitutionSupervisorProfile.distinct('department', { department: prefixRegex(q) }),
    ]);
    return mergeResults(fromMaster, [...fromStudents, ...fromSupervisors]);
  }

  return fromMaster;
};

// ── Company / internship place auto-suggest ───────────────────────────────────

const suggestCompanies = async (q) => {
  const fromMaster = searchList(NIGERIA_COMPANIES, q);

  if (q && q.length >= 2) {
    const fromDB = await IndustrySupervisorProfile.distinct('company', { company: prefixRegex(q) });
    return mergeResults(fromMaster, fromDB);
  }

  return fromMaster;
};

// ── State auto-suggest — uses master Nigeria state list ───────────────────────

const suggestStates = (q) => {
  if (!q) return STATE_NAMES.slice(0, LIMIT);
  const qLow = q.toLowerCase();
  return STATE_NAMES.filter((s) => s.toLowerCase().startsWith(qLow)).slice(0, LIMIT);
};

// ── LGA auto-suggest — filters by state from master Nigeria LGA list ─────────

const suggestLGAs = (q, state) => {
  let pool = ALL_LGAS;
  if (state) {
    const stateKey = STATE_NAMES.find((s) => s.toLowerCase() === state.trim().toLowerCase());
    if (stateKey) pool = NIGERIA_STATES_LGAS[stateKey];
  }

  if (!q) return pool.slice(0, LIMIT);
  const qLow = q.toLowerCase();
  return pool.filter((l) => l.toLowerCase().startsWith(qLow)).slice(0, LIMIT);
};

// ── Student search (by name or matric number) — used by supervisors ───────────

const searchStudents = async (q) => {
  if (!q || q.length < 2) return [];

  const profilesByMatric = await StudentProfile.find({ matricNumber: prefixRegex(q) })
    .select('user matricNumber university department')
    .lean();

  const words = q.trim().split(/\s+/);
  const userQuery = words.length > 1
    ? {
        role: 'student',
        $or: [
          { firstName: prefixRegex(words[0]), lastName: prefixRegex(words[1]) },
          { firstName: prefixRegex(q) },
          { lastName:  prefixRegex(q) },
        ],
      }
    : {
        role: 'student',
        $or: [{ firstName: prefixRegex(q) }, { lastName: prefixRegex(q) }],
      };

  const users = await User.find(userQuery)
    .select('firstName lastName email profileImage')
    .limit(LIMIT)
    .lean();

  const profileMap = await StudentProfile.find({ user: { $in: users.map((u) => u._id) } })
    .select('user matricNumber university department')
    .lean()
    .then((ps) => ps.reduce((m, p) => { m[p.user.toString()] = p; return m; }, {}));

  const fromUsers = users.map((u) => ({
    _id:          u._id,
    firstName:    u.firstName,
    lastName:     u.lastName,
    email:        u.email,
    profileImage: u.profileImage,
    matricNumber: profileMap[u._id.toString()]?.matricNumber,
    university:   profileMap[u._id.toString()]?.university,
    department:   profileMap[u._id.toString()]?.department,
  }));

  const extraUsers = await User.find({ _id: { $in: profilesByMatric.map((p) => p.user) } })
    .select('firstName lastName email profileImage')
    .lean();

  const fromMatric = extraUsers.map((u) => {
    const prof = profilesByMatric.find((p) => p.user.toString() === u._id.toString());
    return {
      _id:          u._id,
      firstName:    u.firstName,
      lastName:     u.lastName,
      email:        u.email,
      profileImage: u.profileImage,
      matricNumber: prof?.matricNumber,
      university:   prof?.university,
      department:   prof?.department,
    };
  });

  const seen = new Set();
  const combined = [...fromUsers, ...fromMatric].filter((s) => {
    const id = s._id.toString();
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });

  return combined.slice(0, LIMIT);
};

module.exports = {
  suggestUniversities,
  suggestDepartments,
  suggestCompanies,
  suggestStates,
  suggestLGAs,
  searchStudents,
};
