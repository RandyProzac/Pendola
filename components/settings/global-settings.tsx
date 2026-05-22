"use client";

import { useState } from "react";
import { Settings, Cpu, BrainCircuit, Sparkles, Box } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  const { aiSettings, updateAISettings, writerPreferences, updateWriterPreferences } = useProjectStore();
  const [open, setOpen] = useState(false);

  // Local state until saved
  const [keys, setKeys] = useState({
    openai: aiSettings.openaiKey || "",
    anthropic: aiSettings.anthropicKey || "",
    gemini: aiSettings.geminiKey || "",
  });
  const [preferences, setPreferences] = useState(writerPreferences);

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);

    if (nextOpen) {
      setKeys({
        openai: aiSettings.openaiKey || "",
        anthropic: aiSettings.anthropicKey || "",
        gemini: aiSettings.geminiKey || "",
      });
      setPreferences(writerPreferences);
    }
  };

  const handleProviderSelect = (provider: AIProvider) => {
    updateAISettings({ provider });
  };

  const handleSave = () => {
    updateAISettings({
      openaiKey: keys.openai,
      anthropicKey: keys.anthropic,
      geminiKey: keys.gemini,
    });
    updateWriterPreferences(preferences);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger 
        render={<Button variant="outline" size="sm" className="gap-2 text-xs w-full" />}
      >
        <Settings className="h-4 w-4" />
        Ajustes / Perfil
      </DialogTrigger>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>Ajustes Globales (Mi Perfil)</DialogTitle>
          <DialogDescription>
            Configura el motor de Inteligencia Artificial que usará Péndola en todo tu entorno de trabajo.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-1">
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
                  <h4 className="font-medium text-sm">Ollama (Local)</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">Gratuito, privado (por defecto).</p>
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

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={handleSave}>Guardar Configuración</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
