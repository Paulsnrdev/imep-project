module.exports = {
  ROLES: {
    STUDENT:                'student',
    INDUSTRY_SUPERVISOR:    'industry_supervisor',
    INSTITUTION_SUPERVISOR: 'institution_supervisor',
  },

  DAYS_OF_WEEK: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],

  ATTENDANCE_STATUS: {
    PRESENT:    'present',
    ABSENT:     'absent',
    LATE:       'late',
    HALF_DAY:   'half_day',
  },

  LOGBOOK_STATUS: {
    OPEN:   'open',
    LOCKED: 'locked',
  },

  GRADE_WEIGHTS: {
    ATTENDANCE: 20,
    LOGBOOK:    30,
    SUPERVISOR: 50,
  },

  TIMELOCK: {
    OPEN_DAY:    1,       // Monday  (moment.js isoWeekday)
    OPEN_HOUR:   7,
    OPEN_MINUTE: 30,
    CLOSE_DAY:   5,       // Friday
    CLOSE_HOUR:  21,
    CLOSE_MINUTE: 0,
  },

  CRON: {
    TIMEZONE:          'Africa/Lagos',
    WEEKLY_LOCK:       '0 21 * * 5',     // Friday  21:00 WAT
    GRADE_CALC:        '1 0 * * 6',      // Saturday 00:01 WAT
    WEEKLY_RESET:      '0 23 * * 0',     // Sunday  23:00 WAT
    REMINDER_SUBMIT:   '0 15 * * 4',     // Thursday 15:00 WAT
    REMINDER_CHECKOUT: '55 23 * * 1-5',  // Mon-Fri  23:55 WAT
    ABSENCE_ALERT:     '5 17 * * 1-5',   // Mon-Fri  17:05 WAT (after both work shifts end)
  },

  FCM: {
    REMINDER_TITLE:       'Logbook Reminder',
    REMINDER_BODY:        'You have not submitted all logbook entries for this week. Deadline is Friday 9 PM.',
    CHECKOUT_TITLE:       'Missing Checkout',
    CHECKOUT_BODY:        'You did not check out today. Please update your attendance record.',
    ABSENCE_SUP_TITLE:    'Student Absence Alert',
    ABSENCE_SUP_BODY:     (name) => `${name} did not check in today.`,
  },

  GEOFENCE_RADIUS_METERS: 200,
  LATE_ARRIVAL_HOUR:      9,
  EARLY_DEPARTURE_HOUR:   16,
};
