import { useEffect, useMemo, useRef, useState } from "react";
import {
  CATALOG_CATEGORIES,
  CATALOG_GROUPS,
  CATALOG_SOURCES,
  CATALOG_UNITS,
  PLUMBING_SEED,
  type CatalogCategory,
  type CatalogGroup,
  type CatalogItem,
  type CatalogSource,
  type CatalogUnit,
} from "./plumbing-seed";
import { CATALOG_EDITOR_STYLES } from "./styles";

const STORAGE_KEY = "danko-catalog-plumbing";

const CATEGORY_LABELS: Record<CatalogCategory, string> = {
  works: "Работа",
  materials: "Материал",
  equipment: "Оборудование",
  consumables: "Расходники",
};

type SectionTab = {
  id: string;
  label: string;
  ready: boolean;
};

const SECTION_TABS: SectionTab[] = [
  { id: "plumbing", label: "Сантехника", ready: true },
  { id: "floors", label: "Полы", ready: false },
  { id: "walls", label: "Стены", ready: false },
  { id: "ceilings", label: "Потолки", ready: false },
  { id: "electrics", label: "Электрика", ready: false },
  { id: "warm-floor", label: "Тёплый пол", ready: false },
  { id: "doors", label: "Двери", ready: false },
  { id: "completion", label: "Комплектация", ready: false },
  { id: "appliances", label: "Техника", ready: false },
  { id: "furniture", label: "Мебель", ready: false },
  { id: "cleaning", label: "Уборка", ready: false },
];

function cloneSeed(): CatalogItem[] {
  return PLUMBING_SEED.map((item) => ({ ...item }));
}

function isCatalogItem(value: unknown): value is CatalogItem {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.id === "string" &&
    typeof candidate.publicTitle === "string" &&
    typeof candidate.works === "number" &&
    typeof candidate.materials === "number" &&
    typeof candidate.equipment === "number" &&
    typeof candidate.consumables === "number"
  );
}

function normalizeItem(raw: CatalogItem): CatalogItem {
  return {
    id: raw.id,
    publicTitle: raw.publicTitle ?? "",
    technicalTitle: raw.technicalTitle ?? "",
    category: CATALOG_CATEGORIES.includes(raw.category) ? raw.category : "materials",
    unit: CATALOG_UNITS.includes(raw.unit) ? raw.unit : "шт",
    works: Number.isFinite(raw.works) ? raw.works : 0,
    materials: Number.isFinite(raw.materials) ? raw.materials : 0,
    equipment: Number.isFinite(raw.equipment) ? raw.equipment : 0,
    consumables: Number.isFinite(raw.consumables) ? raw.consumables : 0,
    coefficient: Number.isFinite(raw.coefficient) && raw.coefficient > 0 ? raw.coefficient : 1,
    group: CATALOG_GROUPS.includes(raw.group) ? raw.group : "Доп.",
    source: CATALOG_SOURCES.includes(raw.source) ? raw.source : "вручную",
  };
}

function loadFromStorage(): CatalogItem[] {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) return cloneSeed();
    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) return cloneSeed();
    const items = parsed.filter(isCatalogItem).map(normalizeItem);
    return items.length > 0 ? items : cloneSeed();
  } catch {
    return cloneSeed();
  }
}

function baseSum(item: CatalogItem): number {
  return item.works + item.materials + item.equipment + item.consumables;
}

function totalWithCoefficient(item: CatalogItem): number {
  return Math.round(baseSum(item) * item.coefficient);
}

function formatMoney(value: number): string {
  return value.toLocaleString("ru-RU");
}

function makeNewId(existing: CatalogItem[]): string {
  let counter = existing.length + 1;
  const ids = new Set(existing.map((item) => item.id));
  let candidate = `new-item-${counter}`;
  while (ids.has(candidate)) {
    counter += 1;
    candidate = `new-item-${counter}`;
  }
  return candidate;
}

export function CatalogEditor() {
  const [items, setItems] = useState<CatalogItem[]>(() => loadFromStorage());
  const [activeTab, setActiveTab] = useState<string>("plumbing");
  const [search, setSearch] = useState("");
  const [groupFilter, setGroupFilter] = useState<"all" | CatalogGroup>("all");
  const [savedAt, setSavedAt] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const firstRender = useRef(true);

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
    }
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
      const now = new Date();
      setSavedAt(now.toLocaleTimeString("ru-RU"));
    } catch {
      setSavedAt("ошибка сохранения");
    }
  }, [items]);

  const filteredItems = useMemo(() => {
    const query = search.trim().toLowerCase();
    return items.filter((item) => {
      if (groupFilter !== "all" && item.group !== groupFilter) return false;
      if (!query) return true;
      return (
        item.publicTitle.toLowerCase().includes(query) ||
        item.technicalTitle.toLowerCase().includes(query) ||
        item.id.toLowerCase().includes(query)
      );
    });
  }, [items, search, groupFilter]);

  const totals = useMemo(() => {
    const base = filteredItems.reduce((sum, item) => sum + baseSum(item), 0);
    const withCoef = filteredItems.reduce((sum, item) => sum + totalWithCoefficient(item), 0);
    return { base, withCoef };
  }, [filteredItems]);

  function updateItem(id: string, patch: Partial<CatalogItem>) {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }

  function updateNumber(id: string, field: keyof CatalogItem, value: string) {
    const parsed = value === "" ? 0 : Number(value.replace(",", "."));
    if (!Number.isFinite(parsed)) return;
    updateItem(id, { [field]: parsed } as Partial<CatalogItem>);
  }

  function addItem() {
    setItems((prev) => {
      const newItem: CatalogItem = {
        id: makeNewId(prev),
        publicTitle: "Новая позиция",
        technicalTitle: "",
        category: "materials",
        unit: "шт",
        works: 0,
        materials: 0,
        equipment: 0,
        consumables: 0,
        coefficient: 1,
        group: groupFilter === "all" ? "Доп." : groupFilter,
        source: "вручную",
      };
      return [newItem, ...prev];
    });
  }

  function removeItem(id: string) {
    setItems((prev) => prev.filter((item) => item.id !== id));
  }

  function resetToSeed() {
    const ok = window.confirm("Сбросить каталог к «Сан v1»? Все локальные изменения будут потеряны.");
    if (ok) setItems(cloneSeed());
  }

  function exportJson() {
    const blob = new Blob([JSON.stringify(items, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const stamp = new Date().toISOString().slice(0, 10);
    link.href = url;
    link.download = `danko-catalog-plumbing-${stamp}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  function importJson(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        if (!Array.isArray(parsed)) {
          window.alert("Неверный формат: ожидается массив позиций.");
          return;
        }
        const imported = parsed.filter(isCatalogItem).map(normalizeItem);
        if (imported.length === 0) {
          window.alert("В файле не найдено корректных позиций.");
          return;
        }
        setItems(imported);
      } catch {
        window.alert("Не удалось разобрать JSON-файл.");
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    };
    reader.readAsText(file);
  }

  const activeSection = SECTION_TABS.find((tab) => tab.id === activeTab);

  return (
    <div className="catalog-editor">
      <style>{CATALOG_EDITOR_STYLES}</style>

      <header className="ce-header">
        <div className="ce-header-text">
          <span className="ce-kicker">Danko BuildTech · внутренний инструмент</span>
          <h1>Редактор каталога расценок</h1>
          <p>
            Локальная рабочая копия. Данные хранятся только в этом браузере (localStorage), на сервер
            ничего не отправляется. Не публичная страница.
          </p>
        </div>
        <div className="ce-save-status">
          <span className="ce-dot" aria-hidden="true" />
          Автосохранение{savedAt ? ` · ${savedAt}` : ""}
        </div>
      </header>

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

      {activeSection && !activeSection.ready ? (
        <div className="ce-stub-panel">
          <h2>{activeSection.label}</h2>
          <p>Раздел в разработке. Сейчас наполняется только вкладка «Сантехника».</p>
        </div>
      ) : (
        <>
          <div className="ce-toolbar">
            <div className="ce-toolbar-group">
              <input
                type="search"
                className="ce-input ce-search"
                placeholder="Поиск по названию, id, комментарию…"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
              <select
                className="ce-input"
                value={groupFilter}
                onChange={(event) => setGroupFilter(event.target.value as "all" | CatalogGroup)}
              >
                <option value="all">Все группы</option>
                {CATALOG_GROUPS.map((group) => (
                  <option key={group} value={group}>
                    {group}
                  </option>
                ))}
              </select>
            </div>
            <div className="ce-toolbar-group">
              <button type="button" className="ce-btn ce-btn-primary" onClick={addItem}>
                + Добавить позицию
              </button>
              <button type="button" className="ce-btn" onClick={exportJson}>
                Экспорт JSON
              </button>
              <button type="button" className="ce-btn" onClick={() => fileInputRef.current?.click()}>
                Импорт JSON
              </button>
              <button type="button" className="ce-btn ce-btn-danger" onClick={resetToSeed}>
                Сбросить к Сан v1
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="application/json,.json"
                className="ce-file-hidden"
                onChange={importJson}
              />
            </div>
          </div>

          <div className="ce-meta">
            Показано: <strong>{filteredItems.length}</strong> из {items.length} позиций · База:{" "}
            <strong>{formatMoney(totals.base)} ₽</strong> · С коэффициентом:{" "}
            <strong>{formatMoney(totals.withCoef)} ₽</strong>
          </div>

          <div className="ce-table-wrap">
            <table className="ce-table">
              <thead>
                <tr>
                  <th className="ce-col-id">ID</th>
                  <th className="ce-col-title">Публичное название</th>
                  <th className="ce-col-tech">Тех. название / комментарий</th>
                  <th className="ce-col-select">Категория</th>
                  <th className="ce-col-select">Ед.</th>
                  <th className="ce-col-num">Работа ₽</th>
                  <th className="ce-col-num">Материал ₽</th>
                  <th className="ce-col-num">Оборуд. ₽</th>
                  <th className="ce-col-num">Расходн. ₽</th>
                  <th className="ce-col-num">Коэф.</th>
                  <th className="ce-col-num ce-col-total">База ₽</th>
                  <th className="ce-col-num ce-col-total">Итого ₽</th>
                  <th className="ce-col-select">Группа</th>
                  <th className="ce-col-select">Источник</th>
                  <th className="ce-col-actions" aria-label="Действия" />
                </tr>
              </thead>
              <tbody>
                {filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={15} className="ce-empty">
                      Ничего не найдено по текущему фильтру.
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((item) => (
                    <tr key={item.id}>
                      <td className="ce-col-id">
                        <input
                          className="ce-cell-input ce-mono"
                          value={item.id}
                          onChange={(event) => updateItem(item.id, { id: event.target.value })}
                        />
                      </td>
                      <td>
                        <input
                          className="ce-cell-input"
                          value={item.publicTitle}
                          onChange={(event) => updateItem(item.id, { publicTitle: event.target.value })}
                        />
                      </td>
                      <td>
                        <input
                          className="ce-cell-input"
                          value={item.technicalTitle}
                          onChange={(event) => updateItem(item.id, { technicalTitle: event.target.value })}
                        />
                      </td>
                      <td>
                        <select
                          className="ce-cell-input"
                          value={item.category}
                          onChange={(event) =>
                            updateItem(item.id, { category: event.target.value as CatalogCategory })
                          }
                        >
                          {CATALOG_CATEGORIES.map((category) => (
                            <option key={category} value={category}>
                              {CATEGORY_LABELS[category]}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <select
                          className="ce-cell-input"
                          value={item.unit}
                          onChange={(event) => updateItem(item.id, { unit: event.target.value as CatalogUnit })}
                        >
                          {CATALOG_UNITS.map((unit) => (
                            <option key={unit} value={unit}>
                              {unit}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <input
                          className="ce-cell-input ce-num"
                          type="number"
                          value={item.works}
                          onChange={(event) => updateNumber(item.id, "works", event.target.value)}
                        />
                      </td>
                      <td>
                        <input
                          className="ce-cell-input ce-num"
                          type="number"
                          value={item.materials}
                          onChange={(event) => updateNumber(item.id, "materials", event.target.value)}
                        />
                      </td>
                      <td>
                        <input
                          className="ce-cell-input ce-num"
                          type="number"
                          value={item.equipment}
                          onChange={(event) => updateNumber(item.id, "equipment", event.target.value)}
                        />
                      </td>
                      <td>
                        <input
                          className="ce-cell-input ce-num"
                          type="number"
                          value={item.consumables}
                          onChange={(event) => updateNumber(item.id, "consumables", event.target.value)}
                        />
                      </td>
                      <td>
                        <input
                          className="ce-cell-input ce-num"
                          type="number"
                          step="0.01"
                          value={item.coefficient}
                          onChange={(event) => updateNumber(item.id, "coefficient", event.target.value)}
                        />
                      </td>
                      <td className="ce-num ce-readonly">{formatMoney(baseSum(item))}</td>
                      <td className="ce-num ce-readonly ce-total-cell">{formatMoney(totalWithCoefficient(item))}</td>
                      <td>
                        <select
                          className="ce-cell-input"
                          value={item.group}
                          onChange={(event) => updateItem(item.id, { group: event.target.value as CatalogGroup })}
                        >
                          {CATALOG_GROUPS.map((group) => (
                            <option key={group} value={group}>
                              {group}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <select
                          className="ce-cell-input"
                          value={item.source}
                          onChange={(event) =>
                            updateItem(item.id, { source: event.target.value as CatalogSource })
                          }
                        >
                          {CATALOG_SOURCES.map((source) => (
                            <option key={source} value={source}>
                              {source}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="ce-col-actions">
                        <button
                          type="button"
                          className="ce-row-delete"
                          title="Удалить позицию"
                          onClick={() => removeItem(item.id)}
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

export default CatalogEditor;
