import test from "node:test";
import assert from "node:assert/strict";
import {
  registerAccount,
  loadDashboardData,
  timed,
} from "../js/account-flow.js";

function fakeApi(overrides = {}) {
  return {
    auth: {},
    db: {},
    createUserWithEmailAndPassword: async () => ({
      user: { uid: "test-user" },
    }),
    updateProfile: async () => {},
    setDoc: async () => {},
    doc: (...parts) => parts,
    serverTimestamp: () => "timestamp",
    ...overrides,
  };
}
const fields = {
  name: "Test Person",
  email: "test@example.invalid",
  password: "test-only",
};
test("a profile permission error does not report successful signup as failed authentication", async () => {
  const denied = Object.assign(new Error("Denied"), {
    code: "permission-denied",
  });
  const result = await registerAccount(
    fakeApi({
      setDoc: async () => {
        throw denied;
      },
    }),
    fields,
  );
  assert.equal(result.user.uid, "test-user");
  assert.equal(result.setup[0].status, "fulfilled");
  assert.equal(result.setup[1].reason.code, "permission-denied");
});
test("signup saves the supplied name even when updating the auth profile fails", async () => {
  let record;
  const result = await registerAccount(
    fakeApi({
      updateProfile: async () => {
        throw new Error("Offline");
      },
      setDoc: async (_ref, data) => {
        record = data;
      },
    }),
    fields,
  );
  assert.equal(record.name, fields.name);
  assert.equal(record.role, "user");
  assert.equal(result.setup[1].status, "fulfilled");
});
test("invalid credentials stop signup before any profile writes", async () => {
  let wrote = false;
  await assert.rejects(
    registerAccount(
      fakeApi({
        createUserWithEmailAndPassword: async () => {
          throw new Error("Invalid credentials");
        },
        setDoc: async () => {
          wrote = true;
        },
      }),
      fields,
    ),
    /Invalid credentials/,
  );
  assert.equal(wrote, false);
});
test("denied viewings do not hide saved homes or the dashboard", async () => {
  const result = await loadDashboardData({
    savedHomes: async () => new Set(["home-1"]),
    listings: async () => [{ id: "home-1" }],
    viewings: async () => {
      throw Object.assign(new Error("Denied"), { code: "permission-denied" });
    },
  });
  assert.equal(result.saved.status, "fulfilled");
  assert.equal(result.homes.value[0].id, "home-1");
  assert.equal(result.requests.reason.code, "permission-denied");
});
test("synchronous section failures are contained independently", async () => {
  const result = await loadDashboardData({
    savedHomes: () => {
      throw new Error("Offline");
    },
    listings: async () => [],
    viewings: async () => [],
  });
  assert.equal(result.saved.status, "rejected");
  assert.equal(result.requests.status, "fulfilled");
});
test("timeouts include an actionable error code", async () => {
  await assert.rejects(timed(new Promise(() => {}), 5), { code: "timeout" });
});
