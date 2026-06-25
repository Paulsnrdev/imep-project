const WAT_OFFSET = 60; // UTC+1 in minutes

export const toWAT = (date) => {
  const d = new Date(date);
  const utc = d.getTime() + d.getTimezoneOffset() * 60000;
  return new Date(utc + WAT_OFFSET * 60000);
};

export const formatDate = (date, options = {}) => {
  if (!date) return '—';
  const d = new Date(date);
  return d.toLocaleDateString('en-NG', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    ...options,
  });
};

export const formatTime = (date) => {
  if (!date) return '—';
  const d = new Date(date);
  return d.toLocaleTimeString('en-NG', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
};

export const formatDateTime = (date) => {
  if (!date) return '—';
  return `${formatDate(date)} ${formatTime(date)}`;
};

export const getDayOfWeek = (date) => {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[new Date(date).getDay()];
};

export const isWeekend = (date) => {
  const day = new Date(date).getDay();
  return day === 0 || day === 6;
};

export const getWeekRange = (startDate) => {
  const start = new Date(startDate);
  const end = new Date(startDate);
  end.setDate(end.getDate() + 4);
  return { start, end };
};

export const timeAgo = (date) => {
  if (!date) return '';
  const seconds = Math.floor((Date.now() - new Date(date)) / 1000);
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
};
