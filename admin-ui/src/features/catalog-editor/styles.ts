// Изолированные стили редактора каталога. Держим отдельно, чтобы не цеплять
// публичный калькулятор и не зависеть от глобального styles.css.
export const CATALOG_EDITOR_STYLES = `
.catalog-editor {
  --ce-bg: #0f1115;
  --ce-panel: #171a21;
  --ce-panel-2: #1d212b;
  --ce-border: #2a2f3a;
  --ce-text: #e6e9ef;
  --ce-muted: #9aa3b2;
  --ce-accent: #4c8dff;
  --ce-accent-soft: #1b2740;
  --ce-danger: #ff5d5d;
  --ce-ok: #36d399;
  min-height: 100vh;
  box-sizing: border-box;
  padding: 20px 24px 64px;
  background: var(--ce-bg);
  color: var(--ce-text);
  font-family: "Inter", "Segoe UI", system-ui, -apple-system, sans-serif;
  font-size: 13px;
}
.catalog-editor *, .catalog-editor *::before, .catalog-editor *::after { box-sizing: border-box; }

.ce-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 24px;
  flex-wrap: wrap;
  margin-bottom: 16px;
}
.ce-header-text h1 { margin: 4px 0 6px; font-size: 22px; font-weight: 650; }
.ce-header-text p { margin: 0; max-width: 720px; color: var(--ce-muted); line-height: 1.5; }
.ce-kicker { font-size: 11px; letter-spacing: .08em; text-transform: uppercase; color: var(--ce-accent); font-weight: 600; }
.ce-save-status {
  display: inline-flex; align-items: center; gap: 8px;
  padding: 6px 12px; border-radius: 999px;
  background: var(--ce-panel); border: 1px solid var(--ce-border);
  color: var(--ce-muted); font-size: 12px; white-space: nowrap;
}
.ce-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--ce-ok); box-shadow: 0 0 8px var(--ce-ok); }

.ce-tabs { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 18px; }
.ce-tab {
  display: inline-flex; align-items: center; gap: 8px;
  padding: 8px 14px; border-radius: 8px;
  background: var(--ce-panel); border: 1px solid var(--ce-border);
  color: var(--ce-text); font-size: 13px; cursor: pointer; transition: all .12s ease;
}
.ce-tab:hover { border-color: var(--ce-accent); }
.ce-tab.is-active { background: var(--ce-accent); border-color: var(--ce-accent); color: #fff; font-weight: 600; }
.ce-tab.is-stub { color: var(--ce-muted); }
.ce-tab-badge {
  font-size: 10px; padding: 2px 6px; border-radius: 5px;
  background: var(--ce-panel-2); color: var(--ce-muted); border: 1px solid var(--ce-border);
}
.ce-tab.is-active .ce-tab-badge { background: rgba(255,255,255,.18); color: #fff; border-color: transparent; }

.ce-stub-panel {
  padding: 48px; text-align: center; border: 1px dashed var(--ce-border);
  border-radius: 12px; background: var(--ce-panel); color: var(--ce-muted);
}
.ce-stub-panel h2 { margin: 0 0 8px; color: var(--ce-text); }

.ce-toolbar {
  display: flex; align-items: center; justify-content: space-between;
  gap: 12px; flex-wrap: wrap; margin-bottom: 10px;
}
.ce-toolbar-group { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.ce-input {
  height: 34px; padding: 0 10px; border-radius: 8px;
  background: var(--ce-panel); border: 1px solid var(--ce-border); color: var(--ce-text);
  font-size: 13px; outline: none;
}
.ce-input:focus { border-color: var(--ce-accent); }
.ce-search { min-width: 280px; }

.ce-btn {
  height: 34px; padding: 0 14px; border-radius: 8px; cursor: pointer;
  background: var(--ce-panel); border: 1px solid var(--ce-border); color: var(--ce-text);
  font-size: 13px; font-weight: 500; transition: all .12s ease; white-space: nowrap;
}
.ce-btn:hover { border-color: var(--ce-accent); }
.ce-btn-primary { background: var(--ce-accent); border-color: var(--ce-accent); color: #fff; }
.ce-btn-primary:hover { filter: brightness(1.08); }
.ce-btn-danger { color: var(--ce-danger); border-color: rgba(255,93,93,.4); }
.ce-btn-danger:hover { background: rgba(255,93,93,.12); border-color: var(--ce-danger); }
.ce-file-hidden { display: none; }

.ce-meta { margin-bottom: 12px; color: var(--ce-muted); font-size: 12px; }
.ce-meta strong { color: var(--ce-text); }

.ce-note {
  display: flex; align-items: center; gap: 10px; flex-wrap: wrap;
  margin-bottom: 14px; padding: 10px 12px; border-radius: 9px;
  background: rgba(76,141,255,.08); border: 1px solid rgba(76,141,255,.28);
  color: var(--ce-muted); font-size: 12px; line-height: 1.5;
}
.ce-note-tag {
  flex: none; padding: 2px 9px; border-radius: 999px; font-size: 11px; font-weight: 600;
  background: var(--ce-accent); color: #fff;
}
.ce-note-warn {
  background: rgba(255, 180, 50, .08); border-color: rgba(255, 180, 50, .35);
}
.ce-note-warn .ce-note-tag { background: #e6a020; color: #1a1200; }

.ce-qty-hint {
  display: block; margin-top: 2px; padding: 0 4px;
  font-size: 10px; line-height: 1.3; color: var(--ce-muted); white-space: normal;
}

.ce-table-wrap {
  border: 1px solid var(--ce-border); border-radius: 12px; overflow: auto; max-height: calc(100vh - 280px);
}
.ce-table { border-collapse: separate; border-spacing: 0; width: 100%; min-width: 1320px; }
.ce-table th, .ce-table td {
  border-bottom: 1px solid var(--ce-border); border-right: 1px solid var(--ce-border);
  padding: 0; text-align: left; vertical-align: middle;
}
.ce-table th:last-child, .ce-table td:last-child { border-right: none; }
.ce-table thead th {
  position: sticky; top: 0; z-index: 2;
  background: var(--ce-panel-2); color: var(--ce-muted);
  font-weight: 600; font-size: 11px; text-transform: uppercase; letter-spacing: .03em;
  padding: 9px 8px; white-space: nowrap;
}
.ce-table tbody tr:nth-child(even) { background: rgba(255,255,255,.015); }
.ce-table tbody tr:hover { background: var(--ce-accent-soft); }

.ce-cell-input {
  width: 100%; height: 34px; padding: 0 8px; border: 0; background: transparent;
  color: var(--ce-text); font-size: 12px; outline: none; font-family: inherit;
}
.ce-cell-input:focus { background: var(--ce-bg); box-shadow: inset 0 0 0 1px var(--ce-accent); }
select.ce-cell-input { appearance: none; cursor: pointer; }
.ce-mono { font-family: "JetBrains Mono", "Consolas", monospace; font-size: 11px; }
.ce-num { text-align: right; }
.ce-num.ce-cell-input { text-align: right; }
.ce-readonly { padding: 0 10px; color: var(--ce-muted); font-size: 12px; }
.ce-na {
  display: block; width: 100%; height: 34px; line-height: 34px;
  text-align: center; color: var(--ce-muted); user-select: none;
}
.ce-total-cell { color: var(--ce-ok); font-weight: 600; }

.ce-col-id { min-width: 150px; }
.ce-col-title { min-width: 200px; }
.ce-col-tech { min-width: 220px; }
.ce-col-select { min-width: 110px; }
.ce-col-formula { min-width: 168px; }
.ce-col-num { min-width: 92px; text-align: right; }
.ce-col-total { min-width: 90px; }
.ce-col-actions { width: 44px; text-align: center; }

.ce-row-delete {
  width: 26px; height: 26px; border-radius: 6px; cursor: pointer;
  background: transparent; border: 1px solid transparent; color: var(--ce-muted);
  font-size: 13px; line-height: 1;
}
.ce-row-delete:hover { color: var(--ce-danger); border-color: rgba(255,93,93,.4); background: rgba(255,93,93,.1); }

.ce-empty { padding: 32px; text-align: center; color: var(--ce-muted); }

/* --- Под-вкладки внутри раздела --- */
.ce-subtabs { display: inline-flex; gap: 4px; padding: 3px; border-radius: 9px; background: var(--ce-panel); border: 1px solid var(--ce-border); }
.ce-subtab {
  padding: 6px 14px; border-radius: 6px; cursor: pointer;
  background: transparent; border: 0; color: var(--ce-muted); font-size: 13px; font-weight: 500;
}
.ce-subtab:hover { color: var(--ce-text); }
.ce-subtab.is-active { background: var(--ce-accent); color: #fff; }

.ce-btn-sm { height: 28px; padding: 0 10px; font-size: 12px; }

/* --- Иерархия зон --- */
.ce-zones { display: flex; flex-direction: column; gap: 12px; }
.ce-subgroup { border: 1px solid var(--ce-border); border-radius: 12px; background: var(--ce-panel); overflow: hidden; }
.ce-subgroup-head {
  display: flex; align-items: center; justify-content: space-between; gap: 12px;
  padding: 10px 14px; background: var(--ce-panel-2);
}
.ce-disclosure {
  display: inline-flex; align-items: center; gap: 10px;
  background: transparent; border: 0; color: var(--ce-text); cursor: pointer; font-size: 14px; padding: 0;
}
.ce-chevron { display: inline-block; font-size: 10px; color: var(--ce-muted); transition: transform .12s ease; }
.ce-chevron.is-open { transform: rotate(90deg); }
.ce-subgroup-title { font-size: 15px; font-weight: 650; }
.ce-subgroup-count { font-size: 11px; color: var(--ce-muted); }
.ce-subgroup-right { display: inline-flex; align-items: center; gap: 14px; }
.ce-subgroup-total { font-size: 14px; font-weight: 650; color: var(--ce-ok); }
.ce-subgroup-body { padding: 10px 14px 14px; display: flex; flex-direction: column; gap: 10px; }
.ce-zone-empty { padding: 14px; text-align: center; color: var(--ce-muted); font-size: 12px; border: 1px dashed var(--ce-border); border-radius: 8px; }

.ce-zone { border: 1px solid var(--ce-border); border-radius: 10px; background: var(--ce-bg); overflow: hidden; }
.ce-zone-head { display: flex; align-items: center; gap: 10px; padding: 8px 12px; background: rgba(255,255,255,.02); }
.ce-zone-title {
  flex: 1; min-width: 0; height: 30px; padding: 0 8px; border-radius: 6px;
  background: transparent; border: 1px solid transparent; color: var(--ce-text); font-size: 14px; font-weight: 600; outline: none;
}
.ce-zone-title:hover { border-color: var(--ce-border); }
.ce-zone-title:focus { background: var(--ce-panel); border-color: var(--ce-accent); }
.ce-zone-count { font-size: 11px; color: var(--ce-muted); white-space: nowrap; }
.ce-zone-total { font-size: 14px; font-weight: 650; color: var(--ce-ok); white-space: nowrap; min-width: 90px; text-align: right; }
.ce-zone-body { padding: 10px 12px 12px; }
.ce-zone-desc {
  width: 100%; height: 30px; padding: 0 8px; margin-bottom: 8px; border-radius: 6px;
  background: var(--ce-panel); border: 1px solid var(--ce-border); color: var(--ce-muted); font-size: 12px; outline: none;
}
.ce-zone-desc:focus { border-color: var(--ce-accent); color: var(--ce-text); }
.ce-zone-table { min-width: 0; width: 100%; border: 1px solid var(--ce-border); border-radius: 8px; }
.ce-zone-table thead th { position: static; }
.ce-row-missing td { background: rgba(255,93,93,.08); color: var(--ce-danger); }
.ce-zone-add { margin-top: 8px; }
.ce-zone-pick { width: 100%; max-width: 520px; cursor: pointer; }

.ce-price-classes {
  display: flex; align-items: center; gap: 10px; flex-wrap: wrap;
  margin-bottom: 8px; padding: 8px 10px; border-radius: 8px;
  background: var(--ce-panel); border: 1px solid var(--ce-border);
}
.ce-price-classes-label { font-size: 12px; color: var(--ce-muted); font-weight: 600; }
.ce-price-class-tabs { display: inline-flex; gap: 4px; flex-wrap: wrap; }
.ce-price-class-tab {
  padding: 5px 12px; border-radius: 6px; cursor: pointer;
  background: transparent; border: 1px solid var(--ce-border); color: var(--ce-muted); font-size: 12px;
}
.ce-price-class-tab:hover { border-color: var(--ce-accent); color: var(--ce-text); }
.ce-price-class-tab.is-active { background: var(--ce-accent); border-color: var(--ce-accent); color: #fff; font-weight: 600; }

.ce-zone-risk-field { margin-bottom: 8px; }
.ce-zone-risk-label {
  display: inline-flex; align-items: center; gap: 8px;
  font-size: 12px; color: var(--ce-muted);
}
.ce-zone-risk-input { width: 72px; text-align: right; }

.ce-variant-separator td {
  padding: 8px 10px !important; font-size: 11px; font-weight: 600;
  text-transform: uppercase; letter-spacing: .04em;
  color: var(--ce-accent); background: rgba(76,141,255,.06) !important;
  border-top: 1px solid rgba(76,141,255,.25);
}

.ce-zone-summary-row td { padding: 6px 10px !important; border-top: 1px solid var(--ce-border); }
.ce-zone-summary-label { text-align: right !important; font-weight: 600; color: var(--ce-muted); }
.ce-zone-summary-risk td { color: var(--ce-muted); font-style: italic; }
.ce-zone-summary-total td { background: rgba(54,211,153,.06); }
.ce-zone-summary-total .ce-zone-summary-label { color: var(--ce-text); }

/* --- Превью публичной цены --- */
.ce-preview {
  margin-bottom: 16px; padding: 14px 16px;
  border: 1px solid rgba(54,211,153,.35); border-radius: 12px;
  background: rgba(54,211,153,.05);
}
.ce-preview-head {
  display: flex; align-items: flex-start; justify-content: space-between; gap: 12px;
  margin-bottom: 12px;
}
.ce-preview-hint { display: block; margin-top: 4px; color: var(--ce-muted); font-size: 12px; }
.ce-preview-body { margin-top: 8px; }

/* --- Вкладка «Полы» (F5b) --- */
.ce-flooring-section { margin-bottom: 20px; }
.ce-flooring-section-title { margin: 0 0 10px; font-size: 15px; font-weight: 650; }
.ce-flooring-table-wrap { margin-bottom: 10px; max-height: none; }
.ce-flooring-table { min-width: 720px; }
.ce-flooring-form {
  padding: 12px; border: 1px solid var(--ce-border); border-radius: 10px;
  background: var(--ce-panel);
}
.ce-flooring-form-head {
  display: flex; align-items: center; justify-content: space-between; gap: 12px;
  margin-bottom: 10px;
}
.ce-flooring-form-content {
  display: flex; flex-direction: column; gap: 12px;
}
.ce-flooring-form-fields {
  display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 10px;
}
.ce-flooring-field { display: flex; flex-direction: column; gap: 4px; font-size: 12px; }
.ce-flooring-field-label { color: var(--ce-muted); }
.ce-flooring-field .ce-input { width: 100%; }
.ce-flooring-library-form { margin-top: 10px; }
.ce-flooring-library-actions { justify-content: center; gap: 6px; flex-wrap: nowrap; padding: 0 6px; }

/* --- Локальная сборка покрытия (FA1 spike) --- */
.ce-flooring-assembly {
  width: 100%; padding: 14px; border: 1px solid rgba(76,141,255,.35); border-radius: 10px;
  background: rgba(76,141,255,.04);
}
.ce-flooring-assembly-empty {
  display: flex; flex-direction: column; align-items: center; gap: 10px;
  padding: 28px 16px; text-align: center; color: var(--ce-muted);
  border: 1px dashed var(--ce-border); border-radius: 8px; margin-bottom: 10px;
}
.ce-flooring-assembly-empty p { margin: 0; font-size: 13px; }
.ce-flooring-assembly-row-off { opacity: 0.45; }
.ce-flooring-assembly-recommended { border-style: dashed; }
.ce-flooring-assembly-summary-total .ce-flooring-assembly-summary-value { font-size: 14px; }
.ce-flooring-assembly-status {
  flex: 1; min-width: 200px; display: inline-flex; align-items: center; gap: 8px;
  font-size: 12px; color: var(--ce-muted); line-height: 1.4;
}
.ce-flooring-assembly-actions { align-items: center; justify-content: space-between; }
.ce-flooring-assembly-head {
  display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; flex-wrap: wrap;
  margin-bottom: 10px;
}
.ce-flooring-assembly-title { margin: 0; font-size: 14px; font-weight: 650; }
.ce-flooring-assembly-hint { margin: 4px 0 0; font-size: 11px; color: var(--ce-muted); line-height: 1.4; }
.ce-flooring-assembly-toolbar { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.ce-flooring-assembly-library {
  display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
  margin-bottom: 10px; padding: 8px 10px; border-radius: 8px;
  background: rgba(255,255,255,.025); border: 1px solid var(--ce-border);
}
.ce-flooring-assembly-library-label { font-size: 12px; color: var(--ce-muted); font-weight: 650; }
.ce-flooring-assembly-library-select { width: 150px; }
.ce-flooring-assembly-library-item { min-width: 280px; flex: 1; }
.ce-flooring-assembly-library-hint { color: var(--ce-muted); font-size: 11px; line-height: 1.35; }
.ce-flooring-assembly-table-wrap { margin-bottom: 10px; max-height: none; border-radius: 8px; }
.ce-flooring-assembly-table { min-width: 1080px; width: 100%; table-layout: fixed; }
.ce-flooring-assembly-table thead th { padding: 8px 7px; }
.ce-flooring-assembly-table tbody td { height: 34px; }
.ce-flooring-assembly-table .ce-col-check { width: 44px; text-align: center; }
.ce-flooring-assembly-table .ce-col-kind { width: 100px; }
.ce-flooring-assembly-table .ce-col-formula { width: 126px; }
.ce-flooring-assembly-table .ce-col-title { width: auto; min-width: 220px; }
.ce-flooring-assembly-table .ce-col-unit { width: 58px; }
.ce-flooring-assembly-table .ce-col-num { width: 82px; }
.ce-flooring-assembly-table .ce-col-total { width: 86px; }
.ce-flooring-assembly-table .ce-col-actions { width: 38px; text-align: center; }
.ce-flooring-assembly-table .ce-cell-input {
  height: 34px; min-height: 34px; padding: 0 7px; font-size: 12px;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.ce-flooring-assembly-table .ce-cell-select { padding-right: 16px; font-size: 11px; }
.ce-flooring-assembly-table .ce-cell-formula { font-size: 10px; font-weight: 600; }
.ce-flooring-assembly-table .ce-cell-unit { text-align: center; }
.ce-flooring-assembly-table .ce-readonly { padding: 0 7px; line-height: 34px; }
.ce-flooring-assembly-table .ce-total-cell { font-size: 12px; white-space: nowrap; }
.ce-flooring-assembly-table .ce-row-delete { display: block; margin: 0 auto; }
.ce-flooring-assembly-section-row td {
  height: 26px !important; padding: 5px 8px !important;
  border-top: 1px solid rgba(76,141,255,.35);
  border-bottom: 1px solid rgba(76,141,255,.18);
  background: rgba(76,141,255,.08) !important;
  color: var(--ce-accent); font-size: 11px; font-weight: 650;
  text-transform: uppercase; letter-spacing: .04em;
}
.ce-flooring-assembly-summary {
  display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 8px;
  margin-bottom: 10px; padding: 10px; border-radius: 8px;
  background: var(--ce-panel-2); border: 1px solid var(--ce-border);
}
.ce-flooring-assembly-summary-item { font-size: 12px; }
.ce-flooring-assembly-summary-label { display: block; color: var(--ce-muted); font-size: 11px; }
.ce-flooring-assembly-summary-value { font-weight: 600; color: var(--ce-ok); }
.ce-flooring-assembly-actions { display: flex; justify-content: flex-end; gap: 8px; flex-wrap: wrap; }
.ce-flooring-assembly-check { padding: 0; text-align: center; }
.ce-flooring-assembly-check input {
  display: block; width: 14px; height: 14px; margin: 0 auto;
}
`;
