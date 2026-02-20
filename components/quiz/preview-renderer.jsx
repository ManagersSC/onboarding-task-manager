"use client"

import { RadioGroup, RadioGroupItem } from "@components/ui/radio-group"
import { Checkbox } from "@components/ui/checkbox"
import { Label } from "@components/ui/label"
import { splitOptionsString } from "@/lib/quiz/options"
import { sanitizeHtml } from "@/lib/utils/sanitize"

export default function PreviewRenderer({ items = [] }) {
  const toArray = (opts) => Array.isArray(opts) ? opts : splitOptionsString(String(opts || ""))
  return (
    <div className="space-y-3">
      {items
        .slice()
        .sort((a,b) => (Number(a?.order ?? 0)) - (Number(b?.order ?? 0)))
        .map((it, idx) => {
          const type = String(it?.type || it?.Type || "").toLowerCase()
          const qType = String(it?.qType || it?.["Q.Type"] || it?.questionType || "").toLowerCase()
          const content = it?.content || it?.Content || it?.questionText || ""
          const options = toArray(it?.options ?? it?.Options ?? it?.choices)
          if (type === "information" || type === "info") {
            return (
              <div key={it.id || idx} className="rounded-md border p-3 bg-secondary/40">
                <div className="text-sm" dangerouslySetInnerHTML={{ __html: sanitizeHtml(content) }} />
              </div>
            )
          }
          if (qType === "checkbox") {
            return (
              <div key={it.id || idx} className="rounded-md border p-3">
                <div className="text-sm font-medium mb-2" dangerouslySetInnerHTML={{ __html: sanitizeHtml(content) }} />
                <div className="space-y-2">
                  {options.map((opt, i) => (
                    <Label key={i} className="flex items-center gap-2 text-sm">
                      <Checkbox disabled className="pointer-events-none" />
                      <span dangerouslySetInnerHTML={{ __html: sanitizeHtml(opt) }} />
                    </Label>
                  ))}
                </div>
              </div>
            )
          }
          return (
            <div key={it.id || idx} className="rounded-md border p-3">
              <div className="text-sm font-medium mb-2" dangerouslySetInnerHTML={{ __html: sanitizeHtml(content) }} />
              <RadioGroup value="" className="space-y-2">
                {options.map((opt, i) => (
                  <Label key={i} className="flex items-center gap-2 text-sm">
                    <RadioGroupItem disabled value={`opt-${i}`} className="pointer-events-none" />
                    <span dangerouslySetInnerHTML={{ __html: sanitizeHtml(opt) }} />
                  </Label>
                ))}
              </RadioGroup>
            </div>
          )
        })}
    </div>
  )
}


