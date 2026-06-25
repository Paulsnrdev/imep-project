const ErrorAlert = ({ message, onDismiss }) => {
  if (!message) return null;
  return (
    <div className="flex items-start gap-3 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
      <span className="mt-0.5 shrink-0">&#9888;</span>
      <span className="flex-1">{message}</span>
      {onDismiss && (
        <button onClick={onDismiss} className="shrink-0 text-red-400 hover:text-red-600">&times;</button>
      )}
    </div>
  );
};

export default ErrorAlert;
