// GET get-tasks route tests

describe("GET /api/get-tasks", () => {
    // Set environment variables and reset modules before each test.
    beforeEach(() => {
      jest.resetModules();
      process.env.AIRTABLE_API_KEY = "dummy_api_key";
      process.env.AIRTABLE_BASE_ID = "dummy_base_id";
    });
  
    afterEach(() => {
      jest.clearAllMocks();
      jest.resetModules();
    });
  
    // Helper to set up mocks for GET route tests.
    const setupGetMocks = (overrides = {}) => {
      // Mock next/headers to control cookie behaviour.
      jest.doMock("next/headers", () => ({
        cookies: () => {
          return overrides.cookies || {
            // By default, return a valid user_email cookie.
            get: (key) => (key === "user_email" ? { value: "test@example.com" } : undefined),
          };
        },
      }));
  
      // Mock Airtable for the Applicants table.
      jest.doMock("airtable", () => {
        return jest.fn().mockImplementation(() => {
          return {
            base: () => (tableName) => {
              if (tableName === "Applicants") {
                return {
                  // Allow overriding of select behaviour.
                  select: overrides.mockApplicantsSelect || (() => ({
                    firstPage: () => Promise.resolve([]), // Default: simulate no applicant record found.
                  })),
                };
              }
            },
          };
        });
      });
  
      // Re-import GET after mocks are set up.
      const { GET } = require("./route");
      return { GET };
    };
  
    test("returns 401 status and 'Unauthorized' error when no user_email cookie is provided", async () => {
      // Simulate missing user_email cookie.
      const { GET } = setupGetMocks({
        cookies: {
          get: () => undefined, // No cookie provided.
        },
      });
      const response = await GET();
      expect(response.status).toBe(401);
      const json = await response.json();
      expect(json.error).toBe("Unauthorized");
    });
  
    test("returns 404 status and 'Applicant not found' error when no applicant record is found", async () => {
      // Simulate valid cookie and an empty applicant record.
      const { GET } = setupGetMocks({
        // Ensure select returns an empty array.
        mockApplicantsSelect: () => ({
          firstPage: () => Promise.resolve([]),
        }),
      });
      const response = await GET();
      expect(response.status).toBe(404);
      const json = await response.json();
      expect(json.error).toBe("Applicant not found");
    });
});
  