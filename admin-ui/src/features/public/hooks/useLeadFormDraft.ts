import { type ChangeEvent, type FormEvent, useState } from "react";

import { initialLeadForm } from "../public-content";

const PUBLIC_LEADS_ENDPOINT = "/api/public/leads";
const PUBLIC_LEAD_SUCCESS_MESSAGE =
  "Заявка отправлена. На следующем этапе подключим уведомление менеджеру в Telegram.";
const PUBLIC_LEAD_ERROR_MESSAGE = "Не удалось отправить заявку. Попробуйте ещё раз или напишите нам напрямую.";

function resolvePublicLeadEndpoint(): string {
  const rawApiBase = import.meta.env.VITE_API_BASE_URL?.trim();
  if (!rawApiBase) {
    if (
      typeof window !== "undefined" &&
      (window.location.hostname === "127.0.0.1" || window.location.hostname === "localhost")
    ) {
      return `http://127.0.0.1:8000${PUBLIC_LEADS_ENDPOINT}`;
    }

    return PUBLIC_LEADS_ENDPOINT;
  }

  return `${rawApiBase.replace(/\/+$/, "")}${PUBLIC_LEADS_ENDPOINT}`;
}

export function useLeadFormDraft() {
  const [leadForm, setLeadForm] = useState(initialLeadForm);
  const [leadFormStatus, setLeadFormStatus] = useState("");
  const [isLeadFormSubmitting, setIsLeadFormSubmitting] = useState(false);

  const handleLeadFormChange = (
    event: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) => {
    const target = event.target;
    const { name } = target;

    setLeadForm((currentForm) => ({
      ...currentForm,
      [name]:
        target instanceof HTMLInputElement && target.type === "checkbox"
          ? target.checked
          : target.value,
    }));

    if (leadFormStatus) {
      setLeadFormStatus("");
    }
  };

  const handleLeadFormSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (isLeadFormSubmitting) {
      return;
    }

    setIsLeadFormSubmitting(true);
    setLeadFormStatus("");

    try {
      const response = await fetch(resolvePublicLeadEndpoint(), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(leadForm),
      });
      const payload = (await response.json().catch(() => null)) as { ok?: boolean } | null;

      if (!response.ok || payload?.ok !== true) {
        throw new Error("Public lead endpoint rejected the request.");
      }

      setLeadFormStatus(PUBLIC_LEAD_SUCCESS_MESSAGE);
    } catch {
      setLeadFormStatus(PUBLIC_LEAD_ERROR_MESSAGE);
    } finally {
      setIsLeadFormSubmitting(false);
    }
  };

  return {
    leadForm,
    leadFormStatus,
    isLeadFormSubmitting,
    handleLeadFormChange,
    handleLeadFormSubmit,
  };
}
