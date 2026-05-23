import { type ChangeEvent, type FormEvent, useState } from "react";

import { initialLeadForm } from "../public-content";

export function useLeadFormDraft() {
  const [leadForm, setLeadForm] = useState(initialLeadForm);
  const [leadFormStatus, setLeadFormStatus] = useState("");

  const handleLeadFormChange = (
    event: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = event.target;

    setLeadForm((currentForm) => ({
      ...currentForm,
      [name]: value,
    }));

    if (leadFormStatus) {
      setLeadFormStatus("");
    }
  };

  const handleLeadFormSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLeadFormStatus("Заявка подготовлена. На следующем этапе подключим отправку в Telegram-бот.");
  };

  return {
    leadForm,
    leadFormStatus,
    handleLeadFormChange,
    handleLeadFormSubmit,
  };
}
