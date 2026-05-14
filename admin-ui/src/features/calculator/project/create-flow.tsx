import { useState, type FormEvent } from "react";

import { Button } from "../../../shared/controls";
import type { CalculatorProjectCreatePayload } from "../screen/types";

type CalculatorProjectCreateFlowProps = {
  open: boolean;
  hasProject: boolean;
  loading: boolean;
  busyKey: string | null;
  error: string | null;
  onOpenChange: (open: boolean) => void;
  onCreateProject: (payload: CalculatorProjectCreatePayload) => Promise<void>;
};

export function CalculatorProjectCreateFlow(props: CalculatorProjectCreateFlowProps) {
  const [name, setName] = useState("");
  const [note, setNote] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);
  const isCreating = props.busyKey === "calculator-project-create";
  const shouldRender = props.loading || props.open || !props.hasProject;

  if (!shouldRender) {
    return null;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalizedName = name.trim();
    if (!normalizedName) {
      setLocalError("Введите название объекта.");
      return;
    }

    setLocalError(null);
    await props.onCreateProject({
      name: normalizedName,
      note: note.trim(),
    });
    setName("");
    setNote("");
    props.onOpenChange(false);
  }

  if (props.loading) {
    return (
      <section className="glass-panel stage-panel p-5">
        <div className="empty-state">Загружаю объекты калькулятора...</div>
      </section>
    );
  }

  if (!props.open) {
    return (
      <section className="glass-panel stage-panel p-5">
        <div className="mx-auto max-w-2xl space-y-4 text-center">
          <div className="eyebrow">Калькулятор</div>
          <h2 className="text-2xl font-semibold text-slate-50">Объект калькулятора не выбран</h2>
          <p className="text-sm leading-6 text-slate-300">
            Создайте первый объект, чтобы открыть помещения, расчеты и вкладку потолков. Пустой список объектов - нормальное
            состояние для нового аккаунта.
          </p>
          {props.error ? <div className="rounded-2xl border border-rose-300/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">{props.error}</div> : null}
          <Button type="button" onClick={() => props.onOpenChange(true)}>
            Создать объект
          </Button>
        </div>
      </section>
    );
  }

  return (
    <section className="glass-panel stage-panel p-5">
      <form className="mx-auto max-w-2xl space-y-4" onSubmit={(event) => void handleSubmit(event)}>
        <div className="space-y-2 text-center">
          <div className="eyebrow">Новый объект</div>
          <h2 className="text-2xl font-semibold text-slate-50">Создать объект калькулятора</h2>
          <p className="text-sm leading-6 text-slate-300">Минимально нужны название объекта и, при необходимости, примечание.</p>
        </div>

        <label className="block space-y-2">
          <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Название объекта</span>
          <input
            className="w-full rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3 text-sm text-slate-50 outline-none transition focus:border-cyan-300/60 focus:bg-slate-950/70"
            disabled={isCreating}
            onChange={(event) => setName(event.target.value)}
            placeholder="Например: ЖК Династия, квартира 42"
            type="text"
            value={name}
          />
        </label>

        <label className="block space-y-2">
          <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Примечание</span>
          <textarea
            className="min-h-24 w-full resize-y rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3 text-sm text-slate-50 outline-none transition focus:border-cyan-300/60 focus:bg-slate-950/70"
            disabled={isCreating}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Необязательно"
            value={note}
          />
        </label>

        {localError || props.error ? (
          <div className="rounded-2xl border border-rose-300/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
            {localError || props.error}
          </div>
        ) : null}

        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Button disabled={isCreating} type="button" variant="secondary" onClick={() => props.onOpenChange(false)}>
            Отмена
          </Button>
          <Button disabled={isCreating || !name.trim()} type="submit">
            {isCreating ? "Создаю..." : "Создать"}
          </Button>
        </div>
      </form>
    </section>
  );
}
