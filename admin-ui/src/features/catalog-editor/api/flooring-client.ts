// Typed REST client для каталога полов (F5a): публичный snapshot + create endpoints.
// Паттерн auth/error — fetchJson с credentials (как warm-floor-client / calculator finishes).

import { fetchJson } from "../../../shared/utils";
import type {
  FlooringCoveringCreatePayload,
  FlooringCoveringDto,
  FlooringLayoutCreatePayload,
  FlooringLayoutDto,
  FlooringPreparationCreatePayload,
  FlooringPreparationDto,
  PublicFlooringSnapshotResponse,
} from "./flooring-types";

const FLOORING_API = "/api/calculator/flooring";
const PUBLIC_FLOORING_SNAPSHOT = "/api/public/catalog/flooring/snapshot";

export async function fetchFlooringSnapshot(): Promise<PublicFlooringSnapshotResponse> {
  return fetchJson<PublicFlooringSnapshotResponse>(PUBLIC_FLOORING_SNAPSHOT);
}

export async function createFlooringCovering(
  payload: FlooringCoveringCreatePayload,
): Promise<FlooringCoveringDto> {
  return fetchJson<FlooringCoveringDto>(`${FLOORING_API}/coverings`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function createFlooringPreparation(
  payload: FlooringPreparationCreatePayload,
): Promise<FlooringPreparationDto> {
  return fetchJson<FlooringPreparationDto>(`${FLOORING_API}/preparations`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function createFlooringLayout(payload: FlooringLayoutCreatePayload): Promise<FlooringLayoutDto> {
  return fetchJson<FlooringLayoutDto>(`${FLOORING_API}/layouts`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
