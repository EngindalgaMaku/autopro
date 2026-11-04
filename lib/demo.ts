// The public demo. AUTO_SEED=true turns the whole app into it; business.isDemo marks the one
// workshop everybody signs in to with the published password.

export const isDemoMode = () => process.env.AUTO_SEED === "true";

/** Answer to anything that would lock the next visitor out of the shared workshop */
export const DEMO_LOCKED = "Demo hesapta bu işlem kapalı. Denemek için kendi atölyenizi kaydedebilirsiniz.";

// Enough to try the screens in the shared demo business
export const DEMO_MAX_PHOTO_BYTES = 3 * 1024 * 1024;
export const DEMO_PHOTOS_PER_BUSINESS = 50;
export const DEMO_PHOTOS_TOTAL = 500;
