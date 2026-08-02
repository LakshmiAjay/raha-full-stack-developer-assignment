export function defaultUserPassword() {
  const password = process.env.DEFAULT_USER_PASSWORD;
  if (!password)
    throw new Error("DEFAULT_USER_PASSWORD is not configured");
  if (
    password.length < 8 ||
    !/[A-Z]/.test(password) ||
    !/[a-z]/.test(password) ||
    !/\d/.test(password) ||
    !/[^A-Za-z0-9]/.test(password)
  )
    throw new Error(
      "DEFAULT_USER_PASSWORD must be at least 8 characters and include upper and lowercase letters, a number, and a special character",
    );
  return password;
}
