/**
 * Counts Monday–Friday working days from startDate up to today
 * (or internship endDate if it has already passed).
 */
const countWorkingDays = (startDate, endDate = null) => {
  if (!startDate) return 0;

  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);

  const today = new Date();
  today.setHours(23, 59, 59, 999);

  let end = today;
  if (endDate) {
    const ed = new Date(endDate);
    ed.setHours(23, 59, 59, 999);
    if (ed < today) end = ed;
  }

  if (start > end) return 0;

  let count = 0;
  const cur = new Date(start);
  while (cur <= end) {
    const d = cur.getDay();
    if (d !== 0 && d !== 6) count++; // skip Sunday(0) and Saturday(6)
    cur.setDate(cur.getDate() + 1);
  }
  return count;
};

module.exports = countWorkingDays;
