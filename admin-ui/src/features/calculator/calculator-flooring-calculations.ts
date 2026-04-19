import { toInteger, toNumber, trimFloat } from "./calculator-shared";
import type {
  CalculatorFlooringConfig,
  CalculatorFlooringDetail,
  CalculatorFlooringSpecItem,
  CalculatorFlooringSummary,
  FlooringEditState,
} from "./calculator-types";

// Расчёты и подготовка состояния для напольных покрытий.
// Модуль держит только flooring-логику и не знает о других сценариях калькулятора.

export function buildFlooringState(detail: CalculatorFlooringDetail, draft: FlooringEditState | null = null): FlooringEditState {
  const draftRooms = new Map((draft?.rooms ?? []).map((room) => [room.room_id, room]));
  return {
    include_underlay: draft?.include_underlay ?? Boolean(detail.config.include_underlay),
    include_plinth: draft?.include_plinth ?? Boolean(detail.config.include_plinth),
    include_demolition: draft?.include_demolition ?? Boolean(detail.config.include_demolition),
    include_preparation: draft?.include_preparation ?? Boolean(detail.config.include_preparation),
    demolition_price_per_m2: draft?.demolition_price_per_m2 ?? trimFloat(detail.config.demolition_price_per_m2),
    underlay_price_per_m2: draft?.underlay_price_per_m2 ?? trimFloat(detail.config.underlay_price_per_m2),
    plinth_material_price_per_m: draft?.plinth_material_price_per_m ?? trimFloat(detail.config.plinth_material_price_per_m),
    plinth_install_price_per_m: draft?.plinth_install_price_per_m ?? trimFloat(detail.config.plinth_install_price_per_m),
    threshold_profile_count: draft?.threshold_profile_count ?? trimFloat(detail.config.threshold_profile_count),
    threshold_profile_price: draft?.threshold_profile_price ?? trimFloat(detail.config.threshold_profile_price),
    rooms: detail.rooms.map((room) => {
      const draftRoom = draftRooms.get(room.room_id);
      return {
        room_id: room.room_id,
        selected: draftRoom?.selected ?? room.selected,
        covering_id: draftRoom?.covering_id ?? (room.covering_id === null ? "" : String(room.covering_id)),
        preparation_id: draftRoom?.preparation_id ?? (room.preparation_id === null ? "" : String(room.preparation_id)),
        layout_id: draftRoom?.layout_id ?? (room.layout_id === null ? "" : String(room.layout_id)),
        area_m2_override: draftRoom?.area_m2_override ?? (room.area_m2_override === null ? "" : trimFloat(room.area_m2_override)),
        perimeter_m_override: draftRoom?.perimeter_m_override ?? (room.perimeter_m_override === null ? "" : trimFloat(room.perimeter_m_override)),
        plinth_m_override: draftRoom?.plinth_m_override ?? (room.plinth_m_override === null ? "" : trimFloat(room.plinth_m_override)),
        note: draftRoom?.note ?? (room.note ?? ""),
      };
    }),
  };
}

export function buildFlooringPreview(
  detail: CalculatorFlooringDetail,
  state: FlooringEditState,
): CalculatorFlooringDetail {
  const config: CalculatorFlooringConfig = {
    project_id: detail.config.project_id,
    include_underlay: state.include_underlay,
    include_plinth: state.include_plinth,
    include_demolition: state.include_demolition,
    include_preparation: state.include_preparation,
    demolition_price_per_m2: Math.max(0, toNumber(state.demolition_price_per_m2) ?? detail.config.demolition_price_per_m2),
    underlay_price_per_m2: Math.max(0, toNumber(state.underlay_price_per_m2) ?? detail.config.underlay_price_per_m2),
    plinth_material_price_per_m: Math.max(0, toNumber(state.plinth_material_price_per_m) ?? detail.config.plinth_material_price_per_m),
    plinth_install_price_per_m: Math.max(0, toNumber(state.plinth_install_price_per_m) ?? detail.config.plinth_install_price_per_m),
    threshold_profile_count: Math.max(0, toInteger(state.threshold_profile_count) ?? detail.config.threshold_profile_count),
    threshold_profile_price: Math.max(0, toNumber(state.threshold_profile_price) ?? detail.config.threshold_profile_price),
  };

  const stateRooms = new Map(state.rooms.map((room) => [room.room_id, room]));
  const coveringsById = new Map(detail.coverings.map((item) => [item.id, item]));
  const preparationsById = new Map(detail.preparations.map((item) => [item.id, item]));
  const layoutsById = new Map(detail.layouts.map((item) => [item.id, item]));

  const summary: CalculatorFlooringSummary = {
    rooms_count: 0,
    total_area_m2: 0,
    total_purchase_area_m2: 0,
    total_material_cost: 0,
    total_installation_cost: 0,
    total_preparation_work_cost: 0,
    total_preparation_material_cost: 0,
    total_preparation_cost: 0,
    total_underlay_qty: 0,
    underlay_unit: "РјВІ",
    total_underlay_cost: 0,
    total_glue_qty: 0,
    glue_unit: "РєРі",
    total_glue_cost: 0,
    total_primer_qty: 0,
    primer_unit: "Р»",
    total_primer_cost: 0,
    total_svp_qty: 0,
    svp_unit: "С€С‚",
    total_svp_cost: 0,
    total_grout_qty: 0,
    grout_unit: "РєРі",
    total_grout_cost: 0,
    total_plinth_m: 0,
    total_plinth_material_cost: 0,
    total_plinth_install_cost: 0,
    total_demolition_cost: 0,
    threshold_profile_count: config.threshold_profile_count,
    threshold_profile_cost: 0,
    total_instrument_cost: 0,
    work_total: 0,
    material_total: 0,
    grand_total: 0,
    price_per_m2: null,
  };

  const specMap = new Map<string, CalculatorFlooringSpecItem>();
  const addSpec = (kind: "work" | "material", title: string, unit: string, quantity: number, amount: number) => {
    if (quantity <= 0 || amount <= 0) {
      return;
    }
    const key = `${kind}|${title}|${unit}`;
    const current = specMap.get(key);
    if (current) {
      current.quantity += quantity;
      current.amount += amount;
      return;
    }
    specMap.set(key, { kind, title, unit, quantity, amount });
  };

  const rooms = detail.rooms.map((room) => {
    const edit = stateRooms.get(room.room_id);
    const selected = edit?.selected ?? room.selected;
    const coveringId = edit ? toInteger(edit.covering_id) : room.covering_id;
    const preparationId = edit ? toInteger(edit.preparation_id) : room.preparation_id;
    const layoutId = edit ? toInteger(edit.layout_id) : room.layout_id;
    const covering = coveringId === null ? null : coveringsById.get(coveringId) ?? null;
    const preparation = preparationId === null ? null : preparationsById.get(preparationId) ?? null;
    const layout = layoutId === null ? null : layoutsById.get(layoutId) ?? null;

    const areaOverride = edit ? toNumber(edit.area_m2_override) : room.area_m2_override;
    const perimeterOverride = edit ? toNumber(edit.perimeter_m_override) : room.perimeter_m_override;
    const plinthOverride = edit ? toNumber(edit.plinth_m_override) : room.plinth_m_override;

    const effectiveArea = selected ? Math.max(0, areaOverride ?? room.base_area_m2) : 0;
    const effectivePerimeter = selected ? Math.max(0, perimeterOverride ?? room.base_perimeter_m) : 0;
    const plinthBase = selected ? Math.max(0, plinthOverride ?? effectivePerimeter) : 0;

    const baseWastePercent = covering?.base_waste_percent ?? 0;
    const extraWastePercent = layout?.extra_waste_percent ?? 0;
    const totalWastePercent = baseWastePercent + extraWastePercent;
    const purchaseArea = selected ? effectiveArea * (1 + totalWastePercent / 100) : 0;

    const materialPricePerM2 = covering?.material_price_per_m2 ?? 0;
    const baseLaborPricePerM2 = covering?.labor_price_per_m2 ?? 0;
    const layoutMultiplier = layout?.labor_multiplier ?? 1;
    const laborPricePerM2 = selected ? baseLaborPricePerM2 * layoutMultiplier : 0;

    const materialCost = purchaseArea * materialPricePerM2;
    const installationCost = effectiveArea * laborPricePerM2;

    let preparationWorkCost = 0;
    let preparationMaterialCost = 0;
    let preparationPrimerQty = 0;
    let preparationPrimerCost = 0;
    if (selected && preparation && Boolean(config.include_preparation)) {
      preparationWorkCost = effectiveArea * preparation.labor_price_per_m2;
      preparationMaterialCost = effectiveArea * preparation.material_price_per_m2;
      preparationPrimerQty = effectiveArea * preparation.primer_consumption_per_m2;
      preparationPrimerCost = preparationPrimerQty * preparation.primer_price_per_unit;
    }
    const preparationTotalCost = preparationWorkCost + preparationMaterialCost;

    let underlayQty = 0;
    let underlayCost = 0;
    if (selected && covering && Boolean(config.include_underlay) && covering.underlay_mode !== "none") {
      underlayQty = effectiveArea * (covering.underlay_consumption_per_m2 || 1);
      underlayCost = underlayQty * config.underlay_price_per_m2;
    }

    const glueQty = selected && covering ? purchaseArea * covering.glue_consumption_per_m2 : 0;
    const glueCost = selected && covering ? glueQty * covering.glue_price_per_unit : 0;
    const coveringPrimerQty = selected && covering ? purchaseArea * covering.primer_consumption_per_m2 : 0;
    const coveringPrimerCost = selected && covering ? coveringPrimerQty * covering.primer_price_per_unit : 0;
    const primerQty = preparationPrimerQty + coveringPrimerQty;
    const primerCost = preparationPrimerCost + coveringPrimerCost;
    const svpQty = selected && covering ? purchaseArea * covering.svp_consumption_per_m2 : 0;
    const svpCost = selected && covering ? svpQty * covering.svp_price_per_unit : 0;
    const groutQty = selected && covering ? purchaseArea * covering.grout_consumption_per_m2 : 0;
    const groutCost = selected && covering ? groutQty * covering.grout_price_per_unit : 0;

    let plinthM = 0;
    let plinthMaterialCost = 0;
    let plinthInstallCost = 0;
    if (selected && covering && Boolean(config.include_plinth) && Boolean(covering.needs_plinth)) {
      plinthM = plinthBase;
      plinthMaterialCost = plinthM * config.plinth_material_price_per_m;
      plinthInstallCost = plinthM * config.plinth_install_price_per_m;
    }

    const demolitionCost = selected && Boolean(config.include_demolition) ? effectiveArea * config.demolition_price_per_m2 : 0;
    const instrumentCost = selected && covering ? effectiveArea * covering.instrument_price_per_m2 : 0;
    const totalCost =
      materialCost +
      installationCost +
      preparationTotalCost +
      underlayCost +
      glueCost +
      primerCost +
      svpCost +
      groutCost +
      plinthMaterialCost +
      plinthInstallCost +
      demolitionCost +
      instrumentCost;

    if (selected) {
      summary.rooms_count += 1;
      summary.total_area_m2 += effectiveArea;
      summary.total_purchase_area_m2 += purchaseArea;
      summary.total_material_cost += materialCost;
      summary.total_installation_cost += installationCost;
      summary.total_preparation_work_cost += preparationWorkCost;
      summary.total_preparation_material_cost += preparationMaterialCost;
      summary.total_preparation_cost += preparationTotalCost;
      summary.total_underlay_qty += underlayQty;
      summary.total_underlay_cost += underlayCost;
      summary.total_glue_qty += glueQty;
      summary.total_glue_cost += glueCost;
      summary.total_primer_qty += primerQty;
      summary.total_primer_cost += primerCost;
      summary.total_svp_qty += svpQty;
      summary.total_svp_cost += svpCost;
      summary.total_grout_qty += groutQty;
      summary.total_grout_cost += groutCost;
      summary.total_plinth_m += plinthM;
      summary.total_plinth_material_cost += plinthMaterialCost;
      summary.total_plinth_install_cost += plinthInstallCost;
      summary.total_demolition_cost += demolitionCost;
      summary.total_instrument_cost += instrumentCost;
      if (covering?.glue_unit) {
        summary.glue_unit = covering.glue_unit;
      }
      if (preparation?.primer_unit) {
        summary.primer_unit = preparation.primer_unit;
      } else if (covering?.primer_unit) {
        summary.primer_unit = covering.primer_unit;
      }
      if (covering?.svp_unit) {
        summary.svp_unit = covering.svp_unit;
      }
      if (covering?.grout_unit) {
        summary.grout_unit = covering.grout_unit;
      }

      const layoutTitle = layout?.title ?? "РџСЂСЏРјР°СЏ";
      const coveringTitle = covering?.title ?? "РџРѕРєСЂС‹С‚РёРµ";
      addSpec("work", `РЈРєР»Р°РґРєР° ${coveringTitle}, ${layoutTitle.toLowerCase()}`, "РјВІ", effectiveArea, installationCost);
      addSpec("material", coveringTitle, "РјВІ", purchaseArea, materialCost);
      if (preparation && Boolean(config.include_preparation)) {
        addSpec("work", `РџРѕРґРіРѕС‚РѕРІРєР° РѕСЃРЅРѕРІР°РЅРёСЏ: ${preparation.title}`, "РјВІ", effectiveArea, preparationWorkCost);
        addSpec("material", `РњР°С‚РµСЂРёР°Р»С‹ РїРѕРґРіРѕС‚РѕРІРєРё: ${preparation.title}`, "РјВІ", effectiveArea, preparationMaterialCost);
      }
      addSpec("material", "РџРѕРґР»РѕР¶РєР°", "РјВІ", underlayQty, underlayCost);
      addSpec("material", "РљР»РµР№", covering?.glue_unit ?? "РєРі", glueQty, glueCost);
      addSpec("material", "Р“СЂСѓРЅС‚РѕРІРєР°", summary.primer_unit, primerQty, primerCost);
      addSpec("material", "РЎР’Рџ", covering?.svp_unit ?? "С€С‚", svpQty, svpCost);
      addSpec("material", "Р—Р°С‚РёСЂРєР°", covering?.grout_unit ?? "РєРі", groutQty, groutCost);
      addSpec("material", "РџР»РёРЅС‚СѓСЃ", "Рј.Рї.", plinthM, plinthMaterialCost);
      addSpec("work", "РњРѕРЅС‚Р°Р¶ РїР»РёРЅС‚СѓСЃР°", "Рј.Рї.", plinthM, plinthInstallCost);
      addSpec("work", "Р”РµРјРѕРЅС‚Р°Р¶ РЅР°РїРѕР»СЊРЅРѕРіРѕ РїРѕРєСЂС‹С‚РёСЏ", "РјВІ", effectiveArea, demolitionCost);
      addSpec("material", "Р Р°СЃС…РѕРґ РёРЅСЃС‚СЂСѓРјРµРЅС‚Р°", "РјВІ", effectiveArea, instrumentCost);
    }

    return {
      ...room,
      selected,
      covering_id: coveringId,
      covering_title: covering?.title ?? null,
      preparation_id: preparationId,
      preparation_title: preparation?.title ?? null,
      layout_id: layoutId,
      layout_title: layout?.title ?? null,
      effective_area_m2: effectiveArea,
      effective_perimeter_m: effectivePerimeter,
      plinth_m: plinthM,
      area_m2_override: areaOverride,
      perimeter_m_override: perimeterOverride,
      plinth_m_override: plinthOverride,
      base_waste_percent: baseWastePercent,
      extra_waste_percent: extraWastePercent,
      total_waste_percent: totalWastePercent,
      purchase_area_m2: purchaseArea,
      material_price_per_m2: materialPricePerM2,
      base_labor_price_per_m2: baseLaborPricePerM2,
      layout_multiplier: layoutMultiplier,
      labor_price_per_m2: laborPricePerM2,
      material_cost: materialCost,
      installation_cost: installationCost,
      preparation_work_cost: preparationWorkCost,
      preparation_material_cost: preparationMaterialCost,
      preparation_total_cost: preparationTotalCost,
      underlay_qty: underlayQty,
      underlay_cost: underlayCost,
      glue_qty: glueQty,
      glue_unit: covering?.glue_unit ?? "РєРі",
      glue_cost: glueCost,
      primer_qty: primerQty,
      primer_unit: summary.primer_unit,
      primer_cost: primerCost,
      svp_qty: svpQty,
      svp_unit: covering?.svp_unit ?? "С€С‚",
      svp_cost: svpCost,
      grout_qty: groutQty,
      grout_unit: covering?.grout_unit ?? "РєРі",
      grout_cost: groutCost,
      plinth_material_cost: plinthMaterialCost,
      plinth_install_cost: plinthInstallCost,
      demolition_cost: demolitionCost,
      instrument_cost: instrumentCost,
      total_cost: totalCost,
      note: edit?.note ?? room.note,
    };
  });

  if (summary.rooms_count > 0 && summary.threshold_profile_count > 0) {
    summary.threshold_profile_cost = summary.threshold_profile_count * config.threshold_profile_price;
    addSpec("material", "РџРѕСЂРѕР¶РµРє / СЃС‚С‹РєРѕРІРѕС‡РЅС‹Р№ РїСЂРѕС„РёР»СЊ", "С€С‚", summary.threshold_profile_count, summary.threshold_profile_cost);
  }

  summary.work_total =
    summary.total_installation_cost +
    summary.total_preparation_work_cost +
    summary.total_plinth_install_cost +
    summary.total_demolition_cost;
  summary.material_total =
    summary.total_material_cost +
    summary.total_preparation_material_cost +
    summary.total_underlay_cost +
    summary.total_glue_cost +
    summary.total_primer_cost +
    summary.total_svp_cost +
    summary.total_grout_cost +
    summary.total_plinth_material_cost +
    summary.threshold_profile_cost +
    summary.total_instrument_cost;
  summary.grand_total = summary.work_total + summary.material_total;
  summary.price_per_m2 = summary.total_area_m2 > 0 ? summary.grand_total / summary.total_area_m2 : null;

  return {
    config,
    coverings: detail.coverings,
    preparations: detail.preparations,
    layouts: detail.layouts,
    rooms,
    summary,
    specification: Array.from(specMap.values()),
  };
}
