import { useEffect, useState } from "react";

import { api } from "../../api";
import type { Student } from "../../types";
import { LevelBadge, useLoad } from "../../ui";

const KEY = "madrasti_child";

/** Liste des enfants du compte + enfant sélectionné (mémorisé dans le navigateur). */
export function useChildren() {
  const children = useLoad(() => api.get<Student[]>("/api/students"));
  const [selectedId, setSelectedId] = useState<number | null>(() => {
    try {
      return Number(localStorage.getItem(KEY)) || null;
    } catch {
      return null;
    }
  });

  const list = children.data ?? [];
  const selected = list.find((c) => c.id === selectedId) ?? list[0] ?? null;

  useEffect(() => {
    if (!selected) return;
    try {
      localStorage.setItem(KEY, String(selected.id));
    } catch {
      /* ignore */
    }
  }, [selected]);

  return { state: children, list, selected, select: setSelectedId };
}

export function ChildPicker({ list, selected, select }: { list: Student[]; selected: Student | null; select: (id: number) => void }) {
  if (list.length < 2) return null;
  return (
    <div className="mb-4 flex flex-wrap gap-2">
      {list.map((c) => (
        <button
          key={c.id}
          onClick={() => select(c.id)}
          className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm ring-1 ${
            selected?.id === c.id ? "bg-ink text-white ring-ink" : "bg-white text-slate-700 ring-slate-200"
          }`}
        >
          {c.first_name} <LevelBadge level={c.level} />
        </button>
      ))}
    </div>
  );
}
