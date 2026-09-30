import type { Locale } from "./types";

/** Explain / summary answers default to Traditional Chinese regardless of UI locale. */
export const EXPLAIN_SUMMARY_OUTPUT_LOCALE: Locale = "zh-Hant";

const ZH_HANT_OUTPUT =
  "Respond in Traditional Chinese (Taiwan). Use 繁體中文 only, not Simplified Chinese.";

export function systemPreamble(locale: Locale, outputLocale: Locale = locale) {
  const lang = outputLocale === "zh-Hant" ? ZH_HANT_OUTPUT : "Respond in clear English.";
  return `You are a careful research-paper reading assistant inside Thesis Helper, an independent AI PDF reader. ${lang}
Use only the provided paper context. If something is not in the paper, say so. Prefer short, structured answers with bullet points when helpful. Do not mention other commercial PDF products.`;
}

export function explainSummaryPreamble(locale: Locale) {
  return systemPreamble(locale, EXPLAIN_SUMMARY_OUTPUT_LOCALE);
}
