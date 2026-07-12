"use client";

import { useState } from "react";

export default function LoginForm() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    setError("");
    setSubmitting(true);
    try {
      const response = await fetch(mode === "login" ? "/api/login" : "/api/register", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data.error || (mode === "login" ? "登录失败" : "注册失败"));
        return;
      }
      window.location.href = "/";
    } catch {
      setError("请求失败，请稍后重试");
    } finally {
      setSubmitting(false);
    }
  }

  function switchMode(nextMode: "login" | "register") {
    setMode(nextMode);
    setError("");
  }

  return (
    <main className="login">
      <section className="login-box">
        <h1>Clash Sub Manager</h1>
        <div className="stack">
          <div className="tabs" role="tablist" aria-label="账户操作">
            <button className={mode === "login" ? "tab-active" : ""} onClick={() => switchMode("login")} type="button">登录</button>
            <button className={mode === "register" ? "tab-active" : ""} onClick={() => switchMode("register")} type="button">注册</button>
          </div>
          <input autoComplete="username" placeholder="用户名" value={username} onChange={(event) => setUsername(event.target.value)} onKeyDown={(event) => event.key === "Enter" && submit()} />
          <input autoComplete={mode === "login" ? "current-password" : "new-password"} type="password" placeholder="密码" value={password} onChange={(event) => setPassword(event.target.value)} onKeyDown={(event) => event.key === "Enter" && submit()} />
          {error ? <div className="muted" style={{ color: "var(--danger)" }}>{error}</div> : null}
          <button className="primary" onClick={submit} disabled={submitting}>{submitting ? "请稍候" : mode === "login" ? "登录" : "注册并登录"}</button>
        </div>
      </section>
    </main>
  );
}
