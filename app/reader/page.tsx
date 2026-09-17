"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { ReaderApp } from "@/components/reader/ReaderApp";
import { ReaderProvider, useReader } from "@/components/reader/reader-context";

export const dynamic = "force-dynamic";

export default function ReaderPage() {
  return (
    <Suspense fallback={<div className="grid h-screen place-items-center text-violet-800">Loading…</div>}>
      <ReaderGate />
    </Suspense>
  );
}

function ReaderGate() {
  const params = useSearchParams();
  const sample = params.get("sample") === "1";
  return (
    <ReaderProvider initialSample={sample}>
      <DropShell />
    </ReaderProvider>
  );
}

function DropShell() {
  const { openUploaded } = useReader();
  return (
    <div
      className="h-screen"
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        const file = e.dataTransfer.files?.[0];
        if (file && /pdf/i.test(file.type || file.name)) openUploaded(file);
      }}
    >
      <ReaderApp />
    </div>
  );
}
