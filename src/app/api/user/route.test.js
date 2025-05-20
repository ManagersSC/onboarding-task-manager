import { jest } from "@jest/globals";

// Helper to create a fake request object (used in error logging)
const createFakeRequest = (overrides = {}) => ({
  ...overrides,
});

describe("User Route (/api/user)", () => {
  let GET;
  let mockCookies;
  let mockSelect;
  let mockBase;
  let mockAirtable;
  let logger;
  let logAuditEvent;

  // Save original environment variables
  const originalAirtableApiKey = process.env.AIRTABLE_API_KEY;
  const originalAirtableBaseId = process.env.AIRTABLE_BASE_ID;

  beforeEach(() => {
    // Ensure valid configuration for tests unless explicitly overridden
    process.env.AIRTABLE_API_KEY = originalAirtableApiKey || "fakeKey";
    process.env.AIRTABLE_BASE_ID = originalAirtableBaseId || "fakeBase";
  });

  afterEach(() => {
    // Restore environment variables after each test
    process.env.AIRTABLE_API_KEY = originalAirtableApiKey;
    process.env.AIRTABLE_BASE_ID = originalAirtableBaseId;
    jest.resetModules();
    jest.clearAllMocks();
  });

  /**
   * Sets up mocks for the GET user route.
   *
   * Options:
   *  - userEmail: the email to simulate from cookies (if undefined, no cookie is present)
   *  - airtableRecords: array of records to return from Airtable's firstPage() call
   *  - simulateError: if true, firstPage() will reject with an error
   */
  const setupMocks = (options = {}) => {
    const userEmail = options.userEmail; 
    const airtableRecords = options.airtableRecords !== undefined ? options.airtableRecords : [];
    const simulateError = options.simulateError || false;

    // Mock next/headers: cookies() returns a fake cookie store.
    mockCookies = {
      get: jest.fn(() => userEmail ? { value: userEmail } : undefined),
    };
    jest.doMock("next/headers", () => ({
      cookies: jest.fn(() => mockCookies),
    }));

    // Mock Airtable: simulate base("Applicants").select({ ... }).firstPage() behaviour.
    const mockFirstPage = simulateError
      ? jest.fn().mockRejectedValue(new Error("Airtable error"))
      : jest.fn().mockResolvedValue(airtableRecords);
    mockSelect = jest.fn(() => ({ firstPage: mockFirstPage }));
    mockBase = jest.fn(() => ({ select: mockSelect }));
    mockAirtable = jest.fn().mockImplementation(() => ({ base: () => mockBase }));
    jest.doMock("airtable", () => mockAirtable);

    // Mock logger and auditLogger.
    logger = { error: jest.fn() };
    logAuditEvent = jest.fn();
    jest.doMock("@/lib/logger", () => logger);
    jest.doMock("@/lib/auditLogger", () => ({ logAuditEvent: logAuditEvent }));

    // Import the GET function from your route file.
    ({ GET } = require("./route"));
  };

  test("should return 500 if configuration is missing", async () => {
    process.env.AIRTABLE_API_KEY = "";
    process.env.AIRTABLE_BASE_ID = "";
    setupMocks({ userEmail: "test@example.com" });
    const req = createFakeRequest();
    const res = await GET(req);
    const json = await res.json();
    expect(res.status).toBe(500);
    expect(json.error).toBe("Server configuration error");
  });

  test("should return 401 if no user_email cookie is found", async () => {
    setupMocks({ userEmail: undefined });
    const req = createFakeRequest();
    const res = await GET(req);
    const json = await res.json();
    expect(res.status).toBe(401);
    expect(json.error).toBe("Unauthorised");
    expect(json.userError).toBe("You are unauthorised to access this.");
  });

  test("should return 404 if user record is not found", async () => {
    setupMocks({
      userEmail: "notfound@example.com",
      airtableRecords: [],
    });
    const req = createFakeRequest();
    const res = await GET(req);
    const json = await res.json();
    expect(res.status).toBe(404);
    expect(json.error).toBe("User not found");
    expect(json.userError).toBe(
      "Apologies, there was no user found for this email: notfound@example.com"
    );
  });

  test("should return user details if record is found", async () => {
    const airtableRecord = {
      id: "recordId",
      fields: {
        Name: "John Doe",
        Job: "Developer",
      },
    };
    setupMocks({
      userEmail: "john@example.com",
      airtableRecords: [airtableRecord],
    });
    const req = createFakeRequest();
    const res = await GET(req);
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.email).toBe("john@example.com");
    expect(json.name).toBe("John Doe");
    expect(json.job).toBe("Developer");
  });

  test("should default to 'Unknown' if name or job are not provided", async () => {
    const airtableRecord = {
      id: "recordId",
      fields: {},
    };
    setupMocks({
      userEmail: "unknown@example.com",
      airtableRecords: [airtableRecord],
    });
    const req = createFakeRequest();
    const res = await GET(req);
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.email).toBe("unknown@example.com");
    expect(json.name).toBe("Unknown");
    expect(json.job).toBe("Unknown");
  });

  test("should return 500 and log error when an exception occurs", async () => {
    setupMocks({
      userEmail: "error@example.com",
      simulateError: true,
    });
    const req = createFakeRequest();
    const res = await GET(req);
    const json = await res.json();
    expect(res.status).toBe(500);
    expect(json.error).toBe("Internal server error");
    expect(logger.error).toHaveBeenCalledWith(
      "GET /api/user error:",
      expect.any(Error)
    );
    expect(logAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: "User",
        eventStatus: "Error",
        userIdentifier: "error@example.com",
        detailedMessage: expect.stringContaining("Airtable error"),
        request: req,
      })
    );
  });
});
