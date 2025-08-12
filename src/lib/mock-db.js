const _applicants = [
  {
    id: "rec_001",
    name: "Ayesha Khan",
    email: "ayesha.khan@example.com",
    phone: "+44 7700 900001",
    stage: "New Application",
    job: "Dental Nurse",
    location: "",
    interviewDate: "",
    secondInterviewDate: "",
    docs: { present: 2, required: 5 },
    requiredDocs: [
      "Passport",
      "GDC Registration Certificate",
      "Qualification Certificate",
      "Indemnity Insurance",
      "Hep B Immunity Record",
    ],
    providedDocs: ["Passport", "CV"],
    feedbackCount: 0,
    feedback: [],
    feedbackFiles: [],
    source: "Indeed",
    createdAt: "2025-08-01",
    updatedAt: "2025-08-05",
  },
  {
    id: "rec_002",
    name: "Ben Thompson",
    email: "ben.t@example.com",
    phone: "+44 7700 900002",
    stage: "First Interview Booked",
    job: "Receptionist",
    location: "Finchley Branch",
    interviewDate: "2025-08-12 10:00",
    secondInterviewDate: "",
    docs: { present: 4, required: 5 },
    requiredDocs: ["Passport", "Qualification Certificate", "DBS", "Indemnity Insurance", "Hep B Immunity Record"],
    providedDocs: ["Passport", "DBS", "CV", "Qualification Certificate"],
    feedbackCount: 1,
    feedback: [{ id: "f1", stage: "First Interview", createdAt: "2025-08-05 14:10", notes: "Strong communication." }],
    feedbackFiles: [{ name: "first-interview-notes.pdf", size: 120000, type: "application/pdf" }],
    source: "LinkedIn",
    createdAt: "2025-07-29",
    updatedAt: "2025-08-06",
  },
  {
    id: "rec_003",
    name: "Chloe Martin",
    email: "chloe.m@example.com",
    phone: "+44 7700 900003",
    stage: "Second Interview Invite Sent",
    job: "Dentist",
    location: "Online",
    interviewDate: "2025-08-08 09:30",
    secondInterviewDate: "",
    docs: { present: 5, required: 7 },
    requiredDocs: [
      "Passport",
      "Portfolio with Testimonial",
      "GDC Registration Certificate",
      "Qualification Certificate",
      "Indemnity Insurance",
      "Hep B Immunity Record",
      "Reference 1",
    ],
    providedDocs: [
      "Passport",
      "GDC Registration Certificate",
      "Qualification Certificate",
      "Indemnity Insurance",
      "Reference 1",
    ],
    feedbackCount: 2,
    feedback: [
      { id: "f2", stage: "First Interview", createdAt: "2025-08-02 11:00", notes: "Technically excellent." },
      { id: "f3", stage: "Finished Interviews", createdAt: "2025-08-03 15:30", notes: "Recommend for second." },
    ],
    feedbackFiles: [
      { name: "portfolio-review.png", size: 340000, type: "image/png" },
      {
        name: "second-invite-prep.docx",
        size: 78000,
        type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      },
    ],
    source: "Smile Cliniq Website",
    createdAt: "2025-07-27",
    updatedAt: "2025-08-07",
  },
  {
    id: "rec_004",
    name: "Daniele Costa",
    email: "daniele.c@example.com",
    phone: "+44 7700 900004",
    stage: "Hired",
    job: "Dental Nurse",
    location: "St Johns Wood Branch",
    interviewDate: "2025-07-20 13:30",
    secondInterviewDate: "2025-07-27 13:30",
    docs: { present: 7, required: 7 },
    requiredDocs: [
      "Passport",
      "GDC Registration Certificate",
      "Qualification Certificate",
      "Indemnity Insurance",
      "Hep B Immunity Record",
      "Reference 1",
      "Reference 2",
    ],
    providedDocs: [
      "Passport",
      "GDC Registration Certificate",
      "Qualification Certificate",
      "Indemnity Insurance",
      "Hep B Immunity Record",
      "Reference 1",
      "Reference 2",
    ],
    feedbackCount: 3,
    feedback: [
      { id: "f4", stage: "First Interview", createdAt: "2025-07-15 10:00", notes: "Great culture fit." },
      { id: "f5", stage: "Second Interview", createdAt: "2025-07-22 10:00", notes: "Strong clinical knowledge." },
      { id: "f6", stage: "Finished Interviews", createdAt: "2025-07-28 10:00", notes: "Offer recommended." },
    ],
    feedbackFiles: [
      { name: "final-assessment.pdf", size: 210000, type: "application/pdf" },
      { name: "references.zip", size: 560000, type: "application/zip" },
    ],
    source: "Reed",
    createdAt: "2025-07-10",
    updatedAt: "2025-07-28",
  },
]

export async function getApplicants() {
  await new Promise((r) => setTimeout(r, 120))
  return _applicants
}

export async function getApplicantById(id) {
  await new Promise((r) => setTimeout(r, 10))
  return _applicants.find((a) => a.id === id) || null
}

export async function updateApplicantInStore(id, changes) {
  await new Promise((r) => setTimeout(r, 80))
  const idx = _applicants.findIndex((a) => a.id === id)
  if (idx === -1) throw new Error("Applicant not found")
  const next = {
    ..._applicants[idx],
    ...changes,
    updatedAt: new Date().toISOString(),
  }
  _applicants[idx] = next
  return next
}

export async function addApplicantsFromEmails(emails) {
  await new Promise((r) => setTimeout(r, 120))
  const created = []
  for (const email of emails) {
    const local = String(email).split("@")[0]
    const name = local
      .split(/[.\-_]+/)
      .map((s) => (s ? s[0].toUpperCase() + s.slice(1) : ""))
      .join(" ")
    const id = `rec_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
    const row = {
      id,
      name: name || email,
      email,
      phone: "",
      stage: "New Application",
      job: "",
      location: "",
      interviewDate: "",
      secondInterviewDate: "",
      docs: { present: 0, required: 0 },
      requiredDocs: [],
      providedDocs: [],
      feedbackCount: 0,
      feedback: [],
      feedbackFiles: [],
      source: "Manual",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    _applicants.unshift(row)
    created.push(row)
  }
  return created
}

export async function addFeedbackFiles(id, files) {
  await new Promise((r) => setTimeout(r, 120))
  const idx = _applicants.findIndex((a) => a.id === id)
  if (idx === -1) throw new Error("Applicant not found")
  const additions = (files || []).map((f, i) => ({
    id: `fb_${Date.now()}_${i}`,
    stage: "Attachment",
    createdAt: new Date().toISOString(),
    notes: `File: ${f.name} (${Math.round((f.size || 0) / 1024)} KB)`,
  }))
  const next = {
    ..._applicants[idx],
    feedbackCount: (_applicants[idx].feedbackCount || 0) + additions.length,
    feedback: [...(_applicants[idx].feedback || []), ...additions],
    feedbackFiles: [...(_applicants[idx].feedbackFiles || []), ...(files || [])],
    updatedAt: new Date().toISOString(),
  }
  _applicants[idx] = next
  return next
}
