import { usePlumbingCatalog } from "./api/client";
import { useWarmFloorCatalog } from "./api/warm-floor-client";
import { FlooringCatalogPanel } from "./FlooringCatalogPanel";
import { PlumbingCatalogPanel } from "./PlumbingCatalogPanel";
import { useCatalogPersistedState } from "./useCatalogPersistedState";
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
  const [activeTab, setActiveTab] = useCatalogPersistedState<string>("section-tab", "plumbing");

  const activeSection = SECTION_TABS.find((tab) => tab.id === activeTab) ?? SECTION_TABS[0];
  const activeSectionId = activeSection.id;
  const activeLoading =
    activeSectionId === "warm-floor" ? warmFloorCatalog.loading : activeSectionId === "plumbing" ? plumbingCatalog.loading : false;
  const activeSaving =
    activeSectionId === "warm-floor" ? warmFloorCatalog.saving : activeSectionId === "plumbing" ? plumbingCatalog.saving : false;
  const activeSavedAt =
    activeSectionId === "warm-floor" ? warmFloorCatalog.savedAt : activeSectionId === "plumbing" ? plumbingCatalog.savedAt : null;
  const activeError =
    activeSectionId === "warm-floor" ? warmFloorCatalog.error : activeSectionId === "plumbing" ? plumbingCatalog.error : null;

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
            className={`ce-tab${tab.id === activeSectionId ? " is-active" : ""}${tab.ready ? "" : " is-stub"}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
            {!tab.ready && <span className="ce-tab-badge">в разработке</span>}
          </button>
        ))}
      </nav>

      <main className="ce-workspace">
        <section hidden={activeSectionId !== "plumbing"}>
          <PlumbingCatalogPanel catalog={plumbingCatalog} />
        </section>
        <section hidden={activeSectionId !== "floors"}>
          <FlooringCatalogPanel />
        </section>
        <section hidden={activeSectionId !== "warm-floor"}>
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
