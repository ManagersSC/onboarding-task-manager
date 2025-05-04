// src/app/api/logout/route.test.js
import { jest } from "@jest/globals";

// A simple TestResponse class to simulate Next.js Response.json() behaviour.
class TestResponse {
  constructor(data, status = 200) {
    this._data = data;
    this.status = status;
  }
  async json() {
    return this._data;
  }
}

// Override global Response.json so that our route code works as expected.
global.Response = {
  json: (data, options = {}) => new TestResponse(data, options.status || 200),
};

describe("Logout Route (/api/logout)", () => {
  let logout;
  let cookieStoreMock;
  let logger;
  let auditLogger;

  beforeEach(() => {
    jest.resetModules();
    process.env.AIRTABLE_API_KEY = "dummy_api_key";
    process.env.AIRTABLE_BASE_ID = "dummy_base_id";

    // Set up a dummy cookie store with get and delete methods.
    cookieStoreMock = {
      get: jest.fn(() => ({ value: "test@example.com" })),
      delete: jest.fn(),
    };

    // Mock next/headers.
    jest.doMock("next/headers", () => ({
      cookies: jest.fn(() => cookieStoreMock),
    }));

    // Mock logger.
    jest.doMock("@/lib/logger", () => ({
      error: jest.fn(),
      info: jest.fn(),
    }));

    // Mock auditLogger to bypass Airtable initialisation.
    jest.doMock("@/lib/auditLogger", () => ({
      logAuditEvent: jest.fn(),
    }));

    // Import the logout route after our mocks are set up.
    ({ logout } = require("./route"));
    logger = require("@/lib/utils/logger");
    auditLogger = require("@/lib/auditLogger");
  });

  afterEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  test("should logout successfully", async () => {
    const req = {
      headers: new Map([
        ["x-forwarded-for", "127.0.0.1"],
        ["user-agent", "jest"],
      ]),
    };
    const res = await logout(req);
    const data = await res.json();
    expect(cookieStoreMock.delete).toHaveBeenCalledWith("user_email");
    expect(res.status).toBe(200);
    expect(data.message).toBe("Logged out successfully");
    expect(auditLogger.logAuditEvent).toHaveBeenCalledWith({
      eventType: "Logout",
      eventStatus: "Success",
      userIdentifier: "test@example.com",
      detailedMessage: expect.stringContaining("Logged out"),
      request: req,
    });
  });

  test("should return 500 if an error occurs during logout", async () => {
    // Simulate an error when deleting the cookie.
    cookieStoreMock.delete.mockImplementation(() => {
      throw new Error("Delete error");
    });
    const req = {
      headers: new Map([
        ["x-forwarded-for", "127.0.0.1"],
        ["user-agent", "jest"],
      ]),
    };
    const res = await logout(req);
    const data = await res.json();
    expect(res.status).toBe(500);
    expect(data.error).toBe("Internal server error");
    expect(logger.error).toHaveBeenCalledWith("Logout Error:", expect.any(Error));
    expect(auditLogger.logAuditEvent).toHaveBeenCalledWith({
      eventType: "Logout",
      eventStatus: "Errror",
      userIdentifier: "test@example.com",
      detailedMessage: expect.stringContaining("Delete error"),
      request: req,
    });
  });

  test("should logout successfully even if no user_email cookie exists", async () => {
    // Simulate absence of the user_email cookie.
    cookieStoreMock.get.mockReturnValueOnce(undefined);
    const req = {
      headers: new Map([
        ["x-forwarded-for", "127.0.0.1"],
        ["user-agent", "jest"],
      ]),
    };
    const res = await logout(req);
    const data = await res.json();
    expect(cookieStoreMock.delete).toHaveBeenCalledWith("user_email");
    expect(res.status).toBe(200);
    expect(data.message).toBe("Logged out successfully");
    expect(auditLogger.logAuditEvent).toHaveBeenCalledWith({
      eventType: "Logout",
      eventStatus: "Success",
      userIdentifier: "unknown",
      detailedMessage: expect.stringContaining("Logged out"),
      request: req,
    });
  });
});
