// src/app/api/forgot-password/route.test.js
import { jest } from "@jest/globals";
import jwt from "jsonwebtoken";

// A simple TestResponse class to simulate Next.js Response.json() behavior.
class TestResponse {
  constructor(data, status = 200) {
    this._data = data;
    this.status = status;
  }
  async json() {
    return this._data;
  }
}
// Override global Response so that our route code can use Response.json()
global.Response = {
  json: (data, options = {}) => new TestResponse(data, options.status || 200),
};

describe("forgotPassword route", () => {
  let forgotPassword;
  let createMock; // For "Website Audit Log" table's create() call.
  let logger;
  let auditLogger; // Will hold the auditLogger module.
  let logAuditEventSpy; // Spy for logAuditEvent.
  let originalEnv;
  // This variable will be used to simulate the Applicants table result.
  let applicantsFirstPageMock;

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    originalEnv = { ...process.env };

    // Set required environment variables.
    process.env.AIRTABLE_API_KEY = "dummy_api_key";
    process.env.AIRTABLE_BASE_ID = "dummy_base_id";
    process.env.JWT_SECRET = "dummy_jwt_secret";
    process.env.MAKE_WEBHOOK_URL = "https://example.com/webhook";

    // Default: Applicants returns an empty array.
    applicantsFirstPageMock = async () => [];

    // Create a mock for the Airtable create method.
    createMock = jest.fn().mockResolvedValue();

    // Use jest.doMock for Airtable so that when modules load they get our mock.
    jest.doMock("airtable", () => {
      return jest.fn().mockImplementation(() => ({
        base: jest.fn().mockImplementation((baseId) => {
          return (tableName) => {
            if (tableName === "Applicants") {
              // Return a select() function whose firstPage is our mutable mock.
              return {
                select: () => ({ firstPage: applicantsFirstPageMock }),
              };
            }
            if (tableName === "Website Audit Log") {
              return { create: createMock };
            }
            return {};
          };
        }),
      }));
    });

    // Use jest.doMock for logger.
    jest.doMock("@/lib/logger", () => ({
      error: jest.fn(),
      info: jest.fn(),
    }));

    // Use jest.doMock for auditLogger.
    jest.doMock("@/lib/auditLogger", () => {
      const actual = jest.requireActual("@/lib/auditLogger");
      return { ...actual };
    });

    // Import our route and modules after mocks are in place.
    ({ forgotPassword } = require("./route"));
    auditLogger = require("@/lib/auditLogger");
    // Create a spy on logAuditEvent.
    logAuditEventSpy = jest.spyOn(auditLogger, "logAuditEvent").mockResolvedValue();
    logger = require("@/lib/logger");

    // Mock global.fetch for the Make.com webhook.
    global.fetch = jest.fn();
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.clearAllMocks();
  });

  it("should return 400 if email is missing", async () => {
    const req = {
      json: jest.fn().mockResolvedValue({}),
      headers: { get: jest.fn() },
    };
    const res = await forgotPassword(req);
    const data = await res.json();
    expect(res.status).toBe(400);
    expect(data.error).toBe("Email is required");
  });

  it("should return generic success message if user is not found", async () => {
    // Set Applicants to return an empty array.
    applicantsFirstPageMock = async () => [];
    const req = {
      json: jest.fn().mockResolvedValue({ email: "notfound@example.com" }),
      headers: { get: jest.fn().mockReturnValue("dummy") },
    };

    const res = await forgotPassword(req);
    const data = await res.json();
    // Expect generic message.
    expect(res.status).toBe(200);
    expect(data.message).toBe("If the email is registered, a password reset email will be sent.");
    // Verify that logAuditEvent was called with details for "User not found".
    expect(logAuditEventSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: "Forgot Password",
        eventStatus: "Error",
        userIdentifier: "notfound@example.com",
        detailedMessage: "User not found",
        request: req,
      })
    );
  });

  it("should return 500 if JWT_SECRET is missing", async () => {
    process.env.JWT_SECRET = "";
    // Simulate that a user exists.
    applicantsFirstPageMock = async () => [{ id: "applicant1", fields: {} }];
    const req = {
      json: jest.fn().mockResolvedValue({ email: "exists@example.com" }),
      headers: { get: jest.fn().mockReturnValue("dummy") },
    };
    const res = await forgotPassword(req);
    const data = await res.json();
    expect(res.status).toBe(500);
    expect(data.error).toBe("Server configuration error");
    expect(logger.error).toHaveBeenCalledWith("JWT_SECRET is not configured");
  });

  it("should return 500 if MAKE_WEBHOOK_URL is missing", async () => {
    process.env.MAKE_WEBHOOK_URL = "";
    // Simulate that a user exists.
    applicantsFirstPageMock = async () => [{ id: "applicant1", fields: {} }];
    const req = {
      json: jest.fn().mockResolvedValue({ email: "exists@example.com" }),
      headers: { get: jest.fn().mockReturnValue("dummy") },
    };
    const res = await forgotPassword(req);
    const data = await res.json();
    expect(res.status).toBe(500);
    expect(data.error).toBe("Server configuration error");
    expect(logger.error).toHaveBeenCalledWith("Make.com webhook URL is not configured");
  });

  it("should return 500 if webhook call fails", async () => {
    // Simulate that a user exists.
    applicantsFirstPageMock = async () => [{ id: "applicant1", fields: {} }];
    // Mock fetch to simulate a failed webhook call.
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      text: async () => "Webhook error message",
    });
    const req = {
      json: jest.fn().mockResolvedValue({ email: "exists@example.com" }),
      headers: {
        get: jest.fn().mockImplementation((headerName) => {
          if (headerName === "x-forwarded-for") return "111.222.333.444";
          if (headerName === "user-agent") return "test-agent";
          return null;
        }),
      },
    };
    const res = await forgotPassword(req);
    const data = await res.json();
    expect(res.status).toBe(500);
    expect(data.error).toBe("Failed to send password reset email");
    expect(logger.error).toHaveBeenCalledWith("Webhook failed", "Webhook error message");
    expect(logAuditEventSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: "Forgot Password Webhook Error",
        eventStatus: "Error",
        userIdentifier: "exists@example.com",
        detailedMessage: expect.stringContaining("Webhook call failed: Webhook error message"),
        request: req,
      })
    );
  });

  it("should succeed and trigger webhook when all conditions are met", async () => {
    // Simulate that a user exists.
    applicantsFirstPageMock = async () => [{ id: "applicant1", fields: {} }];
    // Mock fetch to simulate a successful webhook call.
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      text: async () => "Success",
    });
    const req = {
      json: jest.fn().mockResolvedValue({ email: "Exists@Example.com" }),
      headers: {
        get: jest.fn().mockImplementation((headerName) => {
          if (headerName === "x-forwarded-for") return "222.333.444.555";
          if (headerName === "user-agent") return "success-agent";
          return null;
        }),
      },
    };
    const res = await forgotPassword(req);
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.message).toBe("If the email is registered, a password reset email will be sent.");
    // Verify that an audit log was recorded for success.
    expect(logAuditEventSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: "Forgot Password",
        eventStatus: "Success",
        userIdentifier: "exists@example.com", // normalized to lowercase
        detailedMessage: "Password reset email triggered via webhook",
        request: req,
      })
    );
    // Verify that fetch was called with the correct webhook URL and body.
    expect(global.fetch).toHaveBeenCalledWith(process.env.MAKE_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: expect.stringContaining('"email":"exists@example.com"'),
    });
    // Verify that a resetToken was included in the webhook body.
    const body = JSON.parse(global.fetch.mock.calls[0][1].body);
    expect(body.resetToken).toBeDefined();
    // Decode the token to verify its payload.
    const decoded = jwt.verify(body.resetToken, process.env.JWT_SECRET);
    expect(decoded.email).toBe("exists@example.com");
  });
});
