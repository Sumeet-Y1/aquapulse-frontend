import { FormEvent, useEffect, useState } from "react";
import type { MaintenanceLogRequest, MaintenanceStatus, RWHUnitRequest, SocietyRequest, WaterReadingRequest } from "../types/api";

export function SocietyForm({
  initialValues,
  submitLabel,
  error,
  onSubmit,
  isSaving,
}: {
  initialValues?: SocietyRequest;
  submitLabel?: string;
  error?: string;
  onSubmit: (payload: SocietyRequest) => Promise<void>;
  isSaving: boolean;
}) {
  const [payload, setPayload] = useState<SocietyRequest>(initialValues ?? { name: "", address: "", city: "" });

  useEffect(() => {
    if (initialValues) {
      setPayload({
        name: initialValues.name ?? "",
        address: initialValues.address ?? "",
        city: initialValues.city ?? "",
      });
    }
  }, [initialValues]);

  return (
    <form className="form-grid" onSubmit={(event) => handleSubmit(event, () => onSubmit(payload))}>
      <input required placeholder="Society name" value={payload.name} onChange={(event) => setPayload({ ...payload, name: event.target.value })} />
      <input required placeholder="Address" value={payload.address} onChange={(event) => setPayload({ ...payload, address: event.target.value })} />
      <input placeholder="City" value={payload.city} onChange={(event) => setPayload({ ...payload, city: event.target.value })} />
      {error && <p className="rounded-2xl bg-red-950/50 px-4 py-3 text-sm text-red-50">{error}</p>}
      <button className="primary-btn" disabled={isSaving}>{isSaving ? "Saving..." : submitLabel ?? "Create society"}</button>
    </form>
  );
}

export function JoinSocietyForm({
  error,
  onSubmit,
  isSaving,
}: {
  error?: string;
  onSubmit: (inviteCode: string) => Promise<void>;
  isSaving: boolean;
}) {
  const [inviteCode, setInviteCode] = useState("");
  return (
    <form className="form-grid" onSubmit={(event) => handleSubmit(event, () => onSubmit(inviteCode.trim()))}>
      <input
        required
        placeholder="Invite code"
        value={inviteCode}
        onChange={(event) => setInviteCode(event.target.value.toUpperCase())}
      />
      <p className="text-sm text-white/55">Enter the invite code shared by the society admin.</p>
      {error && <p className="rounded-2xl bg-red-950/50 px-4 py-3 text-sm text-red-50">{error}</p>}
      <button className="primary-btn" disabled={isSaving}>{isSaving ? "Joining..." : "Join society"}</button>
    </form>
  );
}

export function UnitForm({
  societyId,
  onSubmit,
  isSaving,
}: {
  societyId: number;
  onSubmit: (payload: RWHUnitRequest) => Promise<void>;
  isSaving: boolean;
}) {
  const [payload, setPayload] = useState<RWHUnitRequest>({
    tankCapacityLiters: 10000,
    rooftopAreaSqm: 500,
    installDate: new Date().toISOString().slice(0, 10),
    societyId,
  });
  return (
    <form className="form-grid" onSubmit={(event) => handleSubmit(event, () => onSubmit(payload))}>
      <input type="number" min="1" placeholder="Tank capacity (liters)" value={payload.tankCapacityLiters} onChange={(event) => setPayload({ ...payload, tankCapacityLiters: Number(event.target.value) })} />
      <input type="number" min="1" placeholder="Rooftop area (sqm)" value={payload.rooftopAreaSqm} onChange={(event) => setPayload({ ...payload, rooftopAreaSqm: Number(event.target.value) })} />
      <input type="date" value={payload.installDate} onChange={(event) => setPayload({ ...payload, installDate: event.target.value })} />
      <button className="primary-btn" disabled={isSaving}>{isSaving ? "Saving..." : "Add unit"}</button>
    </form>
  );
}

export function ReadingForm({
  unitId,
  onSubmit,
  isSaving,
}: {
  unitId: number;
  onSubmit: (payload: WaterReadingRequest) => Promise<void>;
  isSaving: boolean;
}) {
  const [payload, setPayload] = useState<WaterReadingRequest>({
    readingDate: new Date().toISOString().slice(0, 10),
    waterCollectedLiters: 1200,
    storageLevelPercent: 62,
    rainfallMm: 8,
    unitId,
  });
  return (
    <form className="form-grid" onSubmit={(event) => handleSubmit(event, () => onSubmit(payload))}>
      <input type="date" value={payload.readingDate} onChange={(event) => setPayload({ ...payload, readingDate: event.target.value })} />
      <input type="number" min="0" placeholder="Water collected" value={payload.waterCollectedLiters} onChange={(event) => setPayload({ ...payload, waterCollectedLiters: Number(event.target.value) })} />
      <input type="number" min="0" max="100" placeholder="Storage level %" value={payload.storageLevelPercent} onChange={(event) => setPayload({ ...payload, storageLevelPercent: Number(event.target.value) })} />
      <input type="number" min="0" placeholder="Rainfall mm" value={payload.rainfallMm ?? ""} onChange={(event) => setPayload({ ...payload, rainfallMm: Number(event.target.value) })} />
      <button className="primary-btn" disabled={isSaving}>{isSaving ? "Saving..." : "Log reading"}</button>
    </form>
  );
}

export function MaintenanceForm({
  unitId,
  onSubmit,
  isSaving,
}: {
  unitId: number;
  onSubmit: (payload: MaintenanceLogRequest) => Promise<void>;
  isSaving: boolean;
}) {
  const [status, setStatus] = useState<MaintenanceStatus>("PENDING");
  const [payload, setPayload] = useState({
    maintenanceDate: new Date().toISOString().slice(0, 10),
    type: "Filter inspection",
    notes: "",
    nextDueDate: "",
    unitId,
  });
  return (
    <form className="form-grid" onSubmit={(event) => handleSubmit(event, () => onSubmit({ ...payload, status, nextDueDate: payload.nextDueDate || undefined }))}>
      <input type="date" value={payload.maintenanceDate} onChange={(event) => setPayload({ ...payload, maintenanceDate: event.target.value })} />
      <input required placeholder="Maintenance type" value={payload.type} onChange={(event) => setPayload({ ...payload, type: event.target.value })} />
      <select value={status} onChange={(event) => setStatus(event.target.value as MaintenanceStatus)}>
        <option value="PENDING">Pending</option>
        <option value="COMPLETED">Completed</option>
        <option value="OVERDUE">Overdue</option>
      </select>
      <input type="date" value={payload.nextDueDate} onChange={(event) => setPayload({ ...payload, nextDueDate: event.target.value })} />
      <textarea placeholder="Notes" value={payload.notes} onChange={(event) => setPayload({ ...payload, notes: event.target.value })} />
      <button className="primary-btn" disabled={isSaving}>{isSaving ? "Saving..." : "Add maintenance"}</button>
    </form>
  );
}

function handleSubmit(event: FormEvent, action: () => Promise<void>) {
  event.preventDefault();
  void action();
}
