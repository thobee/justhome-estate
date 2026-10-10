export async function timed(promise, milliseconds = 12000) {
  let timer;
  try {
    return await Promise.race([
      promise,
      new Promise((_, reject) => {
        timer = setTimeout(() => {
          const error = new Error("Connection timed out");
          error.code = "timeout";
          reject(error);
        }, milliseconds);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

export async function registerAccount(api, { name, email, password }) {
  const { user } = await api.createUserWithEmailAndPassword(
    api.auth,
    email,
    password,
  );
  // Authentication succeeded even if the separate profile store is unavailable.
  const setup = await Promise.allSettled([
    Promise.resolve().then(() =>
      timed(api.updateProfile(user, { displayName: name })),
    ),
    Promise.resolve().then(() =>
      timed(
        api.setDoc(api.doc(api.db, "users", user.uid), {
          name,
          email,
          role: "user",
          createdAt: api.serverTimestamp(),
          savedProperties: [],
          recentViews: [],
        }),
      ),
    ),
  ]);
  return { user, setup };
}

export async function loadDashboardData({ savedHomes, listings, viewings }) {
  const [saved, homes, requests] = await Promise.allSettled([
    Promise.resolve().then(() => timed(savedHomes())),
    Promise.resolve().then(() => timed(listings())),
    Promise.resolve().then(() => timed(viewings())),
  ]);
  return { saved, homes, requests };
}
