const Internship                    = require('../models/Internship');
const InstitutionSupervisorProfile  = require('../models/InstitutionSupervisorProfile');
const StudentProfile                = require('../models/StudentProfile');
const logger                        = require('../utils/logger');

/**
 * Allocate an institution supervisor to a student using a tiered regional
 * match strategy, then pick the least-loaded supervisor to balance workload.
 *
 * Priority:
 *   1. Supervisors in the same LGA as the student
 *   2. Supervisors in the same state (fallback)
 *   3. Any available supervisor (last resort)
 *
 * Within each tier, the supervisor with the fewest currently allocated
 * students is always chosen, ensuring even load distribution.
 */
const allocateInstitutionSupervisor = async (studentUserId) => {
  try {
    const studentProfile = await StudentProfile.findOne({ user: studentUserId }).lean();
    if (!studentProfile) {
      logger.warn(`[Allocation] StudentProfile not found for user ${studentUserId}`);
      return null;
    }

    const { lga, state } = studentProfile;

    let candidates = [];
    let tier = 0;

    // Tier 1 — same LGA
    if (lga) {
      candidates = await InstitutionSupervisorProfile.find({
        lga: { $regex: `^${lga.trim()}$`, $options: 'i' },
      })
        .select('user')
        .lean();
      if (candidates.length) tier = 1;
    }

    // Tier 2 — same state
    if (!candidates.length && state) {
      candidates = await InstitutionSupervisorProfile.find({
        state: { $regex: `^${state.trim()}$`, $options: 'i' },
      })
        .select('user')
        .lean();
      if (candidates.length) tier = 2;
    }

    // Tier 3 — any supervisor
    if (!candidates.length) {
      candidates = await InstitutionSupervisorProfile.find({}).select('user').lean();
      if (candidates.length) tier = 3;
    }

    if (!candidates.length) {
      logger.warn(`[Allocation] No institution supervisors found; cannot allocate for student ${studentUserId}`);
      return null;
    }

    // Pick the least-loaded supervisor among candidates
    const candidateUserIds = candidates.map((c) => c.user);
    const loadCounts = await StudentProfile.aggregate([
      { $match: { allocatedInstitutionSupervisor: { $in: candidateUserIds } } },
      { $group: { _id: '$allocatedInstitutionSupervisor', count: { $sum: 1 } } },
    ]);
    const loadMap = loadCounts.reduce((m, row) => {
      m[row._id.toString()] = row.count;
      return m;
    }, {});

    const chosen = candidates.reduce((best, c) => {
      const bestLoad = loadMap[best.user.toString()] ?? 0;
      const cLoad    = loadMap[c.user.toString()]    ?? 0;
      return cLoad < bestLoad ? c : best;
    }, candidates[0]);

    // Persist allocation on the student profile
    await StudentProfile.findOneAndUpdate(
      { user: studentUserId },
      { allocatedInstitutionSupervisor: chosen.user }
    );

    logger.info(
      `[Allocation] Student ${studentUserId} → supervisor ${chosen.user} ` +
      `(tier ${tier}, load ${loadMap[chosen.user.toString()] ?? 0})`
    );
    return chosen.user;
  } catch (err) {
    logger.error(`[Allocation] Failed for student ${studentUserId}: ${err.message}`);
    return null;
  }
};

module.exports = { allocateInstitutionSupervisor };
