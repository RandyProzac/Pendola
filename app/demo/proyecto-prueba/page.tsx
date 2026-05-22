"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";
import { useProjectStore } from "@/lib/store";
import { seedSampleProject } from "@/lib/demo/sample-project";

export default function SampleProjectPage() {
  const router = useRouter();
  const hasSeededRef = useRef(false);

  useEffect(() => {
    if (hasSeededRef.current) return;
    hasSeededRef.current = true;

    const result = seedSampleProject(useProjectStore.getState());

    if (result.href) {
      router.replace(result.href);
      return;
    }

    router.replace("/");
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/20 px-6">
      <div className="max-w-md rounded-3xl border bg-card p-8 text-center shadow-lg">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-500/10">
          <Sparkles className="h-7 w-7 text-violet-500" />
        </div>
        <h1 className="text-2xl font-semibold">Preparando proyecto demo</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          Estamos cargando un ejemplo original con capitulos, personajes,
          escenarios y copia editorial para que puedas revisar todo el flujo.
        </p>
      </div>
    </div>
  );
}
