export function validateCredentials(usernameValue: unknown, passwordValue: unknown) {
  const username = String(usernameValue || "").trim();
  const password = String(passwordValue || "");
  if (!/^[a-zA-Z0-9_-]{3,32}$/.test(username)) return { error: "用户名需为 3-32 位字母、数字、下划线或连字符" };
  if (password.length < 8 || password.length > 128) return { error: "密码长度需为 8-128 位" };
  return { username, password };
}
