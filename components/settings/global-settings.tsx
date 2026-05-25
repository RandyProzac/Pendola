"use client";

import { useMemo, useState } from "react";
import { Settings, Cpu, BrainCircuit, Sparkles, Box, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { formatTokenCount, formatUsd, sumConversationUsages } from "@/lib/ai/usage";
import { useProjectStore } from "@/lib/store";
import type { AIProvider, WriterColumnWidth, WriterFontOption } from "@/lib/types";

const FONT_SIZE_OPTIONS = [16, 18, 20, 22];
const LINE_HEIGHT_OPTIONS = [1.65, 1.8, 1.95, 2.1];

const FONT_LABELS: Record<WriterFontOption, string> = {
  editorial: "Serif editorial",
  clasica: "Serif clásica",
  moderna: "Serif moderna",
  sans: "Sans de lectura",
};

const COLUMN_WIDTH_LABELS: Record<WriterColumnWidth, string> = {
  compacta: "Compacta",
  equilibrada: "Equilibrada",
  amplia: "Amplia",
};

export function GlobalSettings() {
  const { aiSettings, updateAISettings, writerPreferences, updateWriterPreferences, aiConversations } = useProjectStore();
  const [open, setOpen] = useState(false);
  const usageSummary = useMemo(
    () =>
      sumConversationUsages(aiConversations, {
        since: aiSettings.budgetCycleStartedAt,
      }),
    [aiConversations, aiSettings.budgetCycleStartedAt]
  );
  const budgetProgress =
    typeof aiSettings.monthlyBudgetUsd === "number" &&
    aiSettings.monthlyBudgetUsd > 0 &&
    typeof usageSummary?.estimatedCostUsd === "number"
      ? Math.max(0, Math.min(100, (usageSummary.estimatedCostUsd / aiSettings.monthlyBudgetUsd) * 100))
      : undefined;
  const budgetState =
    typeof budgetProgress !== "number"
      ? "idle"
      : budgetProgress >= 100
      ? "exceeded"
      : budgetProgress >= 80
      ? "warning"
      : "ok";

  // Local state until saved
  const [keys, setKeys] = useState({
    openai: aiSettings.openaiKey || "",
    anthropic: aiSettings.anthropicKey || "",
    gemini: aiSettings.geminiKey || "",
    ollamaBaseUrl: aiSettings.ollamaBaseUrl || "",
    ollamaKey: aiSettings.ollamaKey || "",
    ollamaModel: aiSettings.ollamaModel || "",
    monthlyBudgetUsd:
      typeof aiSettings.monthlyBudgetUsd === "number" ? String(aiSettings.monthlyBudgetUsd) : "",
  });
  const [preferences, setPreferences] = useState(writerPreferences);

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);

    if (nextOpen) {
      setKeys({
        openai: aiSettings.openaiKey || "",
        anthropic: aiSettings.anthropicKey || "",
        gemini: aiSettings.geminiKey || "",
        ollamaBaseUrl: aiSettings.ollamaBaseUrl || "",
        ollamaKey: aiSettings.ollamaKey || "",
        ollamaModel: aiSettings.ollamaModel || "",
        monthlyBudgetUsd:
          typeof aiSettings.monthlyBudgetUsd === "number" ? String(aiSettings.monthlyBudgetUsd) : "",
      });
      setPreferences(writerPreferences);
    }
  };

  const handleProviderSelect = (provider: AIProvider) => {
    updateAISettings({ provider });
  };

  const handleSave = () => {
    const normalizedBudget =
      keys.monthlyBudgetUsd.trim().length > 0 ? Number(keys.monthlyBudgetUsd) : undefined;

    updateAISettings({
      openaiKey: keys.openai,
      anthropicKey: keys.anthropic,
      geminiKey: keys.gemini,
      ollamaBaseUrl: keys.ollamaBaseUrl,
      ollamaKey: keys.ollamaKey,
      ollamaModel: keys.ollamaModel,
      monthlyBudgetUsd:
        typeof normalizedBudget === "number" && Number.isFinite(normalizedBudget) && normalizedBudget >= 0
          ? normalizedBudget
          : undefined,
      budgetCycleStartedAt: aiSettings.budgetCycleStartedAt || new Date().toISOString(),
    });
    updateWriterPreferences(preferences);
    setOpen(false);
  };

  const handleResetMeter = () => {
    updateAISettings({
      budgetCycleStartedAt: new Date().toISOString(),
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger 
        render={<Button variant="outline" size="sm" className="gap-2 text-xs w-full" />}
      >
        <Settings className="h-4 w-4" />
        Ajustes / Perfil
      </DialogTrigger>
      <DialogContent className="flex max-h-[85vh] flex-col overflow-hidden sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>Ajustes Globales (Mi Perfil)</DialogTitle>
          <DialogDescription>
            Configura el motor de Inteligencia Artificial que usará Péndola en todo tu entorno de trabajo.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 overflow-y-auto py-1 pr-2">
          {/* Provider Selection */}
          <section className="space-y-4 rounded-2xl border bg-muted/20 p-5">
            <div className="space-y-1">
              <Label className="text-sm font-semibold">Motor de IA Activo</Label>
              <p className="text-xs text-muted-foreground">
                Elige qué proveedor quieres usar por defecto cuando abras el panel de IA.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              
              {/* Ollama */}
              <div 
                onClick={() => handleProviderSelect('ollama')}
                className={`cursor-pointer rounded-xl border p-3.5 flex flex-col gap-2 transition-all ${
                  aiSettings.provider === 'ollama' ? 'border-violet-500/50 bg-violet-500/8 shadow-sm' : 'border-border bg-background/80 hover:border-violet-500/30'
                }`}
              >
                <div className="flex items-center justify-between">
                  <Box className="h-5 w-5 text-muted-foreground" />
                  {aiSettings.provider === 'ollama' && <span className="flex h-2 w-2 rounded-full bg-violet-500" />}
                </div>
                <div>
                  <h4 className="font-medium text-sm">Ollama (Local / Cloud)</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">Privado o en tu propio servidor.</p>
                </div>
              </div>

              {/* Anthropic */}
              <div 
                onClick={() => handleProviderSelect('anthropic')}
                className={`cursor-pointer rounded-xl border p-3.5 flex flex-col gap-2 transition-all ${
                  aiSettings.provider === 'anthropic' ? 'border-orange-500/50 bg-orange-500/8 shadow-sm' : 'border-border bg-background/80 hover:border-orange-500/30'
                }`}
              >
                <div className="flex items-center justify-between">
                  <BrainCircuit className="h-5 w-5 text-muted-foreground" />
                  {aiSettings.provider === 'anthropic' && <span className="flex h-2 w-2 rounded-full bg-orange-500" />}
                </div>
                <div>
                  <h4 className="font-medium text-sm">Anthropic (Claude)</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">Excelente para literatura e ideas.</p>
                </div>
              </div>

              {/* OpenAI */}
              <div 
                onClick={() => handleProviderSelect('openai')}
                className={`cursor-pointer rounded-xl border p-3.5 flex flex-col gap-2 transition-all ${
                  aiSettings.provider === 'openai' ? 'border-emerald-500/50 bg-emerald-500/8 shadow-sm' : 'border-border bg-background/80 hover:border-emerald-500/30'
                }`}
              >
                <div className="flex items-center justify-between">
                  <Sparkles className="h-5 w-5 text-muted-foreground" />
                  {aiSettings.provider === 'openai' && <span className="flex h-2 w-2 rounded-full bg-emerald-500" />}
                </div>
                <div>
                  <h4 className="font-medium text-sm">OpenAI (ChatGPT)</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">Rápido y versátil (GPT-4o).</p>
                </div>
              </div>

              {/* Gemini */}
              <div 
                onClick={() => handleProviderSelect('gemini')}
                className={`cursor-pointer rounded-xl border p-3.5 flex flex-col gap-2 transition-all ${
                  aiSettings.provider === 'gemini' ? 'border-blue-500/50 bg-blue-500/8 shadow-sm' : 'border-border bg-background/80 hover:border-blue-500/30'
                }`}
              >
                <div className="flex items-center justify-between">
                  <Cpu className="h-5 w-5 text-muted-foreground" />
                  {aiSettings.provider === 'gemini' && <span className="flex h-2 w-2 rounded-full bg-blue-500" />}
                </div>
                <div>
                  <h4 className="font-medium text-sm">Google (Gemini)</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">Ventanas de contexto gigantes.</p>
                </div>
              </div>

            </div>
          </section>

          {/* API Keys Configuration */}
          <section className="space-y-4 rounded-2xl border bg-muted/20 p-5">
            <div className="space-y-1">
              <h3 className="text-sm font-semibold">Tus API Keys (Trae tu propia IA)</h3>
              <p className="text-xs text-muted-foreground">
                Las llaves se guardan localmente en este navegador para tu comodidad. Solo se usarán para tus propios proyectos.
              </p>
            </div>
            
            <div className="grid gap-3">
              <div className="grid grid-cols-3 items-center gap-4">
                <Label htmlFor="anthropic-key" className="text-right text-xs">Anthropic Key</Label>
                <Input
                  id="anthropic-key"
                  type="password"
                  value={keys.anthropic}
                  onChange={(e) => setKeys({ ...keys, anthropic: e.target.value })}
                  placeholder="sk-ant-..."
                  className="col-span-2 text-xs"
                />
              </div>
              <div className="grid grid-cols-3 items-center gap-4">
                <Label htmlFor="openai-key" className="text-right text-xs">OpenAI Key</Label>
                <Input
                  id="openai-key"
                  type="password"
                  value={keys.openai}
                  onChange={(e) => setKeys({ ...keys, openai: e.target.value })}
                  placeholder="sk-proj-..."
                  className="col-span-2 text-xs"
                />
              </div>
              <div className="grid grid-cols-3 items-center gap-4">
                <Label htmlFor="gemini-key" className="text-right text-xs">Gemini Key</Label>
                <Input
                  id="gemini-key"
                  type="password"
                  value={keys.gemini}
                  onChange={(e) => setKeys({ ...keys, gemini: e.target.value })}
                  placeholder="AIzaSy..."
                  className="col-span-2 text-xs"
                />
              </div>
              <div className="grid grid-cols-3 items-center gap-4">
                <Label htmlFor="ai-budget" className="text-right text-xs">Presupuesto IA (USD)</Label>
                <Input
                  id="ai-budget"
                  type="number"
                  min="0"
                  step="0.1"
                  value={keys.monthlyBudgetUsd}
                  onChange={(e) => setKeys({ ...keys, monthlyBudgetUsd: e.target.value })}
                  placeholder="0.50"
                  className="col-span-2 text-xs"
                />
              </div>
              <div className="pt-2 border-t mt-2"></div>
              <div className="grid grid-cols-3 items-center gap-4">
                <Label htmlFor="ollama-url" className="text-right text-xs">Ollama Cloud URL</Label>
                <Input
                  id="ollama-url"
                  type="text"
                  value={keys.ollamaBaseUrl}
                  onChange={(e) => setKeys({ ...keys, ollamaBaseUrl: e.target.value })}
                  placeholder="http://tu-servidor:11434/v1"
                  className="col-span-2 text-xs"
                />
              </div>
              <div className="grid grid-cols-3 items-center gap-4">
                <Label htmlFor="ollama-key" className="text-right text-xs">Ollama Key (Opcional)</Label>
                <Input
                  id="ollama-key"
                  type="password"
                  value={keys.ollamaKey}
                  onChange={(e) => setKeys({ ...keys, ollamaKey: e.target.value })}
                  placeholder="Bearer token si aplica..."
                  className="col-span-2 text-xs"
                />
              </div>
              <div className="grid grid-cols-3 items-center gap-4">
                <Label htmlFor="ollama-model" className="text-right text-xs">Ollama Model</Label>
                <Input
                  id="ollama-model"
                  type="text"
                  value={keys.ollamaModel}
                  onChange={(e) => setKeys({ ...keys, ollamaModel: e.target.value })}
                  placeholder="llama3.1:8b, qwen2.5, gemma3..."
                  className="col-span-2 text-xs"
                />
              </div>
            </div>
          </section>

          <section className="space-y-4 rounded-2xl border bg-muted/20 p-5">
            <div className="space-y-1">
              <h3 className="text-sm font-semibold">Medidor de IA</h3>
              <p className="text-xs text-muted-foreground">
                Aquí revisas el consumo acumulado sin ocupar espacio dentro del chat.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border bg-background/80 p-3">
                <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Entrada</p>
                <p className="mt-1 text-sm font-semibold">{formatTokenCount(usageSummary?.inputTokens)}</p>
              </div>
              <div className="rounded-xl border bg-background/80 p-3">
                <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Salida</p>
                <p className="mt-1 text-sm font-semibold">{formatTokenCount(usageSummary?.outputTokens)}</p>
              </div>
              <div className="rounded-xl border bg-background/80 p-3">
                <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Total</p>
                <p className="mt-1 text-sm font-semibold">{formatTokenCount(usageSummary?.totalTokens)}</p>
              </div>
              <div className="rounded-xl border bg-background/80 p-3">
                <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Costo estimado</p>
                <p className="mt-1 text-sm font-semibold">{formatUsd(usageSummary?.estimatedCostUsd)}</p>
              </div>
            </div>

            {typeof budgetProgress === "number" ? (
              <div>
                <div className="mb-1.5 flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>Progreso del presupuesto</span>
                  <span>
                    {formatUsd(usageSummary?.estimatedCostUsd)} / {formatUsd(aiSettings.monthlyBudgetUsd)}
                  </span>
                </div>
                <Progress value={budgetProgress} className="gap-0" aria-label="Progreso del presupuesto" />
                {budgetState === "warning" ? (
                  <p className="mt-2 text-[11px] text-amber-700 dark:text-amber-300">
                    Aviso: ya pasaste el 80% del presupuesto de referencia.
                  </p>
                ) : null}
                {budgetState === "exceeded" ? (
                  <p className="mt-2 text-[11px] text-rose-700 dark:text-rose-300">
                    Aviso: ya superaste el presupuesto de referencia. Esto no bloquea Gemini; es un medidor local de Pendola.
                  </p>
                ) : null}
              </div>
            ) : (
              <p className="text-[11px] leading-5 text-muted-foreground">
                Define un presupuesto arriba para activar la barra compacta del chat y controlar mejor el consumo.
              </p>
            )}

            <div className="flex items-center justify-between gap-3 rounded-xl border bg-background/70 p-3">
              <div className="text-[11px] text-muted-foreground">
                <p>
                  Ciclo actual desde{" "}
                  <span className="font-medium text-foreground">
                    {aiSettings.budgetCycleStartedAt
                      ? new Date(aiSettings.budgetCycleStartedAt).toLocaleString("es-PE")
                      : "ahora"}
                  </span>
                </p>
                <p className="mt-1">
                  Reiniciar no borra chats; solo vuelve a cero el medidor.
                </p>
              </div>
              <Button type="button" variant="outline" size="sm" className="shrink-0" onClick={handleResetMeter}>
                <RotateCcw className="mr-1 h-3.5 w-3.5" />
                Reiniciar
              </Button>
            </div>
          </section>

          <section className="space-y-4 rounded-2xl border bg-muted/20 p-5">
            <div className="space-y-1">
              <h3 className="text-sm font-semibold">Experiencia de escritura</h3>
              <p className="text-xs text-muted-foreground">
                Ajusta cómo se ve el editor al escribir y corregir. Estas preferencias son personales y se guardan en este navegador.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-xs">Tipografía del editor</Label>
                <Select
                  value={preferences.editorFont}
                  onValueChange={(value) =>
                    setPreferences((current) => ({
                      ...current,
                      editorFont: value as WriterFontOption,
                    }))
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(FONT_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs">Ancho de columna</Label>
                <Select
                  value={preferences.columnWidth}
                  onValueChange={(value) =>
                    setPreferences((current) => ({
                      ...current,
                      columnWidth: value as WriterColumnWidth,
                    }))
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(COLUMN_WIDTH_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Tamaño de texto</Label>
              <div className="flex flex-wrap gap-2.5">
                {FONT_SIZE_OPTIONS.map((size) => (
                  <Button
                    key={size}
                    type="button"
                    variant={preferences.fontSize === size ? "default" : "outline"}
                    size="sm"
                    className="rounded-xl"
                    onClick={() =>
                      setPreferences((current) => ({
                        ...current,
                        fontSize: size,
                      }))
                    }
                  >
                    {size}px
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Interlineado</Label>
              <div className="flex flex-wrap gap-2.5">
                {LINE_HEIGHT_OPTIONS.map((value) => (
                  <Button
                    key={value}
                    type="button"
                    variant={preferences.lineHeight === value ? "default" : "outline"}
                    size="sm"
                    className="rounded-xl"
                    onClick={() =>
                      setPreferences((current) => ({
                        ...current,
                        lineHeight: value,
                      }))
                    }
                  >
                    {value.toFixed(2)}
                  </Button>
                ))}
              </div>
            </div>
          </section>

        </div>

        <div className="flex shrink-0 justify-end gap-2 border-t pt-4">
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={handleSave}>Guardar Configuración</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
