/**
 * Appraisal Questions JSON Utilities
 * 
 * Handles normalization, validation, and manipulation of pre-appraisal question JSON structures.
 * All questions follow the contract:
 * {
 *   version: 1,
 *   type: "preappraisal",
 *   roleKey: "<string>",
 *   updatedAt: "<ISO datetime>",
 *   questions: [{ order: 1, text: "<question text>" }, ...]
 * }
 */

/**
 * Normalize questions array - sort by order, renumber 1..N, remove empty text entries
 * @param {Array} questions - Array of {order, text} objects
 * @returns {Array} Normalized questions array
 */
export function normalizeQuestions(questions) {
  if (!Array.isArray(questions)) return []
  
  // Filter out empty questions and trim text
  const filtered = questions
    .map(q => ({
      order: Number(q?.order) || 0,
      text: String(q?.text || "").trim()
    }))
    .filter(q => q.text.length > 0)
  
  // Sort by original order
  filtered.sort((a, b) => a.order - b.order)
  
  // Renumber sequentially 1..N
  return filtered.map((q, idx) => ({
    order: idx + 1,
    text: q.text
  }))
}

/**
 * Validate a questions JSON string or object
 * @param {string|object} jsonInput - JSON string or parsed object
 * @returns {{ valid: boolean, data: object|null, error: string|null }}
 */
export function validateQuestionsJSON(jsonInput) {
  try {
    let data
    if (typeof jsonInput === "string") {
      if (!jsonInput.trim()) {
        return { valid: false, data: null, error: "Empty JSON string" }
      }
      data = JSON.parse(jsonInput)
    } else if (typeof jsonInput === "object" && jsonInput !== null) {
      data = jsonInput
    } else {
      return { valid: false, data: null, error: "Invalid input type" }
    }

    // Check required fields
    if (data.version !== 1) {
      return { valid: false, data: null, error: "Invalid or missing version (expected 1)" }
    }
    if (data.type !== "preappraisal") {
      return { valid: false, data: null, error: "Invalid or missing type (expected 'preappraisal')" }
    }
    if (typeof data.roleKey !== "string") {
      return { valid: false, data: null, error: "Missing or invalid roleKey" }
    }
    if (!Array.isArray(data.questions)) {
      return { valid: false, data: null, error: "Missing or invalid questions array" }
    }

    // Validate each question
    for (let i = 0; i < data.questions.length; i++) {
      const q = data.questions[i]
      if (typeof q !== "object" || q === null) {
        return { valid: false, data: null, error: `Question at index ${i} is not an object` }
      }
      if (typeof q.order !== "number" || q.order < 1) {
        return { valid: false, data: null, error: `Question at index ${i} has invalid order` }
      }
      if (typeof q.text !== "string") {
        return { valid: false, data: null, error: `Question at index ${i} has invalid text` }
      }
    }

    return { valid: true, data, error: null }
  } catch (e) {
    return { valid: false, data: null, error: `JSON parse error: ${e.message}` }
  }
}

/**
 * Create an empty questions JSON structure
 * @param {string} roleKey - The role/job identifier
 * @returns {object} Valid empty questions structure
 */
export function createEmptyQuestionsJSON(roleKey = "unknown") {
  return {
    version: 1,
    type: "preappraisal",
    roleKey: String(roleKey),
    updatedAt: new Date().toISOString(),
    questions: []
  }
}

/**
 * Create a questions JSON structure with the given questions
 * @param {string} roleKey - The role/job identifier
 * @param {Array} questions - Array of {order, text} objects
 * @returns {object} Valid questions structure
 */
export function createQuestionsJSON(roleKey, questions) {
  return {
    version: 1,
    type: "preappraisal",
    roleKey: String(roleKey || "unknown"),
    updatedAt: new Date().toISOString(),
    questions: normalizeQuestions(questions)
  }
}

/**
 * Deep copy template to override with fresh updatedAt
 * @param {object|string} templateJSON - The template JSON (parsed or string)
 * @param {string} [overrideRoleKey] - Optional roleKey override
 * @returns {{ success: boolean, data: object|null, error: string|null }}
 */
export function copyTemplateToOverride(templateJSON, overrideRoleKey = null) {
  const validation = validateQuestionsJSON(templateJSON)
  
  if (!validation.valid) {
    // If template is invalid, return empty structure
    const roleKey = overrideRoleKey || "unknown"
    return {
      success: true,
      data: createEmptyQuestionsJSON(roleKey),
      error: `Template was invalid, created empty structure: ${validation.error}`
    }
  }

  const copy = {
    version: 1,
    type: "preappraisal",
    roleKey: overrideRoleKey || validation.data.roleKey,
    updatedAt: new Date().toISOString(),
    questions: normalizeQuestions(validation.data.questions)
  }

  return { success: true, data: copy, error: null }
}

/**
 * Parse questions from Airtable field (handles lookup array format and legacy formats)
 * @param {string|Array} fieldValue - The raw Airtable field value
 * @returns {{ success: boolean, data: object|null, error: string|null }}
 */
export function parseAirtableQuestionsField(fieldValue) {
  // Lookup fields may return an array with a single string
  let jsonString = fieldValue
  if (Array.isArray(fieldValue)) {
    jsonString = fieldValue.join("")
  }
  
  if (!jsonString || (typeof jsonString === "string" && !jsonString.trim())) {
    return { success: false, data: null, error: "Empty field value" }
  }

  // Try to parse the JSON
  let parsed
  try {
    parsed = typeof jsonString === "string" ? JSON.parse(jsonString) : jsonString
  } catch (e) {
    return { success: false, data: null, error: `JSON parse error: ${e.message}` }
  }

  // Handle legacy format: { version: 1, questions: ["string", "string"] }
  // Convert to new format: { version: 1, type: "preappraisal", roleKey, questions: [{order, text}] }
  if (parsed && Array.isArray(parsed.questions) && parsed.questions.length > 0) {
    const firstQuestion = parsed.questions[0]
    
    // Check if it's legacy format (questions are strings, not objects)
    if (typeof firstQuestion === "string") {
      const convertedQuestions = parsed.questions
        .filter(q => typeof q === "string" && q.trim())
        .map((text, idx) => ({ order: idx + 1, text: text.trim() }))
      
      const convertedData = {
        version: 1,
        type: "preappraisal",
        roleKey: parsed.roleKey || "unknown",
        updatedAt: parsed.updatedAt || new Date().toISOString(),
        questions: convertedQuestions
      }
      
      return { success: true, data: convertedData, error: null }
    }
  }

  // Standard validation for new format
  const validation = validateQuestionsJSON(parsed)
  if (!validation.valid) {
    return { success: false, data: null, error: validation.error }
  }

  return { success: true, data: validation.data, error: null }
}

/**
 * Generate a stable role key from job name
 * @param {string} jobName - The job name
 * @returns {string} Slugified role key
 */
export function generateRoleKey(jobName) {
  if (!jobName || typeof jobName !== "string") return "unknown"
  return jobName
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    || "unknown"
}
