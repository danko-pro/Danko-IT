import { EditorScreen } from "../editor/ui/editor-screen";
import { CalculatorScreen } from "../features/calculator/calculator";
import { DashboardScreen } from "../features/dashboard/screen";
import { MaterialsScreen } from "../features/materials/screen";
import { RequestsScreen } from "../features/requests/screen";
import { SettingsScreen } from "../features/settings/screen";
import type { AdminAppController } from "./controller";

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
    calculatorProjects,
    selectedCalculatorProjectId,
    setSelectedCalculatorProjectId,
    calculatorProjectDetail,
    selectedCalculatorRoomId,
    setSelectedCalculatorRoomId,
    calculatorRoomDetail,
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
    calculatorLoading,
    calculatorProjectLoading,
    calculatorRoomLoading,
    savingFamily,
    savingVariant,
    savingSku,
    savingAlias,
    savingDelivery,
    requestActionId,
    requestDetailBusyKey,
    calculatorBusyKey,
    error,
    requestError,
    materialsError,
    calculatorError,
    settingsError,
    loadRequests,
    loadOverview,
    loadFamilies,
    loadCatalogSearch,
    loadCalculatorProjects,
    handleCreateCalculatorProject,
    handleCreateCalculatorRoom,
    handleSaveCalculatorRoom,
    handleDeleteCalculatorRoom,
    handleSaveCalculatorWarmFloor,
    handleSaveCalculatorFlooring,
    handleCreateCalculatorFlooringCovering,
    handleCreateCalculatorFlooringPreparation,
    handleCreateCalculatorFlooringLayout,
    handleSaveCalculatorWallFinish,
    handleCreateCalculatorWallFinishCovering,
    handleCreateCalculatorWallFinishPreparation,
    handleCreateCalculatorWallFinishLayout,
    handleCreateCalculatorDoorCatalogItem,
    handleCreateCalculatorDoorComponentCatalogItem,
    handleCreateCalculatorProjectDoor,
    handleUpdateCalculatorProjectDoor,
    handleDeleteCalculatorProjectDoor,
    handleCreateCalculatorProjectDoorComponent,
    handleUpdateCalculatorProjectDoorComponent,
    handleDeleteCalculatorProjectDoorComponent,
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

  switch (screen) {
    case "requests":
      return (
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

    case "materials":
      return (
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

    case "calculator":
      return (
        <CalculatorScreen
          projects={calculatorProjects}
          projectDetail={calculatorProjectDetail}
          roomDetail={calculatorRoomDetail}
          selectedProjectId={selectedCalculatorProjectId}
          selectedRoomId={selectedCalculatorRoomId}
          loading={calculatorLoading}
          detailLoading={calculatorProjectLoading}
          roomLoading={calculatorRoomLoading}
          busyKey={calculatorBusyKey}
          error={calculatorError}
          onReload={loadCalculatorProjects}
          onSelectProject={setSelectedCalculatorProjectId}
          onSelectRoom={setSelectedCalculatorRoomId}
          onCreateProject={handleCreateCalculatorProject}
          onCreateRoom={handleCreateCalculatorRoom}
          onSaveRoom={handleSaveCalculatorRoom}
          onDeleteRoom={handleDeleteCalculatorRoom}
          onSaveWarmFloor={handleSaveCalculatorWarmFloor}
          onSaveFlooring={handleSaveCalculatorFlooring}
          onCreateFlooringCovering={handleCreateCalculatorFlooringCovering}
          onCreateFlooringPreparation={handleCreateCalculatorFlooringPreparation}
          onCreateFlooringLayout={handleCreateCalculatorFlooringLayout}
          onSaveWallFinish={handleSaveCalculatorWallFinish}
          onCreateWallFinishCovering={handleCreateCalculatorWallFinishCovering}
          onCreateWallFinishPreparation={handleCreateCalculatorWallFinishPreparation}
          onCreateWallFinishLayout={handleCreateCalculatorWallFinishLayout}
          onCreateDoorCatalogItem={handleCreateCalculatorDoorCatalogItem}
          onCreateDoorComponentCatalogItem={handleCreateCalculatorDoorComponentCatalogItem}
          onCreateProjectDoor={handleCreateCalculatorProjectDoor}
          onUpdateProjectDoor={handleUpdateCalculatorProjectDoor}
          onDeleteProjectDoor={handleDeleteCalculatorProjectDoor}
          onCreateProjectDoorComponent={handleCreateCalculatorProjectDoorComponent}
          onUpdateProjectDoorComponent={handleUpdateCalculatorProjectDoorComponent}
          onDeleteProjectDoorComponent={handleDeleteCalculatorProjectDoorComponent}
        />
      );

    case "settings":
      return (
        <SettingsScreen
          deliveryForm={deliveryForm}
          groups={groups}
          savingDelivery={savingDelivery}
          error={settingsError}
          onChangeDelivery={setDeliveryForm}
          onSubmit={handleSaveDeliverySettings}
        />
      );

    case "editor":
      return <EditorScreen />;

    case "dashboard":
    default:
      return <DashboardScreen />;
  }
}
