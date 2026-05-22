import { useState, type FormEvent } from "react";
import { Button } from "../../shared/controls";

export function AdminAuthScreen(props: {
  loading: boolean;
  error: string | null;
  onLogin: (email: string, password: string) => Promise<void>;
  onRegister: (displayName: string, email: string, password: string) => Promise<void>;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await props.onLogin(email, password);
    setPassword("");
  }

  const canSubmit = Boolean(email.trim() && password.trim() && !props.loading);

  return (
    <div className="flex min-h-[calc(100vh-1.5rem)] items-center justify-center">
      <div className="glass-panel w-full max-w-[460px] px-6 py-6">
        <div className="space-y-2">
          <div className="eyebrow">Вход для команды</div>
          <h1 className="text-[2rem] font-semibold tracking-[-0.04em] text-slate-50">Вход в Danko IT</h1>
        </div>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <label className="block">
            <div className="field-label">Электронная почта</div>
            <input
              type="email"
              className="text-input"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              placeholder="mail@example.com"
            />
          </label>

          <label className="block">
            <div className="field-label">Пароль</div>
            <input
              type="password"
              className="text-input"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              placeholder="Введите пароль"
            />
          </label>

          {props.error ? (
            <div className="rounded-[16px] border border-rose-300/16 bg-rose-300/8 px-3.5 py-3 text-sm text-rose-100">
              {props.error}
            </div>
          ) : null}

          <div className="flex items-center justify-between gap-3 pt-1">
            <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Защищённая сессия</div>
            <Button type="submit" className="min-w-[10.5rem]" disabled={!canSubmit}>
              {props.loading ? "Обработка..." : "Войти"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
