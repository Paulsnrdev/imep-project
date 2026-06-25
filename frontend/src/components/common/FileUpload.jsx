import { useRef } from 'react';

const FileUpload = ({ label, name, onChange, accept, error, currentUrl }) => {
  const inputRef = useRef(null);

  return (
    <div className="flex flex-col gap-1">
      {label && <label className="text-sm font-medium text-gray-700">{label}</label>}
      <div
        onClick={() => inputRef.current?.click()}
        className={`
          border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition
          hover:border-blue-400 hover:bg-blue-50
          ${error ? 'border-red-400' : 'border-gray-300'}
        `}
      >
        <input ref={inputRef} type="file" name={name} onChange={onChange} accept={accept} className="hidden" />
        <p className="text-sm text-gray-500">
          {currentUrl ? 'File uploaded. Click to replace.' : 'Click to select file'}
        </p>
        {accept && <p className="text-xs text-gray-400 mt-1">Accepted: {accept}</p>}
      </div>
      {currentUrl && (
        <a href={currentUrl} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline">
          View current file
        </a>
      )}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
};

export default FileUpload;
