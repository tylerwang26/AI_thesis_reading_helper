"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  BookOpen,
  Highlighter,
  Languages,
  MessageSquareText,
  Quote,
  Sparkles,
  StickyNote,
  WandSparkles,
} from "lucide-react";
import { Logo } from "@/components/Logo";
import { t, type Messages } from "@/lib/i18n";
import type { Locale } from "@/lib/types";

const featureTabs = ["colleague", "navigation", "markup", "save"] as const;

export function LandingPage() {
  const [locale, setLocale] = useState<Locale>("en");
  const [tab, setTab] = useState<(typeof featureTabs)[number]>("colleague");
  const copy = t(locale);

  return (
    <div className="min-h-full bg-[#f6f3ff] text-ink">
      <header className="sticky top-0 z-30 border-b border-violet-100/80 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <Logo />
            <span>{copy.brand}</span>
          </Link>
          <nav className="hidden items-center gap-6 text-sm text-violet-900/70 md:flex">
            <a href="#features" className="hover:text-violet-950">
              {copy.navFeatures}
            </a>
            <a href="#faq" className="hover:text-violet-950">
              {copy.navFaq}
            </a>
            <button
              type="button"
              className="rounded-full border border-violet-200 px-3 py-1 text-xs"
              onClick={() => setLocale(locale === "en" ? "zh-Hant" : "en")}
            >
              {locale === "en" ? "EN" : "繁中"}
            </button>
          </nav>
          <div className="flex items-center gap-2">
            <Link
              href="/reader"
              className="hidden rounded-full px-3 py-2 text-sm text-violet-900 md:inline"
            >
              {copy.navReader}
            </Link>
            <Link
              href="/reader?sample=1"
              className="rounded-full bg-violet-950 px-4 py-2 text-sm font-medium text-white shadow-sm"
            >
              {copy.getStarted}
            </Link>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden bg-hero text-white">
        <div className="pointer-events-none absolute -left-24 top-20 h-72 w-72 rounded-full bg-fuchsia-400/20 blur-3xl" />
        <div className="pointer-events-none absolute -right-16 bottom-0 h-80 w-80 rounded-full bg-indigo-300/20 blur-3xl" />
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 md:grid-cols-2 md:py-20">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-violet-200">
              {copy.heroEyebrow}
            </p>
            <h1 className="mt-3 font-display text-4xl leading-tight md:text-5xl">
              {copy.heroTitle}
            </h1>
            <p className="mt-4 max-w-lg text-violet-100/90">{copy.heroBody}</p>
            <p className="mt-3 text-xs text-violet-200/80">{copy.heroNote}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/reader?sample=1"
                className="rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-violet-950"
              >
                {copy.ctaTry}
              </Link>
              <Link
                href="/reader"
                className="rounded-full border border-white/30 px-5 py-2.5 text-sm text-white"
              >
                {copy.uploadPaper}
              </Link>
            </div>
          </div>
          <HeroIllustration copy={copy} />
        </div>
      </section>

      <section id="features" className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="text-center font-display text-4xl text-violet-950">{copy.featuresTitle}</h2>
        <div className="mx-auto mt-8 flex max-w-3xl flex-wrap justify-center gap-2">
          {featureTabs.map((key) => {
            const label =
              key === "colleague"
                ? copy.tabColleague
                : key === "navigation"
                  ? copy.tabNavigation
                  : key === "markup"
                    ? copy.tabMarkup
                    : copy.tabSave;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setTab(key)}
                className={`rounded-full px-4 py-2 text-sm ${
                  tab === key
                    ? "bg-white text-violet-950 shadow ring-1 ring-violet-200"
                    : "text-violet-800/70 hover:bg-white/60"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
        <div className="mt-10 grid gap-6 md:grid-cols-2">
          {tabFeatures(copy, tab).map((item) => (
            <article
              key={item.title}
              className="rounded-3xl border border-violet-100 bg-white p-6 shadow-sm"
            >
              <div className="mb-4 inline-flex rounded-2xl bg-violet-100 p-3 text-violet-800">
                {item.icon}
              </div>
              <h3 className="text-xl font-semibold tracking-wide text-violet-900">
                {item.title}
              </h3>
              <p className="mt-2 text-sm leading-6 text-violet-900/70">{item.body}</p>
              {item.how ? (
                <p className="mt-4 flex items-start gap-2 text-sm text-violet-800/80">
                  <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet-200 text-[10px] font-bold">
                    {copy.how}
                  </span>
                  {item.how}
                </p>
              ) : null}
            </article>
          ))}
        </div>
      </section>

      <section className="bg-hero py-16 text-white">
        <div className="mx-auto max-w-6xl px-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {[
              { icon: <Languages className="h-6 w-6" />, title: copy.featTranslateTitle, body: copy.featTranslateBody },
              { icon: <MessageSquareText className="h-6 w-6" />, title: copy.featChatTitle, body: copy.featChatBody },
              { icon: <Sparkles className="h-6 w-6" />, title: copy.featExplainTitle, body: copy.featExplainBody },
              { icon: <Quote className="h-6 w-6" />, title: copy.featCiteTitle, body: copy.featCiteBody },
              { icon: <BookOpen className="h-6 w-6" />, title: copy.featSummaryTitle, body: copy.featSummaryBody },
            ].map((card) => (
              <div
                key={card.title}
                className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur"
              >
                <div className="mb-4 text-violet-200">{card.icon}</div>
                <h3 className="font-medium">{card.title}</h3>
                <p className="mt-2 text-sm text-violet-100/75">{card.body}</p>
              </div>
            ))}
          </div>
          <div className="mt-10 text-center">
            <Link
              href="/reader?sample=1"
              className="inline-flex rounded-full bg-white px-6 py-3 font-semibold text-violet-950"
            >
              {copy.getStarted}
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 py-16" id="pricing">
        <h2 className="text-center font-display text-3xl text-violet-950">{copy.pricingTitle}</h2>
        <p className="mt-3 text-center text-violet-900/70">{copy.pricingBody}</p>
      </section>

      <section id="faq" className="mx-auto max-w-3xl px-4 pb-20">
        <h2 className="text-center font-display text-3xl text-violet-950">{copy.faqTitle}</h2>
        <dl className="mt-8 space-y-4">
          {[
            [copy.faq1q, copy.faq1a],
            [copy.faq2q, copy.faq2a],
            [copy.faq3q, copy.faq3a],
            [copy.faq4q, copy.faq4a],
          ].map(([q, a]) => (
            <div key={q} className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-violet-100">
              <dt className="font-medium text-violet-950">{q}</dt>
              <dd className="mt-2 text-sm leading-6 text-violet-900/70">{a}</dd>
            </div>
          ))}
        </dl>
      </section>

      <footer className="border-t border-violet-100 py-8 text-center text-xs text-violet-800/70">
        {copy.brandFull} · {copy.footer}
      </footer>
    </div>
  );
}

function tabFeatures(copy: Messages, tab: (typeof featureTabs)[number]) {
  if (tab === "navigation") {
    return [
      {
        title: copy.featCiteTitle,
        body: copy.featCiteBody,
        how: copy.featExplainHow,
        icon: <Quote className="h-6 w-6" />,
      },
      {
        title: copy.featSummaryTitle,
        body: copy.featSummaryBody,
        icon: <BookOpen className="h-6 w-6" />,
      },
    ];
  }
  if (tab === "markup") {
    return [
      {
        title: copy.featMarkupTitle,
        body: copy.featMarkupBody,
        icon: <Highlighter className="h-6 w-6" />,
      },
      {
        title: copy.featHighlightTitle,
        body: copy.featHighlightBody,
        how: copy.featExplainHow,
        icon: <WandSparkles className="h-6 w-6" />,
      },
    ];
  }
  if (tab === "save") {
    return [
      {
        title: copy.featLibraryTitle,
        body: copy.featLibraryBody,
        icon: <StickyNote className="h-6 w-6" />,
      },
    ];
  }
  return [
    {
      title: copy.featExplainTitle,
      body: copy.featExplainBody,
      how: copy.featExplainHow,
      icon: <Sparkles className="h-6 w-6" />,
    },
    {
      title: copy.featImageTitle,
      body: copy.featImageBody,
      how: copy.featExplainHow,
      icon: <WandSparkles className="h-6 w-6" />,
    },
    {
      title: copy.featTranslateTitle,
      body: copy.featTranslateBody,
      icon: <Languages className="h-6 w-6" />,
    },
    {
      title: copy.featChatTitle,
      body: copy.featChatBody,
      icon: <MessageSquareText className="h-6 w-6" />,
    },
  ];
}

function HeroIllustration({ copy }: { copy: Messages }) {
  const bubbles = useMemo(
    () => [
      { t: "Did I get this right?", s: "left-6 top-16" },
      { t: "What does this figure mean?", s: "right-8 top-28" },
      { t: "So what's the main point?", s: "right-16 top-10" },
    ],
    [],
  );
  return (
    <div className="relative rounded-[28px] bg-white/95 p-3 text-violet-950 shadow-2xl shadow-violet-950/30">
      <div className="mb-2 flex items-center gap-2 border-b border-violet-100 px-2 pb-2 text-xs">
        <Logo className="h-6 w-6" />
        <span className="font-semibold">{copy.brand}</span>
        <span className="ml-auto rounded-md bg-violet-50 px-2 py-0.5">1 / 4</span>
      </div>
      <div className="grid grid-cols-[72px_1fr_140px] gap-2">
        <div className="space-y-2 rounded-xl bg-violet-50 p-2 text-[10px] text-violet-800">
          <div>{copy.open}</div>
          <div>{copy.library}</div>
          <div>{copy.addToLibrary}</div>
        </div>
        <div className="relative min-h-[260px] rounded-xl bg-[#fbfbfe] p-3">
          <div className="mx-auto mt-4 w-40">
            <div className="mx-auto h-8 w-20 rounded bg-emerald-200" />
            <div className="mx-auto my-2 h-10 w-28 rounded bg-violet-200" />
            <div className="flex justify-between gap-2">
              <div className="h-8 flex-1 rounded bg-amber-100" />
              <div className="h-8 flex-1 rounded bg-sky-100" />
            </div>
          </div>
          {bubbles.map((b) => (
            <span
              key={b.t}
              className={`absolute ${b.s} rounded-2xl bg-white px-2 py-1 text-[10px] shadow`}
            >
              {b.t}
            </span>
          ))}
        </div>
        <div className="space-y-2 rounded-xl bg-white p-2 text-[10px] shadow-inner">
          <div className="font-medium">{copy.threeLine}</div>
          <div className="h-2 rounded-full bg-gradient-to-r from-sky-200 to-violet-300" />
          <div className="h-2 rounded-full bg-gradient-to-r from-sky-200 to-violet-300" />
          <div className="mt-3 font-medium">{copy.explainFigure}</div>
          <div className="h-16 rounded-xl bg-gradient-to-b from-sky-100 to-violet-200" />
        </div>
      </div>
    </div>
  );
}
