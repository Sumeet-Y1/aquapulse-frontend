import { ArrowLeft, ArrowUpRight, BadgeInfo, Clock3, Copy, Pencil, Plus, QrCode, RefreshCw, Trash2, UserPlus, Droplets } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { SocietyForm, UnitForm } from "../components/Forms";
import { GlassCard } from "../components/GlassCard";
import { Modal } from "../components/Modal";
import { EmptyState, ErrorState, LoadingState } from "../components/Status";
import { getApiErrorMessage, getApiUrl, societiesApi, unitsApi } from "../services/api";
import type { InviteCodeResponse, RWHUnitResponse } from "../types/api";
import { useAuth } from "../context/AuthContext";
import { useSocieties } from "../context/SocietyContext";

type ModalMode = "edit" | "create-unit" | null;

export function SocietyDetailPage() {
  const navigate = useNavigate();
  const params = useParams();
  const routeSocietyId = Number(params.societyId);
  const { user } = useAuth();
  const { societies, selectedSocietyId, selectSociety, selectedSociety, loading, error, updateSociety, deleteSociety, canManageSocieties } =
    useSocieties();
  const [units, setUnits] = useState<RWHUnitResponse[]>([]);
  const [unitsLoading, setUnitsLoading] = useState(false);
  const [unitsError, setUnitsError] = useState("");
  const [modal, setModal] = useState<ModalMode>(null);
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState("");
  const [now, setNow] = useState(() => Date.now());
  const [standardCode, setStandardCode] = useState<InviteCodeResponse | null>(null);
  const [qrCode, setQrCode] = useState<InviteCodeResponse | null>(null);
  const [standardLoading, setStandardLoading] = useState(false);
  const [qrLoading, setQrLoading] = useState(false);
  const [standardError, setStandardError] = useState("");
  const [qrError, setQrError] = useState("");
  const [standardCopied, setStandardCopied] = useState(false);
  const [qrCopied, setQrCopied] = useState(false);

  const society = useMemo(() => {
    if (Number.isFinite(routeSocietyId)) {
      return societies.find((item) => item.id === routeSocietyId) ?? null;
    }
    return selectedSociety;
  }, [routeSocietyId, societies, selectedSociety]);

  const standardState = useMemo(() => {
    if (!standardCode) {
      return null;
    }
    return getCountdownState(standardCode.expiresAt, now);
  }, [now, standardCode]);

  const qrState = useMemo(() => {
    if (!qrCode) {
      return null;
    }
    return getCountdownState(qrCode.expiresAt, now);
  }, [now, qrCode]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    if (society && selectedSocietyId !== society.id) {
      selectSociety(society.id);
    }
  }, [selectedSocietyId, selectSociety, society]);

  useEffect(() => {
    if (!society) {
      setUnits([]);
      setUnitsError("");
      setStandardCode(null);
      setQrCode(null);
      setStandardError("");
      setQrError("");
      return;
    }

    let active = true;
    setUnitsLoading(true);
    setUnitsError("");

    void unitsApi
      .bySociety(society.id)
      .then((nextUnits) => {
        if (active) {
          setUnits(nextUnits);
        }
      })
      .catch((caught) => {
        if (active) {
          setUnitsError(getApiErrorMessage(caught, "Unable to load units for this society."));
        }
      })
      .finally(() => {
        if (active) {
          setUnitsLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [society]);

  const canManageRecords = user?.role === "ADMIN";

  if (loading) return <LoadingState />;

  if (!society) {
    return (
      <div className="grid gap-4">
        <Link to="/" className="chip w-fit">
          <ArrowLeft size={16} /> Back
        </Link>
        <ErrorState message={error || "You do not have access to that society."} />
      </div>
    );
  }

  const handleCopyStandardCode = async () => {
    if (!standardCode) {
      return;
    }
    await navigator.clipboard.writeText(standardCode.code);
    setStandardCopied(true);
    window.setTimeout(() => setStandardCopied(false), 1500);
  };

  const handleCopyQrCode = async () => {
    if (!qrCode) {
      return;
    }
    await navigator.clipboard.writeText(qrCode.code);
    setQrCopied(true);
    window.setTimeout(() => setQrCopied(false), 1500);
  };

  const handleGenerateStandardCode = async () => {
    setStandardLoading(true);
    setStandardError("");
    try {
      const nextCode = await societiesApi.generateInviteCode(society.id);
      setStandardCode(nextCode);
    } catch (caught) {
      setStandardError(getApiErrorMessage(caught, "Unable to generate a standard invite code."));
    } finally {
      setStandardLoading(false);
    }
  };

  const handleGenerateQrCode = async () => {
    setQrLoading(true);
    setQrError("");
    try {
      const nextCode = await societiesApi.generateQrCode(society.id);
      setQrCode(nextCode);
    } catch (caught) {
      setQrError(getApiErrorMessage(caught, "Unable to generate a QR invite code."));
    } finally {
      setQrLoading(false);
    }
  };

  const standardExpired = standardState?.expired ?? false;
  const qrExpired = qrState?.expired ?? false;

  return (
    <div className="grid gap-6">
      <Link to="/" className="chip w-fit">
        <ArrowLeft size={16} /> Back
      </Link>

      {error && <ErrorState message={error} />}
      {unitsError && <ErrorState message={unitsError} />}

      <section className="hero-panel min-h-[280px]">
        <div className="max-w-2xl">
          <p className="chip w-fit">{society.city || "Society view"}</p>
          <h1 className="mt-4 text-4xl font-bold md:text-6xl">{society.name}</h1>
          <p className="mt-4 max-w-2xl text-[#5B6B85]">{society.address}</p>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <GlassCard className="flex items-center gap-3 px-4 py-3">
              <UserPlus size={18} className="text-leaf" />
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-[#8FA4C0]">Membership</p>
                <p className="font-semibold">Invite codes are generated on demand</p>
              </div>
            </GlassCard>
            <GlassCard className="flex items-center gap-3 px-4 py-3">
              <BadgeInfo size={18} className="text-leaf" />
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-[#8FA4C0]">Sharing</p>
                <p className="font-semibold">Use standard or QR invites below</p>
              </div>
            </GlassCard>
          </div>
        </div>

        <GlassCard className="w-full p-5 md:w-80">
          <p className="text-sm text-[#5B6B85]">Units tracked</p>
          <strong className="mt-3 block text-5xl">{units.length}</strong>
          <p className="mt-3 text-sm text-[#5B6B85]">
            Members can join with a fresh standard code or a short-lived QR code. Admins can manage the society, units, and records.
          </p>
        </GlassCard>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <GlassCard className="p-5 md:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="chip w-fit">Standard invite code</p>
              <h2 className="mt-4 text-2xl font-semibold">Generate a 24-hour code</h2>
              <p className="mt-2 max-w-xl text-sm text-[#5B6B85]">
                Create a fresh code for remote sharing. Generating a new one immediately invalidates the previous standard code.
              </p>
            </div>
            <button className="secondary-btn" disabled={standardLoading} aria-busy={standardLoading} onClick={() => void handleGenerateStandardCode()}>
              <RefreshCw size={16} /> {standardCode ? "Generate new code" : "Generate invite code"}
            </button>
          </div>

          {standardError && <ErrorState message={standardError} />}

          {standardLoading ? (
            <div className="mt-6 rounded-3xl border border-dashed border-[#BFD7EC] bg-white/70 p-6 text-sm text-[#5B6B85]">
              Generating a new invite code...
            </div>
          ) : standardCode ? (
            <div className="mt-6 grid gap-4">
              {standardExpired ? (
                <div className="rounded-3xl border border-amber-200 bg-amber-50 px-4 py-5 text-sm text-amber-900">
                  This invite code has expired. Generate a new one to share access again.
                </div>
              ) : (
                <div className="rounded-3xl border border-[#D7E8F6] bg-white px-4 py-5">
                  <p className="text-xs uppercase tracking-[0.22em] text-[#8FA4C0]">Current code</p>
                  <p className="mt-3 break-all font-mono text-3xl font-semibold tracking-[0.2em] text-[#22314A] md:text-4xl">
                    {standardCode.code}
                  </p>
                </div>
              )}

              <div className="flex flex-wrap items-center gap-3">
                {!standardExpired && (
                  <button className="secondary-btn" onClick={handleCopyStandardCode}>
                    <Copy size={16} /> {standardCopied ? "Copied" : "Copy code"}
                  </button>
                )}
                <div className="rounded-full border border-[#D7E8F6] bg-[#F7FBFE] px-4 py-2 text-sm text-[#5B6B85]">
                  {standardExpired ? "Expired" : formatStandardCountdown(standardState?.remainingMs ?? 0)}
                </div>
                <div className="rounded-full border border-[#D7E8F6] bg-[#F7FBFE] px-4 py-2 text-sm text-[#5B6B85]">
                  Expires {standardExpired ? "now" : formatLocalDateTime(standardCode.expiresAt)}
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-6 rounded-3xl border border-dashed border-[#BFD7EC] bg-white/70 p-6 text-sm text-[#5B6B85]">
              No invite code is active right now. Generate one when you are ready to share access.
            </div>
          )}
        </GlassCard>

        <GlassCard className="p-5 md:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="chip w-fit">QR code</p>
              <h2 className="mt-4 text-2xl font-semibold">Generate a 5-minute QR invite</h2>
              <p className="mt-2 max-w-xl text-sm text-[#5B6B85]">
                Best for in-person sharing. The QR code expires quickly, so the screen switches to an expired state as soon as time runs out.
              </p>
            </div>
            <button className="secondary-btn" disabled={qrLoading} aria-busy={qrLoading} onClick={() => void handleGenerateQrCode()}>
              <QrCode size={16} /> {qrCode ? "Generate new QR code" : "Generate QR code"}
            </button>
          </div>

          {qrError && <ErrorState message={qrError} />}

          {qrLoading ? (
            <div className="mt-6 rounded-3xl border border-dashed border-[#BFD7EC] bg-white/70 p-6 text-sm text-[#5B6B85]">
              Generating a new QR code...
            </div>
          ) : qrCode ? (
            <div className="mt-6 grid gap-4">
              {qrExpired ? (
                <div className="rounded-[28px] border border-amber-200 bg-amber-50 p-6 text-center text-sm text-amber-900">
                  <p className="text-lg font-semibold">Expired</p>
                  <p className="mt-2">This QR code is no longer valid. Generate a new one to continue sharing access.</p>
                </div>
              ) : (
                <div className="rounded-[28px] border border-[#D7E8F6] bg-white p-5">
                  <div className="mx-auto grid w-full max-w-[320px] gap-4">
                    <div className="grid place-items-center rounded-[28px] bg-[#F7FBFE] p-5">
                      <img
                        alt="Society invite QR code"
                        className="h-[280px] w-[280px] max-w-full rounded-3xl bg-white p-4 shadow-[0_12px_32px_rgba(43,108,176,0.08)]"
                        src={getApiUrl(`/api/societies/qr-image/${encodeURIComponent(qrCode.code)}`)}
                      />
                    </div>
                    <div className="text-center">
                      <p className="text-xs uppercase tracking-[0.22em] text-[#8FA4C0]">Scan or share</p>
                      <p className="mt-2 font-mono text-lg font-semibold tracking-[0.2em] text-[#22314A]">{qrCode.code}</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-3">
                  {!qrExpired && (
                    <button className="secondary-btn" onClick={handleCopyQrCode}>
                      <Copy size={16} /> {qrCopied ? "Copied" : "Copy code"}
                    </button>
                  )}
                  <div className="rounded-full border border-[#D7E8F6] bg-[#F7FBFE] px-4 py-2 text-sm text-[#5B6B85]">
                    <Clock3 size={15} className="mr-1 inline-block text-leaf" />
                    {qrExpired ? "Expired" : formatQrCountdown(qrState?.remainingMs ?? 0)}
                  </div>
                </div>
                <button className="secondary-btn" disabled={qrLoading} aria-busy={qrLoading} onClick={() => void handleGenerateQrCode()}>
                  <RefreshCw size={16} /> {qrExpired ? "Generate new QR code" : "Refresh QR code"}
                </button>
              </div>

              <p className="text-sm text-[#5B6B85]">
                Expires {qrExpired ? "now" : formatLocalDateTime(qrCode.expiresAt)}. A new QR code replaces the previous one immediately.
              </p>
            </div>
          ) : (
            <div className="mt-6 rounded-3xl border border-dashed border-[#BFD7EC] bg-white/70 p-6 text-sm text-[#5B6B85]">
              No QR code is active right now. Generate one when residents are ready to scan and join.
            </div>
          )}
        </GlassCard>
      </section>

      <section className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold">RWH units</h2>
          <p className="text-sm text-[#5B6B85]">View the units for this society.</p>
        </div>
        {canManageRecords && (
          <button className="primary-btn" onClick={() => setModal("create-unit")}>
            <Plus size={18} /> Add unit
          </button>
        )}
      </section>

      <section className="flex flex-wrap gap-3">
        {canManageSocieties && (
          <>
            <button className="secondary-btn" onClick={() => setModal("edit")}>
              <Pencil size={16} /> Edit society
            </button>
            <button
              className="secondary-btn"
              onClick={async () => {
                if (!window.confirm(`Delete ${society.name}?`)) {
                  return;
                }
                try {
                  await deleteSociety(society.id);
                  navigate("/");
                } catch (caught) {
                  setModalError(getApiErrorMessage(caught, "Unable to delete this society."));
                }
              }}
            >
              <Trash2 size={16} /> Delete
            </button>
          </>
        )}
      </section>

      {unitsLoading ? (
        <LoadingState label="Loading units..." />
      ) : units.length === 0 ? (
        <EmptyState title="No units yet" body="Create the first harvesting unit for this society." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {units.map((unit) => (
            <Link key={unit.id} to={`/units/${unit.id}`} className="glass-card group p-5">
              <div className="flex items-start justify-between">
                <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#EAF4FB] text-leaf">
                  <Droplets size={21} />
                </span>
                <ArrowUpRight className="text-[#8FA4C0] transition group-hover:translate-x-1 group-hover:-translate-y-1 group-hover:text-leaf" size={18} />
              </div>
              <h3 className="mt-5 text-xl font-semibold">Unit #{unit.id}</h3>
              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <Metric label="Tank" value={`${unit.tankCapacityLiters.toLocaleString()} L`} />
                <Metric label="Rooftop" value={`${unit.rooftopAreaSqm.toLocaleString()} sqm`} />
              </div>
              <p className="mt-5 text-xs uppercase tracking-[0.22em] text-sage">Installed {unit.installDate || "date pending"}</p>
            </Link>
          ))}
        </div>
      )}

      {modal && (
        <Modal title={modal === "edit" ? "Edit society" : "Add unit"} onClose={() => setModal(null)}>
          {modal === "edit" ? (
            <SocietyForm
              initialValues={{ name: society.name, address: society.address, city: society.city || "" }}
              error={modalError}
              isSaving={saving}
              submitLabel="Save changes"
              onSubmit={async (payload) => {
                setSaving(true);
                setModalError("");
                try {
                  await updateSociety(society.id, payload);
                  setModal(null);
                } catch (caught) {
                  setModalError(getApiErrorMessage(caught, "Unable to update this society."));
                } finally {
                  setSaving(false);
                }
              }}
            />
          ) : (
            <UnitForm
              societyId={society.id}
              isSaving={saving}
              onSubmit={async (payload) => {
                setSaving(true);
                setModalError("");
                try {
                  await unitsApi.create(payload);
                  setModal(null);
                  setUnits(await unitsApi.bySociety(society.id));
                } catch (caught) {
                  setModalError(getApiErrorMessage(caught, "Unable to create this unit."));
                } finally {
                  setSaving(false);
                }
              }}
            />
          )}
          {modalError && <ErrorState message={modalError} />}
        </Modal>
      )}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white/8 p-3">
      <p className="text-xs text-[#8FA4C0]">{label}</p>
      <p className="mt-1 font-semibold">{value}</p>
    </div>
  );
}

function getCountdownState(expiresAt: string, now: number) {
  const expiresAtMs = new Date(expiresAt).getTime();
  const remainingMs = Math.max(0, expiresAtMs - now);
  return {
    expired: remainingMs <= 0,
    remainingMs,
  };
}

function formatStandardCountdown(remainingMs: number) {
  const remainingMinutes = Math.ceil(remainingMs / 60000);
  if (remainingMinutes <= 0) {
    return "Expired";
  }

  const hours = Math.floor(remainingMinutes / 60);
  const minutes = remainingMinutes % 60;

  if (hours === 0) {
    return `Expires in ${minutes}m`;
  }

  return `Expires in ${hours}h ${String(minutes).padStart(2, "0")}m`;
}

function formatQrCountdown(remainingMs: number) {
  const remainingSeconds = Math.ceil(remainingMs / 1000);
  if (remainingSeconds <= 0) {
    return "Expired";
  }

  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")} remaining`;
}

function formatLocalDateTime(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
