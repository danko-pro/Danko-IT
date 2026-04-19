import type { ProjectCardContractContentProps } from "./project-card-contract-types";

type ProjectCardContractHeroProps = Pick<
  ProjectCardContractContentProps,
  | "contract"
  | "extractionChipClass"
  | "extractionChipLabel"
  | "isDownloadingSource"
  | "onDownloadContractSource"
>;

export function ProjectCardContractHero(props: ProjectCardContractHeroProps) {
  return (
    <div className="dashboard-project-contract-hero">
      <div className="dashboard-project-contract-file">{props.contract.fileName}</div>
      <div className="dashboard-project-contract-title-row">
        <div className="dashboard-project-contract-title">{props.contract.title}</div>
        <span className={props.extractionChipClass}>{props.extractionChipLabel}</span>
      </div>
      <div className="dashboard-project-contract-number">{props.contract.number}</div>

      {props.contract.sourceFile ? (
        <div className="dashboard-project-contract-source-row">
          <div className="dashboard-project-contract-source-name">{props.contract.sourceFile.fileName}</div>
          {props.contract.downloadUrl ? (
            <button
              type="button"
              className="slot-chip"
              onClick={props.onDownloadContractSource}
              disabled={props.isDownloadingSource}
            >
              Скачать исходник
            </button>
          ) : null}
        </div>
      ) : (
        <div className="dashboard-project-contract-source-note">
          Загрузите PDF или TXT, чтобы нейросеть прочитала договор и заполнила даты, сумму и вехи.
        </div>
      )}
    </div>
  );
}
