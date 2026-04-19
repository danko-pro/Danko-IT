import { type FormEvent, useEffect, useMemo, useState } from "react";

import { DashboardSceneChrome } from "../dashboard-scene-chrome";
import type { DashboardSceneView } from "../dashboard-scene-types";
import type { DashboardProjectCardData } from "../model/project-model";
import {
  createPassportDraft,
  samePassportDraft,
  type PassportDraft,
  type PassportSaveState,
} from "./dashboard-passport-draft";
import { DashboardPassportActions } from "./dashboard-passport-actions";
import {
  DashboardPassportAccessSection,
  DashboardPassportIdentitySection,
  DashboardPassportMetricsSection,
} from "./dashboard-passport-sections";

// Сцена паспорта объекта.
// Компонент хранит только orchestration формы, dirty-check и сценарий сохранения, а сами секции вынесены в отдельные UI-модули.

export function DashboardPassportScene(props: {
  project: DashboardProjectCardData;
  activeView: DashboardSceneView;
  onSelectView: (view: DashboardSceneView) => void;
  onSavePassport: (passport: PassportDraft) => Promise<void>;
}) {
  const [draft, setDraft] = useState<PassportDraft>(() => createPassportDraft(props.project));
  const [saveState, setSaveState] = useState<PassportSaveState>("idle");

  useEffect(() => {
    setDraft(createPassportDraft(props.project));
    setSaveState("idle");
  }, [props.project]);

  const baseDraft = useMemo(() => createPassportDraft(props.project), [props.project]);
  const isDirty = !samePassportDraft(draft, baseDraft);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isDirty) {
      return;
    }

    setSaveState("saving");
    try {
      await props.onSavePassport(draft);
      setSaveState("saved");
    } catch {
      setSaveState("error");
    }
  }

  return (
    <article className="dashboard-project-card dashboard-passport-card">
      <div className="dashboard-project-card__glow" />
      <DashboardSceneChrome activeView={props.activeView} onSelect={props.onSelectView} />

      <form className="dashboard-passport-form" onSubmit={handleSubmit}>
        <DashboardPassportIdentitySection draft={draft} setDraft={setDraft} />
        <DashboardPassportAccessSection draft={draft} setDraft={setDraft} />
        <DashboardPassportMetricsSection draft={draft} setDraft={setDraft} />
        <DashboardPassportActions saveState={saveState} isDirty={isDirty} />
      </form>
    </article>
  );
}
