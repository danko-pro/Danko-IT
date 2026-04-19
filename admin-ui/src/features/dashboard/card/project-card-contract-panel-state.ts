/**
 * Локальный state и handlers для contract-панели.
 * Здесь живут draft, upload/download, edit/delete flow и временное состояние sync-баннера.
 */
import { type ChangeEvent, useEffect, useRef, useState } from "react";
import { downloadFile } from "../../../shared/utils";
import { getContractSummary, getContractTimelineMilestones } from "./project-card-contract-timeline";
import {
  buildDraft,
  buildUpdatedContract,
  getContractExtractionChipState,
  hasContractContent,
  type ContractSyncDisplayMode,
} from "./project-card-contract-state-helpers";
import type { ContractDraft, ProjectCardContractPanelProps } from "./project-card-contract-types";

const EMPTY_SYNC_MODE: ContractSyncDisplayMode = "hidden";

// Hook координирует локальное поведение панели, но не рендерит JSX.
export function useProjectCardContractPanelState(props: ProjectCardContractPanelProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDownloadingSource, setIsDownloadingSource] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [draft, setDraft] = useState<ContractDraft>(() => buildDraft(props.contract));
  const [syncDisplayMode, setSyncDisplayMode] = useState<ContractSyncDisplayMode>(EMPTY_SYNC_MODE);
  const uploadInputRef = useRef<HTMLInputElement | null>(null);

  const contractSummary = getContractSummary(props.contract, props.advances);
  const timelineMilestones = getContractTimelineMilestones(props.contract, props.advances);
  const extractionChip = getContractExtractionChipState(props.contract);
  const hasUploadedSource = Boolean(props.contract.sourceFile);
  const hasSavedContract = hasContractContent(props.contract);
  const isBusy = props.syncState.uploading || props.syncState.extracting || isSubmitting || isDeleting;

  useEffect(() => {
    if (!isEditing) {
      setDraft(buildDraft(props.contract));
      setIsDeleteConfirmOpen(false);
    }
  }, [props.contract, isEditing]);

  useEffect(() => {
    if (!props.syncState.message) {
      setSyncDisplayMode(EMPTY_SYNC_MODE);
      return;
    }

    if (props.syncState.uploading || props.syncState.extracting || props.syncState.tone === "error") {
      setSyncDisplayMode("full");
      return;
    }

    setSyncDisplayMode("full");
    const compactTimer = window.setTimeout(() => setSyncDisplayMode("compact"), 1800);
    const hideTimer = window.setTimeout(() => setSyncDisplayMode(EMPTY_SYNC_MODE), 4200);

    return () => {
      window.clearTimeout(compactTimer);
      window.clearTimeout(hideTimer);
    };
  }, [props.syncState.extracting, props.syncState.message, props.syncState.tone, props.syncState.uploading]);

  function toggleExpanded() {
    setIsExpanded((current) => !current);
  }

  function expandPanel() {
    setIsExpanded(true);
  }

  function toggleEditing() {
    setIsEditing((current) => !current);
  }

  function openDeleteConfirm() {
    setIsDeleteConfirmOpen(true);
  }

  function closeDeleteConfirm() {
    setIsDeleteConfirmOpen(false);
  }

  function handleUploadChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    props.onUploadContract(file);
    event.currentTarget.value = "";
  }

  function updateDraft(key: keyof ContractDraft, value: string) {
    setDraft((current) => ({
      ...current,
      [key]: value,
    }));
  }

  async function handleSave() {
    setIsSubmitting(true);
    try {
      await props.onUpdateContract(buildUpdatedContract(props.contract, draft));
      setIsEditing(false);
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleCancelEditing() {
    setDraft(buildDraft(props.contract));
    setIsDeleteConfirmOpen(false);
    setIsEditing(false);
  }

  async function handleDeleteContract() {
    setIsDeleting(true);
    try {
      await props.onDeleteContract();
      setIsDeleteConfirmOpen(false);
      setIsEditing(false);
    } finally {
      setIsDeleting(false);
    }
  }

  async function handleDownloadContractSource() {
    if (!props.contract.downloadUrl) {
      return;
    }

    setIsDownloadingSource(true);
    try {
      await downloadFile(
        props.contract.downloadUrl,
        props.contract.sourceFile?.fileName || props.contract.fileName || "contract",
      );
    } finally {
      setIsDownloadingSource(false);
    }
  }

  return {
    contractSummary,
    draft,
    extractionChipClass: extractionChip.className,
    extractionChipLabel: extractionChip.label,
    hasSavedContract,
    hasUploadedSource,
    isBusy,
    isDeleteConfirmOpen,
    isDeleting,
    isDownloadingSource,
    isEditing,
    isExpanded,
    isSubmitting,
    syncDisplayMode,
    timelineMilestones,
    uploadInputRef,
    closeDeleteConfirm,
    expandPanel,
    handleCancelEditing,
    handleDeleteContract,
    handleDownloadContractSource,
    handleSave,
    handleUploadChange,
    openDeleteConfirm,
    toggleEditing,
    toggleExpanded,
    updateDraft,
  };
}
