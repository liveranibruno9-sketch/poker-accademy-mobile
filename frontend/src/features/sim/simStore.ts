import { create } from "zustand";
import { SimConfig, SimController } from "./simController";
import { SessionRecord, useApp } from "@/src/store/appStore";

interface SimStore {
  controller: SimController | null;
  tick: number;
  start: (cfg: SimConfig) => void;
  bump: () => void;
  finalize: () => SessionRecord | null;
}

export const COMPOSITIONS: Record<string, { label: string; profiles: SimConfig["villainProfiles"] }> = {
  realistic: { label: "Realistica", profiles: ["tag", "tag", "nit", "lag", "fish"] },
  school: { label: "Scuola", profiles: ["tag", "tag", "tag", "tag", "tag"] },
  micro: { label: "Micro stakes", profiles: ["fish", "fish", "whale", "nit", "tag"] },
};

export const useSim = create<SimStore>((set, get) => ({
  controller: null,
  tick: 0,
  start: (cfg) => set({ controller: new SimController(cfg), tick: 0 }),
  bump: () => set((s) => ({ tick: s.tick + 1 })),
  finalize: () => {
    const c = get().controller;
    if (!c) return null;
    const rec: SessionRecord = {
      id: `sess-${Date.now()}`,
      startedAt: c.startedAt,
      endedAt: new Date().toISOString(),
      mode: c.cfg.mode,
      handsPlanned: c.cfg.handsPlanned,
      handsPlayed: c.handIndex + 1,
      scoreStart: 100,
      scoreFinal: c.score,
      evLostBb: c.decisions.reduce((a, d) => a + d.deltaEvBb, 0),
      endedEarly: c.endedEarly,
      decisions: c.decisions,
      scoreTimeline: c.scoreTimeline,
    };
    if (rec.mode === "rated") useApp.getState().addSession(rec);
    return rec;
  },
}));
