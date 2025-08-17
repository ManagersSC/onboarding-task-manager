import { z } from "zod"

// Schema for updating applicant stage
export const applicantUpdateSchema = z.object({
  stage: z.enum([
    'First Interview Invite Sent',
    'Second Interview Invite Sent', 
    'Hired'
  ]),
  location: z.string().optional()
}).refine((data) => {
  // Custom validation for location requirement
  if (data.stage.includes('Interview Invite') && !data.location) {
    return false
  }
  return true
}, {
  message: "Location is required for interview invite stages"
})

// Schema for feedback upload
export const feedbackUploadSchema = z.object({
  interviewStage: z.enum(['First Interview', 'Second Interview']),
  files: z.array(z.instanceof(File)).min(1, "At least one file is required"),
  notes: z.string().optional()
})

// Schema for bulk applicant creation
export const bulkApplicantSchema = z.object({
  emails: z.array(z.string().email()).min(1, "At least one email is required")
})

// Schema for search parameters
export const searchParamsSchema = z.object({
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(50).default(20),
  search: z.string().optional(),
  stage: z.string().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional()
})
