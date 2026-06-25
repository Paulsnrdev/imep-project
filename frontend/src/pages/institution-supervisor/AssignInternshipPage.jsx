import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import Avatar from '../../components/common/Avatar';

const useDebounce = (value, delay = 400) => {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
};

const AssignInternshipPage = () => {
  const navigate = useNavigate();

  // Students assigned to this supervisor without an industry supervisor
  const [myStudents, setMyStudents]         = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState(null);

  // Industry supervisor search
  const [supervisorQuery, setSupervisorQuery] = useState('');
  const debouncedSupervisor                   = useDebounce(supervisorQuery);
  const [supervisors, setSupervisors]         = useState([]);
  const [loadingSupervisors, setLoadingSupervisors] = useState(false);
  const [selectedSupervisor, setSelectedSupervisor] = useState(null);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError]           = useState('');
  const [success, setSuccess]       = useState(false);

  // Load students auto-assigned to this supervisor (no industry supervisor yet)
  useEffect(() => {
    api.get('/institution/search/students?q=')
      .then(({ data }) => setMyStudents(data.data.students))
      .catch(() => {})
      .finally(() => setLoadingStudents(false));
  }, []);

  // Search industry supervisors
  useEffect(() => {
    if (!debouncedSupervisor) { setSupervisors([]); return; }
    setLoadingSupervisors(true);
    api.get(`/institution/search/supervisors?q=${encodeURIComponent(debouncedSupervisor)}`)
      .then(({ data }) => setSupervisors(data.data.supervisors))
      .catch(() => {})
      .finally(() => setLoadingSupervisors(false));
  }, [debouncedSupervisor]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedStudent || !selectedSupervisor) {
      setError('Please select both a student and an industry supervisor.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await api.post('/institution/internships', {
        studentId:            selectedStudent._id,
        industrySupervisorId: selectedSupervisor._id,
      });
      setSuccess(true);
    } catch (err) {
      setError(err.response?.data?.message ?? 'Failed to link supervisor. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4 text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center text-3xl">✓</div>
        <h2 className="text-xl font-bold text-gray-800">Industry Supervisor Linked!</h2>
        <p className="text-gray-500 text-sm max-w-sm">
          {selectedStudent?.name} is now linked to {selectedSupervisor?.name} at {selectedSupervisor?.company}.
          A conversation thread has been created.
        </p>
        <div className="flex gap-3">
          <button
            onClick={() => {
              setSuccess(false);
              setSelectedStudent(null);
              setSelectedSupervisor(null);
              setSupervisorQuery('');
              // Reload students list
              setLoadingStudents(true);
              api.get('/institution/search/students?q=')
                .then(({ data }) => setMyStudents(data.data.students))
                .catch(() => {})
                .finally(() => setLoadingStudents(false));
            }}
            className="px-4 py-2 border border-purple-600 text-purple-600 rounded-xl text-sm font-medium hover:bg-purple-50"
          >
            Link Another
          </button>
          <button
            onClick={() => navigate('/institution/students')}
            className="px-4 py-2 bg-purple-600 text-white rounded-xl text-sm font-medium hover:bg-purple-700"
          >
            View Students →
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20 lg:pb-0 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Link Industry Supervisor</h1>
        <p className="text-gray-500 text-sm mt-0.5">
          Students are automatically assigned to you based on location. Connect them to their company supervisor here.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">

        {/* Step 1 — Pick a student */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-3">
          <h2 className="font-semibold text-gray-800">1. Select Student</h2>
          <p className="text-xs text-gray-400">These students are assigned to you and awaiting an industry supervisor.</p>

          {loadingStudents ? (
            <div className="flex justify-center py-6">
              <div className="w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : myStudents.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-sm text-gray-400">All your students already have industry supervisors linked.</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-56 overflow-y-auto">
              {myStudents.map((s) => (
                <button
                  key={s._id}
                  type="button"
                  onClick={() => setSelectedStudent(selectedStudent?._id === s._id ? null : s)}
                  className={`w-full text-left flex items-center gap-3 p-3 rounded-xl border transition-colors
                    ${selectedStudent?._id === s._id
                      ? 'border-purple-400 bg-purple-50'
                      : 'border-gray-100 hover:bg-gray-50'}`}
                >
                  <Avatar name={s.name} src={s.profileImage} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-gray-800">{s.name}</p>
                    <p className="text-xs text-gray-400">{s.matricNumber} · {s.university}</p>
                    {s.company && <p className="text-xs text-gray-400 mt-0.5">Company: {s.company}</p>}
                    {s.nominatedSupervisorInfo?.name && (
                      <p className="text-xs text-green-600 mt-0.5 font-medium">
                        Suggests: {s.nominatedSupervisorInfo.name}
                        {s.nominatedSupervisorInfo.company ? ` · ${s.nominatedSupervisorInfo.company}` : ''}
                      </p>
                    )}
                  </div>
                  {selectedStudent?._id === s._id && <span className="text-purple-500 shrink-0">✓</span>}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Step 2 — Search industry supervisor */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-3">
          <h2 className="font-semibold text-gray-800">2. Select Industry Supervisor</h2>

          {/* Student's nomination hint */}
          {selectedStudent?.nominatedSupervisorInfo?.name && !selectedSupervisor && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-3">
              <p className="text-xs font-semibold text-green-700 mb-1">Student Suggestion</p>
              <p className="text-sm font-medium text-gray-800">{selectedStudent.nominatedSupervisorInfo.name}</p>
              {selectedStudent.nominatedSupervisorInfo.company && (
                <p className="text-xs text-gray-500">{selectedStudent.nominatedSupervisorInfo.company}
                  {selectedStudent.nominatedSupervisorInfo.jobTitle ? ` · ${selectedStudent.nominatedSupervisorInfo.jobTitle}` : ''}
                </p>
              )}
              {selectedStudent.nominatedSupervisorInfo.email && (
                <p className="text-xs text-gray-400">{selectedStudent.nominatedSupervisorInfo.email}</p>
              )}
              {selectedStudent.nominatedSupervisorInfo.phone && (
                <p className="text-xs text-gray-400">{selectedStudent.nominatedSupervisorInfo.phone}</p>
              )}
              {selectedStudent.nominatedSupervisorInfo.userId ? (
                <p className="text-xs text-green-600 mt-1 font-medium">Registered on portal — search their name above to select them.</p>
              ) : (
                <p className="text-xs text-amber-600 mt-1">Not registered on portal — search or ask them to register first.</p>
              )}
            </div>
          )}

          {selectedSupervisor ? (
            <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-100 rounded-xl">
              <Avatar name={selectedSupervisor.name} src={selectedSupervisor.profileImage} size="md" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-gray-800">{selectedSupervisor.name}</p>
                <p className="text-xs text-gray-400">{selectedSupervisor.company} · {selectedSupervisor.jobTitle || 'Supervisor'}</p>
              </div>
              <button
                type="button"
                onClick={() => { setSelectedSupervisor(null); setSupervisorQuery(''); setSupervisors([]); }}
                className="text-xs text-red-500 hover:underline shrink-0"
              >
                Change
              </button>
            </div>
          ) : (
            <>
              <input
                type="search"
                placeholder="Search by name or company..."
                value={supervisorQuery}
                onChange={(e) => setSupervisorQuery(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-xl text-sm outline-none focus:ring-2 focus:ring-purple-500"
              />
              {loadingSupervisors && (
                <div className="flex justify-center py-4">
                  <div className="w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                </div>
              )}
              {!loadingSupervisors && supervisors.length > 0 && (
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {supervisors.map((s) => (
                    <button
                      key={s._id}
                      type="button"
                      onClick={() => { setSelectedSupervisor(s); setSupervisors([]); setSupervisorQuery(''); }}
                      className="w-full text-left flex items-center gap-3 p-2.5 rounded-lg hover:bg-gray-50"
                    >
                      <Avatar name={s.name} src={s.profileImage} size="sm" />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-800">{s.name}</p>
                        <p className="text-xs text-gray-400">{s.company} · {s.jobTitle || 'Supervisor'}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
              {!loadingSupervisors && supervisorQuery && supervisors.length === 0 && (
                <p className="text-xs text-gray-400 text-center py-3">No supervisors found for "{supervisorQuery}"</p>
              )}
              {!supervisorQuery && (
                <p className="text-xs text-gray-400 text-center py-3">Type a name or company to search...</p>
              )}
            </>
          )}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-100 rounded-xl p-3">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-400">
            {!selectedStudent && !selectedSupervisor ? 'Select a student and supervisor above' :
             !selectedStudent ? 'Select a student above' :
             !selectedSupervisor ? 'Search and select an industry supervisor' :
             `${selectedStudent.name} → ${selectedSupervisor.name}`}
          </p>
          <button
            type="submit"
            disabled={submitting || !selectedStudent || !selectedSupervisor}
            className="px-6 py-2.5 bg-purple-600 text-white rounded-xl text-sm font-medium hover:bg-purple-700 disabled:opacity-50 transition-colors"
          >
            {submitting ? 'Linking...' : 'Link Supervisor'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AssignInternshipPage;
