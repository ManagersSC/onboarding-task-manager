// route.test.js

// Top-level mocks for logger and auditLogger:
jest.mock("@/lib/logger", () => ({
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));
jest.mock("@/lib/auditLogger", () => ({
  logAuditEvent: jest.fn(),
}));

import { jest } from "@jest/globals";

describe("GET /api/get-tasks", () => {
  beforeEach(() => {
    jest.resetModules();
    // Ensure environment variables are set.
    process.env.AIRTABLE_API_KEY = "dummy_api_key";
    process.env.AIRTABLE_BASE_ID = "dummy_base_id";
  });
  
  afterEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
  });
  
  /**
   * Helper to set up mocks.
   * Options:
   *   - userEmail: simulated value for cookie "user_email". If undefined, simulates missing cookie.
   *   - applicantRecord: a fake record from the Applicants table.
   *   - taskLogs: an array of fake task log records (for the Onboarding Tasks Logs table).
   *   - simulateError: if true, causes the Airtable promise to reject.
   */
  const setupMocks = (options = {}) => {
    const { userEmail, applicantRecord, taskLogs, simulateError } = options;
    
    // --- Mock next/headers to simulate cookies.
    jest.doMock("next/headers", () => ({
      cookies: () => ({
        get: (key) =>
          key === "user_email" ? (userEmail ? { value: userEmail } : undefined) : undefined
      })
    }));
    
    // --- Mock Airtable:
    // For the Applicants table.
    const mockApplicantsSelect = jest.fn(() => ({
      firstPage: simulateError
        ? () => Promise.reject(new Error("Airtable error"))
        : () => Promise.resolve(applicantRecord ? [applicantRecord] : [])
    }));
    // For the Onboarding Tasks Logs table.
    const mockTaskLogsSelect = jest.fn(() => ({
      all: simulateError
        ? () => Promise.reject(new Error("Task logs error"))
        : () => Promise.resolve(taskLogs || [])
    }));
    
    jest.doMock("airtable", () => {
      return jest.fn().mockImplementation(() => ({
        base: () => (tableName) => {
          if (tableName === "Applicants") {
            return { select: mockApplicantsSelect };
          }
          if (tableName === "Onboarding Tasks Logs") {
            return { select: mockTaskLogsSelect };
          }
        }
      }));
    });
    
    // Import GET after mocks are set.
    const { GET } = require("./route");
    // Get our logger and auditLogger from mocks.
    const logger = require("@/lib/utils/logger");
    const { logAuditEvent } = require("@/lib/auditLogger");
    return { GET, logger, logAuditEvent, mockApplicantsSelect, mockTaskLogsSelect };
  };

  // A dummy request object to pass to GET.
  const dummyRequest = { 
    headers: new Map([
      ["x-forwarded-for", "127.0.0.1"],
      ["user-agent", "test-agent"]
    ])
  };

  test("returns 401 when no user_email cookie is provided", async () => {
    const { GET } = setupMocks({ userEmail: undefined });
    const res = await GET(dummyRequest);
    const json = await res.json();
    expect(res.status).toBe(401);
    expect(json.error).toBe("Unauthorized");
  });

  test("returns 500 when environment variables are missing", async () => {
    process.env.AIRTABLE_API_KEY = "";
    const { GET } = setupMocks({ userEmail: "test@example.com" });
    const res = await GET(dummyRequest);
    const json = await res.json();
    expect(res.status).toBe(500);
    expect(json.error).toBe("Server configuration error");
  });

  test("returns 404 when applicant record is not found", async () => {
    const { GET } = setupMocks({ userEmail: "notfound@example.com" });
    const res = await GET(dummyRequest);
    const json = await res.json();
    expect(res.status).toBe(404);
    expect(json.error).toBe("Applicant not found");
  });

  test("returns empty tasks when applicant is found and Task Log field is empty", async () => {
    // Simulate applicant record with an empty Task Log field.
    const fakeApplicant = {
      id: "applicant123",
      _rawJson: { id: "applicant123", fields: { Email: "test@example.com" } },
      get: (field) => (field === "Task Log" ? [] : undefined)
    };
    // In this case, the route returns early and does not query task logs.
    const { GET, logger } = setupMocks({ userEmail: "test@example.com", applicantRecord: fakeApplicant });
    const res = await GET(dummyRequest);
    const json = await res.json();
    // logger.warn should not be called because the branch for empty task IDs is separate.
    expect(logger.warn).not.toHaveBeenCalled();
    expect(json.email).toBe("test@example.com");
    expect(json.recordId).toBe("applicant123");
    expect(json.tasks).toEqual([]);
  });

  test("returns empty tasks and logs warning when applicant has Task Log IDs but no task logs are returned", async () => {
    // Simulate an applicant record with a non-empty Task Log field.
    const fakeApplicant = {
      id: "applicant123",
      _rawJson: { id: "applicant123", fields: { Email: "test@example.com" } },
      get: (field) => (field === "Task Log" ? ["task1"] : undefined)
    };
    // Simulate that the query for task logs returns an empty array.
    const { GET, logger } = setupMocks({
      userEmail: "test@example.com",
      applicantRecord: fakeApplicant,
      taskLogs: []
    });
    const res = await GET(dummyRequest);
    const json = await res.json();
    // Expect that logger.warn is called.
    expect(logger.warn).toHaveBeenCalledWith(`No task logs found for applicant: applicant123`);
    expect(json.email).toBe("test@example.com");
    expect(json.recordId).toBe("applicant123");
    expect(json.tasks).toEqual([]);
  });

  test("returns tasks when applicant is found and task logs exist", async () => {
    const fakeApplicant = {
      id: "applicant123",
      _rawJson: { id: "applicant123", fields: { Email: "test@example.com" } },
      get: (field) => (field === "Task Log" ? ["task1", "task2"] : undefined)
    };
    // Create two fake task log records.
    const fakeTaskLogs = [
      {
        id: "log1",
        get: (field) => {
          const data = {
            "Status": "Completed",
            "Task Title": "Task One",
            "Task Desc": "Description One",
            "Resource Link": "http://resource.one",
            "Last Status Change Time": "2025-03-14T12:00:00Z",
            "Task Week Number": ["1"]
          };
          return data[field];
        }
      },
      {
        id: "log2",
        get: (field) => {
          const data = {
            "Status": "Overdue",
            "Task Title": "Task Two",
            "Task Desc": "Description Two",
            "Resource Link": null,
            "Last Status Change Time": null,
            "Task Week Number": "2"
          };
          return data[field];
        }
      }
    ];
    const { GET } = setupMocks({
      userEmail: "test@example.com",
      applicantRecord: fakeApplicant,
      taskLogs: fakeTaskLogs
    });
    const res = await GET(dummyRequest);
    const tasks = await res.json();
    expect(Array.isArray(tasks)).toBe(true);
    expect(tasks.length).toBe(2);
    const task1 = tasks.find(t => t.id === "log1");
    expect(task1.title).toBe("Task One");
    expect(task1.description).toBe("Description One");
    expect(task1.completed).toBe(true);
    expect(task1.overdue).toBe(false);
    expect(task1.resourceUrl).toBe("http://resource.one");
    expect(task1.lastStatusChange).toBe("2025-03-14T12:00:00Z");
    expect(task1.week).toBe("1");
  });

  test("returns 500 when an error occurs", async () => {
    // Simulate an error during the Airtable query.
    const req = {
      headers: new Map([
        ["x-forwarded-for", "127.0.0.1"],
        ["user-agent", "test-agent"]
      ])
    };
    const { GET, logAuditEvent, logger } = setupMocks({
      userEmail: "test@example.com",
      simulateError: true
    });
    const res = await GET(req);
    const json = await res.json();
    expect(res.status).toBe(500);
    expect(json.error).toBe("Internal server error");
    expect(logger.error).toHaveBeenCalledWith(
      "Full Error:",
      expect.objectContaining({ message: "Airtable error" })
    );
    expect(logAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: "User",
        eventStatus: "Errror",
        userIdentifier: "test@example.com",
        detailedMessage: expect.stringContaining("Airtable error"),
        request: req
      })
    );
  });
});
