import { useState, useEffect } from 'react';
import useGeolocation from '../../hooks/useGeolocation';
import { formatTime } from '../../utils/formatDate';
import api from '../../services/api';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
import EmptyState from '../../components/common/EmptyState';
import Spinner from '../../components/common/Spinner';

// ─── Status ring ──────────────────────────────────────────────────────────────

const StatusRing = ({ status }) => {
  const config = {
    idle:       { color: 'border-gray-200',  bg: 'bg-gray-50',    text: 'text-gray-400',  label: 'Not checked in today' },
    checkedIn:  { color: 'border-green-400', bg: 'bg-green-50',   text: 'text-green-600', label: 'Checked In' },
    checkedOut: { color: 'border-blue-400',  bg: 'bg-blue-50',    text: 'text-blue-600',  label: 'Checked Out' },
    locating:   { color: 'border-yellow-400 animate-pulse', bg: 'bg-yellow-50', text: 'text-yellow-600', label: 'Getting location...' },
  };
  const c = config[status] ?? config.idle;
  return (
    <div className={`w-36 h-36 rounded-full border-4 ${c.color} ${c.bg} flex flex-col items-center justify-center mx-auto`}>
      <span className="text-3xl">
        {status === 'idle' ? '📍' : status === 'checkedIn' ? '✅' : status === 'locating' ? '🔄' : '🏁'}
      </span>
      <span className={`text-xs font-semibold mt-2 text-center px-2 leading-tight ${c.text}`}>{c.label}</span>
    </div>
  );
};

// ─── History row ──────────────────────────────────────────────────────────────

const HistoryRow = ({ record }) => {
  const late      = record.checkIn?.isLate;
  const early     = record.checkOut?.isEarlyDeparture;
  const violation = record.violation?.reason;

  return (
    <div className="py-3 border-b border-gray-50 last:border-0">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center shrink-0 text-xs font-bold text-gray-500">
          {new Date(record.date).toLocaleDateString('en-NG', { day: '2-digit', month: 'short' })}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-sm font-medium text-gray-800">
              {new Date(record.date).toLocaleDateString('en-NG', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}
            </span>
            {late  && <Badge label="Late"       variant="yellow" />}
            {early && <Badge label="Early out"  variant="orange" />}
            {record.isGeofenceViolation && <Badge label="Out of zone" variant="red" />}
          </div>
        </div>
        <div className="text-right shrink-0">
          <p className="text-xs font-medium text-gray-700">
            {record.checkIn?.time ? formatTime(record.checkIn.time) : '—'}
            {record.checkOut?.time ? ` → ${formatTime(record.checkOut.time)}` : ' → —'}
          </p>
          {record.checkIn?.time && record.checkOut?.time && (
            <p className="text-xs text-gray-400">
              {((new Date(record.checkOut.time) - new Date(record.checkIn.time)) / 3600000).toFixed(1)}h
            </p>
          )}
        </div>
      </div>
      {violation && (
        <div className="mt-1.5 ml-13 pl-13">
          <p className="text-xs text-gray-400 italic ml-13 pl-[52px]">
            Reason: <span className="text-gray-600 not-italic">{violation}</span>
          </p>
        </div>
      )}
    </div>
  );
};

// ─── Summary card ─────────────────────────────────────────────────────────────

const SummaryCard = ({ summary }) => {
  if (!summary || summary.totalWorkingDays === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <h2 className="font-semibold text-gray-800 mb-3">Attendance Summary</h2>
        <EmptyState title="No attendance data yet" description="Your summary will appear here after your first check-in." />
      </div>
    );
  }

  const rate = summary.attendanceRate ?? 0;
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
      <h2 className="font-semibold text-gray-800 mb-4">Attendance Summary</h2>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
        {[
          { label: 'Present',     value: summary.presentDays,     color: 'text-green-600' },
          { label: 'Absent',      value: summary.absentDays,      color: 'text-red-500' },
          { label: 'Late Arrives',value: summary.lateDays,        color: 'text-yellow-600' },
          { label: 'Early Outs',  value: summary.earlyDepartures, color: 'text-orange-500' },
        ].map((item) => (
          <div key={item.label} className="text-center">
            <p className={`text-2xl font-bold ${item.color}`}>{item.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{item.label}</p>
          </div>
        ))}
      </div>
      <div>
        <div className="flex justify-between mb-1.5">
          <span className="text-xs text-gray-500 font-medium">Attendance Rate</span>
          <span className={`text-xs font-bold ${rate >= 80 ? 'text-green-600' : 'text-red-500'}`}>{rate}%</span>
        </div>
        <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full ${rate >= 80 ? 'bg-green-500' : rate >= 60 ? 'bg-yellow-400' : 'bg-red-400'}`}
            style={{ width: `${rate}%` }}
          />
        </div>
      </div>
      {(summary.averageCheckIn || summary.averageWorkingHours) && (
        <div className="flex gap-4 mt-4 pt-4 border-t border-gray-100">
          {summary.averageCheckIn && (
            <div>
              <p className="text-xs text-gray-400">Avg Check-in</p>
              <p className="text-sm font-semibold text-gray-800">{summary.averageCheckIn}</p>
            </div>
          )}
          {summary.averageWorkingHours && (
            <div>
              <p className="text-xs text-gray-400">Avg Working Hours</p>
              <p className="text-sm font-semibold text-gray-800">{summary.averageWorkingHours}h / day</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ─── Violation reason modal ───────────────────────────────────────────────────

const ViolationModal = ({ isOpen, onClose, onSubmit, violationType, distanceFromOffice, workShift }) => {
  const shift    = workShift || '8-16';
  const [sH, eH] = shift.split('-').map(Number);
  const h12  = (h) => String(h > 12 ? h - 12 : h).padStart(2, '0');
  const ampm = (h) => h < 12 ? 'AM' : 'PM';
  const coH  = eH - 1;
  const endStr             = `${h12(eH)}:00 ${ampm(eH)}`;
  const checkInDeadlineStr = `${h12(sH)}:30 ${ampm(sH)}`;
  const checkOutEarliestStr = `${h12(coH)}:30 ${ampm(coH)}`;
  const [reason, setReason]       = useState('');
  const [reasonErr, setReasonErr] = useState('');

  const handleSubmit = () => {
    if (!reason.trim()) { setReasonErr('Please provide a reason.'); return; }
    onSubmit(reason.trim());
    setReason('');
    setReasonErr('');
  };

  const handleClose = () => { setReason(''); setReasonErr(''); onClose(); };

  const isLate      = violationType === 'late_checkin';
  const isGeofence  = violationType === 'geofence';
  const isEarly     = violationType === 'early_checkout';

  const title = isLate
    ? 'Late Arrival — Reason Required'
    : isGeofence
    ? 'Outside Workplace — Reason Required'
    : 'Early Departure — Reason Required';

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={title} size="sm">
      <div className="space-y-4">
        {isLate && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2 text-sm text-yellow-700">
            Expected check-in is by <strong>{checkInDeadlineStr}</strong> (30 min grace). You are checking in late.
          </div>
        )}
        {isGeofence && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-700">
            You are <strong>{distanceFromOffice}m</strong> from your workplace (limit: 200m).
          </div>
        )}
        {isEarly && (
          <div className="bg-orange-50 border border-orange-200 rounded-lg px-3 py-2 text-sm text-orange-700">
            Expected closing time is <strong>{endStr}</strong> (30 min grace). You are checking out early.
          </div>
        )}
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">
            Reason <span className="text-red-500">*</span>
          </label>
          <textarea
            value={reason}
            onChange={(e) => { setReason(e.target.value); setReasonErr(''); }}
            placeholder={
              isLate ? 'e.g. Traffic on the way to work...'
              : isGeofence ? 'e.g. Working from client office today...'
              : 'e.g. Family emergency...'
            }
            rows={3}
            className={`w-full px-3 py-2 border rounded-lg text-sm outline-none resize-none
              focus:ring-2 focus:ring-blue-500 ${reasonErr ? 'border-red-400' : 'border-gray-300'}`}
          />
          {reasonErr && <p className="text-xs text-red-500">{reasonErr}</p>}
        </div>
        <p className="text-xs text-gray-400">
          This reason will be recorded and visible to your supervisors.
        </p>
        <div className="flex gap-2 justify-end">
          <Button variant="secondary" onClick={handleClose}>Cancel</Button>
          <Button onClick={handleSubmit}>
            Submit & {isLate || isGeofence ? 'Check In' : 'Check Out'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

// ─── Work Location Card ───────────────────────────────────────────────────────

const WorkLocationCard = ({ workLocation, onRegister, registering, registerError }) => (
  <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
    <h2 className="font-semibold text-gray-800 mb-1">Work Location</h2>
    <p className="text-xs text-gray-400 mb-4">
      Register where you intern. Check-in will be verified within 200 m of this spot.
    </p>

    {workLocation?.latitude != null ? (
      <div className="space-y-2">
        <div className="flex items-start gap-2 bg-green-50 border border-green-100 rounded-lg px-3 py-2">
          <span className="text-green-500 mt-0.5">📍</span>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-green-700">Location registered</p>
            {workLocation.address && (
              <p className="text-xs text-green-600 mt-0.5 break-words">{workLocation.address}</p>
            )}
            <p className="text-xs text-gray-400 mt-0.5">
              {workLocation.latitude.toFixed(5)}, {workLocation.longitude.toFixed(5)}
            </p>
          </div>
        </div>
        <button
          onClick={onRegister}
          disabled={registering}
          className="text-xs text-blue-600 hover:underline disabled:opacity-50"
        >
          {registering ? 'Updating…' : 'Update to current location'}
        </button>
      </div>
    ) : (
      <div className="space-y-3">
        <p className="text-sm text-gray-500">No work location registered yet.</p>
        <Button onClick={onRegister} loading={registering} size="sm" fullWidth>
          Register Current Location
        </Button>
      </div>
    )}

    {registerError && (
      <p className="text-xs text-red-500 mt-2">{registerError}</p>
    )}
  </div>
);

// ─── Main component ───────────────────────────────────────────────────────────

const AttendancePage = () => {
  const { error: geoError, loading: locating, getPosition } = useGeolocation();

  const [todayRecord,   setTodayRecord]   = useState(null);
  const [history,       setHistory]       = useState([]);
  const [summary,       setSummary]       = useState(null);
  const [pageLoading,   setPageLoading]   = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError,   setActionError]   = useState('');

  // Work location state
  const [workLocation,    setWorkLocation]    = useState(null);
  const [registering,     setRegistering]     = useState(false);
  const [registerError,   setRegisterError]   = useState('');

  // Violation modal state
  const [violationModal,  setViolationModal]  = useState(false);
  const [violationType,   setViolationType]   = useState(null); // 'late_checkin' | 'early_checkout' | 'geofence'
  const [pendingAction,   setPendingAction]   = useState(null); // 'checkin' | 'checkout'
  const [pendingPosition, setPendingPosition] = useState(null);
  const [violationExtra,  setViolationExtra]  = useState(null); // e.g. distanceFromOffice

  const checkedIn  = !!todayRecord?.checkIn?.time;
  const checkedOut = !!todayRecord?.checkOut?.time;
  const status     = locating ? 'locating' : checkedOut ? 'checkedOut' : checkedIn ? 'checkedIn' : 'idle';

  useEffect(() => {
    const load = async () => {
      try {
        const [todayRes, historyRes, summaryRes, locRes] = await Promise.allSettled([
          api.get('/attendance/today'),
          api.get('/attendance/history?limit=14'),
          api.get('/attendance/summary'),
          api.get('/student/work-location'),
        ]);
        if (todayRes.status   === 'fulfilled') setTodayRecord(todayRes.value.data.data);
        if (historyRes.status === 'fulfilled') setHistory(historyRes.value.data.data);
        if (summaryRes.status === 'fulfilled') setSummary(summaryRes.value.data.data);
        if (locRes.status     === 'fulfilled') setWorkLocation(locRes.value.data.data);
      } finally {
        setPageLoading(false);
      }
    };
    load();
  }, []);

  const refresh = async () => {
    const [h, s] = await Promise.allSettled([
      api.get('/attendance/history?limit=14'),
      api.get('/attendance/summary'),
    ]);
    if (h.status === 'fulfilled') setHistory(h.value.data.data);
    if (s.status === 'fulfilled') setSummary(s.value.data.data);
  };

  // ── Register work location ────────────────────────────────────────────────

  const handleRegisterLocation = async () => {
    setRegistering(true);
    setRegisterError('');
    try {
      const position = await getPosition();
      if (!position?.lat) throw new Error('Unable to get location.');

      // Reverse-geocode via browser (no API key needed for a basic label)
      let address = null;
      try {
        const geo = await fetch(
          `https://nominatim.openstreetmap.org/reverse?lat=${position.lat}&lon=${position.lng}&format=json`
        );
        const geoData = await geo.json();
        address = geoData.display_name ?? null;
      } catch {
        // non-fatal — address is optional
      }

      const res = await api.post('/student/work-location', {
        latitude: position.lat, longitude: position.lng, address,
      });
      setWorkLocation(res.data.data);
    } catch (err) {
      setRegisterError(err.response?.data?.message ?? err.message ?? 'Failed to register location.');
    } finally {
      setRegistering(false);
    }
  };

  // ── Core action helper ─────────────────────────────────────────────────────

  const doAction = async (action, position, violationReason) => {
    if (!position || position.lat == null || position.lng == null) {
      throw new Error('Unable to get your location. Please enable location access in your browser and try again.');
    }
    const endpoint = action === 'checkin' ? '/attendance/checkin' : '/attendance/checkout';
    const res = await api.post(endpoint, {
      latitude:  position.lat,
      longitude: position.lng,
      ...(violationReason && { violationReason }),
    });
    setTodayRecord(res.data.data);
    await refresh();
  };

  // ── Check-in ───────────────────────────────────────────────────────────────

  const handleCheckIn = async () => {
    setActionLoading(true);
    setActionError('');
    let position = null;
    try {
      position = await getPosition();
      await doAction('checkin', position);
    } catch (err) {
      const resData = err.response?.data?.data;
      if (resData?.requiresReason) {
        setPendingAction('checkin');
        setPendingPosition(position);
        setViolationType(resData.type ?? 'late_checkin');
        setViolationExtra({ distanceFromOffice: resData.distanceFromOffice, workShift: resData.workShift });
        setViolationModal(true);
      } else if (!err.response && err.code) {
        // Geolocation error — geoError UI already shown by hook, skip actionError
      } else {
        setActionError(err.response?.data?.message ?? err.message ?? 'Check-in failed. Please try again.');
      }
    } finally {
      setActionLoading(false);
    }
  };

  // ── Check-out ──────────────────────────────────────────────────────────────

  const handleCheckOut = async () => {
    setActionLoading(true);
    setActionError('');
    let position = null;
    try {
      position = await getPosition();
      await doAction('checkout', position);
    } catch (err) {
      const resData = err.response?.data?.data;
      if (resData?.requiresReason) {
        setPendingAction('checkout');
        setPendingPosition(position);
        setViolationType(resData.type ?? 'early_checkout');
        setViolationExtra({ workShift: resData.workShift });
        setViolationModal(true);
      } else if (!err.response && err.code) {
        // Geolocation error — geoError UI already shown, skip actionError
      } else {
        setActionError(err.response?.data?.message ?? err.message ?? 'Check-out failed. Please try again.');
      }
    } finally {
      setActionLoading(false);
    }
  };

  // ── Violation modal submit ─────────────────────────────────────────────────

  const handleViolationSubmit = async (reason) => {
    setViolationModal(false);
    setActionLoading(true);
    try {
      await doAction(pendingAction, pendingPosition, reason);
    } catch (err) {
      setActionError(err.response?.data?.message ?? 'Action failed. Please try again.');
    } finally {
      setActionLoading(false);
      setPendingAction(null);
      setPendingPosition(null);
      setViolationType(null);
      setViolationExtra(null);
    }
  };

  if (pageLoading) return <Spinner fullScreen />;

  return (
    <div className="space-y-6 pb-20 lg:pb-0">

      <div>
        <h1 className="text-2xl font-bold text-gray-800">Attendance</h1>
        <p className="text-gray-500 text-sm mt-0.5">
          {new Date().toLocaleDateString('en-NG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

        {/* Left column: check-in panel + work location */}
        <div className="md:col-span-1 space-y-4">

        {/* Check-in/out panel */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 flex flex-col items-center gap-4">
          <StatusRing status={status} />

          {checkedIn && (
            <div className="w-full space-y-2 text-sm">
              <div className="flex justify-between py-1.5 border-b border-gray-100">
                <span className="text-gray-500">Check-in</span>
                <span className="font-medium text-gray-800">{formatTime(todayRecord.checkIn.time)}</span>
              </div>
              {todayRecord.checkIn.isLate && (
                <div className="bg-yellow-50 border border-yellow-100 rounded-lg px-2 py-1 text-xs text-yellow-700">
                  Late arrival recorded
                  {todayRecord.violation?.reason && ` — "${todayRecord.violation.reason}"`}
                </div>
              )}
              {todayRecord.isGeofenceViolation && (
                <div className="bg-red-50 border border-red-100 rounded-lg px-2 py-1 text-xs text-red-600">
                  Outside geofence at check-in
                </div>
              )}
              {checkedOut && (
                <>
                  <div className="flex justify-between py-1.5 border-b border-gray-100">
                    <span className="text-gray-500">Check-out</span>
                    <span className="font-medium text-gray-800">{formatTime(todayRecord.checkOut.time)}</span>
                  </div>
                  {todayRecord.checkOut.isEarlyDeparture && (
                    <div className="bg-orange-50 border border-orange-100 rounded-lg px-2 py-1 text-xs text-orange-700">
                      Early departure recorded
                    </div>
                  )}
                  <div className="flex justify-between py-1.5">
                    <span className="text-gray-500">Working hours</span>
                    <span className="font-medium text-gray-800">
                      {((new Date(todayRecord.checkOut.time) - new Date(todayRecord.checkIn.time)) / 3600000).toFixed(1)}h
                    </span>
                  </div>
                </>
              )}
            </div>
          )}

          {actionError && (
            <div className="w-full bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-600">
              {actionError}
            </div>
          )}
          {geoError && (
            <div className="w-full bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-600 space-y-1">
              <p className="font-semibold">Location access required</p>
              <p>{geoError.message}</p>
              {geoError.code === 1 && (
                <p className="text-red-500">To fix: click the lock/info icon in your browser address bar → Site settings → Allow Location.</p>
              )}
            </div>
          )}

          <div className="w-full">
            {!checkedIn && (
              <Button onClick={handleCheckIn} loading={actionLoading} fullWidth size="lg">
                {locating ? 'Getting location...' : 'Check In'}
              </Button>
            )}
            {checkedIn && !checkedOut && (
              <Button onClick={handleCheckOut} loading={actionLoading} fullWidth size="lg" variant="danger">
                Check Out
              </Button>
            )}
            {checkedOut && (
              <div className="text-center py-2">
                <span className="inline-block bg-green-100 text-green-700 text-xs font-semibold px-3 py-1 rounded-full">
                  Day complete ✓
                </span>
                <p className="text-xs text-gray-400 mt-2">See you tomorrow!</p>
              </div>
            )}
          </div>

          <p className="text-xs text-gray-400 text-center leading-relaxed">
            {(() => {
              const ws = summary?.workShift || '8-16';
              const [sH, eH] = ws.split('-').map(Number);
              const h12 = (h) => String(h > 12 ? h - 12 : h).padStart(2, '0');
              const ampm = (h) => h < 12 ? 'AM' : 'PM';
              const coH = eH - 1;
              return `Expected: ${h12(sH)}:00 ${ampm(sH)} — ${h12(eH)}:00 ${ampm(eH)}. Check-in after ${h12(sH)}:30 ${ampm(sH)} or out before ${h12(coH)}:30 ${ampm(coH)} requires a reason.`;
            })()}
          </p>
        </div>

        {/* Work location registration */}
        <WorkLocationCard
          workLocation={workLocation}
          onRegister={handleRegisterLocation}
          registering={registering || locating}
          registerError={registerError}
        />

        </div>{/* end left column */}

        {/* Summary + History */}
        <div className="md:col-span-2 space-y-4">
          <SummaryCard summary={summary} />

          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-gray-800">Recent History</h2>
              {history.length > 0 && <span className="text-xs text-gray-400">Last {history.length} days</span>}
            </div>
            {history.length === 0 ? (
              <EmptyState title="No attendance records yet"
                description="Your check-in history will appear here after your first check-in." />
            ) : (
              history.map((record) => <HistoryRow key={record._id} record={record} />)
            )}
          </div>
        </div>
      </div>

      {/* Violation reason modal */}
      <ViolationModal
        isOpen={violationModal}
        onClose={() => { setViolationModal(false); setPendingAction(null); setPendingPosition(null); setViolationType(null); }}
        onSubmit={handleViolationSubmit}
        violationType={violationType}
        distanceFromOffice={violationExtra?.distanceFromOffice}
        workShift={violationExtra?.workShift ?? summary?.workShift}
      />

    </div>
  );
};

export default AttendancePage;
