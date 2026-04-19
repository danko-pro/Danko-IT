import type { PassportSaveState } from "./dashboard-passport-draft";

type DashboardPassportActionsProps = {
  saveState: PassportSaveState;
  isDirty: boolean;
};

// Action-бар формы паспорта объекта.
// Содержит только отображение статуса сохранения и кнопку submit.

export function DashboardPassportActions(props: DashboardPassportActionsProps) {
  const { saveState, isDirty } = props;

  return (
    <div className="dashboard-passport-actions">
      <span className="dashboard-passport-status" data-state={saveState}>
        {saveState === "saving"
          ? "Сохраняю паспорт объекта..."
          : saveState === "saved"
            ? "Паспорт объекта сохранён"
            : saveState === "error"
              ? "Не удалось сохранить паспорт объекта"
              : "Паспорт объекта хранит только исходные данные и параметры"}
      </span>
      <button type="submit" className="dashboard-passport-save-button" disabled={!isDirty || saveState === "saving"}>
        Сохранить
      </button>
    </div>
  );
}
