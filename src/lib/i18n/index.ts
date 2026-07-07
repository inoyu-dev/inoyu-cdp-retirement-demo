import { LOCALE_STORAGE_KEY } from "../app-identity";
import { getContactChannelGroupsForRegion } from "../contact-channels";
import type { ContactChannel } from "../types";
import type { VisitorRegion } from "../region";
import { format, getQuizCopy } from "./translations";
import type { AppLocale, QuizCopy } from "./types";

export * from "./types";
export { LOCALE_STORAGE_KEY };
export { format, getQuizCopy } from "./translations";

export function isAppLocale(value: string): value is AppLocale {
  return value === "en" || value === "es" || value === "zh" || value === "fr" || value === "ja";
}

export function readStoredLocale(): AppLocale | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(LOCALE_STORAGE_KEY);
  if (raw && isAppLocale(raw)) return raw;
  return null;
}

export function writeStoredLocale(locale: AppLocale): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(LOCALE_STORAGE_KEY, locale);
}

export function detectBrowserLocale(): AppLocale {
  if (typeof navigator === "undefined") return "en";
  const lang = navigator.language.toLowerCase();
  if (lang.startsWith("es")) return "es";
  if (lang.startsWith("zh")) return "zh";
  if (lang.startsWith("fr")) return "fr";
  if (lang.startsWith("ja")) return "ja";
  return "en";
}

export function resolveInitialLocale(): AppLocale {
  return readStoredLocale() ?? detectBrowserLocale();
}

export function getLocalizedChannelGroups(
  region: VisitorRegion,
  locale: AppLocale,
): { title: string; subtitle?: string; channels: ContactChannel[] }[] {
  const structural = getContactChannelGroupsForRegion(region);
  const localized = getQuizCopy(locale).channelGroups[region];
  return structural.map((group, index) => ({
    channels: group.channels,
    title: localized[index]?.title ?? group.title,
    subtitle: localized[index]?.subtitle ?? group.subtitle,
  }));
}

export function localizedChannelLabel(
  channel: ContactChannel,
  locale: AppLocale,
): string {
  return getQuizCopy(locale).channels[channel].label;
}
