const {
  suggestUniversities,
  suggestDepartments,
  suggestCompanies,
  suggestStates,
  suggestLGAs,
  searchStudents,
} = require('../services/search.service');
const asyncHandler = require('../utils/asyncHandler');

// GET /api/search/universities?q=...
exports.universities = asyncHandler(async (req, res) => {
  const { q = '' } = req.query;
  const results = await suggestUniversities(q);
  res.json({ success: true, data: results });
});

// GET /api/search/departments?q=...
exports.departments = asyncHandler(async (req, res) => {
  const { q = '' } = req.query;
  const results = await suggestDepartments(q);
  res.json({ success: true, data: results });
});

// GET /api/search/states?q=...
exports.states = asyncHandler(async (req, res) => {
  const { q = '' } = req.query;
  const results = suggestStates(q);
  res.json({ success: true, data: results });
});

// GET /api/search/lgas?q=...&state=...
exports.lgas = asyncHandler(async (req, res) => {
  const { q = '', state = '' } = req.query;
  const results = suggestLGAs(q, state);
  res.json({ success: true, data: results });
});

// GET /api/search/companies?q=...
exports.companies = asyncHandler(async (req, res) => {
  const { q = '' } = req.query;
  const results = await suggestCompanies(q);
  res.json({ success: true, data: results });
});

// GET /api/search/students?q=...   (supervisors only)
exports.students = asyncHandler(async (req, res) => {
  const { q = '' } = req.query;
  const results = await searchStudents(q);
  res.json({ success: true, data: results });
});
