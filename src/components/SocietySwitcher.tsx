import { ChevronDown } from "lucide-react";
import { useSocieties } from "../context/SocietyContext";

export function SocietySwitcher() {
  const { societies, selectedSocietyId, selectSociety } = useSocieties();

  if (societies.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="chip">
        <ChevronDown size={16} />
        Societies
      </div>
      <div className="flex w-full gap-2 overflow-x-auto pb-1 md:w-auto md:flex-wrap">
        {societies.map((society) => (
          <button
            key={society.id}
            type="button"
            className={`chip shrink-0 ${selectedSocietyId === society.id ? "nav-pill-active" : ""}`}
            onClick={() => selectSociety(society.id)}
          >
            {society.name}
          </button>
        ))}
      </div>
    </div>
  );
}
