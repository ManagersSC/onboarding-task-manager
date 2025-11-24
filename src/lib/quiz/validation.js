export function findDuplicateOrders(items) {
  const map = new Map()
  for (const it of items) {
    const n = Number(it?.order ?? 0)
    if (!Number.isFinite(n) || n <= 0) continue
    map.set(n, (map.get(n) || 0) + 1)
  }
  const dups = new Set([...map.entries()].filter(([, c]) => c > 1).map(([k]) => k))
  return dups
}

export function validateItem(it) {
  const errors = []
  const type = String(it?.type || "").toLowerCase()
  const qType = String(it?.qType || "").toLowerCase()
  const options = Array.isArray(it?.optionsArray) ? it.optionsArray : []
  const correct = Array.isArray(it?.correctAnswerArray) ? it.correctAnswerArray : []
  const order = Number(it?.order ?? 0)
  if (!Number.isFinite(order) || order <= 0) errors.push("Order must be a positive number")
  if (type === "information") return errors
  // question
  const nonEmptyOptions = options.map((s) => String(s || "").trim()).filter(Boolean)
  if (nonEmptyOptions.length < 2) errors.push("Provide at least 2 options")
  if (qType === "radio") {
    if (correct.length !== 1) errors.push("Select exactly one correct answer")
    if (correct.length === 1 && !nonEmptyOptions.includes(correct[0])) errors.push("Correct answer must be one of options")
  } else if (qType === "checkbox") {
    if (correct.length < 1) errors.push("Select at least one correct answer")
    if (correct.some((c) => !nonEmptyOptions.includes(c))) errors.push("Correct answers must be options")
  }
  return errors
}

export function validateAll(items) {
  const duplicateOrders = findDuplicateOrders(items)
  const perItem = items.map((it) => ({ id: it.id, errors: validateItem(it), hasDuplicateOrder: duplicateOrders.has(Number(it?.order ?? 0)) }))
  const hasAnyErrors = perItem.some((e) => e.errors.length > 0 || e.hasDuplicateOrder)
  return { duplicateOrders, perItem, hasAnyErrors }
}


