import { SAMPLE_PROPERTIES, normalizeProperty } from "./catalog-core.js";
let services;
export async function backend() {
  if (!services)
    services = (async () => {
      const [appModule, authModule, store] = await Promise.all([
        import("https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js"),
        import("https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js"),
        import("https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js"),
      ]);
      const config = {
        apiKey: "AIzaSyBo5JRHCEmp3PftMAmHQxJspCPzX0RRPKY",
        authDomain: "estatejs-7c477.firebaseapp.com",
        projectId: "estatejs-7c477",
        storageBucket: "estatejs-7c477.appspot.com",
        messagingSenderId: "156544193291",
        appId: "1:156544193291:web:96e317eb953cf7194fc80e",
      };
      const app = appModule.getApps().length
        ? appModule.getApp()
        : appModule.initializeApp(config);
      const auth = authModule.getAuth(app);
      await auth.authStateReady();
      return { ...authModule, ...store, auth, db: store.getFirestore(app) };
    })();
  return services;
}

export async function listings() {
  const api = await backend();
  const result = await api.getDocs(
    api.query(api.collection(api.db, "properties"), api.limit(100)),
  );
  const published = result.docs.map((item) =>
    normalizeProperty(item.id, item.data()),
  );
  const ids = new Set(published.map((item) => item.id));
  const available = property => ["available", "active"].includes(property.status);
  return [
    ...published.filter(available),
    ...SAMPLE_PROPERTIES.filter((item) => !ids.has(item.id)).map((item) =>
      normalizeProperty(item.id, item),
    ),
    ...published.filter(property => !available(property)),
  ];
}
export async function savedHomes() {
  const api = await backend();
  if (!api.auth.currentUser) return new Set();
  const snapshot = await api.getDoc(
    api.doc(api.db, "users", api.auth.currentUser.uid),
  );
  const items = snapshot.exists() ? snapshot.data().savedProperties || [] : [];
  return new Set(
    items
      .map((item) => (typeof item === "string" ? item : item.id))
      .filter(Boolean),
  );
}
export async function toggleSaved(id) {
  const api = await backend();
  if (!api.auth.currentUser) {
    const error = new Error("Sign in to save this home.");
    error.code = "signin";
    throw error;
  }
  const saved = await savedHomes();
  saved.has(id) ? saved.delete(id) : saved.add(id);
  await api.updateDoc(api.doc(api.db, "users", api.auth.currentUser.uid), {
    savedProperties: [...saved],
  });
  return saved;
}
export async function requestViewing(property, fields) {
  if (property.isSample) throw new Error("Sample listings cannot be booked.");
  const api = await backend();
  if (!api.auth.currentUser) {
    const error = new Error("Sign in to request a viewing.");
    error.code = "signin";
    throw error;
  }
  await api.addDoc(api.collection(api.db, "viewingRequests"), {
    propertyId: property.id,
    propertyTitle: property.title,
    name: fields.name,
    email: fields.email,
    date: fields.date,
    message: fields.message,
    status: "requested",
    userId: api.auth.currentUser.uid,
    createdAt: api.serverTimestamp(),
  });
}
export async function viewings() {
  const api = await backend();
  if (!api.auth.currentUser) return [];
  const result = await api.getDocs(
    api.query(
      api.collection(api.db, "viewingRequests"),
      api.where("userId", "==", api.auth.currentUser.uid),
      api.limit(50),
    ),
  );
  return result.docs.map((item) => ({ id: item.id, ...item.data() }));
}
