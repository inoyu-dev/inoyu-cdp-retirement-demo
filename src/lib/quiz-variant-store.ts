import { promises as fs } from "fs";
import path from "path";
import { getDataDir, isMemoryStore } from "./data-dir";
import type {
  CachedFunnelAnalysis,
  QuizExperiment,
  QuizExperimentStats,
  QuizFunnelAnalysis,
  QuizVariantConfig,
  QuizVariantProposal,
} from "./types";
import { computeExperimentStats, CONTROL_VARIANT_ID } from "./quiz-variants";
import { listProfiles } from "./local-store";

const DATA_DIR = getDataDir();
const STORE_PATH = path.join(DATA_DIR, "quiz-experiment.json");

export interface QuizExperimentStore {
  variants: Record<string, QuizVariantConfig>;
  pendingProposal: QuizVariantProposal | null;
  experiment: QuizExperiment | null;
  proposalHistory: QuizVariantProposal[];
  /** Cached on-demand funnel AI analysis (global, not per visitor). */
  cachedFunnelAnalysis?: CachedFunnelAnalysis;
}

const EMPTY_STORE: QuizExperimentStore = {
  variants: {},
  pendingProposal: null,
  experiment: null,
  proposalHistory: [],
};

let memoryStore: QuizExperimentStore = { ...EMPTY_STORE };

async function ensureDataDir(): Promise<void> {
  if (isMemoryStore()) return;
  await fs.mkdir(DATA_DIR, { recursive: true });
}

async function readStore(): Promise<QuizExperimentStore> {
  if (isMemoryStore()) {
    return memoryStore;
  }

  try {
    const raw = await fs.readFile(STORE_PATH, "utf8");
    return { ...EMPTY_STORE, ...JSON.parse(raw) } as QuizExperimentStore;
  } catch {
    return { ...EMPTY_STORE };
  }
}

async function writeStore(store: QuizExperimentStore): Promise<void> {
  if (isMemoryStore()) {
    memoryStore = store;
    return;
  }
  await ensureDataDir();
  await fs.writeFile(STORE_PATH, JSON.stringify(store, null, 2));
}

export async function getQuizExperimentStore(): Promise<QuizExperimentStore> {
  return readStore();
}

export async function savePendingProposal(
  proposal: QuizVariantProposal,
): Promise<void> {
  const store = await readStore();
  store.pendingProposal = proposal;
  await writeStore(store);
}

export async function approveProposal(
  proposalId: string,
): Promise<{ variant: QuizVariantConfig; experiment: QuizExperiment } | null> {
  const store = await readStore();
  const proposal = store.pendingProposal;
  if (!proposal || proposal.id !== proposalId || proposal.status !== "pending") {
    return null;
  }

  const variantId = `variant-${Date.now()}`;
  const variant: QuizVariantConfig = {
    id: variantId,
    name: proposal.proposed.name,
    description: proposal.proposed.description,
    stepOrder: proposal.proposed.stepOrder,
    tweaks: proposal.proposed.tweaks,
    status: "active",
    createdAt: new Date().toISOString(),
    basedOnHotspot: proposal.hotspotStep,
  };

  const experiment: QuizExperiment = {
    controlVariantId: CONTROL_VARIANT_ID,
    testVariantId: variantId,
    trafficSplit: 0.5,
    startedAt: new Date().toISOString(),
    proposalId: proposal.id,
  };

  proposal.status = "approved";
  proposal.reviewedAt = new Date().toISOString();
  store.variants[variantId] = variant;
  store.experiment = experiment;
  store.pendingProposal = null;
  store.proposalHistory = [proposal, ...store.proposalHistory].slice(0, 20);
  await writeStore(store);
  return { variant, experiment };
}

export async function rejectProposal(proposalId: string): Promise<boolean> {
  const store = await readStore();
  const proposal = store.pendingProposal;
  if (!proposal || proposal.id !== proposalId || proposal.status !== "pending") {
    return false;
  }
  proposal.status = "rejected";
  proposal.reviewedAt = new Date().toISOString();
  store.pendingProposal = null;
  store.proposalHistory = [proposal, ...store.proposalHistory].slice(0, 20);
  await writeStore(store);
  return true;
}

export async function getVariantDashboardPayload(): Promise<{
  pendingProposal: QuizVariantProposal | null;
  experiment: QuizExperiment | null;
  variants: QuizVariantConfig[];
  stats: QuizExperimentStats | null;
  proposalHistory: QuizVariantProposal[];
}> {
  const store = await readStore();
  const profiles = await listProfiles();
  const stats = computeExperimentStats(profiles, store.experiment);
  return {
    pendingProposal: store.pendingProposal,
    experiment: store.experiment,
    variants: Object.values(store.variants),
    stats,
    proposalHistory: store.proposalHistory,
  };
}

export async function getCachedFunnelAnalysis(
  fingerprint: string,
): Promise<QuizFunnelAnalysis | null> {
  const store = await readStore();
  const cached = store.cachedFunnelAnalysis;
  if (!cached || cached.fingerprint !== fingerprint) return null;
  return cached.analysis;
}

export async function saveCachedFunnelAnalysis(
  fingerprint: string,
  analysis: QuizFunnelAnalysis,
): Promise<void> {
  const store = await readStore();
  store.cachedFunnelAnalysis = {
    fingerprint,
    generatedAt: new Date().toISOString(),
    analysis,
  };
  await writeStore(store);
}

export async function getVariantById(
  variantId: string,
): Promise<QuizVariantConfig | null> {
  if (variantId === CONTROL_VARIANT_ID) return null;
  const store = await readStore();
  return store.variants[variantId] ?? null;
}
