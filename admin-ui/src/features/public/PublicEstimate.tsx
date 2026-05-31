import { useCallback, useMemo, useState } from "react";
import { estimateNumericFieldProps, estimateTextFieldProps } from "./public-estimate-input";
import { buildPublicEstimateResult } from "./estimate/engine";
import { type EstimateSection, type EstimateSectionId } from "./public-estimate-model";
import { classifyEstimatePackage } from "./public-estimate-package";
import {
  doorPackageOptions,
  flooringCoveringOptions,
  flooringLayoutOptions,
  flooringPlinthOptions,
  flooringPreparationOptions,
  GEOMETRY_STEP_HINT,
  wallsCoveringOptions,
  wallsPreparationOptions,
} from "./estimate/defaults";
import { type EstimateObjectMeta } from "./estimate/context";
import { buildEstimateSpecModalData } from "./estimate/spec";
import {
  buildCompactVolumeItems,
  buildEstimateTotalItems,
  buildVolumeSummaryItems,
} from "./estimate/summary";
import { estimateNavigationItems, formatEstimateStep, getEstimateSectionClassName } from "./sections/registry";
import { useEstimateNavigation } from "./estimate/useEstimateNavigation";
import { useEstimateRooms } from "./estimate/useEstimateRooms";
import { useWarmFloorEstimate } from "./estimate/useWarmFloorEstimate";
import { useFlooringEstimate } from "./estimate/useFlooringEstimate";
import { useWallsEstimate } from "./estimate/useWallsEstimate";
import { useCeilingEstimate } from "./estimate/useCeilingEstimate";
import { useElectricEstimate } from "./estimate/useElectricEstimate";
import { usePlumbingEstimate } from "./estimate/usePlumbingEstimate";
import { useDoorsEstimate } from "./estimate/useDoorsEstimate";
import { useCompletionEstimate } from "./estimate/useCompletionEstimate";
import { useAppliancesEstimate } from "./estimate/useAppliancesEstimate";
import { useLooseFurnitureEstimate } from "./estimate/useLooseFurnitureEstimate";
import { useHomeGoodsEstimate } from "./estimate/useHomeGoodsEstimate";
import { FlooringSection } from "./sections/flooring/FlooringSection";
import { GeometrySection } from "./sections/geometry/GeometrySection";
import { ObjectSection } from "./sections/object/ObjectSection";
import { WarmFloorSection } from "./sections/warm-floor/WarmFloorSection";
import { CeilingSection } from "./sections/ceiling/CeilingSection";
import { AppliancesSection } from "./sections/appliances/AppliancesSection";
import { LooseFurnitureSection } from "./sections/loose-furniture/LooseFurnitureSection";
import { HomeGoodsSection } from "./sections/home-goods/HomeGoodsSection";
import { CompletionSection } from "./sections/completion/CompletionSection";
import { EstimateActions } from "./components/estimate/EstimateActions";
import { EstimateMobileTotal } from "./components/estimate/EstimateMobileTotal";
import { EstimatePassportSidebar } from "./components/estimate/EstimatePassportSidebar";
import { EstimateRail } from "./components/estimate/EstimateRail";
import { EstimateSpecModal } from "./components/estimate/EstimateSpecModal";
import { EstimateVolumesPrint } from "./components/estimate/EstimateVolumesPrint";
import { CostsSection } from "./sections/costs/CostsSection";
import { DoorsSection } from "./sections/doors/DoorsSection";
import { ElectricSection } from "./sections/electric/ElectricSection";
import { PlumbingSection } from "./sections/plumbing/PlumbingSection";
import { WallsSection } from "./sections/walls/WallsSection";

export function PublicEstimate() {
  const [objectMeta, setObjectMeta] = useState<EstimateObjectMeta>({
    address: "",
    complexName: "",
    apartmentNumber: "",
    contact: "",
  });
  const [specModal, setSpecModal] = useState<{ kind: "section" | "full"; sectionId?: EstimateSectionId } | null>(
    null,
  );
  const {
    activeEstimateSection,
    estimateRailScrollRef,
    isMobileVolumesExpanded,
    toggleMobileVolumesExpanded,
    scrollToEstimateSection,
  } = useEstimateNavigation();
  const {
    ceilingHeightInput,
    rooms,
    roomInputs,
    roomGeometries,
    totals,
    enteringRoomIds,
    removingRoomIds,
    onCeilingHeightChange,
    onCeilingHeightBlur,
    onRoomNameChange,
    onRoomAreaChange,
    onRoomAreaBlur,
    onRoomDoorCountChange,
    onRoomDoorCountBlur,
    onRoomWindowCountChange,
    onRoomWindowCountBlur,
    addRoom,
    removeRoom,
  } = useEstimateRooms();
  const {
    warmFloorMode,
    setWarmFloorMode,
    warmFloorRooms,
    warmFloorResult,
    warmFloorModeLabel,
    warmFloorConnectionLabel,
    warmFloorSummaryItems,
    removeWarmFloorRoom,
    onWarmFloorRoomSelectedChange,
    onWarmFloorAreaChange,
    onWarmFloorAreaBlur,
  } = useWarmFloorEstimate({ rooms, roomInputs });
  const {
    flooringRooms,
    flooringOptions,
    flooringResult,
    flooringSummaryItems,
    removeFlooringRoom,
    onFlooringRoomIncludedChange,
    onFlooringCoveringChange,
    onFlooringPreparationChange,
    onFlooringLayoutChange,
    onFlooringOptionsChange,
    onFlooringThresholdCountChange,
    onFlooringThresholdCountBlur,
  } = useFlooringEstimate({ rooms, roomInputs, roomGeometries });
  const {
    wallsRooms,
    wallsResult,
    wallsSummaryItems,
    removeWallsRoom,
    onWallsRoomIncludedChange,
    onWallsCoveringChange,
    onWallsPreparationChange,
  } = useWallsEstimate({ rooms, roomGeometries });
  const {
    ceilingRooms,
    ceilingResult,
    ceilingSummaryItems,
    removeCeilingRoom,
    getCeilingLightDefaults,
    onCeilingRoomIncludedChange,
    onCeilingPointLightsChange,
  } = useCeilingEstimate({ rooms, roomGeometries });
  const {
    electricRooms,
    electricOptions,
    electricResult,
    electricSummaryItems,
    removeElectricRoom,
    onElectricRoomIncludedChange,
    onElectricKitchenOutputsChange,
    onElectricSwitchboardChange,
  } = useElectricEstimate({ rooms, roomInputs, ceilingResult });
  const {
    plumbingOptions,
    plumbingResult,
    plumbingCompositionItems,
    plumbingSummaryItems,
    kitchenSinkPackageLabels,
    dishwasherPackageLabels,
    showerPackageLabels,
    getKitchenSinkZonePackageTotal,
    getDishwasherZonePackageTotal,
    getShowerZonePackageTotal,
    getInstallRelocationZoneTotal,
    onIncludeBathroomSetChange,
    onIncludeBathChange,
    onIncludeHygienicShowerChange,
    onIncludeElectricTowelRailChange,
    onIncludeKitchenSinkChange,
    onKitchenSinkPackageLevelChange,
    onIncludeDishwasherOutputChange,
    onDishwasherPackageLevelChange,
    onIncludeShowerZoneChange,
    onShowerPackageLevelChange,
    onIncludeInstallRelocationChange,
    onIncludeWasherOutputChange,
    onIncludeWaterNodeChange,
    onIncludeLeakProtectionChange,
  } = usePlumbingEstimate({ rooms, roomInputs });
  const {
    doorOptions,
    doorsResult,
    doorCompositionItems,
    doorSummaryItems,
    onPackageTypeChange,
    onIncludeHandlesChange,
    onIncludePrivacyLocksChange,
    onIncludeLogisticsChange,
    onIncludeInstallationChange,
  } = useDoorsEstimate({ rooms, roomInputs });
  const {
    completionOptions,
    completionResult,
    completionSummaryItems,
    onIncludeKitchenBaseChange,
    onKitchenLengthMetersChange,
    onKitchenLengthMetersBlur,
    onIncludeKitchenAppliancePenalChange,
    onIncludeKitchenFridgePenalChange,
    onIncludeWardrobeChange,
    onIncludeBathroomFurnitureChange,
  } = useCompletionEstimate();
  const {
    appliancesOptions,
    appliancesResult,
    appliancesSummaryItems,
    getApplianceUnitPriceForKey,
    getApplianceLineTotal,
    onPackageLevelChange,
    onFridgeVariantChange,
    onApplianceIncludeChange,
    onQuantityChange,
    onQuantityBlur,
  } = useAppliancesEstimate();
  const {
    looseFurnitureOptions,
    looseFurnitureResult,
    looseFurnitureSummaryItems,
    getLooseFurnitureUnitPriceForKey,
    getLooseFurnitureLineTotal,
    onPackageLevelChange: onLooseFurniturePackageLevelChange,
    onLooseFurnitureIncludeChange,
    onQuantityChange: onLooseFurnitureQuantityChange,
    onQuantityBlur: onLooseFurnitureQuantityBlur,
  } = useLooseFurnitureEstimate();
  const {
    homeGoodsOptions,
    homeGoodsResult,
    homeGoodsSummaryItems,
    onIncludeCleaningChange,
    onIncludeHomeGoodsChange,
    onPackageLevelChange: onHomeGoodsPackageLevelChange,
  } = useHomeGoodsEstimate({ floorArea: totals.floorArea });
  const purgeRoomFromRelatedState = useCallback(
    (roomId: string) => {
      removeWarmFloorRoom(roomId);
      removeFlooringRoom(roomId);
      removeWallsRoom(roomId);
      removeCeilingRoom(roomId);
      removeElectricRoom(roomId);
    },
    [removeCeilingRoom, removeElectricRoom, removeFlooringRoom, removeWarmFloorRoom, removeWallsRoom],
  );
  const handleRemoveRoom = useCallback(
    (roomId: string) => removeRoom(roomId, purgeRoomFromRelatedState),
    [removeRoom, purgeRoomFromRelatedState],
  );
  const estimateResult = useMemo(
    () =>
      buildPublicEstimateResult({
        warmFloorResult,
        flooringResult,
        wallsResult,
        ceilingResult,
        electricResult,
        plumbingResult,
        doorsResult,
        completionResult,
        appliancesResult,
        looseFurnitureResult,
        homeGoodsResult,
        floorArea: totals.floorArea,
      }),
    [
      appliancesResult,
      looseFurnitureResult,
      homeGoodsResult,
      ceilingResult,
      completionResult,
      doorsResult,
      electricResult,
      flooringResult,
      plumbingResult,
      totals.floorArea,
      wallsResult,
      warmFloorResult,
    ],
  );

  const summaryItems = buildVolumeSummaryItems(totals);
  const compactVolumeItems = buildCompactVolumeItems(summaryItems);
  const estimateTotalItems = buildEstimateTotalItems(estimateResult.totals);
  const packageClassification = classifyEstimatePackage(estimateResult.totals.pricePerSquareMeter);

  const allEstimateSections: EstimateSection[] = [
    warmFloorResult.section,
    flooringResult.section,
    wallsResult.section,
    ceilingResult.section,
    electricResult.section,
    plumbingResult.section,
    doorsResult.section,
    completionResult.section,
    appliancesResult.section,
    looseFurnitureResult.section,
    homeGoodsResult.section,
  ];
  const specModalData = useMemo(
    () =>
      buildEstimateSpecModalData({
        specModal,
        allEstimateSections,
        estimateResult,
        plumbingOptions,
        plumbingResult,
      }),
    [allEstimateSections, estimateResult, plumbingOptions, plumbingResult, specModal],
  );

  function openSectionSpec(sectionId: EstimateSectionId) {
    setSpecModal({ kind: "section", sectionId });
  }

  function openFullSpec() {
    setSpecModal({ kind: "full" });
  }

  function closeSpecModal() {
    setSpecModal(null);
  }

  function handlePrintEstimate() {
    window.print();
  }

  function handlePrintVolumes() {
    document.body.classList.add("public-estimate-print-volumes");

    const cleanup = () => {
      document.body.classList.remove("public-estimate-print-volumes");
    };

    window.addEventListener("afterprint", cleanup, { once: true });
    window.print();
  }

  return (
    <main className="public-landing public-estimate-page">
      <header className="public-estimate-header">
        <a className="public-brand public-privacy-brand" href="/" aria-label="Danko, на главную">
          <img className="public-brand-mark" src="/brand/danko-logo-mark.png" alt="" aria-hidden="true" />
          <span className="public-brand-copy">
            <span className="public-brand-name">Danko</span>
            <span className="public-brand-subtitle">дизайн / отделка / комплектация</span>
          </span>
        </a>
        <a className="public-privacy-back" href="/">
          Вернуться на главную
        </a>
      </header>

      <section className="public-estimate public-estimate-workbench" aria-labelledby="public-estimate-title">
        <EstimateRail
          navigationItems={estimateNavigationItems}
          activeSectionId={activeEstimateSection}
          railScrollRef={estimateRailScrollRef}
          onNavigateToSection={scrollToEstimateSection}
          compactVolumeItems={compactVolumeItems}
          summaryItems={summaryItems}
          isMobileVolumesExpanded={isMobileVolumesExpanded}
          onToggleMobileVolumesExpanded={toggleMobileVolumesExpanded}
          onPrintVolumes={handlePrintVolumes}
        />

        <div className="public-estimate-card public-estimate-card-main">
          <div className="public-estimate-intro">
            <p className="public-section-kicker">Калькулятор ремонта</p>
            <h1 id="public-estimate-title">Расчёт стоимости ремонта</h1>
            <p className="public-estimate-subtitle">
              Задайте помещения и параметры объекта — геометрия и итоги обновляются автоматически по мере заполнения
              разделов.
            </p>
          </div>

          <ObjectSection
            className={getEstimateSectionClassName("estimate-object", activeEstimateSection)}
            stepLabel={formatEstimateStep("estimate-object")}
            objectMeta={objectMeta}
            textFieldProps={estimateTextFieldProps}
            onAddressChange={(event) =>
              setObjectMeta((current) => ({ ...current, address: event.target.value }))
            }
            onComplexNameChange={(event) =>
              setObjectMeta((current) => ({ ...current, complexName: event.target.value }))
            }
            onApartmentNumberChange={(event) =>
              setObjectMeta((current) => ({ ...current, apartmentNumber: event.target.value }))
            }
            onContactChange={(event) =>
              setObjectMeta((current) => ({ ...current, contact: event.target.value }))
            }
          />

          <GeometrySection
            className={getEstimateSectionClassName("estimate-geometry", activeEstimateSection)}
            stepLabel={formatEstimateStep("estimate-geometry")}
            geometryStepHint={GEOMETRY_STEP_HINT}
            ceilingHeightInput={ceilingHeightInput}
            numberFieldProps={estimateNumericFieldProps}
            onCeilingHeightChange={onCeilingHeightChange}
            onCeilingHeightBlur={onCeilingHeightBlur}
            rooms={rooms}
            roomGeometries={roomGeometries}
            enteringRoomIds={enteringRoomIds}
            removingRoomIds={removingRoomIds}
            onRoomNameChange={onRoomNameChange}
            onRoomAreaChange={onRoomAreaChange}
            onRoomAreaBlur={onRoomAreaBlur}
            onRoomDoorCountChange={onRoomDoorCountChange}
            onRoomDoorCountBlur={onRoomDoorCountBlur}
            onRoomWindowCountChange={onRoomWindowCountChange}
            onRoomWindowCountBlur={onRoomWindowCountBlur}
            onRemoveRoom={handleRemoveRoom}
            onAddRoom={addRoom}
          />

          <WarmFloorSection
            className={getEstimateSectionClassName("estimate-warm-floor", activeEstimateSection)}
            stepLabel={formatEstimateStep("estimate-warm-floor")}
            warmFloorMode={warmFloorMode}
            onSetWarmFloorMode={setWarmFloorMode}
            rooms={rooms}
            warmFloorRooms={warmFloorRooms}
            roomInputs={roomInputs}
            numberFieldProps={estimateNumericFieldProps}
            onWarmFloorRoomSelectedChange={onWarmFloorRoomSelectedChange}
            onWarmFloorAreaChange={onWarmFloorAreaChange}
            onWarmFloorAreaBlur={onWarmFloorAreaBlur}
            warmFloorSummaryItems={warmFloorSummaryItems}
            warmFloorResult={warmFloorResult}
            warmFloorModeLabel={warmFloorModeLabel}
            warmFloorConnectionLabel={warmFloorConnectionLabel}
            onOpenSectionSpec={() => openSectionSpec("warm_floor")}
          />

          <FlooringSection
            className={getEstimateSectionClassName("estimate-flooring", activeEstimateSection)}
            stepLabel={formatEstimateStep("estimate-flooring")}
            flooringResult={flooringResult}
            flooringRooms={flooringRooms}
            flooringOptions={flooringOptions}
            flooringCoveringOptions={flooringCoveringOptions}
            flooringPreparationOptions={flooringPreparationOptions}
            flooringLayoutOptions={flooringLayoutOptions}
            flooringPlinthOptions={flooringPlinthOptions}
            numberFieldProps={estimateNumericFieldProps}
            flooringSummaryItems={flooringSummaryItems}
            onFlooringRoomIncludedChange={onFlooringRoomIncludedChange}
            onFlooringCoveringChange={onFlooringCoveringChange}
            onFlooringPreparationChange={onFlooringPreparationChange}
            onFlooringLayoutChange={onFlooringLayoutChange}
            onFlooringOptionsChange={onFlooringOptionsChange}
            onFlooringThresholdCountChange={onFlooringThresholdCountChange}
            onFlooringThresholdCountBlur={onFlooringThresholdCountBlur}
            onOpenSectionSpec={() => openSectionSpec("flooring")}
          />

          <WallsSection
            className={getEstimateSectionClassName("estimate-walls", activeEstimateSection)}
            stepLabel={formatEstimateStep("estimate-walls")}
            wallsResult={wallsResult}
            wallsRooms={wallsRooms}
            wallsCoveringOptions={wallsCoveringOptions}
            wallsPreparationOptions={wallsPreparationOptions}
            wallsSummaryItems={wallsSummaryItems}
            onWallsRoomIncludedChange={onWallsRoomIncludedChange}
            onWallsCoveringChange={onWallsCoveringChange}
            onWallsPreparationChange={onWallsPreparationChange}
            onOpenSectionSpec={() => openSectionSpec("walls")}
          />

          <CeilingSection
            className={getEstimateSectionClassName("estimate-ceiling", activeEstimateSection)}
            stepLabel={formatEstimateStep("estimate-ceiling")}
            ceilingResult={ceilingResult}
            ceilingRooms={ceilingRooms}
            ceilingSummaryItems={ceilingSummaryItems}
            getCeilingLightDefaults={getCeilingLightDefaults}
            onCeilingRoomIncludedChange={onCeilingRoomIncludedChange}
            onCeilingPointLightsChange={onCeilingPointLightsChange}
            onOpenSectionSpec={() => openSectionSpec("ceiling")}
          />

          <ElectricSection
            className={getEstimateSectionClassName("estimate-electric", activeEstimateSection)}
            stepLabel={formatEstimateStep("estimate-electric")}
            electricResult={electricResult}
            electricRooms={electricRooms}
            electricOptions={electricOptions}
            electricSummaryItems={electricSummaryItems}
            onElectricRoomIncludedChange={onElectricRoomIncludedChange}
            onElectricKitchenOutputsChange={onElectricKitchenOutputsChange}
            onElectricSwitchboardChange={onElectricSwitchboardChange}
            onOpenSectionSpec={() => openSectionSpec("electric")}
          />

          <PlumbingSection
            className={getEstimateSectionClassName("estimate-plumbing", activeEstimateSection)}
            stepLabel={formatEstimateStep("estimate-plumbing")}
            plumbingCompositionItems={plumbingCompositionItems}
            plumbingSummaryItems={plumbingSummaryItems}
            plumbingOptions={plumbingOptions}
            plumbingResult={plumbingResult}
            kitchenSinkPackageLabels={kitchenSinkPackageLabels}
            dishwasherPackageLabels={dishwasherPackageLabels}
            showerPackageLabels={showerPackageLabels}
            getKitchenSinkZonePackageTotal={getKitchenSinkZonePackageTotal}
            getDishwasherZonePackageTotal={getDishwasherZonePackageTotal}
            getShowerZonePackageTotal={getShowerZonePackageTotal}
            getInstallRelocationZoneTotal={getInstallRelocationZoneTotal}
            onIncludeBathroomSetChange={onIncludeBathroomSetChange}
            onIncludeBathChange={onIncludeBathChange}
            onIncludeHygienicShowerChange={onIncludeHygienicShowerChange}
            onIncludeElectricTowelRailChange={onIncludeElectricTowelRailChange}
            onIncludeKitchenSinkChange={onIncludeKitchenSinkChange}
            onKitchenSinkPackageLevelChange={onKitchenSinkPackageLevelChange}
            onIncludeDishwasherOutputChange={onIncludeDishwasherOutputChange}
            onDishwasherPackageLevelChange={onDishwasherPackageLevelChange}
            onIncludeShowerZoneChange={onIncludeShowerZoneChange}
            onShowerPackageLevelChange={onShowerPackageLevelChange}
            onIncludeInstallRelocationChange={onIncludeInstallRelocationChange}
            onIncludeWasherOutputChange={onIncludeWasherOutputChange}
            onIncludeWaterNodeChange={onIncludeWaterNodeChange}
            onIncludeLeakProtectionChange={onIncludeLeakProtectionChange}
            onOpenSectionSpec={() => openSectionSpec("plumbing")}
          />

          <DoorsSection
            className={getEstimateSectionClassName("estimate-doors", activeEstimateSection)}
            stepLabel={formatEstimateStep("estimate-doors")}
            doorCompositionItems={doorCompositionItems}
            doorSummaryItems={doorSummaryItems}
            doorOptions={doorOptions}
            doorsResult={doorsResult}
            doorPackageOptions={doorPackageOptions}
            onPackageTypeChange={onPackageTypeChange}
            onIncludeHandlesChange={onIncludeHandlesChange}
            onIncludePrivacyLocksChange={onIncludePrivacyLocksChange}
            onIncludeLogisticsChange={onIncludeLogisticsChange}
            onIncludeInstallationChange={onIncludeInstallationChange}
            onOpenSectionSpec={() => openSectionSpec("doors")}
          />

          <CompletionSection
            className={getEstimateSectionClassName("estimate-completion", activeEstimateSection)}
            stepLabel={formatEstimateStep("estimate-completion")}
            completionOptions={completionOptions}
            completionResult={completionResult}
            completionSummaryItems={completionSummaryItems}
            numberFieldProps={estimateNumericFieldProps}
            onIncludeKitchenBaseChange={onIncludeKitchenBaseChange}
            onKitchenLengthMetersChange={onKitchenLengthMetersChange}
            onKitchenLengthMetersBlur={onKitchenLengthMetersBlur}
            onIncludeKitchenAppliancePenalChange={onIncludeKitchenAppliancePenalChange}
            onIncludeKitchenFridgePenalChange={onIncludeKitchenFridgePenalChange}
            onIncludeWardrobeChange={onIncludeWardrobeChange}
            onIncludeBathroomFurnitureChange={onIncludeBathroomFurnitureChange}
            onOpenSectionSpec={() => openSectionSpec("completion")}
          />

          <AppliancesSection
            className={getEstimateSectionClassName("estimate-appliances", activeEstimateSection)}
            stepLabel={formatEstimateStep("estimate-appliances")}
            appliancesOptions={appliancesOptions}
            appliancesSummaryItems={appliancesSummaryItems}
            appliancesResult={appliancesResult}
            numberFieldProps={estimateNumericFieldProps}
            getUnitPrice={getApplianceUnitPriceForKey}
            getLineTotal={getApplianceLineTotal}
            onPackageLevelChange={onPackageLevelChange}
            onFridgeVariantChange={onFridgeVariantChange}
            onApplianceIncludeChange={onApplianceIncludeChange}
            onQuantityChange={onQuantityChange}
            onQuantityBlur={onQuantityBlur}
            onOpenSectionSpec={() => openSectionSpec("appliances")}
          />

          <LooseFurnitureSection
            className={getEstimateSectionClassName("estimate-loose-furniture", activeEstimateSection)}
            stepLabel={formatEstimateStep("estimate-loose-furniture")}
            looseFurnitureOptions={looseFurnitureOptions}
            looseFurnitureSummaryItems={looseFurnitureSummaryItems}
            looseFurnitureResult={looseFurnitureResult}
            numberFieldProps={estimateNumericFieldProps}
            getUnitPrice={getLooseFurnitureUnitPriceForKey}
            getLineTotal={getLooseFurnitureLineTotal}
            onPackageLevelChange={onLooseFurniturePackageLevelChange}
            onLooseFurnitureIncludeChange={onLooseFurnitureIncludeChange}
            onQuantityChange={onLooseFurnitureQuantityChange}
            onQuantityBlur={onLooseFurnitureQuantityBlur}
            onOpenSectionSpec={() => openSectionSpec("loose_furniture")}
          />

          <HomeGoodsSection
            className={getEstimateSectionClassName("estimate-home-goods", activeEstimateSection)}
            stepLabel={formatEstimateStep("estimate-home-goods")}
            floorArea={totals.floorArea}
            homeGoodsOptions={homeGoodsOptions}
            homeGoodsSummaryItems={homeGoodsSummaryItems}
            homeGoodsResult={homeGoodsResult}
            onIncludeCleaningChange={onIncludeCleaningChange}
            onIncludeHomeGoodsChange={onIncludeHomeGoodsChange}
            onPackageLevelChange={onHomeGoodsPackageLevelChange}
            onOpenSectionSpec={() => openSectionSpec("home_goods")}
          />

          <CostsSection
            className={getEstimateSectionClassName("estimate-costs", activeEstimateSection)}
            stepLabel={formatEstimateStep("estimate-costs")}
            estimateTotalItems={estimateTotalItems}
            estimateResult={estimateResult}
            onOpenFullSpec={openFullSpec}
          />

          <EstimateActions />
        </div>

        <EstimatePassportSidebar
          summaryItems={summaryItems}
          estimateResult={estimateResult}
          packageClassification={packageClassification}
          onPrintVolumes={handlePrintVolumes}
          onOpenFullSpec={openFullSpec}
          onPrintEstimate={handlePrintEstimate}
        />
      </section>

      <EstimateMobileTotal
        total={estimateResult.totals.total}
        pricePerSquareMeter={estimateResult.totals.pricePerSquareMeter}
        onNavigateToCosts={() => scrollToEstimateSection("estimate-costs")}
      />

      <EstimateVolumesPrint summaryItems={summaryItems} />

      <EstimateSpecModal data={specModalData} onClose={closeSpecModal} />
    </main>
  );
}
