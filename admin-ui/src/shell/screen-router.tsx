import { Suspense, lazy, type ReactNode } from "react";

import { buildCalculatorScreenProps } from "../features/calculator/screen/props";
import type { ScreenKey } from "../shared/types";
import type { AdminAppController } from "./controller";

// Экраны грузятся лениво, чтобы основной shell не тянул весь UI-срез сразу.
const loadDashboardScreen = () => import("../features/dashboard/screen").then((module) => ({ default: module.DashboardScreen }));
const loadRequestsScreen = () => import("../features/requests/screen").then((module) => ({ default: module.RequestsScreen }));
const loadMaterialsScreen = () => import("../features/materials/screen").then((module) => ({ default: module.MaterialsScreen }));
const loadCalculatorScreen = () => import("../features/calculator").then((module) => ({ default: module.CalculatorScreen }));
const loadSettingsScreen = () => import("../features/settings/screen").then((module) => ({ default: module.SettingsScreen }));
const loadEditorScreen = () => import("../editor/ui/editor-screen").then((module) => ({ default: module.EditorScreen }));

const DashboardScreen = lazy(loadDashboardScreen);
const RequestsScreen = lazy(loadRequestsScreen);
const MaterialsScreen = lazy(loadMaterialsScreen);
const CalculatorScreen = lazy(loadCalculatorScreen);
const SettingsScreen = lazy(loadSettingsScreen);
const EditorScreen = lazy(loadEditorScreen);

const screenPreloaders: Record<ScreenKey, () => Promise<unknown>> = {
  dashboard: loadDashboardScreen,
  requests: loadRequestsScreen,
  materials: loadMaterialsScreen,
  calculator: loadCalculatorScreen,
  settings: loadSettingsScreen,
  editor: loadEditorScreen,
};

export function preloadAppScreen(screen: ScreenKey) {
  return screenPreloaders[screen]();
}

function AppScreenLoader(props: { screen: ScreenKey }) {
  const label =
    props.screen === "dashboard"
      ? "Загружаю workspace..."
      : props.screen === "requests"
        ? "Загружаю логистику..."
        : props.screen === "materials"
          ? "Загружаю каталог..."
          : props.screen === "calculator"
            ? "Загружаю калькулятор..."
            : props.screen === "settings"
              ? "Загружаю настройки..."
              : "Загружаю редактор...";

  return (
    <section className="glass-panel app-screen-loader flex min-h-[18rem] items-center justify-center p-5">
      <div className="space-y-2 text-center">
        <div className="eyebrow">Экран</div>
        <div className="text-lg font-semibold text-slate-100">{label}</div>
      </div>
    </section>
  );
}

export function AppScreenRouter(props: { controller: AdminAppController }) {
  const {
    screen,
    summary,
    requests,
    families,
    groups,
    deliverySettings,
    selectedRequestId,
    setSelectedRequestId,
    requestDetail,
    selectedFamilyId,
    setSelectedFamilyId,
    familyDetail,
    familyForm,
    setFamilyForm,
    variantForm,
    setVariantForm,
    skuForm,
    setSkuForm,
    aliasForm,
    setAliasForm,
    deliveryForm,
    setDeliveryForm,
    catalogQuery,
    searchResults,
    loading,
    requestsLoading,
    requestDetailLoading,
    materialsLoading,
    familyDetailLoading,
    savingFamily,
    savingVariant,
    savingSku,
    savingAlias,
    savingDelivery,
    requestActionId,
    requestDetailBusyKey,
    error,
    requestError,
    materialsError,
    settingsError,
    loadRequests,
    loadOverview,
    loadFamilies,
    loadCatalogSearch,
    handleCreateFamily,
    handleCreateVariant,
    handleCreateSku,
    handleCreateAlias,
    handleSaveDeliverySettings,
    handleRequestStatusAction,
    handleDeleteRequest,
    handleSaveRequestDelivery,
    handleCreateRequestItem,
    handleUpdateRequestItem,
    handleDeleteRequestItem,
    toggleDialogField,
  } = props.controller;

  let screenNode: ReactNode;

  switch (screen) {
    case "requests":
      screenNode = (
        <RequestsScreen
          summary={summary}
          requests={requests}
          families={families}
          groups={groups}
          deliverySettings={deliverySettings}
          loading={loading}
          requestsLoading={requestsLoading || loading}
          requestDetail={requestDetail}
          requestDetailLoading={requestDetailLoading}
          selectedRequestId={selectedRequestId}
          requestActionId={requestActionId}
          overviewError={error}
          onReloadOverview={loadOverview}
          requestDetailBusyKey={requestDetailBusyKey}
          error={requestError}
          onReload={loadRequests}
          onSelectRequest={setSelectedRequestId}
          onChangeStatus={handleRequestStatusAction}
          onDeleteRequest={handleDeleteRequest}
          onSaveDelivery={handleSaveRequestDelivery}
          onCreateItem={handleCreateRequestItem}
          onUpdateItem={handleUpdateRequestItem}
          onDeleteItem={handleDeleteRequestItem}
        />
      );
      break;

    case "materials":
      screenNode = (
        <MaterialsScreen
          families={families}
          selectedFamilyId={selectedFamilyId}
          familyDetail={familyDetail}
          loading={materialsLoading || loading}
          familyDetailLoading={familyDetailLoading}
          error={materialsError}
          familyForm={familyForm}
          variantForm={variantForm}
          skuForm={skuForm}
          aliasForm={aliasForm}
          searchResults={searchResults}
          catalogQuery={catalogQuery}
          savingFamily={savingFamily}
          savingVariant={savingVariant}
          savingSku={savingSku}
          savingAlias={savingAlias}
          onSelectFamily={setSelectedFamilyId}
          onFamilyFormChange={setFamilyForm}
          onVariantFormChange={setVariantForm}
          onSkuFormChange={setSkuForm}
          onAliasFormChange={setAliasForm}
          onToggleDialogField={toggleDialogField}
          onCreateFamily={handleCreateFamily}
          onCreateVariant={handleCreateVariant}
          onCreateSku={handleCreateSku}
          onCreateAlias={handleCreateAlias}
          onReloadFamilies={loadFamilies}
          onSearchCatalog={loadCatalogSearch}
        />
      );
      break;

    case "calculator": {
      const calculatorScreenProps = buildCalculatorScreenProps(props.controller);
      screenNode = (
        <CalculatorScreen {...calculatorScreenProps} />
      );
      break;
    }

    case "settings":
      screenNode = (
        <SettingsScreen
          deliveryForm={deliveryForm}
          groups={groups}
          savingDelivery={savingDelivery}
          error={settingsError}
          onChangeDelivery={setDeliveryForm}
          onSubmit={handleSaveDeliverySettings}
        />
      );
      break;

    case "editor":
      screenNode = <EditorScreen />;
      break;

    case "dashboard":
    default:
      screenNode = <DashboardScreen />;
      break;
  }

  return <Suspense fallback={<AppScreenLoader screen={screen} />}>{screenNode}</Suspense>;
}
