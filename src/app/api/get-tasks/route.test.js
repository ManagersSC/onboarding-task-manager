// src/app/api/get-tasks/route.test.js

// Mock next/headers and Airtable at the top of the file
jest.mock("next/headers", () => ({
    cookies: () => ({
      get: (key) => {
        if (key === "user_email") return { value: "test@example.com" };
        return undefined;
      },
    }),
  }));
  
  jest.mock("airtable", () => {
    return function Airtable() {
      return {
        base: () => ({
          select: () => ({
            firstPage: () => Promise.resolve([]), // Simulate no records found
          }),
        }),
      };
    };
  });
  
  // Common setup for environment variables
  beforeEach(() => {
    jest.resetModules();
    process.env.AIRTABLE_API_KEY = "dummy_api_key";
    process.env.AIRTABLE_BASE_ID = "dummy_base_id";
  });
  
  describe("GET /api/get-tasks - Unauthorized", () => {
    test("returns 401 status and 'Unauthorized' error when no user_email cookie is provided", async () => {
      // Override the next/headers mock for this specific test
      jest.doMock("next/headers", () => ({
        cookies: () => ({
          get: (key) => undefined,
        }),
      }));
  
      // Require the GET function after setting up the mock
      const { GET } = require("./route");
  
      const response = await GET();
      expect(response.status).toBe(401);
      const json = await response.json();
      expect(json.error).toBe("Unauthorized");
    });
  });
  
  describe("GET /api/get-tasks - Applicant not found", () => {
    test("returns 404 status and 'Applicant not found' error when no applicant record is found", async () => {
      // Require the GET function after our mocks
      const { GET } = require("./route");
  
      const response = await GET();
      expect(response.status).toBe(404);
      const json = await response.json();
      expect(json.error).toBe("Applicant not found");
    });
  });