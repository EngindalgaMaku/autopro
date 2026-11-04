// The key that signs session cookies. It only ever comes from the environment: this repository
// is public, so any key written in the code could be used to forge a sign-in.
export function sessionSecret() {
  const value = process.env.SESSION_SECRET;
  if (!value || value.length < 32 || value.startsWith("CHANGE_ME")) {
    throw new Error("SESSION_SECRET must be set to at least 32 random characters");
  }
  return value;
}
