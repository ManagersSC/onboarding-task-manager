// src/app/api/admin/dashboard/new-hires/[id]/start-onboarding/route.test.js
import { jest } from "@jest/globals";

// Top-level mocks to align with other tests
jest.mock("@/lib/utils/logger", () => ({
  error: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
  warn: jest.fn(),
}));
jest.mock("@/lib/auditLogger", () => ({
  logAuditEvent: jest.fn(),
}));

// Simulate Next.js Response.json
class TestResponse {
  constructor(data, status = 200) {
    this._data = data;
    this.status = status;
  }
  async json() {
    return this._data;
  }
}
global.Response = {
  json: (data, options = {}) => new TestResponse(data, options.status || 200),
};

// Helper: get local-date YYYY-MM-DD string
const localYmd = (d) => {
  const z = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return z.toISOString().split("T")[0];
};

// Common setup helper to mock modules and import the route under test
const setupMocks = (overrides = {}) => {
  const applicantsFindMock =
    overrides.applicantsFindMock ||
    jest.fn().mockResolvedValue({
      id: "applicant1",
      fields: {
        Name: "Test Applicant",
        Email: "applicant@example.com",
        "Applying For": "JOB-123",
      },
    });
  const applicantsUpdateMock =
    overrides.applicantsUpdateMock || jest.fn().mockResolvedValue([{ id: "applicant1", fields: {} }]);
  const auditCreateMock = overrides.auditCreateMock || jest.fn().mockResolvedValue();

  jest.doMock("airtable", () => {
    return jest.fn().mockImplementation(() => ({
      base: jest.fn().mockImplementation(() => (tableName) => {
        if (tableName === "Applicants") {
          return { find: applicantsFindMock, update: applicantsUpdateMock };
        }
        if (tableName === "Website Audit Log") {
          return { create: auditCreateMock };
        }
        return {};
      }),
    }));
  });

  jest.doMock("next/headers", () => ({
    cookies: jest.fn().mockReturnValue({
      get: jest.fn().mockReturnValue({ value: "encrypted_session" }),
      set: jest.fn(),
    }),
  }));

  jest.doMock("iron-session", () => ({
    unsealData: jest.fn().mockResolvedValue({
      userEmail: "admin@example.com",
      userRole: "admin",
      userName: "Admin User",
    }),
  }));

  global.fetch =
    overrides.fetch || jest.fn().mockResolvedValue({ ok: true, text: async () => "" });

  const { POST } = require("./route");
  const logger = require("@/lib/utils/logger");
  const { logAuditEvent } = require("@/lib/auditLogger");

  return { POST, applicantsFindMock, applicantsUpdateMock, auditCreateMock, logger, logAuditEvent };
};

describe("POST /api/admin/dashboard/new-hires/[id]/start-onboarding", () => {
  let originalEnv;

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    originalEnv = { ...process.env };

    process.env.AIRTABLE_API_KEY = "test_airtable_key";
    process.env.AIRTABLE_BASE_ID = "test_airtable_base";
    process.env.SESSION_SECRET = "test_session_secret";
    process.env.MAKE_WEBHOOK_URL_TASK_ASSIGNMENT = "https://example.com/task-assignment";
    process.env.MAKE_WEBHOOK_URL_ONBOARDING_NOTIFICATION = "https://example.com/onboarding-notification";
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.clearAllMocks();
  });

  test("sends both task assignment and notification when start date is today", async () => {
    const { POST, logAuditEvent } = setupMocks();
    const todayStr = localYmd(new Date());
    const req = {
      json: jest.fn().mockResolvedValue({ onboardingStartDate: todayStr }),
      headers: { get: jest.fn() },
    };

    const res = await POST(req, { params: { id: "applicant1" } });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.message).toMatch(/Onboarding started successfully/);
    expect(data.webhookSent).toBe(true);

    expect(global.fetch).toHaveBeenCalledWith(
      process.env.MAKE_WEBHOOK_URL_TASK_ASSIGNMENT,
      expect.objectContaining({ method: "POST" })
    );
    expect(global.fetch).toHaveBeenCalledWith(
      process.env.MAKE_WEBHOOK_URL_ONBOARDING_NOTIFICATION,
      expect.objectContaining({ method: "POST" })
    );

    expect(logAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: "Onboarding Start Date Set", eventStatus: "Success" })
    );
  });

  test("sends only notification webhook when start date is in the future", async () => {
    const { POST, logAuditEvent } = setupMocks();
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = localYmd(tomorrow);
    const req = {
      json: jest.fn().mockResolvedValue({ onboardingStartDate: tomorrowStr }),
      headers: { get: jest.fn() },
    };

    const res = await POST(req, { params: { id: "applicant1" } });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.message).toMatch(/Onboarding scheduled for/);
    expect(data.webhookSent).toBe(false);

    expect(global.fetch).toHaveBeenCalledWith(
      process.env.MAKE_WEBHOOK_URL_ONBOARDING_NOTIFICATION,
      expect.objectContaining({ method: "POST" })
    );
    expect(global.fetch).not.toHaveBeenCalledWith(
      process.env.MAKE_WEBHOOK_URL_TASK_ASSIGNMENT,
      expect.anything()
    );

    expect(logAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: "Onboarding Start Date Set", eventStatus: "Success" })
    );
  });

  test("logs audit error if notification webhook fails but still returns success", async () => {
    const failingFetch = jest.fn().mockImplementation((url) => {
      if (url === process.env.MAKE_WEBHOOK_URL_ONBOARDING_NOTIFICATION) {
        return Promise.resolve({ ok: false, text: async () => "Notify failed" });
      }
      return Promise.resolve({ ok: true, text: async () => "" });
    });
    const { POST, logAuditEvent } = setupMocks({ fetch: failingFetch });

    const todayStr = localYmd(new Date());
    const req = {
      json: jest.fn().mockResolvedValue({ onboardingStartDate: todayStr }),
      headers: { get: jest.fn() },
    };

    const res = await POST(req, { params: { id: "applicant1" } });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.message).toMatch(/Onboarding started successfully/);

    expect(logAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: "Webhook",
        eventStatus: "Error",
        detailedMessage: expect.stringContaining("Onboarding notification webhook failed"),
      })
    );
  });
});


