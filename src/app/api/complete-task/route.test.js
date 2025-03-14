// route.test.js

// Top-level mocks for next/headers, logger and auditLogger are set in setupMocks.
import { jest } from "@jest/globals";

// Helper to create a fake request object.
const createFakeRequest = (body) => ({
  json: jest.fn().mockResolvedValue(body),
});

describe("POST /api/complete-tasks", () => {
  let POST;

  beforeEach(() => {
    jest.resetModules();
    process.env.AIRTABLE_API_KEY = "dummy_api_key";
    process.env.AIRTABLE_BASE_ID = "dummy_base_id";
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
  });

  // Helper to set up mocks for the POST route.
  const setupMocks = (overrides = {}) => {
    // Mock next/headers to simulate cookie behaviour.
    jest.doMock("next/headers", () => ({
      cookies: jest.fn(() => {
        return overrides.cookies || {
          // Return a valid user_email cookie by default.
          get: (key) => (key === "user_email" ? { value: "test@example.com" } : undefined),
          set: jest.fn(),
        };
      }),
    }));

    // Set up Airtable mocks.
    const mockOnboardingUpdate = overrides.mockOnboardingUpdate || jest.fn();
    const mockOnboardingFind = overrides.mockOnboardingFind || jest.fn();
    const mockApplicantsSelect = overrides.mockApplicantsSelect || jest.fn();
    const mockApplicantsUpdate = overrides.mockApplicantsUpdate || jest.fn();

    jest.doMock("airtable", () => {
      return jest.fn().mockImplementation(() => {
        return {
          base: () => (tableName) => {
            if (tableName === "Onboarding Tasks Logs") {
              return {
                update: mockOnboardingUpdate,
                find: mockOnboardingFind,
              };
            } else if (tableName === "Applicants") {
              return {
                select: mockApplicantsSelect,
                update: mockApplicantsUpdate,
              };
            }
          },
        };
      });
    });

    // Re-import POST after setting up mocks.
    ({ POST } = require("./route"));
    return { mockOnboardingUpdate, mockOnboardingFind, mockApplicantsSelect, mockApplicantsUpdate };
  };

  test("should return 500 if AIRTABLE_API_KEY is missing", async () => {
    process.env.AIRTABLE_API_KEY = "";
    setupMocks();
    const fakeRequest = createFakeRequest({ taskId: "task123" });
    const response = await POST(fakeRequest);
    const json = await response.json();
    expect(response.status).toBe(500);
    expect(json.error).toBe("Server configuration error");
  });

  test("should return 500 if AIRTABLE_BASE_ID is missing", async () => {
    process.env.AIRTABLE_BASE_ID = "";
    setupMocks();
    const fakeRequest = createFakeRequest({ taskId: "task123" });
    const response = await POST(fakeRequest);
    const json = await response.json();
    expect(response.status).toBe(500);
    expect(json.error).toBe("Server configuration error");
  });

  test("should return 400 if taskId is missing in the request body", async () => {
    setupMocks();
    const fakeRequest = createFakeRequest({}); // No taskId provided.
    const response = await POST(fakeRequest);
    const json = await response.json();
    expect(response.status).toBe(400);
    expect(json.error).toBe("Missing taskId");
  });

  test("should return 401 if user_email cookie is missing", async () => {
    // Simulate missing user_email by providing a cookie mock that returns undefined.
    setupMocks({
      cookies: {
        get: () => undefined,
        set: jest.fn(),
      },
    });
    const fakeRequest = createFakeRequest({ taskId: "task123" });
    const response = await POST(fakeRequest);
    const json = await response.json();
    expect(response.status).toBe(401);
    expect(json.error).toBe("Unauthorized");
  });

  test("should return 404 if no applicant record is found for the provided user_email", async () => {
    setupMocks({
      // Simulate a successful task update and lookup.
      mockOnboardingUpdate: jest.fn().mockResolvedValue([{ id: "task123", fields: { Status: "Completed" } }]),
      mockOnboardingFind: jest.fn().mockResolvedValue({ fields: { "Task Title": "Test Task" } }),
      // Simulate Applicants select returning an empty array.
      mockApplicantsSelect: jest.fn().mockReturnValue({
        firstPage: jest.fn().mockResolvedValue([]),
      }),
    });
    const fakeRequest = createFakeRequest({ taskId: "task123" });
    const response = await POST(fakeRequest);
    const json = await response.json();
    expect(response.status).toBe(404);
    expect(json.error).toBe("No applicant found for this email");
  });

  test("should complete task successfully", async () => {
    setupMocks({
      mockOnboardingUpdate: jest.fn().mockResolvedValue([{ id: "task123", fields: { Status: "Completed" } }]),
      mockOnboardingFind: jest.fn().mockResolvedValue({ fields: { "Task Title": "Test Task" } }),
      mockApplicantsSelect: jest.fn().mockReturnValue({
        firstPage: jest.fn().mockResolvedValue([
          { id: "applicant123", fields: { Name: "John Doe", "Interface Message - Onboarding Status Update": "Existing message" } },
        ]),
      }),
      mockApplicantsUpdate: jest.fn().mockResolvedValue([{ id: "applicant123" }]),
    });
    const fakeRequest = createFakeRequest({ taskId: "task123" });
    const response = await POST(fakeRequest);
    const json = await response.json();
    // Verify that the success response contains the expected data.
    expect(json.message).toContain("Task completed successfully for applicant: John Doe");
    expect(json.recordId).toBe("applicant123");
    expect(json.interfaceMessage).toContain("John Doe has completed Test Task");
  });

  test("should return 500 if an internal error occurs", async () => {
    setupMocks();
    // Simulate an error by making request.json() reject.
    const fakeRequest = {
      json: jest.fn().mockRejectedValue(new Error("Test error")),
    };
    const response = await POST(fakeRequest);
    const json = await response.json();
    expect(response.status).toBe(500);
    expect(json.error).toBe("Internal server error");
  });
});
