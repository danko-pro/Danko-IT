import type { FamilyDetail } from "../../shared/types";
import { formatSkuDimensions } from "../../shared/utils";

type MaterialsDetailSkusSectionProps = {
  skus: FamilyDetail["skus"];
};

export function MaterialsDetailSkusSection(props: MaterialsDetailSkusSectionProps) {
  return (
    <div className="subpanel p-4">
      <div className="panel-header">
        <div>
          <div className="eyebrow">SKU</div>
          <h3 className="section-title mt-1.5">Закупаемые позиции</h3>
        </div>
        <span className="slot-chip">{props.skus.length}</span>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-[0.16em] text-slate-500">
              <th className="pb-3 font-medium">Позиция</th>
              <th className="pb-3 font-medium">Бренд</th>
              <th className="pb-3 font-medium">Артикул</th>
              <th className="pb-3 font-medium">Параметры</th>
            </tr>
          </thead>
          <tbody>
            {props.skus.map((sku) => (
              <tr key={sku.id} className="border-b border-slate-100 align-top">
                <td className="py-3 pr-4 text-slate-900">{sku.title}</td>
                <td className="py-3 pr-4 text-slate-600">{sku.brand ?? "—"}</td>
                <td className="py-3 pr-4 text-slate-600">{sku.supplier_article ?? "—"}</td>
                <td className="py-3 text-slate-600">{formatSkuDimensions(sku)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!props.skus.length ? <div className="mt-3 empty-state">SKU пока не заведены.</div> : null}
    </div>
  );
}
