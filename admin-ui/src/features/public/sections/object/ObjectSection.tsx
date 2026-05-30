import type { ChangeEvent } from "react";
import type { estimateTextFieldProps } from "../../public-estimate-input";
import type { EstimateObjectMeta } from "../../estimate/context";

export type ObjectSectionProps = {
  className: string;
  stepLabel: string;
  objectMeta: EstimateObjectMeta;
  textFieldProps: typeof estimateTextFieldProps;
  onAddressChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onComplexNameChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onApartmentNumberChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onContactChange: (event: ChangeEvent<HTMLInputElement>) => void;
};

export function ObjectSection({
  className,
  stepLabel,
  objectMeta,
  textFieldProps,
  onAddressChange,
  onComplexNameChange,
  onApartmentNumberChange,
  onContactChange,
}: ObjectSectionProps) {
  return (
    <section id="estimate-object" className={className} aria-labelledby="public-estimate-object-title">
      <div className="public-estimate-object-head">
        <div>
          <span>{stepLabel}</span>
          <h2 id="public-estimate-object-title">Объект</h2>
        </div>
      </div>

      <div className="public-estimate-object-form">
        <label className="public-estimate-field">
          <span>Адрес объекта</span>
          <input
            className="public-estimate-input"
            value={objectMeta.address}
            {...textFieldProps}
            onChange={onAddressChange}
          />
        </label>

        <label className="public-estimate-field">
          <span>Название ЖК</span>
          <input
            className="public-estimate-input"
            placeholder="Необязательно"
            value={objectMeta.complexName}
            {...textFieldProps}
            onChange={onComplexNameChange}
          />
        </label>

        <label className="public-estimate-field">
          <span>Номер квартиры</span>
          <input
            className="public-estimate-input"
            value={objectMeta.apartmentNumber}
            {...textFieldProps}
            onChange={onApartmentNumberChange}
          />
        </label>

        <label className="public-estimate-field public-estimate-object-contact">
          <span>Контакт</span>
          <input
            className="public-estimate-input"
            placeholder="Телефон или имя + телефон"
            value={objectMeta.contact}
            {...textFieldProps}
            onChange={onContactChange}
          />
        </label>
      </div>
    </section>
  );
}
