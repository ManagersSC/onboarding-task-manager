import { jest } from "@jest/globals";

const ORIGINAL_API_KEY = process.env.AIRTABLE_API_KEY;
const ORIGINAL_BASE_ID = process.env.AIRTABLE_BASE_ID;

afterEach(() => {
  jest.resetModules();
  jest.clearAllMocks();
  process.env.AIRTABLE_API_KEY = ORIGINAL_API_KEY;
  process.env.AIRTABLE_BASE_ID = ORIGINAL_BASE_ID;
});

describe("Core‐Tasks API Route", () => {
  test("GET returns tasks array and pagination info", async () => {
    process.env.AIRTABLE_API_KEY = "fake_key";
    process.env.AIRTABLE_BASE_ID = "fake_base";

    // Mock session cookie
    jest.doMock("next/headers", () => ({
      cookies: jest.fn().mockResolvedValue({
        get: () => ({ value: "fakeSessionCookie" }),
      }),
    }));

    // Mock session data
    jest.doMock("iron-session", () => ({
      unsealData: jest.fn().mockResolvedValue({
        userEmail: "admin@example.com",
        userRole: "admin",
        userName: "Admin",
      }),
    }));

    // Mock audit logger
    jest.doMock("@/lib/auditLogger", () => ({
      logAuditEvent: jest.fn(),
    }));

    // Corrected Airtable mock for GET
    jest.doMock("airtable", () => ({
      __esModule: true,
      default: class {
        constructor() {}
        base() {
          // Return a function that represents the table
          return (tableName) => ({
            select: () => ({
              eachPage: (onPage, onDone) => {
                // Simulate a page of records
                onPage(
                  [
                    {
                      id: "rec1",
                      fields: {
                        Task: "First Task",
                        "Task Body": "Body",
                        "Week Number": "1",
                        "Day Number": "1",
                        "Folder Name": "Folder",
                        Type: "Core",
                        "Task Function": "Core",
                        Job: "Dentist",
                        Location: "Loc",
                        Link: "http://link",
                        "Created Time": "2025-04-01T00:00:00.000Z",
                      },
                    },
                  ],
                  () => {} // fetchNextPage (not needed for first page)
                );
                onDone(); // No more pages
              },
            }),
          });
        }
      },
    }));

    // Import GET after mocks
    const { GET } = require("./route");

    // Mock request
    const req = {
      url: "http://localhost/api?pageSize=1",
    };

    // Call GET handler
    const res = await GET(req);
    const data = await res.json();

    // Assertions
    expect(data.tasks).toHaveLength(1);
    expect(data.tasks[0].title).toBe("First Task");
    expect(data.pagination.hasNextPage).toBe(false); // Adjusted based on mock
  });

  test("DELETE deletes tasks and returns success message", async () => {
    process.env.AIRTABLE_API_KEY = "fake_key";
    process.env.AIRTABLE_BASE_ID = "fake_base";

    // Mock session cookie
    jest.doMock("next/headers", () => ({
      cookies: jest.fn().mockResolvedValue({
        get: () => ({ value: "fakeSessionCookie" }),
      }),
    }));

    // Mock session data
    jest.doMock("iron-session", () => ({
      unsealData: jest.fn().mockResolvedValue({
        userEmail: "admin@example.com",
        userRole: "admin",
        userName: "Admin",
      }),
    }));

    // Mock audit logger
    jest.doMock("@/lib/auditLogger", () => ({
      logAuditEvent: jest.fn(),
    }));

    // Track deleted IDs
    let destroyedIds = [];
    
    // Corrected Airtable mock for DELETE
    jest.doMock("airtable", () => ({
      __esModule: true,
      default: class {
        constructor() {}
        base() {
          // Return a function that represents the table
          return (tableName) => ({
            destroy: (id) => {
              destroyedIds.push(id);
              return Promise.resolve();
            },
          });
        }
      },
    }));

    // Import DELETE after mocks
    const { DELETE } = require("./route");

    // Mock request with task IDs
    const req = {
      json: async () => ({ taskIds: ["rec1", "rec2"] }),
    };

    // Call DELETE handler
    const res = await DELETE(req);
    const data = await res.json();

    // Assertions
    expect(data.success).toBe(true);
    expect(destroyedIds).toEqual(["rec1", "rec2"]);
    expect(data.deletedIds).toEqual(["rec1", "rec2"]);
  });
});