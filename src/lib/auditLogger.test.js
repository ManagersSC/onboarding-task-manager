// src/lib/auditLogger.test.js
import { jest } from "@jest/globals";

describe("logAuditEvent", () => {
  let logAuditEvent;
  let createMock;
  let logger;

  beforeEach(() => {
    // Clear module cache so that our mocks are fresh.
    jest.resetModules();
    jest.clearAllMocks();

    // Set required environment variables.
    process.env.AIRTABLE_API_KEY = "dummy_api_key";
    process.env.AIRTABLE_BASE_ID = "dummy_base_id";

    // Create a mock for the Airtable create method.
    createMock = jest.fn().mockResolvedValue();

    // Use jest.doMock for Airtable so that the module initialization in auditLogger.js
    // uses our mocked version.
    jest.doMock("airtable", () => {
      return jest.fn().mockImplementation(() => {
        return {
          // When .base() is called, return a function that accepts a table name.
          base: jest.fn().mockImplementation((baseId) => {
            return (tableName) => {
              if (tableName === "Website Audit Log") {
                return { create: createMock };
              }
              return {};
            };
          }),
        };
      });
    });

    // Use jest.doMock for logger so we can spy on logger.error.
    jest.doMock("./logger", () => ({
      error: jest.fn(),
    }));

    // Import our auditLogger module after our mocks are in place.
    ({ logAuditEvent } = require("./auditLogger"));
    logger = require("./logger");
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should log audit event successfully", async () => {
    // Create a fake request with headers.
    const fakeRequest = {
      headers: {
        get: jest.fn((headerName) => {
          if (headerName === "x-forwarded-for") return "123.456.789.0";
          if (headerName === "user-agent") return "jest-agent";
          if (headerName === "host") return "example.com";
          return null;
        }),
      },
    };

    const eventDetails = {
      eventType: "Sign Up Success",
      eventStatus: "Success",
      userIdentifier: "user@example.com",
      detailedMessage: "User signed up successfully",
      request: fakeRequest,
    };

    await logAuditEvent(eventDetails);

    // Verify that Airtable's create method was called once with the expected data.
    expect(createMock).toHaveBeenCalledTimes(1);
    const [createArg] = createMock.mock.calls[0];
    expect(Array.isArray(createArg)).toBe(true);
    expect(createArg[0]).toHaveProperty("fields");

    const fields = createArg[0].fields;
    expect(fields["Event Type"]).toBe(eventDetails.eventType);
    expect(fields["Event Status"]).toBe(eventDetails.eventStatus);
    expect(fields["User Identifier"]).toBe(eventDetails.userIdentifier);
    expect(fields["Detailed Message"]).toBe(eventDetails.detailedMessage);
    // Since "x-forwarded-for" exists, it should be used.
    expect(fields["IP Address"]).toBe("123.456.789.0");
    expect(fields["User Agent"]).toBe("jest-agent");

    // In the success case, logger.error should not have been called.
    expect(logger.error).not.toHaveBeenCalled();
  });

  it("should handle errors when Airtable create fails", async () => {
    // Force the Airtable create method to reject.
    const errorMsg = "Create failed";
    createMock.mockRejectedValue(new Error(errorMsg));

    // Create a fake request whose headers return undefined (fallback to "unknown").
    const fakeRequest = {
      headers: {
        get: jest.fn().mockReturnValue(undefined),
      },
    };

    const eventDetails = {
      eventType: "Test Event",
      eventStatus: "Failure",
      userIdentifier: "user@example.com",
      detailedMessage: "Test error event",
      request: fakeRequest,
    };

    await logAuditEvent(eventDetails);

    // Verify that logger.error is called with the appropriate error.
    expect(logger.error).toHaveBeenCalledTimes(1);
    const errorCallArgs = logger.error.mock.calls[0];
    expect(errorCallArgs[0]).toBe("Audit log creation failed:");
    expect(errorCallArgs[1]).toBeInstanceOf(Error);
    expect(errorCallArgs[1].message).toBe(errorMsg);
  });

  it("should handle missing environment variables", async () => {
    // Simulate missing environment variables.
    process.env.AIRTABLE_API_KEY = "";
    process.env.AIRTABLE_BASE_ID = "";

    // Create a fake request.
    const fakeRequest = {
      headers: {
        get: jest.fn().mockReturnValue(undefined),
      },
    };

    const eventDetails = {
      eventType: "Test Event",
      eventStatus: "Failure",
      userIdentifier: "user@example.com",
      detailedMessage: "Test missing env event",
      request: fakeRequest,
    };

    await logAuditEvent(eventDetails);

    // Verify that logger.error is called because the environment variables are missing.
    expect(logger.error).toHaveBeenCalledTimes(1);
    const errorCallArgs = logger.error.mock.calls[0];
    expect(errorCallArgs[0]).toBe("Audit log creation failed:");
    expect(errorCallArgs[1]).toBeInstanceOf(Error);
    expect(errorCallArgs[1].message).toBe("Airtable environment variables are missing");
  });
});
