// src/app/api/logout/route.test.js
import { jest } from "@jest/globals";

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

// Override global Response.json so that our route code works as expected.
global.Response = {
  json: (data, options = {}) => new TestResponse(data, options.status || 200),
};

describe("logout route", () => {
  let logout;
  let cookieStoreMock;
  let logger;
  let originalEnv;

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    originalEnv = { ...process.env };

    // Set up a dummy cookie store with a delete method.
    cookieStoreMock = {
      delete: jest.fn(),
    };

    // Use jest.doMock to mock the "next/headers" module.
    jest.doMock("next/headers", () => ({
      cookies: jest.fn(() => cookieStoreMock),
    }));

    // Use jest.doMock to mock logger.
    jest.doMock("@/lib/logger", () => ({
      error: jest.fn(),
      info: jest.fn(),
    }));

    // Import the logout route after our mocks are set up.
    ({ logout } = require("./route"));
    logger = require("@/lib/logger");
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.clearAllMocks();
  });

  it("should logout successfully", async () => {
    const req = {}; // no json input needed
    const res = await logout(req);
    const data = await res.json();
    // Verify that cookieStore.delete() was called for "user_email"
    expect(cookieStoreMock.delete).toHaveBeenCalledWith("user_email");
    expect(res.status).toBe(200);
    expect(data.message).toBe("Logged out successfully");
  });

  it("should return 500 if an error occurs during logout", async () => {
    // Simulate an error when trying to delete the cookie.
    cookieStoreMock.delete.mockImplementation(() => {
      throw new Error("Delete error");
    });
    const req = {};
    const res = await logout(req);
    const data = await res.json();
    expect(res.status).toBe(500);
    expect(data.error).toBe("Internal server error");
    expect(logger.error).toHaveBeenCalledWith("Logout Error:", expect.any(Error));
  });
});
