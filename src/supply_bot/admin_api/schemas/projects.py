"""Схемы проекта, авансов, ledger и договора."""

from pydantic import BaseModel, Field


class ProjectCreatePayload(BaseModel):
    code: str | None = None
    name: str | None = None
    stage_label: str | None = None
    stage_tone: str | None = None
    estimate_project_id: int | None = None
    estimate_source: str | None = None
    area_m2: float = 0
    received_total: float = 0
    remaining_total: float = 0
    deferred_total: float = 0
    planned_total: float = 0
    actual_total: float = 0
    work_per_m2: float = 0
    materials_per_m2: float = 0
    planned_margin_percent: float = 0
    next_delivery_label: str | None = None


class ProjectUpdatePayload(BaseModel):
    code: str | None = None
    name: str | None = None
    stage_label: str | None = None
    stage_tone: str | None = None
    estimate_project_id: int | None = None
    estimate_source: str | None = None
    area_m2: float | None = None
    received_total: float | None = None
    remaining_total: float | None = None
    deferred_total: float | None = None
    planned_total: float | None = None
    actual_total: float | None = None
    work_per_m2: float | None = None
    materials_per_m2: float | None = None
    planned_margin_percent: float | None = None
    next_delivery_label: str | None = None


class ProjectAdvanceCreatePayload(BaseModel):
    title: str | None = None
    amount: float
    date: str
    status: str = "paid"


class ProjectLedgerCounterpartyPayload(BaseModel):
    inn: str | None = None
    legalName: str | None = None
    managerName: str | None = None
    email: str | None = None
    phone: str | None = None
    messenger: str | None = None


class ProjectLedgerEntryCreatePayload(BaseModel):
    category: str | None = None
    item: str | None = None
    owner: str | None = None
    counterparty: str | None = None
    counterparty_details: ProjectLedgerCounterpartyPayload | None = None
    status: str = "planned"
    plan_amount: float = 0
    actual_amount: float = 0
    control_date: str | None = None


class ProjectLedgerEntryUpdatePayload(BaseModel):
    category: str | None = None
    item: str | None = None
    owner: str | None = None
    counterparty: str | None = None
    counterparty_details: ProjectLedgerCounterpartyPayload | None = None
    status: str | None = None
    plan_amount: float | None = None
    actual_amount: float | None = None
    control_date: str | None = None


class ProjectLedgerDocumentUpdatePayload(BaseModel):
    title: str | None = None
    date: str | None = None
    amount: float | None = None
    extracted_by_ai: bool | None = None
    verified_by_user: bool | None = None


class ProjectContractMilestonePayload(BaseModel):
    kind: str = "deadline"
    title: str
    planned_date: str
    amount: float | None = None
    note: str | None = None
    status: str = "upcoming"
    sort_order: int | None = None


class ProjectContractUpdatePayload(BaseModel):
    file_name: str | None = None
    title: str | None = None
    number: str | None = None
    signed_at: str | None = None
    start_date: str | None = None
    planned_end_date: str | None = None
    amount: float = 0
    advance_terms: str | None = None
    extraction_status: str = "review"
    milestones: list[ProjectContractMilestonePayload] = Field(default_factory=list)


class ProjectContractMilestoneUpdatePayload(BaseModel):
    title: str | None = None
    planned_date: str | None = None
    amount: float | None = None
    note: str | None = None
    status: str | None = None
