/**
 * Replace template variables with actual data from applicant record
 * @param {string} text - Text containing variables like {{name}}
 * @param {object} applicantData - Applicant record from Airtable
 * @param {object} senderData - Current user data
 * @returns {string} - Text with variables replaced
 */
export function replaceVariables(text, applicantData, senderData = {}) {
  if (!text || !applicantData) return text

  return text
    .replace(/{{name}}/g, applicantData.Name || '')
    .replace(/{{role}}/g, applicantData['Applying For']?.[0]?.Title || '')
    .replace(/{{startDate}}/g, applicantData['Onboarding Start Date'] ? 
      new Date(applicantData['Onboarding Start Date']).toLocaleDateString() : 'TBD')
    .replace(/{{department}}/g, applicantData['Applying For']?.[0]?.Title || '')
    .replace(/{{senderName}}/g, senderData.Name || 'HR Team')
    .replace(/{{currentDate}}/g, new Date().toLocaleDateString())
}

/**
 * Get available variables for email templates
 * @returns {Array} - Array of variable objects
 */
export function getAvailableVariables() {
  return [
    { key: '{{name}}', description: "Employee's full name" },
    { key: '{{role}}', description: "Employee's job title" },
    { key: '{{startDate}}', description: "Onboarding start date" },
    { key: '{{department}}', description: "Employee's department" },
    { key: '{{senderName}}', description: "Your name" },
    { key: '{{currentDate}}', description: "Today's date" }
  ]
}

/**
 * Validate if all variables in text have corresponding data
 * @param {string} text - Text containing variables
 * @param {object} applicantData - Applicant record
 * @returns {object} - Validation result with missing variables
 */
export function validateVariables(text, applicantData) {
  const variables = getAvailableVariables()
  const missingVariables = []

  variables.forEach(variable => {
    if (text.includes(variable.key)) {
      const hasData = checkVariableData(variable.key, applicantData)
      if (!hasData) {
        missingVariables.push(variable.key)
      }
    }
  })

  return {
    isValid: missingVariables.length === 0,
    missingVariables
  }
}

/**
 * Check if variable has corresponding data
 * @param {string} variable - Variable key like {{name}}
 * @param {object} applicantData - Applicant record
 * @returns {boolean} - Whether data exists for this variable
 */
function checkVariableData(variable, applicantData) {
  switch (variable) {
    case '{{name}}':
      return !!applicantData.Name
    case '{{role}}':
      return !!applicantData['Applying For']?.[0]?.Title
    case '{{startDate}}':
      return !!applicantData['Onboarding Start Date']
    case '{{department}}':
      return !!applicantData['Applying For']?.[0]?.Title
    case '{{senderName}}':
      return true // Always available
    case '{{currentDate}}':
      return true // Always available
    default:
      return false
  }
} 