// Login route test
import { jest } from "@jest/globals";

// Helper to create a fake request object.
const createFakeRequest = (body) => ({
  json: jest.fn().mockResolvedValue(body),
});

describe("Login Route (/api/login)", () => {
    // Set environment variables and reset modules before each test.
    beforeEach(() => {
        jest.resetModules();
        process.env.AIRTABLE_API_KEY = "dummy_api_key";
        process.env.AIRTABLE_BASE_ID = "dummy_base_id";
    });
    
    let login;
    afterEach(() => {
      jest.resetModules();
      jest.clearAllMocks();
    });
  
    const setupLoginMocks = (overrides = {}) => {
      // Mock cookies (for setting the user_email)
      const cookiesMock = { set: jest.fn() };
      jest.doMock("next/headers", () => ({
        cookies: jest.fn(() => cookiesMock),
      }));
  
      // Simulate fetching a user from Airtable.
      const fakeUser =
        overrides.fakeUser ||
        { id: "userId", fields: { Password: "hashedPassword" } };
      const mockSelect =
        overrides.mockSelect ||
        jest.fn().mockResolvedValue([fakeUser]);
      jest.doMock("airtable", () => {
        return jest.fn().mockImplementation(() => ({
          base: () => (tableName) => {
            if (tableName === "Applicants") {
              return {
                select: jest.fn(() => ({ firstPage: mockSelect })),
              };
            }
          },
        }));
      });
  
      // Mock bcrypt.compare.
      const compareFn =
        overrides.compare || jest.fn().mockResolvedValue(true);
      jest.doMock("bcryptjs", () => ({
        compare: compareFn,
      }));
  
      ({ login } = require("./route"));
      return { cookiesMock, mockSelect };
    };
  
    test("should return 400 if email or password is missing", async () => {
      setupLoginMocks();
      const req = createFakeRequest({ email: "test@example.com" }); // missing password
      const res = await login(req);
      const json = await res.json();
      expect(res.status).toBe(400);
      expect(json.error).toBe("Email and password is required");
    });
  
    test("should return 401 if invalid credentials are provided (no user found)", async () => {
      setupLoginMocks({
        mockSelect: jest.fn().mockResolvedValue([]),
      });
      const req = createFakeRequest({ email: "nonexistent@example.com", password: "secret" });
      const res = await login(req);
      const json = await res.json();
      expect(res.status).toBe(401);
      expect(json.error).toBe("Invalid credentials");
    });
  
    test("should return 401 if invalid credentials are provided (wrong password)", async () => {
      setupLoginMocks({
        compare: jest.fn().mockResolvedValue(false),
      });
      const req = createFakeRequest({ email: "test@example.com", password: "wrongpass" });
      const res = await login(req);
      const json = await res.json();
      expect(res.status).toBe(401);
      expect(json.error).toBe("Invalid credentials");
    });
  
    test("should return 200 and set a cookie if login is successful", async () => {
      const { cookiesMock } = setupLoginMocks();
      const req = createFakeRequest({ email: "test@example.com", password: "secret" });
      const res = await login(req);
      const json = await res.json();
      expect(res.status).toBe(200);
      expect(json.message).toBe("Logged in successfully");
      expect(cookiesMock.set).toHaveBeenCalledWith(
        "user_email",
        "test@example.com",
        expect.any(Object)
      );
    });
});