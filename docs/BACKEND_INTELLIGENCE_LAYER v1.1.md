# Backend Intelligence Layer v1.1

## Purpose

Backend intelligence layer is the controlled entry point for non-text and AI-assisted input:

- Telegram voice messages;
- Telegram photos and document scans;
- uploaded contracts;
- uploaded invoices and closing acts;
- future project documents that must be classified, read, and mapped to project entities.

The key rule: AI may prepare structured data, but it must not silently mutate project state without a domain use case and a review boundary.

## Current State

Already implemented:

- group text dialogue through `RequestDialogueService`;
- group voice/audio transcription through `TelegramMediaIntakeService`;
- project contract file upload and download;
- contract text extraction from PDF and text files;
- OCR text extraction for image documents through OpenAI vision when configured;
- AI extraction of structured contract fields;
- ledger document upload for invoice and act files;
- AI extraction endpoint for ledger invoice and act metadata;
- shared LLM provider facade in `supply_bot.services.llm_client`;
- shared project document text reader for PDF, text, and image documents.

Current limitation:

- Telegram photo-to-project linking is not automatic yet because the backend needs a project matching/review flow;
- handwriting quality depends on the configured vision model;
- extracted ledger and contract data still requires user review before it is treated as verified.

## Target Layers

### 1. Transport Layer

Location:

- `supply_bot.handlers` for Telegram;
- `supply_bot.admin_api.project_routes` for HTTP/admin uploads.

Responsibility:

- accept message or file;
- validate sender/session;
- save or pass the raw input;
- call a service/use case;
- return a short result.

Transport must not call external AI APIs directly.

### 2. Media Intake Layer

Future location:

- `supply_bot.services.media_intake` for Telegram-facing intake;
- `supply_bot.projects.access` for project document file reading.

Responsibility:

- normalize voice, audio, photo, PDF, and text documents into a common intake result;
- keep source metadata: file name, MIME type, Telegram file id, project id, ledger entry id;
- mark result as `text`, `needs_ocr`, `needs_transcription`, `unsupported`, or `failed`;
- never decide business meaning by itself.

### 3. AI Provider Facade

Current location:

- `supply_bot.services.llm_client.LlmProviderClient`.

Responsibility:

- centralize OpenAI, Mistral, and OpenRouter chat calls;
- keep provider fallback order in one place;
- keep model, timeout, token, and JSON-response rules in one place;
- become the future extension point for transcription and vision/OCR calls.

No route, handler, project use case, or dialogue service should duplicate provider HTTP calls.

### 4. Text Extraction Layer

Current location:

- `supply_bot.projects.access.contract_extraction_support`.

Responsibility:

- extract text from supported text-like project documents;
- extract text from readable PDFs;
- reject images clearly until OCR is configured;
- reject unknown binary files instead of sending garbage to LLM.

Current extension:

- image OCR is routed through `LlmProviderClient.extract_text_from_image_bytes`;
- routes use `read_project_document_text` instead of talking to OCR directly.

### 5. Classification Layer

Future responsibility:

- classify extracted text or media result into business intent:
  - material request;
  - project contract;
  - invoice;
  - closing act;
  - payment confirmation;
  - project note;
  - unknown.

Classifier output must include confidence and reason. Low confidence goes to review, not to automatic mutation.

### 6. Domain Extraction Layer

Current example:

- `ProjectContractExtractor` maps contract text to contract fields and milestones.

Implemented extractors:

- `ProjectContractExtractor`;
- `ProjectLedgerDocumentExtractor` for invoice and act metadata.

Future extractors:

- `TelegramRequestVoiceExtractor`.

Responsibility:

- convert text into strict domain payloads;
- normalize dates, amounts, titles, and statuses;
- return only validated candidate data.

### 7. Review Boundary

Required before production-grade automation:

- extracted contract/invoice/act data must be visible as a draft;
- admin confirms or edits before applying;
- original file remains linked;
- confidence and extraction notes remain visible.

This prevents AI from quietly corrupting finance or project records.

## Main Flows

### Telegram Voice To Material Request

1. Telegram handler receives voice/audio.
2. Media intake downloads it with size limits.
3. OpenAI transcription adapter transcribes it when configured.
4. Transcript is sent into the same dialogue flow as a text message.
5. Dialogue service builds or updates request draft.
6. User confirms request.

### Telegram Photo To Project Document

1. Telegram handler receives photo/document.
2. Media intake stores metadata and raw file.
3. OCR/vision adapter extracts text when configured.
4. Classifier decides whether it is contract, invoice, act, or unknown.
5. If related project is known, a project document draft is created.
6. Admin reviews and applies.

### Admin Contract Upload

1. Admin uploads contract file.
2. Backend stores raw file with size limits.
3. Text extraction reads PDF/text or routes images through OCR.
4. Contract extractor produces structured fields.
5. Admin reviews contract fields and milestones.
6. Project contract is updated.

### Admin Invoice Or Act Upload

1. Admin uploads invoice/act to ledger entry.
2. Backend stores raw file.
3. Text extraction reads PDF/text or routes images through OCR.
4. Ledger extractor proposes title, date, amount, counterparty, status.
5. Admin reviews before applying.

## Safety Rules

- Raw uploaded files are never trusted.
- Storage paths stay inside `PROJECT_DOCUMENTS_DIR`.
- Upload size is limited by `PROJECT_DOCUMENT_MAX_UPLOAD_BYTES`.
- OCR/transcription must have timeout and file size limits.
- AI output is always treated as untrusted input.
- AI output must pass domain validation before storage.
- Low confidence results must go to review.
- Routes and Telegram handlers must not call AI providers directly.

## Stop Line For v1

The backend is ready for the next intelligence step when:

- all text, transcription, and image OCR provider calls go through `LlmProviderClient`;
- text extraction does not misread binary/image files;
- Telegram voice handlers use media intake, not inline logic;
- contract, invoice, and act extraction are separate domain extractors;
- admin UI can show extracted ledger and contract data as reviewable, unverified data before final confirmation.
