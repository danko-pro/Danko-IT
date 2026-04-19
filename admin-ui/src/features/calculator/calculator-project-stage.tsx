import type { Dispatch, FormEvent, SetStateAction } from "react";

import { Button } from "../../shared/controls";
import { TextField, formatDateTime } from "./calculator-shared";
import type { CalculatorProjectDetail } from "./calculator-types";

type ProjectStageSectionProps = {
  projectDetail: CalculatorProjectDetail | null;
  projectsCount: number;
  loading: boolean;
  error: string | null;
  busyKey: string | null;
  projectName: string;
  setProjectName: Dispatch<SetStateAction<string>>;
  projectNote: string;
  setProjectNote: Dispatch<SetStateAction<string>>;
  onReload: () => Promise<void> | void;
  handleProjectSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void> | void;
};

export function ProjectStageSection(props: ProjectStageSectionProps) {
  const {
    projectDetail,
    projectsCount,
    loading,
    error,
    busyKey,
    projectName,
    setProjectName,
    projectNote,
    setProjectNote,
    onReload,
    handleProjectSubmit,
  } = props;

  return (
    <section className="glass-panel p-4 stage-panel">
      <div className="panel-header">
        <div>
          <div className="eyebrow">Калькулятор</div>
          <h3 className="section-title mt-1.5">Проекты объекта</h3>
        </div>
        <Button type="button" variant="secondary" onClick={() => void onReload()}>
          Обновить
        </Button>
      </div>

      {error ? (
        <div className="mb-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {error}
        </div>
      ) : null}

      <form className="subpanel p-3 space-y-2" onSubmit={(event) => void handleProjectSubmit(event)}>
        <div className="text-xs uppercase tracking-[0.16em] text-slate-500">Новый проект расчёта</div>
        <TextField label="Название проекта" value={projectName} onChange={setProjectName} placeholder="Например, Калинина 111 / смета v1" />
        <TextField label="Заметка" value={projectNote} onChange={setProjectNote} placeholder="Короткое описание объекта" />
        <div className="flex justify-end">
          <Button type="submit" disabled={busyKey === "calculator-project-create"}>
            {busyKey === "calculator-project-create" ? "Создаю..." : "Создать проект"}
          </Button>
        </div>
      </form>

      {projectDetail ? (
        <div className="subpanel mt-3 p-3">
          <div className="row-kicker">Текущий объект</div>
          <div className="mt-1 flex items-start justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-slate-100">{projectDetail.project.name}</div>
              <div className="mt-1 text-[12px] text-slate-400">
                Комнат: {projectDetail.project.rooms_count} · Обновлён {formatDateTime(projectDetail.project.updated_at)}
              </div>
            </div>
            <span className="slot-chip">#{projectDetail.project.id}</span>
          </div>
        </div>
      ) : !projectsCount && !loading ? (
        <div className="mt-3 rounded-2xl border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500">
          Пока нет ни одного проекта калькулятора.
        </div>
      ) : null}
    </section>
  );
}
