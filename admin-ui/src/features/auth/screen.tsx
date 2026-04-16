import { useState, type FormEvent } from "react";

export function AdminAuthScreen(props: {
  loading: boolean;
  error: string | null;
  onLogin: (password: string) => Promise<void>;
}) {
  const [password, setPassword] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await props.onLogin(password);
    setPassword("");
  }

  return (
    <div className="flex min-h-[calc(100vh-1.5rem)] items-center justify-center">
      <div className="glass-panel w-full max-w-[460px] px-6 py-6">
        <div className="space-y-2">
          <div className="eyebrow">Admin Access</div>
          <h1 className="text-[2rem] font-semibold tracking-[-0.04em] text-slate-50">Вход в Данко IT</h1>
          <p className="text-sm leading-6 text-slate-400">
            Панель управления данными и проектами работает через серверную admin-сессию.
          </p>
        </div>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <label className="block">
            <div className="field-label">Пароль администратора</div>
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
            <div className="text-xs uppercase tracking-[0.18em] text-slate-500">HttpOnly session</div>
            <button type="submit" className="action-button min-w-[10.5rem]" disabled={props.loading || !password.trim()}>
              {props.loading ? "Вход..." : "Войти"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
