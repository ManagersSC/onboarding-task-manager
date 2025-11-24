// Split the Airtable Options field into an array of option strings.
// Accepts separators: "<br>", "<br/>", "<br />", and HTML-escaped "&lt;br>"
export function splitOptionsString(raw) {
  if (!raw) return []
  const str = String(raw)
  // Normalize common variants to a single token
  const normalized = str
    .replace(/&lt;br\s*\/?>/gi, "<br>")
    .replace(/<br\s*\/?>/gi, "<br>")
  return normalized
    .split("<br>")
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
}

// Join an array of option strings into Airtable Options multiline format using "<br>"
export function joinOptionsArray(options) {
  if (!Array.isArray(options)) return ""
  return options
    .map((s) => String(s || "").trim())
    .filter((s) => s.length > 0)
    .join("<br>")
}

// Validate that correctAnswer conforms to question type and available options.
// For "Radio": must be a single string present in options.
// For "Checkbox": allow string of multiple answers delimited by "<br>" (or array); each must be present in options.
export function validateCorrectAnswer(correctAnswer, questionType, options) {
  const opts = new Set(splitOptionsString(joinOptionsArray(options)))
  if (String(questionType).toLowerCase() === "radio") {
    const ans = String(correctAnswer || "").trim()
    return ans.length > 0 && opts.has(ans)
  }
  if (String(questionType).toLowerCase() === "checkbox") {
    let parts = []
    if (Array.isArray(correctAnswer)) parts = correctAnswer
    else parts = splitOptionsString(String(correctAnswer || ""))
    if (parts.length === 0) return false
    return parts.every((p) => opts.has(String(p).trim()))
  }
  // Default: no strict validation
  return true
}


