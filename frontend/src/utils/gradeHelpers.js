export const getLetterGrade = (score) => {
  if (score >= 70) return 'A';
  if (score >= 60) return 'B';
  if (score >= 50) return 'C';
  if (score >= 45) return 'D';
  return 'F';
};

export const getGradeClassification = (score) => {
  if (score >= 70) return 'Distinction';
  if (score >= 60) return 'Credit';
  if (score >= 50) return 'Merit';
  if (score >= 45) return 'Pass';
  return 'Fail';
};

export const getGradeColor = (score) => {
  if (score >= 70) return 'text-green-600';
  if (score >= 60) return 'text-blue-600';
  if (score >= 50) return 'text-yellow-600';
  if (score >= 45) return 'text-orange-500';
  return 'text-red-600';
};

export const getGradeBadgeColor = (score) => {
  if (score >= 70) return 'bg-green-100 text-green-800';
  if (score >= 60) return 'bg-blue-100 text-blue-800';
  if (score >= 50) return 'bg-yellow-100 text-yellow-800';
  if (score >= 45) return 'bg-orange-100 text-orange-800';
  return 'bg-red-100 text-red-800';
};

export const formatScore = (score) => {
  if (score === null || score === undefined) return '—';
  return Number(score).toFixed(1);
};

export const calcProgressPercent = (score, max = 100) => {
  if (!score) return 0;
  return Math.min(Math.round((score / max) * 100), 100);
};
