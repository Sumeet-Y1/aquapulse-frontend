import { ArrowUpRight, Building2, Copy, Plus, Waves } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Area, AreaChart, ResponsiveContainer } from "recharts";
import { JoinSocietyForm, SocietyForm } from "../components/Forms";
import { GlassCard } from "../components/GlassCard";
import { Modal } from "../components/Modal";
import { SocietySwitcher } from "../components/SocietySwitcher";
import { EmptyState, ErrorState, LoadingState } from "../components/Status";
import { getApiErrorMessage, readingsApi, unitsApi } from "../services/api";
import type { RWHUnitResponse, WaterReadingResponse } from "../types/api";
import { useAuth } from "../context/AuthContext";
import { useSocieties } from "../context/SocietyContext";

type ModalMode = "create" | "join" | null;

export function DashboardPage() {
  const { user } = useAuth();
  const { societies, selectedSociety, loading, error, refreshSocieties, createSociety, joinSociety, canManageSocieties } =
    useSocieties();
  const [units, setUnits] = useState<RWHUnitResponse[]>([]);
  const [unitReadings, setUnitReadings] = useState<WaterReadingResponse[][]>([]);
  const [loadingUnits, setLoadingUnits] = useState(false);
  const [unitsError, setUnitsError] = useState("");
  const [modal, setModal] = useState<ModalMode>(null);
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState("");
  const [notice, setNotice] = useState<null | { title: string; detail: string; inviteCode?: string }>(null);
  const [editingInviteCopied, setEditingInviteCopied] = useState(false);

  useEffect(() => {
    if (!selectedSociety) {
      setUnits([]);
      setUnitReadings([]);
      setUnitsError("");
      return;
    }

    let active = true;
    setLoadingUnits(true);
    setUnitsError("");

    void (async () => {
      try {
        const nextUnits = await unitsApi.bySociety(selectedSociety.id);
        const nextReadings = await Promise.all(
          nextUnits.map((unit) => readingsApi.byUnit(unit.id).catch(() => [] as WaterReadingResponse[])),
        );

        if (!active) {
          return;
        }

        setUnits(nextUnits);
        setUnitReadings(nextReadings);
      } catch (caught) {
        if (active) {
          setUnitsError(getApiErrorMessage(caught, "Unable to load units for this society."));
        }
      } finally {
        if (active) {
          setLoadingUnits(false);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [selectedSociety]);

  const stats = useMemo(() => {
    const latestReadings = unitReadings.map((series) => series[series.length - 1]).filter(Boolean);
    const avgStorage =
      latestReadings.length > 0
        ? Math.round(latestReadings.reduce((sum, reading) => sum + reading.storageLevelPercent, 0) / latestReadings.length)
        : null;
    const totalCapacity = units.reduce((sum, unit) => sum + unit.tankCapacityLiters, 0);
    return {
      avgStorage,
      totalCapacity,
      latestReadingLabel: latestReadings[0]
        ? `${latestReadings[0].storageLevelPercent.toFixed(0)}% on ${latestReadings[0].readingDate}`
        : "No readings logged yet",
    };
  }, [unitReadings, units]);

  if (loading) return <LoadingState />;

  return (
    <div className="grid gap-6">
      <section className="hero-panel">
        <div className="max-w-2xl">
          <p className="chip w-fit">Today&apos;s overview</p>
          <h1 className="mt-4 max-w-xl text-4xl font-bold leading-tight md:text-6xl">
            Welcome back, {user?.fullName?.split(" ")[0] ?? "there"}.
          </h1>
          <p className="mt-4 max-w-xl text-white/70">
            Manage one society at a time, switch between memberships, and keep your rainwater system view focused.
          </p>
          <div className="mt-6">
            <SocietySwitcher />
          </div>
        </div>
        <GlassCard className="w-full p-5 md:w-80">
          <div className="flex items-center justify-between">
            <p className="text-sm text-white/65">Selected society</p>
            <Building2 size={18} className="text-leaf" />
          </div>
          <strong className="mt-3 block text-2xl">{selectedSociety?.name ?? "None selected"}</strong>
          <p className="mt-2 text-sm text-white/60">{selectedSociety?.address ?? "Join or create a society to get started."}</p>
          <div className="mt-4 flex items-center gap-2">
            {canManageSocieties && (
              <button className="secondary-btn" onClick={() => setModal("create")}>
                <Plus size={16} /> Create
              </button>
            )}
            <button className="secondary-btn" onClick={() => setModal("join")}>
              <Plus size={16} /> Join
            </button>
          </div>
        </GlassCard>
      </section>

      {error && <ErrorState message={error} />}
      {notice && (
        <div className="rounded-3xl border border-leaf/30 bg-leaf/10 px-5 py-4 text-sm text-mist">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-semibold">{notice.title}</p>
              <p className="mt-1 text-white/75">{notice.detail}</p>
            </div>
            {notice.inviteCode && (
              <button
                className="secondary-btn"
                onClick={async () => {
                  await navigator.clipboard.writeText(notice.inviteCode!);
                  setEditingInviteCopied(true);
                  window.setTimeout(() => setEditingInviteCopied(false), 1500);
                }}
              >
                <Copy size={16} /> {editingInviteCopied ? "Copied" : notice.inviteCode}
              </button>
            )}
          </div>
        </div>
      )}

      {selectedSociety ? (
        <>
          <section className="grid gap-4 md:grid-cols-3">
            <Stat title="Units" value={units.length} />
            <Stat title="Total capacity" value={`${stats.totalCapacity.toLocaleString()} L`} />
            <Stat title="Avg storage" value={stats.avgStorage == null ? "--" : `${stats.avgStorage}%`} />
          </section>

          <section className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-2xl font-semibold">{selectedSociety.name}</h2>
              <p className="text-sm text-white/55">{selectedSociety.address}</p>
            </div>
            <Link className="chip" to={`/societies/${selectedSociety.id}`}>
              Open society view
            </Link>
          </section>

          <GlassCard className="p-5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <Waves className="text-leaf" size={18} />
                <div>
                  <h3 className="text-lg font-semibold">Recent signal</h3>
                  <p className="text-sm text-white/55">{stats.latestReadingLabel}</p>
                </div>
              </div>
              <div className="hidden md:block">
                <AreaSpark />
              </div>
            </div>
          </GlassCard>

          {loadingUnits ? (
            <LoadingState label="Loading units for the selected society..." />
          ) : unitsError ? (
            <ErrorState message={unitsError} />
          ) : units.length === 0 ? (
            <EmptyState
              title="No units yet"
              body={canManageSocieties ? "Create a unit to start logging storage and maintenance." : "This society currently has no units to view."}
            />
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {units.map((unit) => {
                const latest = unitReadings.find((series) => series.length > 0 && series[series.length - 1].unitId === unit.id)?.slice(-1)[0];
                return (
                  <Link key={unit.id} to={`/units/${unit.id}`} className="glass-card group p-5">
                    <div className="flex items-start justify-between">
                      <span className="grid h-11 w-11 place-items-center rounded-2xl bg-leaf/20 text-leaf">
                        <Building2 size={21} />
                      </span>
                      <ArrowUpRight className="text-white/45 transition group-hover:translate-x-1 group-hover:-translate-y-1 group-hover:text-leaf" size={18} />
                    </div>
                    <h3 className="mt-5 text-xl font-semibold">Unit #{unit.id}</h3>
                    <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                      <Metric label="Tank" value={`${unit.tankCapacityLiters.toLocaleString()} L`} />
                      <Metric label="Rooftop" value={`${unit.rooftopAreaSqm.toLocaleString()} sqm`} />
                    </div>
                    <p className="mt-4 text-sm text-white/65">
                      {latest ? `Storage ${latest.storageLevelPercent.toFixed(0)}%` : "No readings yet"}
                    </p>
                    <p className="mt-5 text-xs uppercase tracking-[0.22em] text-sage">Installed {unit.installDate || "date pending"}</p>
                  </Link>
                );
              })}
            </div>
          )}
        </>
      ) : (
        <EmptyState
          title={societies.length === 0 ? "No societies yet" : "Select a society"}
          body={
            societies.length === 0
              ? canManageSocieties
                ? "Create a society or join one with an invite code."
                : "Join a society with an invite code to see your dashboard."
              : "Choose a society above to view its units and readings."
          }
        />
      )}

      <section className="flex flex-wrap items-center gap-3">
        {canManageSocieties && (
          <button className="primary-btn" onClick={() => setModal("create")}>
            <Plus size={18} /> Create society
          </button>
        )}
        <button className="secondary-btn" onClick={() => setModal("join")}>
          <Plus size={18} /> Join society
        </button>
        <button className="secondary-btn" onClick={refreshSocieties}>
          Refresh
        </button>
      </section>

      {modal && (
        <Modal title={modal === "create" ? "Create society" : "Join society"} onClose={() => setModal(null)}>
          {modal === "create" ? (
            <SocietyForm
              error={modalError}
              isSaving={saving}
              submitLabel="Create society"
              onSubmit={async (payload) => {
                setSaving(true);
                setModalError("");
                try {
                  const created = await createSociety(payload);
                  setNotice({
                    title: `Created ${created.name}`,
                    detail: `Invite code ready to share with residents.`,
                    inviteCode: created.inviteCode,
                  });
                  setModal(null);
                } catch (caught) {
                  setModalError(getApiErrorMessage(caught, "Unable to create this society."));
                } finally {
                  setSaving(false);
                }
              }}
            />
          ) : (
            <JoinSocietyForm
              error={modalError}
              isSaving={saving}
              onSubmit={async (inviteCode) => {
                setSaving(true);
                setModalError("");
                try {
                  const joined = await joinSociety(inviteCode);
                  setNotice({
                    title: `Joined ${joined.name}`,
                    detail: "The society has been added to your membership list.",
                  });
                  setModal(null);
                } catch (caught) {
                  setModalError(getApiErrorMessage(caught, "Unable to join with that invite code."));
                } finally {
                  setSaving(false);
                }
              }}
            />
          )}
        </Modal>
      )}
    </div>
  );
}

function Stat({ title, value }: { title: string; value: number | string }) {
  return (
    <GlassCard className="p-5">
      <p className="text-sm text-white/60">{title}</p>
      <strong className="mt-3 block text-3xl">{value}</strong>
    </GlassCard>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white/8 p-3">
      <p className="text-xs text-white/45">{label}</p>
      <p className="mt-1 font-semibold">{value}</p>
    </div>
  );
}

function AreaSpark() {
  const data = [36, 42, 39, 51, 58, 54, 67].map((value, index) => ({ index, value }));
  return (
    <div className="h-16 w-36">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <Area type="monotone" dataKey="value" stroke="#A8E063" fill="#A8E06333" strokeWidth={3} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
