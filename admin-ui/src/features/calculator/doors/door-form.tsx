import { Button } from "./";
import { SelectField, TextField, trimFloat } from "./";
import type { DoorsCatalogPanelProps } from "./";

export function DoorsProjectDoorForm(props: DoorsCatalogPanelProps) {
  return (
    <form className="subpanel p-3 space-y-2" onSubmit={(event) => void props.handleProjectDoorSubmit(event)}>
      <div className="text-xs uppercase tracking-[0.16em] text-slate-500">Добавить дверь или проем</div>
      <div className="grid gap-2 md:grid-cols-3">
        <SelectField
          label="Типовой размер"
          value={props.projectDoorState.door_catalog_id}
          onChange={(value) => {
            const selected = props.projectDetail.door_catalog.find((item) => String(item.id) === value);
            props.setProjectDoorState((current) => ({
              ...current,
              door_catalog_id: value,
              title: selected?.title ?? current.title,
              width_mm: selected ? trimFloat(selected.width_mm) : current.width_mm,
              height_mm: selected ? trimFloat(selected.height_mm) : current.height_mm,
              thickness_mm:
                selected?.thickness_mm !== null && selected?.thickness_mm !== undefined
                  ? trimFloat(selected.thickness_mm)
                  : current.thickness_mm,
              purchase_price:
                selected?.purchase_price !== null && selected?.purchase_price !== undefined
                  ? trimFloat(selected.purchase_price)
                  : current.purchase_price,
              sale_price:
                selected?.sale_price !== null && selected?.sale_price !== undefined
                  ? trimFloat(selected.sale_price)
                  : current.sale_price,
              install_price:
                selected?.install_price !== null && selected?.install_price !== undefined
                  ? trimFloat(selected.install_price)
                  : current.install_price,
            }));
          }}
          options={[
            { value: "", label: "Без каталога" },
            ...props.projectDetail.door_catalog.map((item) => ({
              value: String(item.id),
              label: `${item.title} · ${trimFloat(item.area_m2)} м²`,
            })),
          ]}
        />
        <SelectField
          label="Тип"
          value={props.projectDoorState.opening_kind}
          onChange={(value) => props.setProjectDoorState((current) => ({ ...current, opening_kind: value }))}
          options={[
            { value: "door", label: "Дверь" },
            { value: "opening", label: "Проем без двери" },
            { value: "trim_only", label: "Проем с доборами/наличниками" },
          ]}
        />
        <TextField
          label="Название"
          value={props.projectDoorState.title}
          onChange={(value) => props.setProjectDoorState((current) => ({ ...current, title: value }))}
          placeholder="Если нужно своё название"
        />
      </div>

      <div className="grid gap-2 md:grid-cols-5">
        <TextField
          label="Ширина, мм"
          value={props.projectDoorState.width_mm}
          onChange={(value) => props.setProjectDoorState((current) => ({ ...current, width_mm: value }))}
        />
        <TextField
          label="Высота, мм"
          value={props.projectDoorState.height_mm}
          onChange={(value) => props.setProjectDoorState((current) => ({ ...current, height_mm: value }))}
        />
        <TextField
          label="Толщина, мм"
          value={props.projectDoorState.thickness_mm}
          onChange={(value) => props.setProjectDoorState((current) => ({ ...current, thickness_mm: value }))}
        />
        <SelectField
          label="Помещение A"
          value={props.projectDoorState.room_a_id}
          onChange={(value) => props.setProjectDoorState((current) => ({ ...current, room_a_id: value }))}
          options={[
            { value: "", label: "Не выбрано" },
            ...props.projectDetail.rooms.map((room) => ({ value: String(room.id), label: room.name })),
          ]}
        />
        <SelectField
          label="Помещение B"
          value={props.projectDoorState.room_b_id}
          onChange={(value) => props.setProjectDoorState((current) => ({ ...current, room_b_id: value }))}
          options={[
            { value: "", label: "Нет второй стороны" },
            ...props.projectDetail.rooms.map((room) => ({ value: String(room.id), label: room.name })),
          ]}
        />
      </div>
      <div className="grid gap-2 md:grid-cols-3">
        <TextField
          label="Закуп, ₽"
          value={props.projectDoorState.purchase_price}
          onChange={(value) => props.setProjectDoorState((current) => ({ ...current, purchase_price: value }))}
        />
        <TextField
          label="Продажа за дверь, ₽"
          value={props.projectDoorState.sale_price}
          onChange={(value) => props.setProjectDoorState((current) => ({ ...current, sale_price: value }))}
        />
        <TextField
          label="Монтаж, ₽"
          value={props.projectDoorState.install_price}
          onChange={(value) => props.setProjectDoorState((current) => ({ ...current, install_price: value }))}
        />
      </div>

      <TextField
        label="Примечание"
        value={props.projectDoorState.note}
        onChange={(value) => props.setProjectDoorState((current) => ({ ...current, note: value }))}
        placeholder="Например, проем без полотна, только доборы"
      />
      <div className="flex flex-wrap justify-end gap-2">
        {props.editingDoorId !== null ? (
          <Button type="button" variant="secondary" onClick={props.resetDoorForm}>
            Сбросить
          </Button>
        ) : null}
        <Button
          type="submit"
          disabled={
            props.busyKey === `calculator-project-door-create-${props.projectDetail.project.id}` ||
            (props.editingDoorId !== null && props.busyKey === `calculator-project-door-save-${props.editingDoorId}`)
          }
        >
          {props.editingDoorId !== null
            ? props.busyKey === `calculator-project-door-save-${props.editingDoorId}`
              ? "Сохраняю..."
              : "Сохранить дверь"
            : props.busyKey === `calculator-project-door-create-${props.projectDetail.project.id}`
              ? "Добавляю..."
              : "Добавить в проект"}
        </Button>
      </div>
    </form>
  );
}
