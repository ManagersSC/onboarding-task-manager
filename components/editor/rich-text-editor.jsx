"use client"

import { useEffect, useRef } from "react"
import { Button } from "@components/ui/button"
import { Separator } from "@components/ui/separator"
import { Bold, Italic, List, ListOrdered, Link as LinkIcon, Eraser, CornerDownLeft } from "lucide-react"

function exec(cmd, val) {
  try { document.execCommand(cmd, false, val) } catch {}
}

export default function RichTextEditor({ value = "", onChange, placeholder = "Write here...", className = "" }) {
  const ref = useRef(null)

  const lastHtmlRef = useRef("")

  useEffect(() => {
    const el = ref.current
    if (!el) return
    // Only set when external value changes (avoid cursor jump)
    if (el.innerHTML !== String(value || "")) {
      el.innerHTML = String(value || "")
      lastHtmlRef.current = String(value || "")
    }
  }, [value])

  const handleInput = () => {
    const html = ref.current?.innerHTML || ""
    if (html !== lastHtmlRef.current) {
      lastHtmlRef.current = html
      onChange?.(html)
    }
  }

  const insertLink = () => {
    const url = window.prompt("Enter URL")
    if (!url) return
    exec("createLink", url)
    handleInput()
  }

  const insertLineBreak = () => {
    exec("insertHTML", "<br>")
    handleInput()
  }

  return (
    <div className={className}>
      <div className="flex items-center gap-1 mb-2">
        <Button type="button" variant="outline" size="sm" className="h-7 px-2" onClick={() => { exec("bold"); handleInput() }} title="Bold (Ctrl/Cmd+B)">
          <Bold className="h-3.5 w-3.5" />
        </Button>
        <Button type="button" variant="outline" size="sm" className="h-7 px-2" onClick={() => { exec("italic"); handleInput() }} title="Italic (Ctrl/Cmd+I)">
          <Italic className="h-3.5 w-3.5" />
        </Button>
        <Separator orientation="vertical" className="h-5" />
        <Button type="button" variant="outline" size="sm" className="h-7 px-2" onClick={() => { exec("insertUnorderedList"); handleInput() }} title="Bulleted list">
          <List className="h-3.5 w-3.5" />
        </Button>
        <Button type="button" variant="outline" size="sm" className="h-7 px-2" onClick={() => { exec("insertOrderedList"); handleInput() }} title="Numbered list">
          <ListOrdered className="h-3.5 w-3.5" />
        </Button>
        <Separator orientation="vertical" className="h-5" />
        <Button type="button" variant="outline" size="sm" className="h-7 px-2" onClick={insertLink} title="Insert link">
          <LinkIcon className="h-3.5 w-3.5" />
        </Button>
        <Button type="button" variant="outline" size="sm" className="h-7 px-2" onClick={() => { exec("removeFormat"); handleInput() }} title="Clear formatting">
          <Eraser className="h-3.5 w-3.5" />
        </Button>
        <Separator orientation="vertical" className="h-5" />
        <Button type="button" variant="outline" size="sm" className="h-7 px-2" onClick={insertLineBreak} title="Line break (Shift+Enter)">
          <CornerDownLeft className="h-3.5 w-3.5" />
        </Button>
      </div>
      <div
        ref={ref}
        role="textbox"
        aria-multiline="true"
        contentEditable
        suppressContentEditableWarning
        className="min-h-[80px] max-h-[200px] overflow-auto rounded-md border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        placeholder={placeholder}
        onInput={handleInput}
        onBlur={handleInput}
        onKeyDown={(e) => {
          if (e.key === "Enter" && e.shiftKey) {
            e.preventDefault()
            insertLineBreak()
          }
        }}
      />
    </div>
  )
}


