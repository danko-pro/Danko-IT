// UX6b: snapshot preview row без catalogId → POST в каталог → reload → id для beginEdit*.
// Без React и assembly save — покрывается unit-тестами.

import {
  snapshotCoveringRowToCreatePayload,
  snapshotLayoutRowToCreatePayload,
  snapshotPreparationRowToCreatePayload,
} from "./api/flooring-mappers";
import type {
  FlooringCoveringCreatePayload,
  FlooringCoveringDto,
  FlooringLayoutCreatePayload,
  FlooringLayoutDto,
  FlooringPreparationCreatePayload,
  FlooringPreparationDto,
  FlooringSnapshotDisplayRow,
} from "./api/flooring-types";
import { resolveCreatedCatalogRowId } from "./flooring-catalog-assembly-save";

export type PromotableSnapshotSection = "coverings" | "preparations" | "layouts";

export type PromoteSnapshotRowResult =
  | { action: "edit_existing"; catalogId: number; section: PromotableSnapshotSection; title: string }
  | { action: "created"; id: number; section: PromotableSnapshotSection; title: string }
  | { action: "error"; message: string };

export type PromoteSnapshotRowDeps = {
  createCovering: (payload: FlooringCoveringCreatePayload) => Promise<FlooringCoveringDto>;
  createPreparation: (payload: FlooringPreparationCreatePayload) => Promise<FlooringPreparationDto>;
  createLayout: (payload: FlooringLayoutCreatePayload) => Promise<FlooringLayoutDto>;
  reloadCatalog: () => Promise<{
    coverings: FlooringCoveringDto[];
    preparations: FlooringPreparationDto[];
    layouts: FlooringLayoutDto[];
  }>;
};

const UNSUPPORTED_SECTION_MESSAGE =
  "Создание в каталоге доступно только для покрытий, подготовок и укладок.";

const RESOLVE_ID_ERROR = "Не удалось определить id созданной строки каталога.";

function isPromotableSection(
  section: FlooringSnapshotDisplayRow["section"],
): section is PromotableSnapshotSection {
  return section === "coverings" || section === "preparations" || section === "layouts";
}

function catalogForSection(
  section: PromotableSnapshotSection,
  catalogs: Awaited<ReturnType<PromoteSnapshotRowDeps["reloadCatalog"]>>,
): { id: number; title: string }[] {
  if (section === "coverings") return catalogs.coverings;
  if (section === "preparations") return catalogs.preparations;
  return catalogs.layouts;
}

export async function promoteSnapshotRowToCatalog(
  row: FlooringSnapshotDisplayRow,
  deps: PromoteSnapshotRowDeps,
): Promise<PromoteSnapshotRowResult> {
  const title = row.title.trim();
  if (!title) {
    return { action: "error", message: "Укажите название строки." };
  }

  if (!isPromotableSection(row.section)) {
    return { action: "error", message: UNSUPPORTED_SECTION_MESSAGE };
  }

  const section = row.section;

  if (row.catalogId && row.catalogId > 0) {
    return { action: "edit_existing", catalogId: row.catalogId, section, title };
  }

  let created: { id?: number };
  try {
    if (section === "coverings") {
      created = await deps.createCovering(snapshotCoveringRowToCreatePayload(row));
    } else if (section === "preparations") {
      created = await deps.createPreparation(snapshotPreparationRowToCreatePayload(row));
    } else {
      created = await deps.createLayout(snapshotLayoutRowToCreatePayload(row));
    }
  } catch (cause) {
    const detail = cause instanceof Error ? cause.message : "неизвестная ошибка";
    return { action: "error", message: `Не удалось создать запись в каталоге: ${detail}` };
  }

  let freshCatalog: Awaited<ReturnType<PromoteSnapshotRowDeps["reloadCatalog"]>>;
  try {
    freshCatalog = await deps.reloadCatalog();
  } catch (cause) {
    const detail = cause instanceof Error ? cause.message : "неизвестная ошибка";
    return { action: "error", message: `Запись создана, но каталог не перезагрузился: ${detail}` };
  }

  const id = resolveCreatedCatalogRowId(created, title, catalogForSection(section, freshCatalog));
  if (id <= 0) {
    return { action: "error", message: RESOLVE_ID_ERROR };
  }

  return { action: "created", id, section, title };
}

export const FLOORING_SNAPSHOT_PROMOTE_STATUS: Record<PromotableSnapshotSection, (title: string) => string> = {
  coverings: (title) => `Покрытие «${title}» создано в БД. Можно редактировать.`,
  preparations: (title) => `Подготовка «${title}» создана в БД. Можно редактировать.`,
  layouts: (title) => `Укладка «${title}» создана в БД. Можно редактировать.`,
};
