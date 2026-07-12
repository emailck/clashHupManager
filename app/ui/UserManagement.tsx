"use client";

import { Plus, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";

type User = {
  id: number;
  username: string;
  role: "admin" | "user";
  enabled: boolean | number;
  created_at?: string;
};

export default function UserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  async function loadUsers() {
    setLoading(true);
    const response = await fetch("/api/users");
    const data = await response.json().catch(() => ({}));
    if (response.ok) {
      setUsers(data.users || []);
      setMessage("");
    } else {
      setMessage(data.error || "加载用户失败");
    }
    setLoading(false);
  }

  useEffect(() => {
    void loadUsers();
  }, []);

  async function createUser() {
    const response = await fetch("/api/users", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      setMessage(data.error || "创建用户失败");
      return;
    }
    setUsername("");
    setPassword("");
    setMessage("普通用户已创建");
    await loadUsers();
  }

  async function updateUser(user: User, changes: { enabled?: boolean; password?: string }) {
    const response = await fetch(`/api/users/${user.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(changes),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      setMessage(data.error || "更新用户失败");
      return;
    }
    setMessage(changes.password ? `已重置 ${user.username} 的密码` : `已${changes.enabled ? "启用" : "停用"} ${user.username}`);
    await loadUsers();
  }

  async function resetPassword(user: User) {
    const nextPassword = window.prompt(`为 ${user.username} 设置新密码`);
    if (!nextPassword) return;
    await updateUser(user, { password: nextPassword });
  }

  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <div className="panel-title">用户管理</div>
          <div className="muted">创建普通用户、调整账户状态和重置密码</div>
        </div>
        <button title="刷新用户列表" onClick={loadUsers} disabled={loading}><RefreshCw size={16} /></button>
      </div>
      <div className="panel-body stack">
        <div className="user-create">
          <input autoComplete="off" placeholder="用户名" value={username} onChange={(event) => setUsername(event.target.value)} />
          <input autoComplete="new-password" type="password" placeholder="初始密码" value={password} onChange={(event) => setPassword(event.target.value)} onKeyDown={(event) => event.key === "Enter" && createUser()} />
          <button className="primary" title="创建普通用户" onClick={createUser}><Plus size={16} /></button>
        </div>
        {message ? <div className="muted" role="status">{message}</div> : null}
        <div className="list">
          {users.map((user) => {
            const enabled = Boolean(user.enabled);
            return (
              <div className="item user-item" key={user.id}>
                <div>
                  <div className="item-name">{user.username}{user.role === "admin" ? "（管理员）" : ""}</div>
                  <div className="muted">{enabled ? "已启用" : "已停用"}</div>
                </div>
                <div className="row">
                  <button onClick={() => updateUser(user, { enabled: !enabled })} disabled={user.role === "admin"}>{enabled ? "停用" : "启用"}</button>
                  <button onClick={() => resetPassword(user)}>重置密码</button>
                </div>
              </div>
            );
          })}
          {!loading && users.length === 0 ? <div className="muted">暂无用户</div> : null}
        </div>
      </div>
    </section>
  );
}
