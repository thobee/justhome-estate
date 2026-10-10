export const SAMPLE_PROPERTIES = [
  {
    id: "sample-ikoyi",
    title: "A quieter kind of city living",
    location: "Ikoyi, Lagos",
    type: "apartment",
    price: 450000,
    bedrooms: 3,
    bathrooms: 3,
    area: 180,
    image: "images/optimized/home.webp",
    images: ["images/optimized/home.webp", "images/optimized/property-1.webp"],
    status: "available",
    furnished: true,
    description:
      "A bright three-bedroom apartment with generous living spaces, a private balcony, and room to make yourself at home. This is a sample listing, not an available property.",
  },
  {
    id: "sample-abuja",
    title: "Room to grow, inside and out",
    location: "Maitama, Abuja",
    type: "villa",
    price: 650000,
    bedrooms: 4,
    bathrooms: 4,
    area: 260,
    image: "images/optimized/property-1.webp",
    status: "available",
    furnished: false,
    description:
      "An airy family home with flexible spaces for work and everyday life. This is a sample listing, not an available property.",
  },
  {
    id: "sample-lekki",
    title: "Your own corner of Lekki",
    location: "Lekki, Lagos",
    type: "apartment",
    price: 180000,
    bedrooms: 2,
    bathrooms: 2,
    area: 105,
    image: "images/optimized/property-3.webp",
    status: "available",
    furnished: true,
    description:
      "A compact apartment with an open living area and two comfortable bedrooms. This is a sample listing, not an available property.",
  },
  {
    id: "sample-office",
    title: "A better place to do good work",
    location: "Wuse, Abuja",
    type: "office",
    price: 300000,
    bedrooms: 0,
    bathrooms: 2,
    area: 140,
    image: "images/optimized/property-2.webp",
    status: "available",
    description:
      "A flexible office space with natural light and room for a growing team. This is a sample listing, not an available property.",
  },
  {
    id: "sample-kano",
    title: "Simple spaces. Everyday comfort.",
    location: "Nassarawa, Kano",
    type: "apartment",
    price: 95000,
    bedrooms: 2,
    bathrooms: 1,
    area: 90,
    image: "images/optimized/property-4.webp",
    status: "available",
    description:
      "An easy-to-manage home with practical living spaces. This is a sample listing, not an available property.",
  },
  {
    id: "sample-lagos",
    title: "Space for your next chapter",
    location: "Victoria Island, Lagos",
    type: "villa",
    price: 850000,
    bedrooms: 5,
    bathrooms: 4,
    area: 320,
    image: "images/optimized/property-5.webp",
    status: "available",
    description:
      "A spacious residence designed around shared living and quiet personal spaces. This is a sample listing, not an available property.",
  },

  {
    id: "sample-surulere",
    title: "Two-bedroom apartment in Surulere",
    location: "Surulere, Lagos",
    price: 135000,
    bedrooms: 2,
    bathrooms: 2,
    area: 95,
    image: "images/optimized/property-3.webp",
    type: "apartment",
    status: "sample",
    description:
      "An example apartment to help you explore layouts, locations, and budgets. This sample is not an available rental. Contact us to ask about similar published homes.",
  },
  {
    id: "sample-yaba",
    title: "A bright studio in Yaba",
    location: "Yaba, Lagos",
    price: 110000,
    bedrooms: 1,
    bathrooms: 1,
    area: 55,
    image: "images/optimized/property-1.webp",
    type: "apartment",
    status: "sample",
    description:
      "An example apartment to help you explore layouts, locations, and budgets. This sample is not an available rental. Contact us to ask about similar published homes.",
  },
  {
    id: "sample-gwarinpa",
    title: "Family apartment in Gwarinpa",
    location: "Gwarinpa, Abuja",
    price: 240000,
    bedrooms: 3,
    bathrooms: 2,
    area: 145,
    image: "images/optimized/home.webp",
    type: "apartment",
    status: "sample",
    description:
      "An example apartment to help you explore layouts, locations, and budgets. This sample is not an available rental. Contact us to ask about similar published homes.",
  },
  {
    id: "sample-ajah",
    title: "A fresh start in Ajah",
    location: "Ajah, Lagos",
    price: 220000,
    bedrooms: 2,
    bathrooms: 2,
    area: 100,
    image: "images/optimized/property-4.webp",
    type: "apartment",
    status: "sample",
    description:
      "An example apartment to help you explore layouts, locations, and budgets. This sample is not an available rental. Contact us to ask about similar published homes.",
  },
  {
    id: "sample-asokoro",
    title: "A spacious apartment in Asokoro",
    location: "Asokoro, Abuja",
    price: 380000,
    bedrooms: 3,
    bathrooms: 3,
    area: 175,
    image: "images/optimized/property-1.webp",
    type: "apartment",
    status: "sample",
    description:
      "An example apartment to help you explore layouts, locations, and budgets. This sample is not an available rental. Contact us to ask about similar published homes.",
  },
  {
    id: "sample-portharcourt",
    title: "Modern apartment in Port Harcourt",
    location: "GRA, Port Harcourt",
    price: 175000,
    bedrooms: 2,
    bathrooms: 2,
    area: 115,
    image: "images/optimized/property-6.webp",
    type: "apartment",
    status: "sample",
    description:
      "An example apartment to help you explore layouts, locations, and budgets. This sample is not an available rental. Contact us to ask about similar published homes.",
  },
].map((property) => ({ ...property, isSample: true, status: "sample" }));
export function escapeHtml(value = "") {
  return String(value).replace(
    /[&<>"']/g,
    (char) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        char
      ],
  );
}
export function safeImage(value) {
  if (typeof value !== "string") return "images/optimized/home.webp";
  if (/^images\/[\w ()./-]+$/.test(value) && !value.includes(".."))
    return value;
  try {
    const url = new URL(value);
    if (url.protocol === "https:") return url.href;
  } catch {
    /* Invalid image uses local fallback. */
  }
  return "images/optimized/home.webp";
}
export function normalizeProperty(id, data) {
  const images = (Array.isArray(data.images) ? data.images : [])
    .filter(Boolean)
    .map(safeImage);
  const numeric = (value) =>
    Math.max(0, Number(String(value ?? 0).replace(/[^\d.]/g, "")) || 0);
  return {
    ...data,
    id,
    title: String(data.title || "Property listing"),
    location: String(data.location || "Location to be confirmed"),
    type: String(data.type || "apartment").toLowerCase(),
    price: numeric(data.price),
    bedrooms: numeric(data.bedrooms ?? data.beds),
    bathrooms: numeric(data.bathrooms ?? data.baths),
    area: numeric(data.area ?? data.size),
    image: safeImage(data.image || data.imageUrl || images[0]),
    images,
    status: String(data.status || "available").toLowerCase(),
  };
}
export function filterProperties(properties, filters = {}) {
  const query = (filters.q || "").trim().toLowerCase();
  const results = properties.filter(
    (property) =>
      (!query ||
        (property.title + " " + property.location)
          .toLowerCase()
          .includes(query)) &&
      (!filters.location ||
        property.location
          .toLowerCase()
          .includes(filters.location.toLowerCase())) &&
      (!filters.type || property.type === filters.type) &&
      (!filters.max || property.price <= Number(filters.max)) &&
      (!filters.saved || filters.saved.has(property.id)),
  );
  if (filters.sort === "price-low") results.sort((a, b) => a.price - b.price);
  if (filters.sort === "price-high") results.sort((a, b) => b.price - a.price);
  return results;
}
export function safeReturn(value) {
  if (!value) return "dashboard.html";
  try {
    const url = new URL(value, "https://justhome.local/");
    const allowed = [
      "index.html",
      "properties.html",
      "property-details.html",
      "dashboard.html",
      "contact.html",
    ];
    return url.origin === "https://justhome.local" &&
      allowed.includes(url.pathname.slice(1))
      ? url.pathname.slice(1) + url.search
      : "dashboard.html";
  } catch {
    return "dashboard.html";
  }
}
export const money = (value) =>
  new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(value);
