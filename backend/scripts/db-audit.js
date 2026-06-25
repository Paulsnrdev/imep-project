/**
 * One-shot DB audit: lists all students, institution supervisors, and their assignments.
 * Run with: node scripts/db-audit.js
 */
require('dotenv').config();
const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  name:  String,
  email: String,
  role:  String,
}, { strict: false });

const StudentProfileSchema = new mongoose.Schema({
  user:         { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  matricNumber: String,
  department:   String,
  level:        String,
  university:   String,
  state:        String,
  lga:          String,
  allocatedInstitutionSupervisor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { strict: false });

const InstSupSchema = new mongoose.Schema({
  user:       { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  staffId:    String,
  university: String,
  department: String,
  state:      String,
  lga:        String,
}, { strict: false });

const InternshipSchema = new mongoose.Schema({
  student:               { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  institutionSupervisor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  industrySupervisor:    { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  status:                String,
}, { strict: false });

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB\n');

  const User               = mongoose.model('User', UserSchema);
  const StudentProfile     = mongoose.model('StudentProfile', StudentProfileSchema);
  const InstSupProfile     = mongoose.model('InstitutionSupervisorProfile', InstSupSchema);
  const Internship         = mongoose.model('Internship', InternshipSchema);

  // --- Institution Supervisors ---
  const instSups = await InstSupProfile.find({}).populate('user', 'name email').lean();
  console.log('='.repeat(60));
  console.log(`INSTITUTION SUPERVISORS (${instSups.length} registered)`);
  console.log('='.repeat(60));
  instSups.forEach((s, i) => {
    console.log(`\n[${i + 1}] ${s.user?.name || 'N/A'}`);
    console.log(`    Email    : ${s.user?.email || 'N/A'}`);
    console.log(`    User ID  : ${s.user?._id}`);
    console.log(`    Staff ID : ${s.staffId}`);
    console.log(`    University: ${s.university}`);
    console.log(`    Dept     : ${s.department || 'N/A'}`);
    console.log(`    State    : ${s.state || 'N/A'}`);
    console.log(`    LGA      : ${s.lga || 'N/A'}`);
  });

  // --- Students ---
  const students = await StudentProfile.find({})
    .populate('user', 'name email')
    .populate('allocatedInstitutionSupervisor', 'name email')
    .lean();
  console.log('\n' + '='.repeat(60));
  console.log(`STUDENTS (${students.length} registered)`);
  console.log('='.repeat(60));
  students.forEach((s, i) => {
    const sup = s.allocatedInstitutionSupervisor;
    console.log(`\n[${i + 1}] ${s.user?.name || 'N/A'} (${s.matricNumber})`);
    console.log(`    Email      : ${s.user?.email || 'N/A'}`);
    console.log(`    User ID    : ${s.user?._id}`);
    console.log(`    University : ${s.university}`);
    console.log(`    Dept       : ${s.department}`);
    console.log(`    Level      : ${s.level}`);
    console.log(`    State      : ${s.state || 'N/A'}`);
    console.log(`    LGA        : ${s.lga || 'N/A'}`);
    console.log(`    Alloc. Sup : ${sup ? `${sup.name} (${sup.email})` : 'NONE'}`);
  });

  // --- Internships ---
  const internships = await Internship.find({})
    .populate('student', 'name email')
    .populate('institutionSupervisor', 'name email')
    .populate('industrySupervisor', 'name email')
    .lean();
  console.log('\n' + '='.repeat(60));
  console.log(`INTERNSHIPS (${internships.length} records)`);
  console.log('='.repeat(60));
  internships.forEach((inv, i) => {
    console.log(`\n[${i + 1}] Student : ${inv.student?.name || 'N/A'} (${inv.student?.email || 'N/A'})`);
    console.log(`    Inst. Sup: ${inv.institutionSupervisor?.name || 'NONE'} (${inv.institutionSupervisor?.email || ''})`);
    console.log(`    Ind. Sup : ${inv.industrySupervisor?.name || 'not yet assigned'}`);
    console.log(`    Status   : ${inv.status}`);
  });

  // --- Assignment summary: how many students each institution supervisor has ---
  console.log('\n' + '='.repeat(60));
  console.log('INSTITUTION SUPERVISOR LOAD DISTRIBUTION');
  console.log('='.repeat(60));
  const loadMap = {};
  instSups.forEach(s => { loadMap[String(s.user?._id)] = { name: s.user?.name, count: 0 }; });
  internships.forEach(inv => {
    const key = String(inv.institutionSupervisor?._id);
    if (loadMap[key]) loadMap[key].count++;
    else if (key !== 'undefined') loadMap[key] = { name: inv.institutionSupervisor?.name || 'Unknown', count: 1 };
  });
  Object.entries(loadMap).forEach(([id, info]) => {
    console.log(`  ${info.name || id}: ${info.count} student(s)`);
  });

  await mongoose.disconnect();
}

main().catch(err => { console.error(err); process.exit(1); });
