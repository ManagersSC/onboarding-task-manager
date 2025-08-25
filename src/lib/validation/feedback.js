import { z } from 'zod'

export const feedbackUploadSchema = z.object({
  interviewStage: z.enum(['First Interview', 'Second Interview', 'Finished Interviews']),
  files: z.array(z.instanceof(File)).min(1, "At least one file is required").max(10, "Maximum 10 files allowed"),
  notes: z.string().max(1000, "Notes must be less than 1000 characters").optional(),
  rating: z.number().min(1).max(5).optional()
})

export const feedbackDocumentSchema = z.object({
  id: z.string(),
  feedbackId: z.string(),
  documentType: z.string(),
  interviewStage: z.string(),
  fileName: z.string(),
  fileUrl: z.string().url(),
  fileSize: z.number().positive(),
  fileType: z.string(),
  uploadedAt: z.string(),
  interviewer: z.string(),
  rating: z.number().min(1).max(5).optional(),
  notes: z.string().optional(),
  metadata: z.object({
    feedbackRecordId: z.string(),
    originalField: z.string(),
    isAttachment: z.boolean()
  }).optional()
})

export const feedbackDocumentsResponseSchema = z.object({
  feedbackDocuments: z.array(feedbackDocumentSchema),
  metadata: z.object({
    totalDocuments: z.number(),
    documentTypes: z.array(z.string()),
    interviewStages: z.array(z.string())
  }).optional()
})

// Validation function for feedback upload
export function validateFeedbackUpload(data) {
  try {
    return { success: true, data: feedbackUploadSchema.parse(data) }
  } catch (error) {
    return { success: false, error: error.errors }
  }
}

// Validation function for feedback documents
export function validateFeedbackDocuments(data) {
  try {
    return { success: true, data: feedbackDocumentsResponseSchema.parse(data) }
  } catch (error) {
    return { success: false, error: error.errors }
  }
}
