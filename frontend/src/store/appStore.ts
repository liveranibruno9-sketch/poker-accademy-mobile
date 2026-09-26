// Global app store (Zustand) with local persistence. Holds profile, study
// progress, concept mastery (spaced repetition) and session history. Stats are
// derived from sessions.

import { create } from "zustand";
import { storage } from "@/src/utils/storage";
import { LESSONS, lessonsForModule, MODULES } from "@/src/content/curriculum";
import { setColorScheme, setThemeOverride } from "@/src/theme";

const KEY = "poker_academy_state_v3";
const REVIEW_INTERVALS = [1, 3, 7, 16, 35]; // days, SM-2 simplified

export type Level = "novice" | "intuitive" | "basics";
export type ThemePref = "system" | "dark" | "light";
// Feedback during a live session: coach = pill after every graded decision; scoreOnly = score moves, no pills; silent = nothing until the report.
export type VerdictMode = "coach" | "scoreOnly" | "silent";
export type ReduceMotionPref = "system" | "on" | "off";

export interface Profile {
  onboarded: boolean;
  level: Level;
  theme: ThemePref;
  verdictMode: VerdictMode;
  timerSec: number;
  hudEnabled: boolean;
  reduceMotion: ReduceMotionPref;
  createdAt: string;
}

export interface LessonProgress {
  status: "locked" | "available" | "read" | "passed";
  quizScore: number | null;
}

export interface ConceptMastery {
  score: number; // 0..100
  reps: number;
  lastSeenAt: string;
  nextReviewAt: string;
}

export interface EvActionRecord {
  label: string;
  evBb: number;
  rank: number;
}

export interface DecisionRecord {
  handIndex: number;
  handSeed: string;
  heroPosition: string;
  heroCards: [string, string];
  board: string[];
  street: string;
  potBb: number;
  verdict: "correct" | "imprecise" | "error";
  errorCode: string | null;
  errorLabel: string | null;
  severity: string;
  pointsLost: number;
  deltaEvBb: number;
  equity: number;
  requiredEquity: number;
  mdf: number;
  alpha: number;
  spr: number;
  chosenLabel: string;
  bestLabel: string;
  evActions: EvActionRecord[];
  diceRead?: number;
  villainPct?: number; // villain range width (% of hands) at that node
}

export interface SessionRecord {
  id: string;
  startedAt: string;
  endedAt: string;
  mode: "rated" | "training";
  handsPlanned: number;
  handsPlayed: number;
  scoreStart: number;
  scoreFinal: number;
  evLostBb: number;
  endedEarly: boolean;
  decisions: DecisionRecord[];
  scoreTimeline: number[]; // score after each hand
}

interface PersistShape {
  profile: Profile;
  lessonProgress: Record<string, LessonProgress>;
  conceptMastery: Record<string, ConceptMastery>;
  sessions: SessionRecord[];
  activityDays: string[]; // YYYY-MM-DD, days with at least one lesson/quiz/session (for streak)
  savedTakeaways: string[]; // lesson ids whose takeaway card was saved to the glossary
}

interface AppState extends PersistShape {
  hydrated: boolean;
  hydrate: () => Promise<void>;
  setProfile: (p: Partial<Profile>) => void;
  completeOnboarding: (level: Level) => void;
  markLessonRead: (lessonId: string) => void;
  setQuizScore: (lessonId: string, score: number, concepts: string[]) => void;
  recordConceptResult: (concept: string, correct: boolean) => void;
  addSession: (s: SessionRecord) => void;
  toggleTakeaway: (lessonId: string) => void;
  resetProgress: () => void;
}

function defaultProfile(): Profile {
  return {
    onboarded: false,
    level: "intuitive",
    theme: "dark",
    verdictMode: "coach",
    timerSec: 25,
    hudEnabled: true,
    reduceMotion: "system",
    createdAt: new Date().toISOString(),
  };
}

function initialProgress(): Record<string, LessonProgress> {
  const map: Record<string, LessonProgress> = {};
  const m1 = lessonsForModule("M1");
  m1.forEach((l, i) => {
    map[l.id] = { status: i === 0 ? "available" : "locked", quizScore: null };
  });
  return map;
}

export function dayKey(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function withToday(days: string[]): string[] {
  const k = dayKey();
  return days.includes(k) ? days : [...days, k].slice(-400);
}

function daysFromNow(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

function applyThemePref(theme: ThemePref) {
  if (theme === "system") {
    setThemeOverride(null);
    setColorScheme(null);
  } else {
    setThemeOverride(theme);
    setColorScheme(theme);
  }
}

async function persist(get: () => AppState) {
  const s = get();
  const data: PersistShape = {
    profile: s.profile,
    lessonProgress: s.lessonProgress,
    conceptMastery: s.conceptMastery,
    sessions: s.sessions,
    activityDays: s.activityDays,
    savedTakeaways: s.savedTakeaways,
  };
  await storage.setItem(KEY, JSON.stringify(data));
}

export const useApp = create<AppState>((set, get) => ({
  hydrated: false,
  profile: defaultProfile(),
  lessonProgress: initialProgress(),
  conceptMastery: {},
  sessions: [],
  activityDays: [],
  savedTakeaways: [],

  hydrate: async () => {
    const raw = await storage.getItem(KEY, "");
    if (raw) {
      try {
        const data = JSON.parse(raw) as PersistShape;
        set({
          profile: { ...defaultProfile(), ...data.profile },
          lessonProgress: { ...initialProgress(), ...data.lessonProgress },
          conceptMastery: data.conceptMastery ?? {},
          sessions: data.sessions ?? [],
          activityDays: data.activityDays ?? [],
          savedTakeaways: data.savedTakeaways ?? [],
          hydrated: true,
        });
        applyThemePref(data.profile?.theme ?? "dark");
        return;
      } catch {}
    }
    applyThemePref("dark");
    set({ hydrated: true });
  },

  setProfile: (p) => {
    set((s) => ({ profile: { ...s.profile, ...p } }));
    if (p.theme) applyThemePref(p.theme);
    persist(get);
  },

  completeOnboarding: (level) => {
    set((s) => ({ profile: { ...s.profile, onboarded: true, level } }));
    persist(get);
  },

  markLessonRead: (lessonId) => {
    set((s) => {
      const cur = s.lessonProgress[lessonId];
      if (!cur || cur.status === "passed") return { activityDays: withToday(s.activityDays) };
      return { lessonProgress: { ...s.lessonProgress, [lessonId]: { ...cur, status: "read" } }, activityDays: withToday(s.activityDays) };
    });
    persist(get);
  },

  setQuizScore: (lessonId, score, concepts) => {
    set((s) => {
      const lp = { ...s.lessonProgress };
      const passed = score >= 0.7;
      lp[lessonId] = { status: passed ? "passed" : "read", quizScore: score };
      // unlock next lesson in same module
      const lesson = LESSONS.find((l) => l.id === lessonId);
      if (lesson && passed) {
        const modLessons = lessonsForModule(lesson.module);
        const idx = modLessons.findIndex((l) => l.id === lessonId);
        const next = modLessons[idx + 1];
        if (next && lp[next.id]?.status === "locked") lp[next.id] = { status: "available", quizScore: null };
      }
      // concept mastery bump
      const cm = { ...s.conceptMastery };
      for (const c of concepts) {
        const prev = cm[c];
        const reps = (prev?.reps ?? 0) + 1;
        const newScore = Math.min(100, Math.round((prev?.score ?? 0) * 0.4 + score * 100 * 0.6));
        cm[c] = {
          score: newScore,
          reps,
          lastSeenAt: new Date().toISOString(),
          nextReviewAt: daysFromNow(REVIEW_INTERVALS[Math.min(reps - 1, REVIEW_INTERVALS.length - 1)]),
        };
      }
      return { lessonProgress: lp, conceptMastery: cm, activityDays: withToday(s.activityDays) };
    });
    persist(get);
  },

  recordConceptResult: (concept, correct) => {
    set((s) => {
      const cm = { ...s.conceptMastery };
      const prev = cm[concept];
      const reps = (prev?.reps ?? 0) + 1;
      const base = prev?.score ?? 50;
      const newScore = Math.max(0, Math.min(100, base + (correct ? 8 : -12)));
      cm[concept] = {
        score: newScore,
        reps,
        lastSeenAt: new Date().toISOString(),
        nextReviewAt: daysFromNow(REVIEW_INTERVALS[Math.min(reps - 1, REVIEW_INTERVALS.length - 1)]),
      };
      return { conceptMastery: cm };
    });
    persist(get);
  },

  addSession: (session) => {
    set((s) => ({ sessions: [session, ...s.sessions].slice(0, 100), activityDays: withToday(s.activityDays) }));
    persist(get);
  },

  toggleTakeaway: (lessonId) => {
    set((s) => ({ savedTakeaways: s.savedTakeaways.includes(lessonId) ? s.savedTakeaways.filter((x) => x !== lessonId) : [...s.savedTakeaways, lessonId] }));
    persist(get);
  },

  resetProgress: () => {
    set({
      profile: { ...defaultProfile(), onboarded: true, level: get().profile.level },
      lessonProgress: initialProgress(),
      conceptMastery: {},
      sessions: [],
      activityDays: [],
      savedTakeaways: [],
    });
    persist(get);
  },
}));

// ---- Derived selectors (pure helpers) ----
export function conceptsDue(cm: Record<string, ConceptMastery>): string[] {
  const now = Date.now();
  return Object.entries(cm)
    .filter(([, m]) => m.score < 60 || new Date(m.nextReviewAt).getTime() <= now)
    .map(([c]) => c);
}

export function moduleProgress(lp: Record<string, LessonProgress>, moduleId: string): { passed: number; total: number } {
  const lessons = lessonsForModule(moduleId);
  const passed = lessons.filter((l) => lp[l.id]?.status === "passed").length;
  return { passed, total: lessons.length };
}

/** Consecutive active days ending today or yesterday. */
export function streakDays(days: string[]): number {
  const set = new Set(days);
  const d = new Date();
  if (!set.has(dayKey(d))) d.setDate(d.getDate() - 1);
  let n = 0;
  while (set.has(dayKey(d))) {
    n++;
    d.setDate(d.getDate() - 1);
  }
  return n;
}

/** The lesson the user should continue with: first not-passed unlocked lesson (in module order). */
export function currentLesson(lp: Record<string, LessonProgress>): { lesson: (typeof LESSONS)[number]; module: (typeof MODULES)[number]; index: number; total: number } | null {
  for (const m of MODULES) {
    if (m.status !== "published") continue;
    const lessons = lessonsForModule(m.id);
    const idx = lessons.findIndex((l) => lp[l.id]?.status === "available" || lp[l.id]?.status === "read");
    const i = idx >= 0 ? idx : lessons.length - 1;
    if (idx >= 0 || lessons.some((l) => lp[l.id]?.status === "passed")) return { lesson: lessons[i], module: m, index: i, total: lessons.length };
  }
  return null;
}

export function averageScore(sessions: SessionRecord[], n = 10): number | null {
  const rated = sessions.filter((s) => s.mode === "rated").slice(0, n);
  if (rated.length === 0) return null;
  return rated.reduce((a, s) => a + s.scoreFinal, 0) / rated.length;
}
