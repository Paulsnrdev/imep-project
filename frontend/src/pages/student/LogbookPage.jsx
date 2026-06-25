import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  selectWeeks, selectEntriesByWeek,
  setWeeks, setEntries, upsertEntry,
  setLoading, selectLogbookLoading,
} from '../../features/logbook/logbookSlice';
import { isWeekEditable } from '../../utils/timelock';
import { formatDate } from '../../utils/formatDate';
import api from '../../services/api';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import EmptyState from '../../components/common/EmptyState';
import Spinner from '../../components/common/Spinner';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

// Returns today's day name in WAT (UTC+1), or null if it's a weekend.
const getTodayWAT = () => {
  const watNow = new Date(Date.now() + 60 * 60 * 1000);
  const idx    = watNow.getUTCDay(); // 0=Sun, 1=Mon…5=Fri, 6=Sat
  return idx >= 1 && idx <= 5 ? DAYS[idx - 1] : null;
};

// ─── Week card ────────────────────────────────────────────────────────────────

const WeekCard = ({ week, isActive, onClick }) => {
  const offset     = week.startDayOffset ?? 0;
  const required   = 5 - offset;
  const entryCount = (week.entries ?? []).filter((e) => DAYS.indexOf(e.dayOfWeek) >= offset).length;
  const editable   = isWeekEditable(week.weekStartDate, week.weekEndDate, week.isLocked);

  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-3 rounded-xl border transition-all
        ${isActive
          ? 'border-blue-500 bg-blue-50'
          : 'border-gray-100 bg-white hover:border-gray-200 hover:bg-gray-50'
        }`}
    >
      <div className="flex items-center justify-between mb-1">
        <span className={`text-sm font-semibold ${isActive ? 'text-blue-700' : 'text-gray-800'}`}>
          Week {week.weekNumber}
        </span>
        <Badge
          label={week.isLocked ? 'Locked' : editable ? 'Open' : 'Pending'}
          variant={week.isLocked ? 'gray' : editable ? 'green' : 'yellow'}
        />
      </div>
      <p className="text-xs text-gray-400">
        {formatDate(week.weekStartDate)} — {formatDate(week.weekEndDate)}
      </p>
      <div className="flex gap-1 mt-2">
        {DAYS.map((day, i) => (
          <div
            key={day}
            title={i < offset ? `${day} — N/A (before start)` : day}
            className={`flex-1 h-1.5 rounded-full ${
              i < offset
                ? 'bg-gray-100'
                : week.entries?.some((e) => e.dayOfWeek === day)
                ? 'bg-blue-500'
                : 'bg-gray-200'
            }`}
          />
        ))}
      </div>
      <div className="flex items-center justify-between mt-1">
        <p className="text-xs text-gray-400">{entryCount}/{required} entries</p>
        {week.weeklyImage && <span className="text-xs text-green-600">📷 Photo</span>}
      </div>
    </button>
  );
};

// ─── Entry form ───────────────────────────────────────────────────────────────

const EntryForm = ({ day, existingEntry, onSave, saving, locked }) => {
  const [form, setForm] = useState({
    activitiesCarriedOut: existingEntry?.activitiesCarriedOut ?? '',
    skillsLearned:        existingEntry?.skillsLearned        ?? '',
    challenges:           existingEntry?.challenges           ?? '',
    planForTomorrow:      existingEntry?.planForTomorrow      ?? '',
  });

  useEffect(() => {
    setForm({
      activitiesCarriedOut: existingEntry?.activitiesCarriedOut ?? '',
      skillsLearned:        existingEntry?.skillsLearned        ?? '',
      challenges:           existingEntry?.challenges           ?? '',
      planForTomorrow:      existingEntry?.planForTomorrow      ?? '',
    });
  }, [existingEntry]);

  const handleChange = (e) => setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.activitiesCarriedOut.trim()) return;
    onSave({ ...form, dayOfWeek: day });
  };

  const fields = [
    { name: 'activitiesCarriedOut', label: 'Activities Carried Out', required: true,  placeholder: 'Describe what you did today...' },
    { name: 'skillsLearned',        label: 'Skills Learned',          required: false, placeholder: 'What new skills or knowledge did you gain?' },
    { name: 'challenges',           label: 'Challenges Faced',        required: false, placeholder: 'Any difficulties or obstacles?' },
    { name: 'planForTomorrow',      label: 'Plan for Tomorrow',        required: false, placeholder: 'What do you intend to do tomorrow?' },
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {fields.map((field) => (
        <div key={field.name} className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">
            {field.label}
            {field.required && <span className="text-red-500 ml-1">*</span>}
          </label>
          <textarea
            name={field.name}
            value={form[field.name]}
            onChange={handleChange}
            placeholder={locked ? '' : field.placeholder}
            disabled={locked}
            rows={3}
            className={`w-full px-3 py-2 border rounded-lg text-sm outline-none resize-none transition
              focus:ring-2 focus:ring-blue-500 focus:border-blue-500
              disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed
              ${!locked ? 'border-gray-300' : 'border-gray-200'}`}
          />
        </div>
      ))}
      {!locked && (
        <div className="flex justify-end gap-2 pt-2">
          <Button type="submit" loading={saving} disabled={!form.activitiesCarriedOut.trim()}>
            {existingEntry ? 'Update Entry' : 'Save Entry'}
          </Button>
        </div>
      )}
    </form>
  );
};

// ─── Weekly image upload section ──────────────────────────────────────────────

const WeeklyImageUpload = ({ week, weekEntries, onUploaded }) => {
  const fileRef           = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  const required    = 5 - (week.startDayOffset ?? 0);
  const validEntries = weekEntries.filter((e) => DAYS.indexOf(e.dayOfWeek) >= (week.startDayOffset ?? 0));
  const allFilled   = validEntries.length >= required;
  const canUpload   = allFilled && !week.isLocked;
  const hasImage    = !!week.weeklyImage;

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadError('');
    try {
      const formData = new FormData();
      formData.append('weeklyImage', file);
      const { data } = await api.post(`/logbook/weeks/${week._id}/image`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      onUploaded(week._id, data.data.weeklyImage);
    } catch (err) {
      setUploadError(err.response?.data?.message ?? 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <div className="border border-dashed border-gray-200 rounded-xl p-4 bg-gray-50">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <p className="text-sm font-semibold text-gray-700">Weekly Photo / Diagram</p>
          <p className="text-xs text-gray-400 mt-0.5">
            {week.isLocked
              ? 'Week is locked — uploads closed.'
              : !allFilled
              ? `Complete all ${required} daily entries first (${validEntries.length}/${required} done).`
              : 'Upload one image summarising this week\'s work.'}
          </p>
        </div>

        {hasImage ? (
          <a href={week.weeklyImage} target="_blank" rel="noreferrer"
            className="text-xs text-blue-600 hover:underline font-medium">
            View uploaded image →
          </a>
        ) : (
          <>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />
            <Button
              size="sm"
              disabled={!canUpload || uploading}
              loading={uploading}
              onClick={() => canUpload && fileRef.current?.click()}
            >
              {uploading ? 'Uploading...' : 'Upload Image'}
            </Button>
          </>
        )}
      </div>

      {hasImage && (
        <div className="mt-3">
          <img src={week.weeklyImage} alt="Weekly summary" className="max-h-40 rounded-lg object-contain border border-gray-200" />
          <p className="text-xs text-gray-400 mt-1">Uploaded on {formatDate(week.weeklyImageUploadedAt)}</p>
        </div>
      )}

      {uploadError && (
        <p className="text-xs text-red-500 mt-2">{uploadError}</p>
      )}
    </div>
  );
};

// ─── Main component ───────────────────────────────────────────────────────────

const LogbookPage = () => {
  const { weekId: paramWeekId } = useParams();
  const dispatch = useDispatch();
  const weeks    = useSelector(selectWeeks);
  const loading  = useSelector(selectLogbookLoading);

  const [activeWeekId, setActiveWeekId] = useState(paramWeekId ?? null);
  const [activeDay,    setActiveDay]    = useState('Monday');
  const [saving,       setSaving]       = useState(false);
  const [saved,        setSaved]        = useState(false);
  const [saveError,    setSaveError]    = useState('');

  const activeWeek     = weeks.find((w) => w._id === activeWeekId) ?? weeks[0] ?? null;
  const weekEntries    = useSelector(selectEntriesByWeek(activeWeek?._id ?? ''));
  const editable       = activeWeek ? isWeekEditable(activeWeek.weekStartDate, activeWeek.weekEndDate, activeWeek.isLocked) : false;
  const locked         = !activeWeek || activeWeek.isLocked || !editable;
  const activeDayEntry = weekEntries.find((e) => e.dayOfWeek === activeDay);
  const startOffset    = activeWeek?.startDayOffset ?? 0;
  const activeDayIndex = DAYS.indexOf(activeDay);

  useEffect(() => {
    const fetchWeeks = async () => {
      dispatch(setLoading(true));
      try {
        const { data } = await api.get('/logbook/weeks');
        dispatch(setWeeks(data.data));
        if (!activeWeekId && data.data.length > 0) {
          const first = data.data[0];
          setActiveWeekId(first._id);
          setActiveDay(DAYS[first.startDayOffset ?? 0]);
        }
      } catch (err) {
        console.error('[LogbookPage] fetchWeeks error:', err?.response?.status, err?.response?.data ?? err?.message);
      } finally {
        dispatch(setLoading(false));
      }
    };
    fetchWeeks();
  }, []);

  useEffect(() => {
    if (!activeWeekId) return;
    const fetchEntries = async () => {
      try {
        const { data } = await api.get(`/logbook/weeks/${activeWeekId}/entries`);
        dispatch(setEntries({ weekId: activeWeekId, entries: data.data }));
      } catch {
        // silent
      }
    };
    fetchEntries();
  }, [activeWeekId]);

  const handleSave = useCallback(async (formData) => {
    setSaving(true);
    setSaveError('');
    try {
      const { data } = await api.post(`/logbook/weeks/${activeWeekId}/entries`, formData);
      dispatch(upsertEntry({ weekId: activeWeekId, entry: data.data }));

      dispatch(setWeeks(weeks.map((w) =>
        w._id === activeWeekId
          ? {
              ...w,
              entries: weekEntries.some((e) => e.dayOfWeek === formData.dayOfWeek)
                ? w.entries
                : [...(w.entries ?? []), { dayOfWeek: formData.dayOfWeek }],
            }
          : w
      )));

      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setSaveError(err.response?.data?.message ?? 'Failed to save entry.');
    } finally {
      setSaving(false);
    }
  }, [activeWeekId, weeks, weekEntries, dispatch]);

  const handleImageUploaded = useCallback((weekId, imageUrl) => {
    dispatch(setWeeks(weeks.map((w) =>
      w._id === weekId ? { ...w, weeklyImage: imageUrl, weeklyImageUploadedAt: new Date().toISOString() } : w
    )));
  }, [weeks, dispatch]);

  if (loading) return <Spinner fullScreen />;

  if (weeks.length === 0) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-120px)]">
        <EmptyState
          title="No logbook weeks yet"
          description="Logbook weeks are created automatically once your internship start date is reached. If your start date has passed, try refreshing the page."
        />
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-20 lg:pb-0">

      {/* Mobile: week dropdown */}
      <div className="md:hidden">
        <select
          value={activeWeek?._id ?? ''}
          onChange={(e) => {
            const w = weeks.find((wk) => wk._id === e.target.value);
            if (w) { setActiveWeekId(w._id); setActiveDay(DAYS[w.startDayOffset ?? 0]); }
          }}
          className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
        >
          {weeks.map((w) => (
            <option key={w._id} value={w._id}>
              Week {w.weekNumber} · {formatDate(w.weekStartDate)}
            </option>
          ))}
        </select>
      </div>

      <div className="md:flex md:gap-4 md:h-[calc(100vh-160px)] lg:h-[calc(100vh-80px)] md:overflow-hidden">

        {/* Desktop sidebar */}
        <div className="hidden md:block w-56 shrink-0 overflow-y-auto space-y-2 pr-1">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3 px-1">
            Logbook Weeks
          </h2>
          {weeks.map((week) => (
            <WeekCard
              key={week._id}
              week={week}
              isActive={week._id === activeWeek?._id}
              onClick={() => { setActiveWeekId(week._id); setActiveDay(DAYS[week.startDayOffset ?? 0]); }}
            />
          ))}
        </div>

        {/* Main panel */}
        {activeWeek && (
          <div className="flex-1 md:overflow-y-auto">
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm md:h-full flex flex-col">

              {/* Header */}
              <div className="p-5 border-b border-gray-100 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div>
                    <h1 className="text-lg font-bold text-gray-800">Week {activeWeek.weekNumber} Logbook</h1>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {formatDate(activeWeek.weekStartDate)} — {formatDate(activeWeek.weekEndDate)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge label={locked ? '🔒 Locked' : '✏️ Open'} variant={locked ? 'gray' : 'green'} />
                    <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-full">
                      {weekEntries.filter((e) => DAYS.indexOf(e.dayOfWeek) >= startOffset).length}/{5 - startOffset} entries
                    </span>
                  </div>
                </div>

                {/* Weekly image upload — student only, no supervisor comment shown */}
                <WeeklyImageUpload
                  week={activeWeek}
                  weekEntries={weekEntries}
                  onUploaded={handleImageUploaded}
                />

                {locked && !activeWeek.isLocked && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2 text-xs text-yellow-700">
                    Editing window closed. Entries are read-only until next week opens Monday 7:30 AM.
                  </div>
                )}
              </div>

              {/* Day tabs */}
              <div className="flex border-b border-gray-100 overflow-x-auto">
                {(() => {
                  const todayWAT   = getTodayWAT();
                  const todayIndex = todayWAT ? DAYS.indexOf(todayWAT) : -1;
                  const isCurrentWeek = activeWeek
                    ? new Date() >= new Date(activeWeek.weekStartDate) &&
                      new Date() <= new Date(activeWeek.weekEndDate)
                    : false;

                  return DAYS.map((day, i) => {
                    const isNullified  = i < startOffset;
                    const hasEntry     = weekEntries.some((e) => e.dayOfWeek === day);
                    const isFuture     = isCurrentWeek && todayIndex >= 0 && i > todayIndex;
                    const isDisabled   = isNullified || isFuture;

                    let title = day;
                    if (isNullified) title = 'Before internship start — N/A';
                    else if (isFuture) title = 'Not yet — fill this day when it arrives';

                    return (
                      <button
                        key={day}
                        onClick={() => !isDisabled && setActiveDay(day)}
                        disabled={isDisabled}
                        title={title}
                        className={`flex-1 flex flex-col items-center py-3 px-2 text-xs font-medium transition-colors min-w-[70px] border-b-2
                          ${isNullified || isFuture
                            ? 'border-transparent text-gray-300 bg-gray-50 cursor-not-allowed'
                            : activeDay === day
                            ? 'border-blue-500 text-blue-600 bg-blue-50'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                          }`}
                      >
                        <span>{day.slice(0, 3)}</span>
                        {isNullified
                          ? <span className="mt-1 text-gray-300 text-xs">N/A</span>
                          : isFuture
                          ? <span className="mt-1 text-gray-300 text-xs">–</span>
                          : <div className={`mt-1.5 w-2 h-2 rounded-full ${hasEntry ? 'bg-blue-500' : 'bg-gray-200'}`} />
                        }
                      </button>
                    );
                  });
                })()}
              </div>

              {/* Entry area */}
              <div className="flex-1 md:overflow-y-auto p-5">
                {saved && (
                  <div className="mb-4 bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-2.5 rounded-lg flex items-center gap-2">
                    ✓ Entry saved successfully
                  </div>
                )}
                {saveError && (
                  <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-2.5 rounded-lg">
                    {saveError}
                  </div>
                )}

                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-800">{activeDay}</h3>
                  {!locked && activeDayEntry && (
                    <span className="text-xs text-green-600 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">✓ Saved</span>
                  )}
                  {!locked && !activeDayEntry && (
                    <span className="text-xs text-gray-400">Not written yet</span>
                  )}
                </div>

                {DAYS.indexOf(activeDay) < startOffset ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <span className="text-3xl mb-3">🚫</span>
                    <p className="text-sm font-semibold text-gray-500">Not applicable</p>
                    <p className="text-xs text-gray-400 mt-1">This day is before your internship start date.</p>
                  </div>
                ) : locked && !activeDayEntry ? (
                  <EmptyState title="No entry for this day" description="This day has no logbook entry." />
                ) : (
                  <EntryForm
                    key={`${activeWeek._id}-${activeDay}`}
                    day={activeDay}
                    existingEntry={activeDayEntry}
                    onSave={handleSave}
                    saving={saving}
                    locked={locked}
                  />
                )}
              </div>

            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LogbookPage;
