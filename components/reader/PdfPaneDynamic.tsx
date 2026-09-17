"use client";

import dynamic from "next/dynamic";

export const PdfPane = dynamic(() => import("./PdfPane").then((m) => m.PdfPane), {
  ssr: false,
  loading: () => (
    <div className="grid h-full place-items-center text-sm text-violet-800">Loading PDF viewer…</div>
  ),
});
