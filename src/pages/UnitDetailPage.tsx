import { ArrowLeft, Brain, CloudRain, Plus, Wrench } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { MaintenanceForm, ReadingForm } from "../components/Forms";
import { GlassCard } from "../components/GlassCard";
import { Modal } from "../components/Modal";
import { EmptyState, ErrorState, LoadingState } from "../components/Status";
import { getApiErrorMessage, insightsApi, maintenanceApi, readingsApi, unitsApi, weatherApi } from "../services/api";
import type {
  MaintenanceLogResponse,
  RWHUnitResponse,
  WaterReadingResponse,
  WeatherRainfallResponse,
} from "../types/api";
import { useAuth } from "../context/AuthContext";

type ModalMode = "reading" | "maintenance" | null;

export function UnitDetailPage() {
  const unitId = Number(useParams().unitId);
  const { user } = useAuth();
  const canManageRecords = user?.role === "ADMIN";
  const [unit, setUnit] = useState<RWHUnitResponse | null>(null);
  const [readings, setReadings] = useState<WaterReadingResponse[]>([]);
  const [maintenance, setMaintenance] = useState<MaintenanceLogResponse[]>([]);
  const [weather, setWeather] = useState<WeatherRainfallResponse | null>(null);
  const [insight, setInsight] = useState("");
  const [insightError, setInsightError] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingError, setLoadingError] = useState("");
  const [saving, setSaving] = useState(false);
  const [modal, setModal] = useState<ModalMode>(null);
  const [modalError, setModalError] = useState("");

  const load = async () => {
    setLoading(true);
    setLoadingError("");
    try {
      const nextUnit = await unitsApi.get(unitId);
      const [nextReadings, nextMaintenance] = await Promise.all([readingsApi.byUnit(unitId), maintenanceApi.byUnit(unitId)]);
      setUnit(nextUnit);
      setReadings(nextReadings);
      setMaintenance(nextMaintenance);
      if (nextUnit.societyName) {
        weatherApi.rainfall(nextUnit.societyName).then(setWeather).catch(() => setWeather(null));
      }
    } catch (caught) {
      setLoadingError(getApiErrorMessage(caught, "Unable to load this unit."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [unitId]);

  const latest = readings[readings.length - 1];
  const chartData = useMemo(
    () => readings.map((reading) => ({
      date: reading.readingDate.slice(5),
      storage: reading.storageLevelPercent,
      collected: reading.waterCollectedLiters,
    })),
    [readings],
  );

  if (loading) return <LoadingState />;

  if (!unit) {
    return (
      <div className="grid gap-4">
        <Link to="/" className="chip w-fit">
          <ArrowLeft size={16} /> Back
        </Link>
        <ErrorState message={loadingError || "You do not have access to that unit."} />
      </div>
    );
  }

  const submitReading = async (payload: Parameters<typeof readingsApi.create>[0]) => {
    setSaving(true);
    setModalError("");
    try {
      await readingsApi.create(payload);
      setModal(null);
      await load();
    } catch (caught) {
      setModalError(getApiErrorMessage(caught, "Unable to save this reading."));
    } finally {
      setSaving(false);
    }
  };

  const submitMaintenance = async (payload: Parameters<typeof maintenanceApi.create>[0]) => {
    setSaving(true);
    setModalError("");
    try {
      await maintenanceApi.create(payload);
      setModal(null);
      await load();
    } catch (caught) {
      setModalError(getApiErrorMessage(caught, "Unable to save this maintenance log."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid gap-6">
      <Link to={`/societies/${unit.societyId}`} className="chip w-fit">
        <ArrowLeft size={16} /> Back
      </Link>

      {loadingError && <ErrorState message={loadingError} />}

      <section className="hero-panel min-h-[280px]">
        <div>
          <p className="chip w-fit">{unit.societyName}</p>
          <h1 className="mt-4 text-4xl font-bold md:text-6xl">Unit #{unit.id}</h1>
          <p className="mt-4 max-w-xl text-[#5B6B85]">
            {unit.tankCapacityLiters.toLocaleString()} L tank capacity across {unit.rooftopAreaSqm.toLocaleString()} sqm rooftop catchment.
          </p>
        </div>
        <GlassCard className="w-full p-5 md:w-80">
          <p className="text-sm text-[#5B6B85]">Current storage</p>
          <strong className="mt-3 block text-5xl">{latest ? `${latest.storageLevelPercent}%` : "--"}</strong>
          <p className="mt-3 text-sm text-[#5B6B85]">
            {latest ? `${latest.waterCollectedLiters.toLocaleString()} L collected on ${latest.readingDate}` : "Log a reading to unlock storage trends."}
          </p>
        </GlassCard>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.6fr_0.9fr]">
        <GlassCard className="p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-semibold">Water readings</h2>
            {canManageRecords ? (
              <button className="primary-btn" onClick={() => setModal("reading")}>
                <Plus size={18} /> Add reading
              </button>
            ) : (
              <span className="chip">Read only</span>
            )}
          </div>
          <div className="mt-5 h-72">
            {chartData.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid stroke="rgba(255,255,255,0.12)" vertical={false} />
                  <XAxis dataKey="date" stroke="rgba(255,255,255,0.5)" />
                  <YAxis stroke="rgba(255,255,255,0.5)" />
                  <Tooltip contentStyle={{ background: "#1A1F1A", border: "1px solid rgba(255,255,255,.16)", borderRadius: 16 }} />
                  <Line type="monotone" dataKey="storage" stroke="#A8E063" strokeWidth={3} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState title="No readings" body="Log the first reading to draw the storage curve." />
            )}
          </div>
        </GlassCard>

        <div className="grid gap-4">
          <GlassCard className="p-5">
            <div className="flex items-center gap-3">
              <CloudRain className="text-leaf" />
              <h2 className="text-lg font-semibold">Rainfall</h2>
            </div>
            <p className="mt-4 text-4xl font-bold">{weather ? `${weather.rainfallMm} mm` : "--"}</p>
            <p className="mt-2 text-sm text-[#5B6B85]">{weather ? weather.city : "Weather unavailable for this society context."}</p>
          </GlassCard>
          <GlassCard className="p-5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <Brain className="text-leaf" />
                <h2 className="text-lg font-semibold">AI insight</h2>
              </div>
              <button
                className="secondary-btn"
                onClick={async () => {
                  try {
                    setInsightError("");
                    setInsight((await insightsApi.byUnit(unitId)).insight);
                  } catch (caught) {
                    setInsightError(getApiErrorMessage(caught, "Unable to fetch the AI insight."));
                  }
                }}
              >
                Refresh
              </button>
            </div>
            <p className="mt-4 text-sm leading-6 text-[#5B6B85]">{insight || "Fetch a Groq-powered operational summary for this unit."}</p>
            {insightError && <p className="mt-3 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{insightError}</p>}
          </GlassCard>
        </div>
      </section>

      <GlassCard className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Wrench className="text-leaf" />
            <h2 className="text-xl font-semibold">Maintenance</h2>
          </div>
          {canManageRecords ? (
            <button className="primary-btn" onClick={() => setModal("maintenance")}>
              <Plus size={18} /> Add log
            </button>
          ) : (
            <span className="chip">Read only</span>
          )}
        </div>
        <div className="mt-5 grid gap-3">
          {maintenance.length ? (
            maintenance.map((log) => (
              <div key={log.id} className="rounded-3xl bg-white/85 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <strong>{log.type}</strong>
                  <span className="chip">{log.status}</span>
                </div>
                <p className="mt-2 text-sm text-[#5B6B85]">{log.notes || "No notes added."}</p>
                <p className="mt-3 text-xs uppercase tracking-[0.18em] text-sage">
                  {log.maintenanceDate}
                  {log.nextDueDate ? ` -> due ${log.nextDueDate}` : ""}
                </p>
              </div>
            ))
          ) : (
            <EmptyState title="No maintenance logs" body="Add inspection, cleaning, or repair records here." />
          )}
        </div>
      </GlassCard>

      {modal && (
        <Modal title={modal === "reading" ? "Log water reading" : "Add maintenance log"} onClose={() => setModal(null)}>
          {modal === "reading" ? (
            <ReadingForm unitId={unitId} isSaving={saving} onSubmit={submitReading} />
          ) : (
            <MaintenanceForm unitId={unitId} isSaving={saving} onSubmit={submitMaintenance} />
          )}
          {modalError && <ErrorState message={modalError} />}
        </Modal>
      )}
    </div>
  );
}
