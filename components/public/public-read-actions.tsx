"use client";

import { useState } from "react";
import { Copy, Printer } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function PublicReadActions() {
  const [isCopying, setIsCopying] = useState(false);

  const handleCopy = async () => {
    setIsCopying(true);
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success("Link copiado", {
        description: "Ya puedes compartir esta lectura con otra persona.",
      });
    } catch (error) {
      toast.error("No se pudo copiar el link", {
        description:
          error instanceof Error ? error.message : "Inténtalo otra vez desde este navegador.",
      });
    } finally {
      setIsCopying(false);
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      <Button variant="outline" className="rounded-full" onClick={handleCopy} disabled={isCopying}>
        <Copy className="mr-2 h-4 w-4" />
        {isCopying ? "Copiando..." : "Copiar link"}
      </Button>
      <Button
        variant="outline"
        className="rounded-full"
        onClick={() => {
          window.print();
        }}
      >
        <Printer className="mr-2 h-4 w-4" />
        Imprimir / PDF
      </Button>
    </div>
  );
}
