import { ArrowLeft, LogOut, StopCircle } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { GlassCard } from "../components/GlassCard";
import { ErrorState, LoadingState } from "../components/Status";
import { useAuth } from "../context/AuthContext";
import { getApiErrorMessage, meetingsApi } from "../services/api";
import type { JoinMeetingResponse, Meeting } from "../types/api";
import { MeetingStatusBadge } from "./MeetingsPage";

function loadJitsiScript(domain: string, roomId: string, jwt: string | null) {
  const appId = roomId.split("/")[0];
  const src = jwt ? `https://${domain}/${appId}/external_api.js` : `https://${domain}/external_api.js`;
  if (window.JitsiMeetExternalAPI) return Promise.resolve();
  const existing = document.querySelector<HTMLScriptElement>(`script[data-jitsi-src="${src}"]`);
  if (existing) {
    return new Promise<void>((resolve, reject) => {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("Unable to load the meeting room.")), { once: true });
    });
  }
  return new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.dataset.jitsiSrc = src;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Unable to load the meeting room."));
    document.head.appendChild(script);
  });
}

export function MeetingRoomPage() {
  const meetingId = Number(useParams().id);
  const navigate = useNavigate();
  const { user } = useAuth();
  const hostRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<JitsiMeetExternalAPIInstance | null>(null);
  const joinedRef = useRef(false);
  const leaveStartedRef = useRef(false);
  const joinPromiseRef = useRef<Promise<{ meeting: Meeting; room: JoinMeetingResponse }> | null>(null);
  const cleanupTimerRef = useRef<number | null>(null);
  const visitActiveRef = useRef(false);
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [room, setRoom] = useState<JoinMeetingResponse | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [ending, setEnding] = useState(false);

  const leaveOnce = useCallback(async () => {
    if (!joinedRef.current || leaveStartedRef.current || !Number.isFinite(meetingId)) return;
    leaveStartedRef.current = true;
    try { await meetingsApi.leave(meetingId); } catch { /* Leaving must not block navigation. */ }
  }, [meetingId]);

  const returnToMeetings = useCallback((societyId?: number) => {
    navigate(societyId ? `/societies/${societyId}/meetings` : "/", { replace: true });
  }, [navigate]);

  useEffect(() => {
    if (!Number.isFinite(meetingId)) {
      setError("This meeting could not be found."); setLoading(false); return;
    }
    if (cleanupTimerRef.current != null) {
      window.clearTimeout(cleanupTimerRef.current);
      cleanupTimerRef.current = null;
    }
    visitActiveRef.current = true;
    if (!joinPromiseRef.current) {
      joinPromiseRef.current = (async () => {
        const joinResponse = await meetingsApi.join(meetingId);
        joinedRef.current = true;
        if (!visitActiveRef.current) {
          await leaveOnce();
        }
        const meetingResponse = await meetingsApi.get(meetingId);
        return { meeting: meetingResponse, room: joinResponse };
      })();
    }
    let active = true;
    void joinPromiseRef.current.then(({ meeting: meetingResponse, room: joinResponse }) => {
      if (!active) return;
      setMeeting(meetingResponse);
      setRoom(joinResponse);
    }).catch((caught) => {
      if (active) setError(getApiErrorMessage(caught, "Unable to join this meeting."));
    }).finally(() => { if (active) setLoading(false); });
    return () => {
      active = false;
      // StrictMode immediately re-runs this effect in development; postponing cleanup lets that pass reuse the join.
      cleanupTimerRef.current = window.setTimeout(() => {
        visitActiveRef.current = false;
        void leaveOnce();
      }, 0);
    };
  }, [leaveOnce, meetingId]);

  useEffect(() => {
    if (!room || !meeting || !hostRef.current || apiRef.current) return;
    let active = true;
    void loadJitsiScript(room.domain, room.roomId, room.jwt).then(() => {
      if (!active || !hostRef.current || apiRef.current) return;
      const toolbarButtons = ["microphone", "chat", "raisehand", "tileview", "participants-pane", "hangup"];
      if (room.type !== "AUDIO") toolbarButtons.splice(1, 0, "camera");
      if (room.allowScreenShare) toolbarButtons.splice(toolbarButtons.length - 1, 0, "desktop");
      const jitsi = new window.JitsiMeetExternalAPI(room.domain, {
        roomName: room.roomId, jwt: room.jwt ?? undefined, parentNode: hostRef.current, width: "100%", height: "75vh",
        userInfo: { displayName: room.displayName },
        configOverwrite: { prejoinPageEnabled: false, startWithAudioMuted: true, startWithVideoMuted: room.type === "AUDIO", disableDeepLinking: true, toolbarButtons },
        interfaceConfigOverwrite: { SHOW_JITSI_WATERMARK: false },
      });
      apiRef.current = jitsi;
      jitsi.addListener("screenSharingStatusChanged", (event) => { void meetingsApi.screenShare(meetingId, event.on).catch(() => undefined); });
      const closeRoom = () => {
        apiRef.current?.dispose(); apiRef.current = null;
        void leaveOnce().finally(() => returnToMeetings(meeting.societyId));
      };
      jitsi.addListener("videoConferenceLeft", closeRoom);
      jitsi.addListener("readyToClose", closeRoom);
    }).catch((caught) => { if (active) setError(getApiErrorMessage(caught, "Unable to load the meeting room.")); });
    return () => {
      active = false;
      apiRef.current?.dispose();
      apiRef.current = null;
    };
  }, [leaveOnce, meeting, meetingId, returnToMeetings, room]);

  const handleEnd = async () => {
    if (!meeting || !window.confirm("End this meeting for everyone?")) return;
    setEnding(true);
    try {
      await meetingsApi.end(meeting.id);
      apiRef.current?.dispose(); apiRef.current = null;
      await leaveOnce();
      returnToMeetings(meeting.societyId);
    } catch (caught) { setError(getApiErrorMessage(caught, "Unable to end this meeting.")); }
    finally { setEnding(false); }
  };

  if (loading) return <LoadingState label="Joining meeting room..." />;
  if (error) return <div className="grid w-full gap-4"><ErrorState message={error} /><button className="secondary-btn w-fit" onClick={() => returnToMeetings(meeting?.societyId)}><ArrowLeft size={16} /> Back</button></div>;

  return (
    <div className="grid w-full gap-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div><div className="flex items-center gap-3"><h1 className="text-3xl font-bold">{meeting?.title}</h1>{meeting && <MeetingStatusBadge status={meeting.status} />}</div><p className="mt-2 text-sm text-[#5B6B85]">{room?.type === "AUDIO" ? "Audio meeting" : "Video meeting"}</p></div>
        <div className="flex gap-3">{user?.role === "ADMIN" && <button className="secondary-btn" disabled={ending} onClick={() => void handleEnd()}><StopCircle size={16} /> {ending ? "Ending..." : "End meeting for everyone"}</button>}<button className="secondary-btn" onClick={() => { apiRef.current?.dispose(); apiRef.current = null; void leaveOnce().finally(() => returnToMeetings(meeting?.societyId)); }}><LogOut size={16} /> Leave</button></div>
      </div>
      <GlassCard className="min-h-[75vh] overflow-hidden p-2 md:p-3"><div ref={hostRef} className="min-h-[75vh] w-full overflow-hidden rounded-[22px] bg-[#F7FBFE]" /></GlassCard>
    </div>
  );
}
