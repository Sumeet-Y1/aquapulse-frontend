import { ArrowLeft, CalendarDays, Clock3, MonitorUp, Plus, UsersRound, Video } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { MeetingForm } from "../components/Forms";
import { GlassCard } from "../components/GlassCard";
import { Modal } from "../components/Modal";
import { EmptyState, ErrorState, LoadingState } from "../components/Status";
import { useAuth } from "../context/AuthContext";
import { useSocieties } from "../context/SocietyContext";
import { getApiErrorMessage, meetingsApi } from "../services/api";
import type { Meeting, MeetingStatus, MeetingType } from "../types/api";

export function MeetingsPage() {
  const { societyId: rawSocietyId } = useParams();
  const societyId = Number(rawSocietyId);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { societies } = useSocieties();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState("");
  const isAdmin = user?.role === "ADMIN";
  const society = useMemo(() => societies.find((item) => item.id === societyId) ?? null, [societies, societyId]);

  const loadMeetings = useCallback(async (showLoading = false) => {
    if (!Number.isFinite(societyId)) return;
    if (showLoading) setLoading(true);
    setError("");
    try {
      setMeetings(await meetingsApi.bySociety(societyId));
    } catch (caught) {
      setError(getApiErrorMessage(caught, "Unable to load meetings."));
    } finally {
      if (showLoading) setLoading(false);
    }
  }, [societyId]);

  useEffect(() => {
    void loadMeetings(true);
    const timer = window.setInterval(() => void loadMeetings(), 30000);
    return () => window.clearInterval(timer);
  }, [loadMeetings]);

  const handleCancel = async (meeting: Meeting) => {
    if (!window.confirm(`Cancel “${meeting.title}”?`)) return;
    try {
      await meetingsApi.remove(meeting.id);
      await loadMeetings();
    } catch (caught) {
      setError(getApiErrorMessage(caught, "Unable to cancel this meeting."));
    }
  };

  const handleEnd = async (meeting: Meeting) => {
    if (!window.confirm(`End “${meeting.title}” for everyone?`)) return;
    try {
      await meetingsApi.end(meeting.id);
      await loadMeetings();
    } catch (caught) {
      setError(getApiErrorMessage(caught, "Unable to end this meeting."));
    }
  };

  if (!Number.isFinite(societyId)) return <ErrorState message="This society could not be found." />;

  return (
    <div className="grid w-full gap-6">
      <Link to={society ? `/societies/${society.id}` : "/"} className="chip w-fit"><ArrowLeft size={16} /> Back to society</Link>
      <section className="hero-panel min-h-[220px]">
        <div className="max-w-2xl">
          <p className="chip w-fit">Society meetings</p>
          <h1 className="mt-4 text-4xl font-bold md:text-5xl">Meet, discuss, decide.</h1>
          <p className="mt-4 text-[#5B6B85]">{society ? `${society.name} meetings for every resident.` : "Meetings for your society."}</p>
          <p className="mt-3 max-w-xl text-sm leading-6 text-[#5B6B85]">
            Schedule video or audio calls for maintenance updates, rainwater reviews and society decisions. Residents join with one click once the host goes live.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <span className="chip"><Video size={14} /> Video and audio</span>
            <span className="chip"><MonitorUp size={14} /> Screen sharing</span>
            <span className="chip"><UsersRound size={14} /> One-click join</span>
          </div>
        </div>
        {isAdmin && <button className="primary-btn" onClick={() => { setModalError(""); setModalOpen(true); }}><Plus size={18} /> Schedule meeting</button>}
      </section>

      {error && <ErrorState message={error} />}
      {loading ? <LoadingState label="Loading meetings..." /> : meetings.length === 0 ? <MeetingsEmpty isAdmin={isAdmin} onSchedule={() => { setModalError(""); setModalOpen(true); }} /> : (
        <div className="grid gap-4 lg:grid-cols-2">
          {meetings.map((meeting) => (
            <GlassCard key={meeting.id} className="p-5 md:p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <MeetingStatusBadge status={meeting.status} />
                  <h2 className="mt-4 text-2xl font-semibold">{meeting.title}</h2>
                  <p className="mt-2 text-sm text-[#5B6B85]">{meeting.description}</p>
                </div>
                <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#EAF4FB] text-leaf"><Video size={20} /></span>
              </div>
              <div className="mt-5 grid gap-3 text-sm text-[#5B6B85] sm:grid-cols-2">
                <p className="flex items-center gap-2"><CalendarDays size={16} className="text-leaf" /> {formatDateTime(meeting.scheduledAt)}</p>
                <p className="flex items-center gap-2"><Clock3 size={16} className="text-leaf" /> {meeting.durationMinutes} minutes</p>
                <p className="flex items-center gap-2"><UsersRound size={16} className="text-leaf" /> Hosted by {meeting.createdByName}</p>
                <p className="flex items-center gap-2">{meeting.type === "VIDEO" ? <Video size={16} className="text-leaf" /> : <MonitorUp size={16} className="text-leaf" />} {meeting.type === "VIDEO" ? "Video" : "Audio"}{meeting.allowScreenShare ? " · screen share" : ""}</p>
              </div>
              <div className="mt-6 flex flex-wrap gap-3">
                {isAdmin && meeting.status === "SCHEDULED" && <><button className="primary-btn" onClick={() => navigate(`/meetings/${meeting.id}`)}>Start & Join</button><button className="secondary-btn" onClick={() => void handleCancel(meeting)}>Cancel</button></>}
                {isAdmin && meeting.status === "LIVE" && <><button className="primary-btn" onClick={() => navigate(`/meetings/${meeting.id}`)}>Join</button><button className="secondary-btn" onClick={() => void handleEnd(meeting)}>End meeting</button></>}
                {!isAdmin && meeting.status === "LIVE" && <button className="primary-btn" onClick={() => navigate(`/meetings/${meeting.id}`)}>Join</button>}
                {!isAdmin && meeting.status === "SCHEDULED" && <button className="secondary-btn" disabled>Waiting for host</button>}
              </div>
            </GlassCard>
          ))}
        </div>
      )}

      {modalOpen && <Modal title="Schedule meeting" onClose={() => setModalOpen(false)}><MeetingForm societyId={societyId} error={modalError} isSaving={saving} onSubmit={async (payload) => {
        setSaving(true); setModalError("");
        try { await meetingsApi.create(payload); setModalOpen(false); await loadMeetings(); }
        catch (caught) { setModalError(getApiErrorMessage(caught, "Unable to schedule this meeting.")); }
        finally { setSaving(false); }
      }} /></Modal>}
    </div>
  );
}

export function MeetingStatusBadge({ status }: { status: MeetingStatus }) {
  const colors: Record<MeetingStatus, string> = {
    SCHEDULED: "border-sky-200 bg-sky-50 text-sky-700",
    LIVE: "border-emerald-200 bg-emerald-50 text-emerald-700",
    ENDED: "border-slate-200 bg-slate-50 text-slate-600",
    CANCELLED: "border-red-200 bg-red-50 text-red-700",
  };
  return <span className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${colors[status]}`}>{status}</span>;
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function MeetingsEmpty({ isAdmin, onSchedule }: { isAdmin: boolean; onSchedule: () => void }) {
  return (
    <GlassCard className="p-8">
      <div className="flex flex-col items-center text-center">
        <span className="grid h-14 w-14 place-items-center rounded-2xl bg-[#EAF4FB] text-[#2B6CB0]">
          <Video size={26} />
        </span>
        <h2 className="mt-4 text-2xl font-semibold">No meetings yet</h2>
        <p className="mt-2 max-w-md text-sm text-[#5B6B85]">
          {isAdmin
            ? "Schedule a meeting to talk through maintenance, rainfall data or anything else with your residents."
            : "Meetings scheduled by your society admin will appear here."}
        </p>
        {isAdmin && (
          <button className="primary-btn mt-5" onClick={onSchedule}>
            <Plus size={18} /> Schedule the first meeting
          </button>
        )}
      </div>
    </GlassCard>
  );
}