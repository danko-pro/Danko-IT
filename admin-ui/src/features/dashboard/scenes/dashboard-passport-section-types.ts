import type { Dispatch, SetStateAction } from "react";

import type { PassportDraft } from "./dashboard-passport-draft";

export type PassportSectionProps = {
  draft: PassportDraft;
  setDraft: Dispatch<SetStateAction<PassportDraft>>;
};

export type MetricInputMode = "decimal" | "integer";
