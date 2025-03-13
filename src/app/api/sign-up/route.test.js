// signup.test.js
import { jest } from "@jest/globals";

// Helper to create a fake request object.
const createFakeRequest = (body) => ({
  json: jest.fn().mockResolvedValue(body),
});

describe("Signup Route (/api/signup)", () => {
  let signup;
  const ORIGINAL_API_KEY = process.env.AIRTABLE_API_KEY;
  const ORIGINAL_BASE_ID = process.env.AIRTABLE_BASE_ID;

  afterEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    process.env.AIRTABLE_API_KEY = ORIGINAL_API_KEY;
    process.env.AIRTABLE_BASE_ID = ORIGINAL_BASE_ID;
  });

  // Setup mocks for the signup endpoint.
  // Options:
  //   userExists: when true, simulate an applicant record exists.
  //   registered: when true, simulate the applicant already has a password.
  //   mockSelect: custom mock for select.
  //   mockUpdate: custom mock for update.
  const setupSignupMocks = (overrides = {}) => {
    // Create a cookie store mock to track cookie setting.
    const cookieStoreMock = { set: jest.fn() };

    // Mock next/headers to return the cookieStoreMock.
    jest.doMock("next/headers", () => ({
      cookies: jest.fn(() => cookieStoreMock),
    }));

    // Simulate the Airtable query for the applicant record.
    const mockSelect =
      overrides.mockSelect ||
      jest.fn().mockResolvedValue(
        overrides.userExists
          ? [{ id: "existingUserId", fields: overrides.registered ? { Password: "existingHash" } : {} }]
          : []
      );

    // Mock the update function that updates the password.
    const mockUpdate =
      overrides.mockUpdate ||
      jest.fn().mockResolvedValue([{ id: "existingUserId" }]);

    jest.doMock("airtable", () => {
      return jest.fn().mockImplementation(() => ({
        base: () => (tableName) => {
          if (tableName === "Applicants") {
            return {
              select: jest.fn(() => ({ firstPage: mockSelect })),
              update: mockUpdate,
            };
          }
        },
      }));
    });

    // Mock bcrypt.hash.
    jest.doMock("bcryptjs", () => ({
      hash: jest.fn().mockResolvedValue("hashedPassword"),
    }));

    // Import the signup function from the route.
    ({ signup } = require("./route"));
    return { mockSelect, mockUpdate, cookieStoreMock };
  };

  test("should return 500 if configuration is missing", async () => {
    process.env.AIRTABLE_API_KEY = "";
    process.env.AIRTABLE_BASE_ID = "";
    setupSignupMocks({ userExists: true });
    const req = createFakeRequest({ email: "test@example.com", password: "secret" });
    const res = await signup(req);
    const json = await res.json();
    expect(res.status).toBe(500);
    expect(json.error).toBe("Server configuration error");
  });

  test("should return 400 if email or password is missing", async () => {
    setupSignupMocks();
    const req = createFakeRequest({ email: "test@example.com" });
    const res = await signup(req);
    const json = await res.json();
    expect(res.status).toBe(400);
    expect(json.error).toBe("Email and password are required");
  });
  
  test("should return 400 if passwords do not match", async () => {
    setupSignupMocks({ userExists: false });
    const req = createFakeRequest(
      { 
        email: "test@example.com",
        password: "secret123",
        confirmPassword: "secret124"
      }
    );
    const res = await signup(req);
    const json = await res.json();
    expect(res.status).toBe(400);
    expect(json.error).toBe("Passwords do not match.");
  });

  test("should return 404 if the applicant record does not exist", async () => {
    // Simulate that the applicant record is not found in Airtable.
    setupSignupMocks({ userExists: false });
    const req = createFakeRequest({ 
      email: "nonexistent@example.com", 
      password: "secret",
      confirmPassword: "secret"
    });
    const res = await signup(req);
    const json = await res.json();
    expect(res.status).toBe(404);
    expect(json.error).toBe("Applicant record not found");
  });

  test("should return 400 if the user is already registered", async () => {
    // Simulate that the applicant exists and already has a password.
    setupSignupMocks({ userExists: true, registered: true });
    const req = createFakeRequest({ 
      email: "registered@example.com", 
      password: "secret",
      confirmPassword: "secret" 
    });
    const res = await signup(req);
    const json = await res.json();
    expect(res.status).toBe(400);
    expect(json.error).toBe("User already registered. Please log in or reset your password.");
  });

  test("should return 200, update the password, and set a cookie if the applicant exists and is not registered", async () => {
    const { mockUpdate, cookieStoreMock } = setupSignupMocks({ userExists: true, registered: false });
    const req = createFakeRequest({ 
      email: "Existing@Example.Com", 
      password: "secret",
      confirmPassword: "secret" 
    });
    const res = await signup(req);
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.message).toBe("User registered successfully");
    expect(json.recordId).toBe("existingUserId");
    // Verify that the update was called with the correct parameters.
    expect(mockUpdate).toHaveBeenCalledWith([
      {
        id: "existingUserId",
        fields: { Password: "hashedPassword" },
      },
    ]);
    // Verify that the cookie was set with the normalised email.
    expect(cookieStoreMock.set).toHaveBeenCalledWith("user_email", "existing@example.com", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/"
    });
  });
});
