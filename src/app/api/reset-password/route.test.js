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
// Override global Response
global.Response = {
  json: (data, options = {}) => new TestResponse(data, options.status || 200),
};

describe("resetPassword route", () => {
  let resetPassword;
  let updateMock; // For the Applicants table's update() method.
  let applicantsFirstPageMock; // For simulating Applicants query.
  let bcryptMock;
  let logger;
  let originalEnv;

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    originalEnv = { ...process.env };

    // Set required environment variables.
    process.env.AIRTABLE_API_KEY = "dummy_api_key";
    process.env.AIRTABLE_BASE_ID = "dummy_base_id";
    process.env.JWT_SECRET = "dummy_jwt_secret";

    // By default, simulate Applicants query returns an empty array.
    applicantsFirstPageMock = async () => [];

    // Create a mock for the update() method.
    updateMock = jest.fn().mockResolvedValue();

    // Use jest.doMock for Airtable.
    jest.doMock("airtable", () => {
      return jest.fn().mockImplementation(() => ({
        base: jest.fn().mockImplementation((baseId) => {
          return (tableName) => {
            if (tableName === "Applicants") {
              return {
                select: () => ({ firstPage: applicantsFirstPageMock }),
                update: updateMock,
              };
            }
            return {};
          };
        }),
      }));
    });

    // Use jest.doMock for bcrypt.
    jest.doMock("bcryptjs", () => ({
      hash: jest.fn().mockResolvedValue("hashedNewPassword"),
    }));

    // Use jest.doMock for logger.
    jest.doMock("@/lib/logger", () => ({
      error: jest.fn(),
      info: jest.fn(),
    }));

    // Import our resetPassword route after mocks are in place.
    ({ resetPassword } = require("./route"));
    logger = require("@/lib/utils/logger");
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.clearAllMocks();
  });

  it("should return 400 if resetToken, newPassword, or confirmPassword is missing", async () => {
    const req = {
      json: jest.fn().mockResolvedValue({ resetToken: null, newPassword: "newpass", confirmPassword: "newpass" }),
      headers: { get: jest.fn() },
    };
    let res = await resetPassword(req);
    let data = await res.json();
    expect(res.status).toBe(400);
    expect(data.error).toBe("Invalid request");

    req.json = jest.fn().mockResolvedValue({ resetToken: "token", newPassword: null, confirmPassword: "newpass" });
    res = await resetPassword(req);
    data = await res.json();
    expect(res.status).toBe(400);
    expect(data.error).toBe("Invalid request");

    req.json = jest.fn().mockResolvedValue({ resetToken: "token", newPassword: "newpass", confirmPassword: null });
    res = await resetPassword(req);
    data = await res.json();
    expect(res.status).toBe(400);
    expect(data.error).toBe("Invalid request");
  });

  it("should return 400 if newPassword and confirmPassword do not match", async () => {
    const req = {
      json: jest.fn().mockResolvedValue({
        resetToken: "token",
        newPassword: "newpass",
        confirmPassword: "differentpass",
      }),
      headers: { get: jest.fn() },
    };
    const res = await resetPassword(req);
    const data = await res.json();
    expect(res.status).toBe(400);
    expect(data.error).toBe("Passwords do not match");
  });

  it("should return 500 if JWT_SECRET is missing", async () => {
    process.env.JWT_SECRET = "";
    const req = {
      json: jest.fn().mockResolvedValue({ resetToken: "dummy", newPassword: "newpass", confirmPassword: "newpass" }),
      headers: { get: jest.fn().mockReturnValue("dummy") },
    };
    const res = await resetPassword(req);
    const data = await res.json();
    expect(res.status).toBe(500);
    expect(data.error).toBe("Server configuration error");
    expect(logger.error).toHaveBeenCalledWith("JWT_SECRET is not configured");
  });

  it("should return 400 if token is invalid or expired", async () => {
    // Provide an invalid token.
    const req = {
      json: jest.fn().mockResolvedValue({ resetToken: "invalidtoken", newPassword: "newpass", confirmPassword: "newpass" }),
      headers: { get: jest.fn() },
    };
    const res = await resetPassword(req);
    const data = await res.json();
    expect(res.status).toBe(400);
    expect(data.error).toBe("Invalid or expired token");
  });

  it("should return 400 if user is not found", async () => {
    // Generate a valid token.
    const token = jwt.sign({ email: "test@example.com" }, process.env.JWT_SECRET, { expiresIn: "1h" });
    // Simulate no user found.
    applicantsFirstPageMock = async () => [];
    const req = {
      json: jest.fn().mockResolvedValue({ resetToken: token, newPassword: "newpass", confirmPassword: "newpass" }),
      headers: { get: jest.fn().mockReturnValue("dummy") },
    };
    const res = await resetPassword(req);
    const data = await res.json();
    expect(res.status).toBe(400);
    expect(data.error).toBe("Invalid token or user not found");
  });

  it("should update the password and return success", async () => {
    // Generate a valid token for a test email.
    const email = "test@example.com";
    const token = jwt.sign({ email }, process.env.JWT_SECRET, { expiresIn: "1h" });
    // Simulate that the user exists.
    applicantsFirstPageMock = async () => [{ id: "user123", fields: { Email: email } }];
    const req = {
      json: jest.fn().mockResolvedValue({ resetToken: token, newPassword: "newpass", confirmPassword: "newpass" }),
      headers: { get: jest.fn().mockReturnValue("dummy") },
    };
    const res = await resetPassword(req);
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.message).toBe("Password reset successful");
    // Verify that bcrypt.hash was called with newPassword.
    const bcrypt = require("bcryptjs");
    expect(bcrypt.hash).toHaveBeenCalledWith("newpass", 10);
    // Verify that Airtable update was called with the user id and hashed password.
    expect(updateMock).toHaveBeenCalledWith(
        { 
            id:"user123", 
            fields: { Password: "hashedNewPassword" }
        }
    );
  });

  it("should return 500 if an internal error occurs", async () => {
    // Simulate a valid token.
    const email = "test@example.com";
    const token = jwt.sign({ email }, process.env.JWT_SECRET, { expiresIn: "1h" });
    // Simulate that the user exists.
    applicantsFirstPageMock = async () => [{ id: "user123", fields: { Email: email } }];
    // Force update to throw an error.
    updateMock.mockRejectedValue(new Error("Update failed"));
    const req = {
      json: jest.fn().mockResolvedValue({ resetToken: token, newPassword: "newpass", confirmPassword: "newpass" }),
      headers: { get: jest.fn().mockReturnValue("dummy") },
    };
    const res = await resetPassword(req);
    const data = await res.json();
    expect(res.status).toBe(500);
    expect(data.error).toBe("Internal server error");
    expect(logger.error).toHaveBeenCalledWith("Reset Password Error:", expect.any(Error));
  });
});
