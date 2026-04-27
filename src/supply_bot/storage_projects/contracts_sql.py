PROJECT_CONTRACT_SELECT_SQL = """
SELECT
    id,
    project_id,
    file_name,
    title,
    number,
    signed_at,
    start_date,
    planned_end_date,
    amount,
    advance_terms,
    extraction_status,
    source_file_name,
    source_mime_type,
    source_storage_key,
    uploaded_at,
    created_at,
    updated_at
FROM project_contracts
"""

PROJECT_CONTRACT_MILESTONE_SELECT_SQL = """
SELECT
    id,
    contract_id,
    kind,
    title,
    planned_date,
    amount,
    note,
    status,
    sort_order,
    created_at,
    updated_at
FROM project_contract_milestones
"""
