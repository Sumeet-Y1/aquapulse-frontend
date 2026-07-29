import { ArrowLeft, ArrowUpRight, Copy, Pencil, Plus, Trash2, UserPlus, Droplets } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { SocietyForm, UnitForm } from "../components/Forms";
import { GlassCard } from "../components/GlassCard";
import { Modal } from "../components/Modal";
import { EmptyState, ErrorState, LoadingState } from "../components/Status";
import { getApiErrorMessage, unitsApi } from "../services/api";
import type { RWHUnitResponse } from "../types/api";
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
  const [copied, setCopied] = useState(false);

  const society = useMemo(() => {
    if (Number.isFinite(routeSocietyId)) {
      return societies.find((item) => item.id === routeSocietyId) ?? null;
    }
    return selectedSociety;
  }, [routeSocietyId, societies, selectedSociety]);

  useEffect(() => {
    if (society && selectedSocietyId !== society.id) {
      selectSociety(society.id);
    }
  }, [selectedSocietyId, selectSociety, society]);

  useEffect(() => {
    if (!society) {
      setUnits([]);
      setUnitsError("");
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

  const handleCopy = async () => {
    await navigator.clipboard.writeText(society.inviteCode);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  };

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

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <GlassCard className="flex items-center gap-3 px-4 py-3">
              <UserPlus size={18} className="text-leaf" />
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-[#8FA4C0]">Invite code</p>
                <p className="font-semibold">{society.inviteCode}</p>
              </div>
            </GlassCard>
            <button className="secondary-btn" onClick={handleCopy}>
              <Copy size={16} /> {copied ? "Copied" : "Copy code"}
            </button>
          </div>
        </div>

        <GlassCard className="w-full p-5 md:w-80">
          <p className="text-sm text-[#5B6B85]">Units tracked</p>
          <strong className="mt-3 block text-5xl">{units.length}</strong>
          <p className="mt-3 text-sm text-[#5B6B85]">
            Members can join with this invite code. Admins can add and edit the society, units, and records.
          </p>
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
