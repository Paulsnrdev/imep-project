// Client-side time-lock check (informational only — backend is source of truth)

const WAT_OFFSET_MS = 60 * 60 * 1000; // UTC+1

const getNowWAT = () => {
  const now = new Date();
  return new Date(now.getTime() + now.getTimezoneOffset() * 60000 + WAT_OFFSET_MS);
};

export const isWeekEditable = (weekStartDate, weekEndDate, isLocked) => {
  if (isLocked) return false;

  const now = getNowWAT();
  const open = new Date(weekStartDate);
  open.setHours(7, 30, 0, 0);

  const close = new Date(weekEndDate);
  close.setHours(21, 0, 0, 0);

  return now >= open && now <= close;
};

export const getEditWindowLabel = (weekStartDate, weekEndDate) => {
  const open = new Date(weekStartDate);
  open.setHours(7, 30, 0, 0);
  const close = new Date(weekEndDate);
  close.setHours(21, 0, 0, 0);
  return {
    opens: open.toLocaleString('en-NG'),
    closes: close.toLocaleString('en-NG'),
  };
};

export const isLateArrival = (checkInTime) => {
  const t = new Date(checkInTime);
  return t.getHours() > 9 || (t.getHours() === 9 && t.getMinutes() > 0);
};

export const isEarlyDeparture = (checkOutTime) => {
  const t = new Date(checkOutTime);
  return t.getHours() < 16;
};
