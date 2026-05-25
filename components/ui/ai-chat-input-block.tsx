"use client"

import { useState } from "react"
import { Globe, Lightbulb, Mic, Paperclip, Send } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Toggle } from "@/components/ui/toggle"

function AIChatInputBlock() {
  const [input, setInput] = useState("")
  const [model, setModel] = useState("gpt-3.5-turbo")

  const handleSubmit = () => {
    console.log("Submitted:", { input, model })
    setInput("")
  }

  return (
    <div className="flex w-full max-w-2xl flex-col gap-2">
      <div className="flex w-full items-center justify-end max-sm:justify-center">
        <Select
          onValueChange={(value) => {
            if (value) setModel(value)
          }}
          value={model}
        >
          <SelectTrigger className="min-w-44 border-none bg-transparent shadow-none hover:bg-muted">
            <SelectValue placeholder="Selecciona un modelo" />
          </SelectTrigger>
          <SelectContent className="text-sm">
            <SelectItem value="claude-sonnet-4-preview">
              Claude Sonnet 4 (Preview)
            </SelectItem>
            <SelectItem value="claude-sonnet-3.7">Claude Sonnet 3.7</SelectItem>
            <SelectItem value="claude-sonnet-3.5">Claude Sonnet 3.5</SelectItem>
            <SelectItem value="gemini-2.5-pro-preview">
              Gemini 2.5 Pro (Preview)
            </SelectItem>
            <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo</SelectItem>
            <SelectItem value="gpt-4">GPT-4</SelectItem>
            <SelectItem value="gpt-4o">GPT-4o</SelectItem>
            <SelectItem value="gpt-o4-mini">o4-mini (Preview)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card className="w-full rounded-3xl border bg-card/95">
        <CardContent className="space-y-4 p-4">
          <Textarea
            placeholder="Type your message..."
            value={input}
            onChange={(event) => setInput(event.target.value)}
            className="min-h-28 resize-none border-none bg-transparent px-0 py-0 text-sm shadow-none focus-visible:border-none focus-visible:ring-0"
          />

          <div className="flex w-full items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="rounded-md">
                <Paperclip />
              </Button>
              <Toggle size="icon" className="h-9 w-9 rounded-md">
                <Lightbulb className="size-4 shrink-0" />
              </Toggle>
              <Toggle
                variant="ghost"
                className="flex items-center gap-1.5 text-sm font-normal"
              >
                <Globe className="size-4 shrink-0" />
                <span className="max-sm:hidden">Search</span>
              </Toggle>
            </div>

            <div className="flex items-center gap-1">
              <Toggle
                variant="outline"
                size="icon"
                className="h-10 w-10 rounded-full"
                aria-label="Activar micrófono"
              >
                <Mic className="size-4 shrink-0" />
              </Toggle>
              <Button onClick={handleSubmit} size="icon" className="rounded-md">
                <Send />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default AIChatInputBlock
