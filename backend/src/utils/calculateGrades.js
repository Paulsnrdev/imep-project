const { DAYS_OF_WEEK, GRADE_WEIGHTS } = require('./constants');

/**
 * Attendance score out of 20.
 * Each present/late day = 4 pts (5 days × 4 = 20).
 * Late arrival deducts 1 pt per occurrence.
 */
const calcAttendanceScore = (attendanceRecords = []) => {
  let score = 0;
  for (const record of attendanceRecords) {
    if (record.status === 'present') score += 4;
    else if (record.status === 'late')  score += 3;
    else if (record.status === 'half_day') score += 2;
  }
  return Math.min(score, GRADE_WEIGHTS.ATTENDANCE);
};

/**
 * Logbook score out of 30.
 * Each submitted day = 6 pts (5 days × 6 = 30).
 */
const calcLogbookScore = (dailyEntries = []) => {
  const submitted = dailyEntries.filter((e) => DAYS_OF_WEEK.includes(e.dayOfWeek)).length;
  const perDay    = GRADE_WEIGHTS.LOGBOOK / DAYS_OF_WEEK.length;
  return Math.min(submitted * perDay, GRADE_WEIGHTS.LOGBOOK);
};

/**
 * Combined system score out of 50.
 */
const calcSystemScore = (attendanceRecords, dailyEntries) => {
  const attendanceScore = calcAttendanceScore(attendanceRecords);
  const logbookScore    = calcLogbookScore(dailyEntries);
  return { attendanceScore, logbookScore, systemScore: attendanceScore + logbookScore };
};

module.exports = { calcAttendanceScore, calcLogbookScore, calcSystemScore };
