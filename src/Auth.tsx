import { FormEvent, useEffect, useState } from "react";
import { ArrowRight, Eye, EyeOff, LockKeyhole, Mail, UserRound } from "lucide-react";

const ACCOUNT_KEY = "latam-account";
const SESSION_KEY = "latam-session";

type Account = { name: string; email: string; passwordHash: string };

async function hashPassword(password: string) {
  const data = new TextEncoder().encode(password);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, "0")).join("");
}

export function hasSession() {
  return localStorage.getItem(SESSION_KEY) === "1";
}

export default function Auth({ onLogin }: { onLogin: () => void }) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes("@")) return setError("Digite um e-mail válido.");
    if (password.length < 6) return setError("A senha precisa ter pelo menos 6 caracteres.");

    const existing = JSON.parse(localStorage.getItem(ACCOUNT_KEY) || "null") as Account | null;

    if (mode === "register") {
      if (!name.trim()) return setError("Digite seu nome.");
      if (existing?.email === cleanEmail) return setError("Já existe uma conta com esse e-mail.");

      const account = { name: name.trim(), email: cleanEmail, passwordHash: await hashPassword(password) };
      localStorage.setItem(ACCOUNT_KEY, JSON.stringify(account));
      localStorage.setItem(SESSION_KEY, "1");
      onLogin();
      return;
    }

    if (!existing || existing.email !== cleanEmail || existing.passwordHash !== await hashPassword(password)) {
      return setError("E-mail ou senha incorretos.");
    }

    localStorage.setItem(SESSION_KEY, "1");
    onLogin();
  }

  return (
    <div className="auth-page">
      <div className="auth-glow glow-one" />
      <div className="auth-glow glow-two" />
      <div className="auth-card">
        <div className="auth-brand"><img src="https://latam.nyxaria.workers.dev/latam-logo.webp" alt="Logo LATAM" /><b>LATAM</b><small>DATA MANAGER</small></div>
        <div className="auth-title">
          <h1>{mode === "login" ? "Bem-vindo de volta" : "Criar sua conta"}</h1>
          <p>{mode === "login" ? "Entre para acessar seu painel de dados." : "Crie uma conta para começar a gerenciar suas fontes."}</p>
        </div>

        <form onSubmit={submit}>
          {mode === "register" && (
            <label className="auth-field"><span>Nome</span><div><UserRound /><input value={name} onChange={e => setName(e.target.value)} placeholder="Seu nome" autoComplete="name" /></div></label>
          )}
          <label className="auth-field"><span>E-mail</span><div><Mail /><input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="voce@email.com" autoComplete="email" /></div></label>
          <label className="auth-field"><span>Senha</span><div><LockKeyhole /><input type={show ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} placeholder="Mínimo de 6 caracteres" autoComplete={mode === "login" ? "current-password" : "new-password"} /><button type="button" className="password-toggle" onClick={() => setShow(!show)}>{show ? <EyeOff /> : <Eye />}</button></div></label>

          {error && <div className="auth-error">{error}</div>}

          <button className="auth-submit" type="submit">{mode === "login" ? "Entrar" : "Criar conta"} <ArrowRight /></button>
        </form>

        <div className="auth-switch">
          {mode === "login" ? <>Ainda não tem conta? <button onClick={() => { setMode("register"); setError(""); }}>Criar conta</button></> : <>Já tem uma conta? <button onClick={() => { setMode("login"); setError(""); }}>Entrar</button></>}
        </div>
        <footer className="auth-footer">by Souza</footer>
      </div>
    </div>
  );
}
