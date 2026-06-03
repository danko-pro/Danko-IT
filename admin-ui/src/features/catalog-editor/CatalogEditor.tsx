import { useState } from "react";

import { usePlumbingCatalog } from "./api/client";
import { useWarmFloorCatalog } from "./api/warm-floor-client";
import { FlooringCatalogPanel } from "./FlooringCatalogPanel";
import { PlumbingCatalogPanel } from "./PlumbingCatalogPanel";
import { WarmFloorCatalogPanel } from "./WarmFloorCatalogPanel";
import "./styles/catalog-editor.css";

type SectionTab = {
  id: string;
  label: string;
  ready: boolean;
};

const SECTION_TABS: SectionTab[] = [
  { id: "plumbing", label: "Сантехника", ready: true },
  { id: "floors", label: "Полы", ready: true },
  { id: "walls", label: "Стены", ready: false },
  { id: "ceilings", label: "Потолки", ready: false },
  { id: "electrics", label: "Электрика", ready: false },
  { id: "warm-floor", label: "Тёплый пол", ready: true },
  { id: "doors", label: "Двери", ready: false },
  { id: "completion", label: "Комплектация", ready: false },
  { id: "appliances", label: "Техника", ready: false },
  { id: "furniture", label: "Мебель", ready: false },
  { id: "cleaning", label: "Уборка", ready: false },
];


export function CatalogEditor() {
  const plumbingCatalog = usePlumbingCatalog();
  const warmFloorCatalog = useWarmFloorCatalog();
  const [activeTab, setActiveTab] = useState<string>("plumbing");

  const activeSection = SECTION_TABS.find((tab) => tab.id === activeTab);
  const activeLoading =
    activeTab === "warm-floor" ? warmFloorCatalog.loading : activeTab === "plumbing" ? plumbingCatalog.loading : false;
  const activeSaving =
    activeTab === "warm-floor" ? warmFloorCatalog.saving : activeTab === "plumbing" ? plumbingCatalog.saving : false;
  const activeSavedAt =
    activeTab === "warm-floor" ? warmFloorCatalog.savedAt : activeTab === "plumbing" ? plumbingCatalog.savedAt : null;
  const activeError =
    activeTab === "warm-floor" ? warmFloorCatalog.error : activeTab === "plumbing" ? plumbingCatalog.error : null;

  return (
    <div className="catalog-editor">
      <header className="ce-header">
        <div className="ce-header-text">
          <span className="ce-kicker">Danko BuildTech · внутренний инструмент</span>
          <h1>Редактор каталога расценок</h1>
          <p>
            Каталог сантехники хранится в базе данных и редактируется через REST API
            (<code>/api/calculator/plumbing/*</code>) за авторизацией. Изменения сохраняются
            автоматически по сети.
          </p>
        </div>
        <div className="ce-save-status">
          <span className="ce-dot" aria-hidden="true" />
          {activeLoading
            ? "Загрузка из БД…"
            : activeSaving
              ? "Сохранение…"
              : `Сохранено в БД${activeSavedAt ? ` · ${activeSavedAt}` : ""}`}
        </div>
      </header>

      {activeError ? (
        <div className="ce-note ce-note-warn" role="alert">
          <span className="ce-note-tag">Ошибка</span>
          {activeError}
        </div>
      ) : null}

      <nav className="ce-tabs" aria-label="Разделы каталога">
        {SECTION_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`ce-tab${tab.id === activeTab ? " is-active" : ""}${tab.ready ? "" : " is-stub"}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
            {!tab.ready && <span className="ce-tab-badge">в разработке</span>}
          </button>
        ))}
      </nav>

      <main className="ce-workspace">
        <section hidden={activeSection?.id !== "plumbing"}>
          <PlumbingCatalogPanel catalog={plumbingCatalog} />
        </section>
        <section hidden={activeSection?.id !== "floors"}>
          <FlooringCatalogPanel />
        </section>
        <section hidden={activeSection?.id !== "warm-floor"}>
          <WarmFloorCatalogPanel controller={warmFloorCatalog} />
        </section>
        {activeSection && !activeSection.ready ? (
          <div className="ce-stub-panel">
            <h2>{activeSection.label}</h2>
            <p>Раздел в разработке. Сейчас наполняется только вкладка «Сантехника».</p>
          </div>
        ) : null}
      </main>
    </div>
  );
}

export default CatalogEditor;
