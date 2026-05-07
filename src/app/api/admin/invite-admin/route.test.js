import { jest } from "@jest/globals";

jest.mock("@/lib/utils/logger", () => ({
  error: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
  warn: jest.fn(),
}));
jest.mock("@/lib/auditLogger", () => ({
  logAuditEvent: jest.fn(),
}));

class TestResponse {
  constructor(data, status = 200) {
    this._data = data;
    this.status = status;
  }
  async json() { return this._data; }
}
global.Response = {
  json: (data, options = {}) => new TestResponse(data, options.status || 200),
};

const makeRequest = (body) => ({ json: jest.fn().mockResolvedValue(body) });

// ─── shared default mock values ──────────────────────────────────────────────

const ADMIN_SESSION = { userEmail: "admin@example.com", userRole: "admin", userName: "Admin" };
const EXISTING_ADMIN_RECORD = { id: "staff_existing", fields: { Email: "invited@example.com", Password: "", IsAdmin: true } };
const EXISTING_NON_ADMIN_RECORD = { id: "staff_nonadmin", fields: { Email: "staff@example.com", Password: "", IsAdmin: false } };
const NEW_RECORD_ID = "staff_new_123";
const NONCE = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";
const JWT_TOKEN = "header.payload.signature";

// ─── setup helper ────────────────────────────────────────────────────────────

const setupMocks = (overrides = {}) => {
  jest.resetModules();

  // env vars
  process.env.AIRTABLE_API_KEY = "test_key";
  process.env.AIRTABLE_BASE_ID = "test_base";
  process.env.JWT_SECRET = "test_jwt_secret";
  process.env.MAKE_WEBHOOK_URL_ADMIN_PASSWORD_PAGE = "https://hook.make.com/test";
  process.env.NODE_ENV = "test";
  process.env.APP_BASE_URL = "https://app.smilecliniq.com";

  // crypto.randomUUID
  global.crypto = { randomUUID: jest.fn().mockReturnValue(NONCE) };

  // fetch (Make.com webhook)
  const webhookOk = overrides.webhookOk !== undefined ? overrides.webhookOk : true;
  const webhookBody = overrides.webhookBody !== undefined
    ? overrides.webhookBody
    : { success: true, messageId: "msg_123" };
  global.fetch = overrides.fetch || jest.fn().mockResolvedValue({
    ok: webhookOk,
    json: jest.fn().mockResolvedValue(webhookBody),
  });

  // iron-session
  jest.doMock("iron-session", () => ({
    unsealData: jest.fn().mockResolvedValue(overrides.session ?? ADMIN_SESSION),
  }));

  // next/headers cookies — allow callers to override the get() return value
  const cookiesGetMock = overrides.cookiesGet ?? jest.fn().mockReturnValue({ value: "sealed_session" });
  jest.doMock("next/headers", () => ({
    cookies: jest.fn().mockReturnValue({ get: cookiesGetMock, set: jest.fn() }),
  }));

  // jsonwebtoken
  jest.doMock("jsonwebtoken", () => ({
    sign: jest.fn().mockReturnValue(JWT_TOKEN),
  }));

  // Airtable operations
  const selectFirstPage = overrides.selectFirstPage ?? jest.fn().mockResolvedValue([]);
  const staffCreate = overrides.staffCreate ?? jest.fn().mockResolvedValue([{ id: NEW_RECORD_ID }]);
  const staffUpdate = overrides.staffUpdate ?? jest.fn().mockResolvedValue([]);
  const staffDestroy = overrides.staffDestroy ?? jest.fn().mockResolvedValue([]);

  jest.doMock("airtable", () =>
    jest.fn().mockImplementation(() => ({
      base: jest.fn().mockImplementation(() => (tableName) => {
        if (tableName === "Staff") {
          return {
            select: jest.fn().mockReturnValue({ firstPage: selectFirstPage }),
            create: staffCreate,
            update: staffUpdate,
            destroy: staffDestroy,
          };
        }
        return {};
      }),
    }))
  );

  const { POST } = require("./route");
  return { POST, staffCreate, staffUpdate, staffDestroy, selectFirstPage };
};

// ─── tests ───────────────────────────────────────────────────────────────────

describe("POST /api/admin/invite-admin", () => {

  // ── Auth ──────────────────────────────────────────────────────────────────

  test("returns 401 when no session cookie", async () => {
    // Pass the no-cookie override directly so setupMocks loads the route with it
    const { POST } = setupMocks({ cookiesGet: jest.fn().mockReturnValue(undefined) });
    const res = await POST(makeRequest({ name: "Alice", email: "alice@example.com" }));
    expect(res.status).toBe(401);
  });

  test("returns 403 when session role is not admin", async () => {
    const { POST } = setupMocks({ session: { userEmail: "user@example.com", userRole: "user" } });
    const res = await POST(makeRequest({ name: "Alice", email: "alice@example.com" }));
    expect(res.status).toBe(403);
  });

  // ── Input validation ──────────────────────────────────────────────────────

  test("returns 400 when name is missing", async () => {
    const { POST } = setupMocks();
    const res = await POST(makeRequest({ email: "alice@example.com" }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/name/i);
  });

  // Bug 6: whitespace-only name must be rejected
  test("returns 400 when name is whitespace only", async () => {
    const { POST } = setupMocks();
    const res = await POST(makeRequest({ name: "   ", email: "alice@example.com" }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/name/i);
  });

  test("returns 400 when email is invalid", async () => {
    const { POST } = setupMocks();
    const res = await POST(makeRequest({ name: "Alice", email: "not-an-email" }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/email/i);
  });

  test("returns 400 when user already has a password (already configured)", async () => {
    const { POST } = setupMocks({
      selectFirstPage: jest.fn().mockResolvedValue([{
        id: "staff_1",
        fields: { Email: "existing@example.com", Password: "hashed_pw", IsAdmin: true },
      }]),
    });
    const res = await POST(makeRequest({ name: "Existing", email: "existing@example.com" }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/already has an admin account/i);
  });

  // ── Happy path: new invite ─────────────────────────────────────────────────

  test("creates Staff record with trimmed name for a new email", async () => {
    const { POST, staffCreate } = setupMocks();
    const res = await POST(makeRequest({ name: "  Alice  ", email: "alice@example.com" }));
    expect(res.status).toBe(200);
    expect(staffCreate).toHaveBeenCalledWith([
      expect.objectContaining({
        fields: expect.objectContaining({ Name: "Alice", Email: "alice@example.com" }),
      }),
    ]);
  });

  test("sends trimmed name to Make.com webhook", async () => {
    const { POST } = setupMocks();
    await POST(makeRequest({ name: "  Alice  ", email: "alice@example.com" }));
    const [, options] = global.fetch.mock.calls[0];
    const body = JSON.parse(options.body);
    expect(body.name).toBe("Alice");
  });

  test("returns 200 with staffId on success", async () => {
    const { POST } = setupMocks();
    const res = await POST(makeRequest({ name: "Alice", email: "alice@example.com" }));
    expect(res.status).toBe(200);
    expect((await res.json())).toMatchObject({ message: "Invite sent", staffId: NEW_RECORD_ID });
  });

  // ── Re-invite (existing record, no password) ──────────────────────────────

  test("reuses existing Staff record on re-invite", async () => {
    const { POST, staffCreate } = setupMocks({
      selectFirstPage: jest.fn().mockResolvedValue([EXISTING_ADMIN_RECORD]),
    });
    const res = await POST(makeRequest({ name: "Alice Updated", email: "invited@example.com" }));
    expect(res.status).toBe(200);
    expect(staffCreate).not.toHaveBeenCalled();
  });

  // Bug 3: re-invite must update the Name field
  test("updates Name field on re-invite", async () => {
    const { POST, staffUpdate } = setupMocks({
      selectFirstPage: jest.fn().mockResolvedValue([EXISTING_ADMIN_RECORD]),
    });
    await POST(makeRequest({ name: "Alice Updated", email: "invited@example.com" }));
    expect(staffUpdate).toHaveBeenCalledWith([
      expect.objectContaining({
        fields: expect.objectContaining({ Name: "Alice Updated" }),
      }),
    ]);
  });

  // Bug 4: warn when promoting a non-admin Staff record
  test("logs warning when inviting an existing non-admin Staff record", async () => {
    const { POST } = setupMocks({
      selectFirstPage: jest.fn().mockResolvedValue([EXISTING_NON_ADMIN_RECORD]),
    });
    // Require logger AFTER setupMocks so we get the same instance the route uses
    const logger = require("@/lib/utils/logger");
    await POST(makeRequest({ name: "Staff Member", email: "staff@example.com" }));
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining("promoting existing non-admin"),
      expect.any(Object)
    );
  });

  // ── Webhook failure handling ──────────────────────────────────────────────

  // Bug 1 (revised): Make.com error body surfaced in 502
  test("returns 502 with Make.com error message when webhook fails", async () => {
    const { POST } = setupMocks({
      webhookOk: false,
      webhookBody: { success: false, error: "Gmail authentication failed" },
    });
    const res = await POST(makeRequest({ name: "Alice", email: "alice@example.com" }));
    expect(res.status).toBe(502);
    expect((await res.json()).error).toContain("Gmail authentication failed");
  });

  // Bug 2: rollback newly-created record when webhook fails
  test("deletes newly-created Staff record when webhook fails", async () => {
    const { POST, staffDestroy } = setupMocks({
      webhookOk: false,
      webhookBody: { success: false, error: "Gmail error" },
    });
    await POST(makeRequest({ name: "Alice", email: "alice@example.com" }));
    expect(staffDestroy).toHaveBeenCalledWith([NEW_RECORD_ID]);
  });

  // Bug 2: existing record must NOT be deleted on webhook failure
  test("does NOT delete existing Staff record when webhook fails", async () => {
    const { POST, staffDestroy } = setupMocks({
      selectFirstPage: jest.fn().mockResolvedValue([EXISTING_ADMIN_RECORD]),
      webhookOk: false,
      webhookBody: { success: false, error: "Gmail error" },
    });
    await POST(makeRequest({ name: "Alice", email: "invited@example.com" }));
    expect(staffDestroy).not.toHaveBeenCalled();
  });
});
