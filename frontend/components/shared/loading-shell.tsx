"use client";

import { Loader2 } from "lucide-react";

export default function LoadingShell({ message = "Loading..." }: { message?: string }) {
  return (
    <div className="flex min-h-[240px] items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="size-8 animate-spin text-violet-400" />
        <p className="text-sm text-muted-foreground">{message}</p>
      </div>
    </div>
  );
}
