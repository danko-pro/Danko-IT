import type { ReactNode } from "react";

import type { CalculatorStage } from "../model/types";

type CalculatorStageOption = {
  stage: CalculatorStage;
  label: string;
  icon: ReactNode;
};

export const CALCULATOR_STAGE_OPTIONS: CalculatorStageOption[] = [
  {
    stage: "project",
    label: "Объект",
    icon: (
      <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current" strokeWidth="1.8">
        <path d="m4.5 11.25 7.5-6 7.5 6" />
        <path d="M6.5 10.75V18.5h11V10.75" />
        <path d="M10 18.5v-4.75h4V18.5" />
      </svg>
    ),
  },
  {
    stage: "rooms",
    label: "Помещения",
    icon: (
      <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current" strokeWidth="1.8">
        <rect x="4.5" y="5.5" width="15" height="13" rx="2.5" />
        <path d="M12 5.5v13" />
        <path d="M4.5 12h15" />
      </svg>
    ),
  },
  {
    stage: "warmfloor",
    label: "Тёплый пол",
    icon: (
      <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current" strokeWidth="1.8">
        <path d="M6 8.5c1.2 0 1.2 2 2.4 2s1.2-2 2.4-2 1.2 2 2.4 2 1.2-2 2.4-2" />
        <path d="M6 13.5c1.2 0 1.2 2 2.4 2s1.2-2 2.4-2 1.2 2 2.4 2 1.2-2 2.4-2" />
      </svg>
    ),
  },
  {
    stage: "flooring",
    label: "Напольные покрытия",
    icon: (
      <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current" strokeWidth="1.8">
        <path d="M5 7.5h14" />
        <path d="M5 12h14" />
        <path d="M5 16.5h14" />
        <path d="M8.5 5v14" />
        <path d="M15.5 5v14" />
      </svg>
    ),
  },
  {
    stage: "wallfinish",
    label: "Отделка стен",
    icon: (
      <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current" strokeWidth="1.8">
        <rect x="5.5" y="5.5" width="13" height="13" rx="2.5" />
        <path d="M9 5.5v13" />
        <path d="M15 5.5v13" />
      </svg>
    ),
  },
  {
    stage: "ceilings",
    label: "Потолки",
    icon: (
      <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current" strokeWidth="1.8">
        <path d="M5 6.5h14" />
        <path d="M7 10h10" />
        <path d="M8.5 13.5h7" />
        <path d="M10 17h4" />
      </svg>
    ),
  },
  {
    stage: "doors",
    label: "Двери",
    icon: (
      <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current" strokeWidth="1.8">
        <path d="M7.5 4.5h8a1 1 0 0 1 1 1v13h-10v-13a1 1 0 0 1 1-1Z" />
        <path d="M12 4.5v14" />
        <circle cx="10.2" cy="11.8" r="0.65" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
];

export const LIFT_OPTIONS = [
  { value: "", label: "Не выбрано" },
  { value: "none", label: "Нет лифта" },
  { value: "passenger", label: "Пассажирский" },
  { value: "cargo", label: "Грузовой" },
  { value: "mixed", label: "Пассажирский и грузовой" },
];
