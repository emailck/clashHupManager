"use client";

import { useState } from "react";

export default function LoginForm() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function login() {
    setError("");
    const response = await fetch("/api/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (!response.ok) {
      setError("密码不正确");
      return;
    }
    window.location.href = "/";
  }

  return (
    <main className="login">
      <section className="login-box">
        <h1>Clash Sub Manager</h1>
        <div className="stack">
          <input type="password" placeholder="管理密码" value={password} onChange={(event) => setPassword(event.target.value)} onKeyDown={(event) => event.key === "Enter" && login()} />
          {error ? <div className="muted" style={{ color: "var(--danger)" }}>{error}</div> : null}
          <button className="primary" onClick={login}>登录</button>
        </div>
      </section>
    </main>
  );
}
