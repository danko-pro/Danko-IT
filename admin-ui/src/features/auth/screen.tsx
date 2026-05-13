import { useState, type FormEvent } from "react";
import { Button } from "../../shared/controls";

export function AdminAuthScreen(props: {
  loading: boolean;
  error: string | null;
  onLogin: (email: string, password: string) => Promise<void>;
  onRegister: (displayName: string, email: string, password: string) => Promise<void>;
}) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (mode === "register") {
      await props.onRegister(displayName, email, password);
    } else {
      await props.onLogin(email, password);
    }
    setPassword("");
  }

  const canSubmit = Boolean(email.trim() && password.trim() && !props.loading);

  return (
    <div className="flex min-h-[calc(100vh-1.5rem)] items-center justify-center">
      <div className="glass-panel w-full max-w-[460px] px-6 py-6">
        <div className="space-y-2">
          <div className="eyebrow">Danko Access</div>
          <h1 className="text-[2rem] font-semibold tracking-[-0.04em] text-slate-50">
            {mode === "register" ? "Регистрация" : "Вход в Danko IT"}
          </h1>
          <p className="text-sm leading-6 text-slate-400">
            После входа каждый пользователь получает свое отдельное рабочее пространство.
          </p>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-2 rounded-[18px] border border-white/10 bg-white/[0.03] p-1">
          <button
            type="button"
            className={`rounded-[14px] px-3 py-2 text-sm font-semibold ${
              mode === "login" ? "bg-cyan-300 text-slate-950" : "text-slate-300"
            }`}
            onClick={() => setMode("login")}
          >
            Вход
          </button>
          <button
            type="button"
            className={`rounded-[14px] px-3 py-2 text-sm font-semibold ${
              mode === "register" ? "bg-cyan-300 text-slate-950" : "text-slate-300"
            }`}
            onClick={() => setMode("register")}
          >
            Регистрация
          </button>
        </div>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          {mode === "register" ? (
            <label className="block">
              <div className="field-label">Имя</div>
              <input
                type="text"
                className="text-input"
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                autoComplete="name"
                placeholder="Как к вам обращаться"
              />
            </label>
          ) : null}

          <label className="block">
            <div className="field-label">Email</div>
            <input
              type="email"
              className="text-input"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              placeholder="you@example.com"
            />
          </label>

          <label className="block">
            <div className="field-label">Пароль</div>
            <input
              type="password"
              className="text-input"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete={mode === "register" ? "new-password" : "current-password"}
              placeholder="Введите пароль"
            />
          </label>

          {props.error ? (
            <div className="rounded-[16px] border border-rose-300/16 bg-rose-300/8 px-3.5 py-3 text-sm text-rose-100">
              {props.error}
            </div>
          ) : null}

          <div className="flex items-center justify-between gap-3 pt-1">
            <div className="text-xs uppercase tracking-[0.18em] text-slate-500">HttpOnly session</div>
            <Button type="submit" className="min-w-[10.5rem]" disabled={!canSubmit}>
              {props.loading ? "Обработка..." : mode === "register" ? "Создать" : "Войти"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
