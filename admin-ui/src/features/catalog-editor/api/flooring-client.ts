// Typed REST client для каталога полов (F5a): публичный snapshot + create endpoints.
// Паттерн auth/error — fetchJson с credentials (как warm-floor-client / calculator finishes).

import { fetchJson } from "../../../shared/utils";
import type {
  FlooringCoveringCreatePayload,
  FlooringCoveringDto,
  FlooringCoveringUpdatePayload,
  FlooringLayoutCreatePayload,
  FlooringLayoutDto,
  FlooringLayoutUpdatePayload,
  FlooringPreparationCreatePayload,
  FlooringPreparationDto,
  FlooringPreparationUpdatePayload,
  PublicFlooringSnapshotResponse,
} from "./flooring-types";

const FLOORING_API = "/api/calculator/flooring";
const PUBLIC_FLOORING_SNAPSHOT = "/api/public/catalog/flooring/snapshot";

export async function fetchFlooringSnapshot(): Promise<PublicFlooringSnapshotResponse> {
  return fetchJson<PublicFlooringSnapshotResponse>(PUBLIC_FLOORING_SNAPSHOT);
}

export async function listFlooringCoverings(): Promise<FlooringCoveringDto[]> {
  return fetchJson<FlooringCoveringDto[]>(`${FLOORING_API}/coverings`);
}

export async function listFlooringPreparations(): Promise<FlooringPreparationDto[]> {
  return fetchJson<FlooringPreparationDto[]>(`${FLOORING_API}/preparations`);
}

export async function listFlooringLayouts(): Promise<FlooringLayoutDto[]> {
  return fetchJson<FlooringLayoutDto[]>(`${FLOORING_API}/layouts`);
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

export async function updateFlooringCovering(
  id: number,
  payload: FlooringCoveringUpdatePayload,
): Promise<FlooringCoveringDto> {
  return fetchJson<FlooringCoveringDto>(`${FLOORING_API}/coverings/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function updateFlooringPreparation(
  id: number,
  payload: FlooringPreparationUpdatePayload,
): Promise<FlooringPreparationDto> {
  return fetchJson<FlooringPreparationDto>(`${FLOORING_API}/preparations/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function updateFlooringLayout(
  id: number,
  payload: FlooringLayoutUpdatePayload,
): Promise<FlooringLayoutDto> {
  return fetchJson<FlooringLayoutDto>(`${FLOORING_API}/layouts/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}
