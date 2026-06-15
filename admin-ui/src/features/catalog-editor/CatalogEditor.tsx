import { useCallback, useEffect, useRef, useState } from "react";

import {
  DEFAULT_CATALOG_TAB_META,
  isReadyCatalogTabId,
  type CatalogTabMeta,
  type ReadyCatalogTabId,
} from "./catalog-tab-meta";
import { FlooringCatalogTab } from "./FlooringCatalogTab";
import { PlumbingCatalogTab } from "./PlumbingCatalogTab";
import { useCatalogPersistedState } from "./useCatalogPersistedState";
import { WarmFloorCatalogTab } from "./WarmFloorCatalogTab";
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

function initialMountedTabs(activeTabId: string): Set<ReadyCatalogTabId> {
  const section = SECTION_TABS.find((tab) => tab.id === activeTabId) ?? SECTION_TABS[0];
  if (section.ready && isReadyCatalogTabId(section.id)) {
    return new Set([section.id]);
  }

  return new Set();
}

export function CatalogEditor() {
  const [activeTab, setActiveTab] = useCatalogPersistedState<string>("section-tab", "plumbing");
  const [mountedTabs, setMountedTabs] = useState<Set<ReadyCatalogTabId>>(() => initialMountedTabs(activeTab));
  const [tabMeta, setTabMeta] = useState<CatalogTabMeta>(DEFAULT_CATALOG_TAB_META);
  const tabMetaRef = useRef<Partial<Record<ReadyCatalogTabId, CatalogTabMeta>>>({});

  const activeSection = SECTION_TABS.find((tab) => tab.id === activeTab) ?? SECTION_TABS[0];
  const activeSectionId = activeSection.id;

  useEffect(() => {
    if (!activeSection.ready || !isReadyCatalogTabId(activeSectionId)) {
      return;
    }

    setMountedTabs((current) => {
      if (current.has(activeSectionId)) {
        return current;
      }

      return new Set([...current, activeSectionId]);
    });
  }, [activeSection.ready, activeSectionId]);

  useEffect(() => {
    if (!isReadyCatalogTabId(activeSectionId)) {
      setTabMeta(DEFAULT_CATALOG_TAB_META);
      return;
    }

    setTabMeta(tabMetaRef.current[activeSectionId] ?? DEFAULT_CATALOG_TAB_META);
  }, [activeSectionId]);

  const reportPlumbingMeta = useCallback((meta: CatalogTabMeta) => {
    tabMetaRef.current.plumbing = meta;
    if (activeSectionId === "plumbing") {
      setTabMeta(meta);
    }
  }, [activeSectionId]);

  const reportWarmFloorMeta = useCallback((meta: CatalogTabMeta) => {
    tabMetaRef.current["warm-floor"] = meta;
    if (activeSectionId === "warm-floor") {
      setTabMeta(meta);
    }
  }, [activeSectionId]);

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
          {tabMeta.loading
            ? "Загрузка из БД…"
            : tabMeta.saving
              ? "Сохранение…"
              : `Сохранено в БД${tabMeta.savedAt ? ` · ${tabMeta.savedAt}` : ""}`}
        </div>
      </header>

      {tabMeta.error ? (
        <div className="ce-note ce-note-warn" role="alert">
          <span className="ce-note-tag">Ошибка</span>
          {tabMeta.error}
        </div>
      ) : null}

      <nav className="ce-tabs" aria-label="Разделы каталога">
        {SECTION_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`ce-tab${tab.id === activeSectionId ? " is-active" : ""}${tab.ready ? "" : " is-stub"}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
            {!tab.ready && <span className="ce-tab-badge">в разработке</span>}
          </button>
        ))}
      </nav>

      <main className="ce-workspace">
        {mountedTabs.has("plumbing") ? (
          <div className={`ce-tab-pane${activeSectionId === "plumbing" ? " is-active" : ""}`}>
            <PlumbingCatalogTab isActive={activeSectionId === "plumbing"} onMetaChange={reportPlumbingMeta} />
          </div>
        ) : null}
        {mountedTabs.has("floors") ? (
          <div className={`ce-tab-pane${activeSectionId === "floors" ? " is-active" : ""}`}>
            <FlooringCatalogTab />
          </div>
        ) : null}
        {mountedTabs.has("warm-floor") ? (
          <div className={`ce-tab-pane${activeSectionId === "warm-floor" ? " is-active" : ""}`}>
            <WarmFloorCatalogTab isActive={activeSectionId === "warm-floor"} onMetaChange={reportWarmFloorMeta} />
          </div>
        ) : null}
        {!activeSection.ready ? (
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
