import { CalculatorScreen } from "./calculator";
import { useAdminAppController } from "./app-controller";
import { DashboardScreen } from "./app-screen-dashboard";
import { MaterialsScreen } from "./app-screen-materials";
import { RequestsScreen } from "./app-screen-requests";
import { SettingsScreen } from "./app-screen-settings";
import { navigation } from "./app-types";
import { StatusBadge } from "./app-ui";
import { API_BASE } from "./app-utils";

// Главный shell admin UI: навигация, layout и сборка экранов поверх controller-слоя.

export default function App() {
  const {
    screen,
    setScreen,
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
    successMessage,
    setSuccessMessage,
    loadRequests,
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
    handleQuickCreateCalculatorProject,
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
  } = useAdminAppController();
  function renderScreen() {
    switch (screen) {
      case "requests":
        return (
          <RequestsScreen
            requests={requests}
            requestsLoading={requestsLoading || loading}
            requestDetail={requestDetail}
            requestDetailLoading={requestDetailLoading}
            selectedRequestId={selectedRequestId}
            requestActionId={requestActionId}
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
      case "dashboard":
      default:
        return (
          <DashboardScreen
            summary={summary}
            requests={requests.slice(0, 6)}
            families={families.slice(0, 6)}
            groups={groups.slice(0, 5)}
            deliverySettings={deliverySettings}
            loading={loading}
            error={error}
          />
        );
    }
  }

  return (
    <div className="min-h-screen px-3 py-3 text-slate-100 md:px-4 lg:px-5">
      <div className="mx-auto grid min-h-[calc(100vh-1.5rem)] max-w-[1600px] grid-cols-1 gap-3 lg:grid-cols-[248px_minmax(0,1fr)]">
        <aside className="glass-panel flex flex-col justify-between overflow-hidden bg-[linear-gradient(180deg,rgba(29,33,38,0.94),rgba(34,37,42,0.92))] p-3.5 text-slate-100">
          <div className="space-y-5">
            <div className="space-y-2">
              <div className="eyebrow text-cyan-300/80">Supply Bot</div>
              <div>
                <h1 className="text-[1.35rem] font-semibold tracking-tight">Панель снабжения</h1>
                <p className="mt-1.5 text-[13px] leading-5 text-slate-300">
                  Одна локальная панель рядом с ботом: заявки, каталог материалов, объекты и настройки
                  доставки без Telegram-кнопок.
                </p>
              </div>
            </div>

            <nav className="space-y-2">
              {navigation.map((item) => {
                const active = screen === item.key;
                const isCalculator = item.key === "calculator";
                return (
                  <div key={item.key} className="space-y-1.5">
                    <button
                      type="button"
                      className={active ? "nav-button nav-button-active" : "nav-button"}
                      onClick={() => {
                        setScreen(item.key);
                        setSuccessMessage(null);
                        if (item.key === "requests") {
                          void loadRequests();
                        }
                        if (item.key === "materials") {
                          void loadFamilies();
                        }
                        if (item.key === "calculator") {
                          void loadCalculatorProjects();
                        }
                      }}
                    >
                      <span className="text-[13px] font-semibold">{item.label}</span>
                      <span className="mt-1 block text-[11px] leading-4.5 text-current/68">{item.note}</span>
                    </button>

                    {isCalculator && active ? (
                      <div className="calculator-nav-panel">
                        <div className="calculator-nav-list">
                          {calculatorProjects.map((project) => {
                            const projectActive = selectedCalculatorProjectId === project.id;
                            return (
                              <button
                                key={project.id}
                                type="button"
                                className={projectActive ? "calculator-nav-item calculator-nav-item-active" : "calculator-nav-item"}
                                onClick={() => {
                                  setSelectedCalculatorProjectId(project.id);
                                  setSuccessMessage(null);
                                }}
                              >
                                <span className="truncate">{project.name}</span>
                                <span className="calculator-nav-id">#{project.id}</span>
                              </button>
                            );
                          })}

                          {!calculatorLoading && !calculatorProjects.length ? (
                            <div className="calculator-nav-empty">Пока нет объектов</div>
                          ) : null}
                        </div>

                        <button
                          type="button"
                          className="calculator-nav-add"
                          onClick={() => void handleQuickCreateCalculatorProject()}
                          title="Добавить объект"
                        >
                          +
                        </button>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </nav>
          </div>

          <div className="subpanel p-3 text-sm text-slate-300">
            <div className="eyebrow text-cyan-300/70">Статус</div>
            <p className="mt-2 leading-5">
              API: <span className="font-semibold text-white">{API_BASE}</span>
            </p>
            <p className="mt-2 text-[12px] leading-5">
              Живые данные читаются из той же SQLite-базы, что и бот. Теперь можно постепенно переносить
              управление из Telegram в нормальное окно.
            </p>
          </div>
        </aside>

        <main className="space-y-4">
          <section className="glass-panel overflow-hidden p-4">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
              <div className="space-y-1.5">
                <div className="eyebrow">{navigation.find((item) => item.key === screen)?.label}</div>
                <h2 className="text-[1.75rem] font-semibold tracking-tight text-slate-950">
                  {screen === "dashboard" && "Живой обзор проекта"}
                  {screen === "requests" && "Работа с заявками"}
                  {screen === "materials" && "Каталог материалов"}
                  {screen === "calculator" && "Калькулятор объекта"}
                  {screen === "settings" && "Настройки и окно доставки"}
                </h2>
                <p className="max-w-3xl text-[13px] leading-5 text-slate-600">
                  {screen === "dashboard" &&
                    "Быстрый снимок по базе, группам и текущим черновикам. Отсюда видно, куда идти дальше."}
                  {screen === "requests" &&
                    "Последние черновики и подтвержденные заявки. Справа открывается детальная карточка с позициями и доставкой."}
                  {screen === "materials" &&
                    "Первый рабочий CRUD для каталога: создавайте семейства, варианты и SKU в том же проекте, где живет бот."}
                  {screen === "settings" &&
                    "Глобальные дефолты по окну доставки и живой список объектов, чтобы контролировать базовые параметры без бота."}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <StatusBadge label={loading ? "Загрузка" : "Подключено"} tone={loading ? "warn" : "ok"} />
                <span className="slot-chip">
                  React + FastAPI
                </span>
              </div>
            </div>

            {successMessage ? (
              <div className="mt-4 rounded-[14px] border border-emerald-400/20 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
                {successMessage}
              </div>
            ) : null}
          </section>

          {renderScreen()}
        </main>
      </div>
    </div>
  );
}
