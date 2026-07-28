import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { getApiErrorMessage, societiesApi } from "../services/api";
import type { SocietyRequest, SocietyResponse } from "../types/api";
import { useAuth } from "./AuthContext";

const SELECTED_KEY = "aquapulse_selected_society";
const selectionMemory = new Map<string, string>();

function readSelectedSocietyId() {
  try {
    const raw = window.localStorage.getItem(SELECTED_KEY);
    return raw ? Number(raw) : null;
  } catch {
    const raw = selectionMemory.get(SELECTED_KEY);
    return raw ? Number(raw) : null;
  }
}

function writeSelectedSocietyId(id: number | null) {
  if (id == null) {
    selectionMemory.delete(SELECTED_KEY);
    try {
      window.localStorage.removeItem(SELECTED_KEY);
    } catch {
      // Storage can be unavailable in embedded environments.
    }
    return;
  }

  selectionMemory.set(SELECTED_KEY, String(id));
  try {
    window.localStorage.setItem(SELECTED_KEY, String(id));
  } catch {
    // Storage can be unavailable in embedded environments.
  }
}

interface SocietyContextValue {
  societies: SocietyResponse[];
  selectedSocietyId: number | null;
  selectedSociety: SocietyResponse | null;
  loading: boolean;
  error: string;
  refreshSocieties: () => Promise<void>;
  selectSociety: (id: number | null) => void;
  createSociety: (payload: SocietyRequest) => Promise<SocietyResponse>;
  joinSociety: (inviteCode: string) => Promise<SocietyResponse>;
  updateSociety: (id: number, payload: SocietyRequest) => Promise<SocietyResponse>;
  deleteSociety: (id: number) => Promise<void>;
  canManageSocieties: boolean;
}

const SocietyContext = createContext<SocietyContextValue | null>(null);

export function SocietyProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [societies, setSocieties] = useState<SocietyResponse[]>([]);
  const [selectedSocietyId, setSelectedSocietyId] = useState<number | null>(() => readSelectedSocietyId());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const syncSocieties = useCallback(async () => {
    if (!user) {
      setSocieties([]);
      setSelectedSocietyId(null);
      setLoading(false);
      setError("");
      writeSelectedSocietyId(null);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const nextSocieties = await societiesApi.my();
      setSocieties(nextSocieties);
      setSelectedSocietyId((current) => {
        const stored = readSelectedSocietyId();
        const candidate = stored ?? current;
        const chosen = candidate != null && nextSocieties.some((society) => society.id === candidate)
          ? candidate
          : nextSocieties[0]?.id ?? null;
        writeSelectedSocietyId(chosen);
        return chosen;
      });
    } catch (caught) {
      setError(getApiErrorMessage(caught, "Unable to load your societies."));
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void syncSocieties();
  }, [syncSocieties]);

  const selectSociety = useCallback((id: number | null) => {
    setSelectedSocietyId(id);
    writeSelectedSocietyId(id);
  }, []);

  const upsertSociety = useCallback((nextSociety: SocietyResponse) => {
    setSocieties((current) => {
      const existingIndex = current.findIndex((society) => society.id === nextSociety.id);
      if (existingIndex === -1) {
        return [nextSociety, ...current];
      }
      const next = [...current];
      next[existingIndex] = nextSociety;
      return next;
    });
  }, []);

  const createSociety = useCallback(async (payload: SocietyRequest) => {
    const created = await societiesApi.create(payload);
    upsertSociety(created);
    selectSociety(created.id);
    return created;
  }, [selectSociety, upsertSociety]);

  const joinSociety = useCallback(async (inviteCode: string) => {
    const joined = await societiesApi.join(inviteCode);
    upsertSociety(joined);
    selectSociety(joined.id);
    return joined;
  }, [selectSociety, upsertSociety]);

  const updateSociety = useCallback(async (id: number, payload: SocietyRequest) => {
    const updated = await societiesApi.update(id, payload);
    setSocieties((current) => current.map((society) => (society.id === id ? updated : society)));
    return updated;
  }, []);

  const deleteSociety = useCallback(async (id: number) => {
    await societiesApi.remove(id);
    setSocieties((current) => {
      const next = current.filter((society) => society.id !== id);
      const nextSelected = selectedSocietyId === id ? next[0]?.id ?? null : selectedSocietyId;
      writeSelectedSocietyId(nextSelected);
      setSelectedSocietyId(nextSelected);
      return next;
    });
  }, [selectedSocietyId]);

  const selectedSociety = useMemo(
    () => societies.find((society) => society.id === selectedSocietyId) ?? null,
    [societies, selectedSocietyId],
  );

  const value = useMemo<SocietyContextValue>(
    () => ({
      societies,
      selectedSocietyId,
      selectedSociety,
      loading,
      error,
      refreshSocieties: syncSocieties,
      selectSociety,
      createSociety,
      joinSociety,
      updateSociety,
      deleteSociety,
      canManageSocieties: user?.role === "ADMIN",
    }),
    [
      societies,
      selectedSocietyId,
      selectedSociety,
      loading,
      error,
      syncSocieties,
      selectSociety,
      createSociety,
      joinSociety,
      updateSociety,
      deleteSociety,
      user?.role,
    ],
  );

  return <SocietyContext.Provider value={value}>{children}</SocietyContext.Provider>;
}

export function useSocieties() {
  const context = useContext(SocietyContext);
  if (!context) {
    throw new Error("useSocieties must be used within SocietyProvider");
  }
  return context;
}
