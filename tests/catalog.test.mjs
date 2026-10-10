import test from "node:test";
import assert from "node:assert/strict";
import { requestViewing } from "../js/platform.js";
import {
  SAMPLE_PROPERTIES,
  normalizeProperty,
  filterProperties,
  escapeHtml,
  safeImage,
  safeReturn,
} from "../js/catalog-core.js";
const properties = SAMPLE_PROPERTIES.map((item) =>
  normalizeProperty(item.id, item),
);
test("sample apartments cannot create real viewing requests", async () => {
  await assert.rejects(
    requestViewing(SAMPLE_PROPERTIES[0], {}),
    /cannot be booked/,
  );
});
test("location and budget filters compose without modifying source data", () => {
  const result = filterProperties(properties, {
    location: "Lagos",
    max: 250000,
  });
  assert.equal(result.length, 4);
  assert.equal(result[0].id, "sample-lekki");
  assert.equal(properties.length, 12);
});
test("search, property type, and sorting work together", () => {
  const result = filterProperties(properties, {
    q: "Abuja",
    type: "villa",
    sort: "price-low",
  });
  assert.deepEqual(
    result.map((item) => item.id),
    ["sample-abuja"],
  );
  const sorted = filterProperties(properties, { sort: "price-high" });
  assert.equal(sorted[0].price, 850000);
});
test("saved-only view and no-result search are deterministic", () => {
  assert.deepEqual(
    filterProperties(properties, { saved: new Set(["sample-ikoyi"]) }).map(
      (item) => item.id,
    ),
    ["sample-ikoyi"],
  );
  assert.equal(filterProperties(properties, { q: "unlisted-city" }).length, 0);
});
test("legacy listing fields normalize to stable display values", () => {
  const result = normalizeProperty("legacy", {
    price: "NGN 250,000",
    beds: 2,
    baths: 1,
    imageUrl: "https://example.com/home.jpg",
  });
  assert.equal(result.price, 250000);
  assert.equal(result.bedrooms, 2);
  assert.equal(result.bathrooms, 1);
});
test("listing content and image URLs cannot inject HTML or script URLs", () => {
  assert.equal(escapeHtml('<img src="x">'), "&lt;img src=&quot;x&quot;&gt;");
  assert.equal(safeImage("javascript:alert(1)"), "images/optimized/home.webp");
  assert.equal(safeImage("images/../../secret"), "images/optimized/home.webp");
  assert.equal(
    safeImage("images/optimized/property-1.webp"),
    "images/optimized/property-1.webp",
  );
});
test("sign-in continuations accept only supported internal destinations", () => {
  assert.equal(
    safeReturn("property-details.html?id=home-1"),
    "property-details.html?id=home-1",
  );
  assert.equal(safeReturn("https://evil.example/"), "dashboard.html");
  assert.equal(safeReturn("//evil.example/"), "dashboard.html");
  assert.equal(safeReturn("admin/signup.html"), "dashboard.html");
});
