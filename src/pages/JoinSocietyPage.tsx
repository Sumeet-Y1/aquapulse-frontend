import { ArrowLeft, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ErrorState, LoadingState } from "../components/Status";
import { getApiErrorMessage } from "../services/api";
import { useSocieties } from "../context/SocietyContext";

export function JoinSocietyPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { joinSociety } = useSocieties();
  const [error, setError] = useState("");
  const [status, setStatus] = useState("Joining your society...");
  const [joining, setJoining] = useState(true);

  const inviteCode = searchParams.get("code")?.trim().toUpperCase() ?? "";

  useEffect(() => {
    let active = true;

    void (async () => {
      if (!inviteCode) {
        if (active) {
          setJoining(false);
          setStatus("Missing invite code.");
          setError("This invite link is missing a code.");
        }
        return;
      }

      try {
        const joined = await joinSociety(inviteCode);
        if (!active) {
          return;
        }
        navigate(`/societies/${joined.id}`, { replace: true });
      } catch (caught) {
        if (active) {
          setError(getApiErrorMessage(caught, "Unable to join with that invite code."));
          setJoining(false);
          setStatus("We couldn't join you automatically.");
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [inviteCode, joinSociety, navigate]);

  if (joining && !error) {
    return <LoadingState label={status} />;
  }

  return (
    <div className="grid gap-4">
      <Link to="/" className="chip w-fit">
        <ArrowLeft size={16} /> Back
      </Link>

      <div className="glass-card p-6">
        <p className="text-xs uppercase tracking-[0.22em] text-[#8FA4C0]">Join society</p>
        <h1 className="mt-3 text-2xl font-semibold">We couldn&apos;t join you automatically</h1>
        <p className="mt-2 text-sm text-[#5B6B85]">
          {inviteCode ? "Try signing in again or ask the admin for a fresh invite code." : "Open a valid invite link to join a society."}
        </p>
        {error && <ErrorState message={error} />}
        <div className="mt-4 flex flex-wrap gap-3">
          <button className="secondary-btn" onClick={() => window.location.reload()}>
            <RefreshCw size={16} /> Try again
          </button>
          <Link className="secondary-btn" to="/">
            Go to dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
