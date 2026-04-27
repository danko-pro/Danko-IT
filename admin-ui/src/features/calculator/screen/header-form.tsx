import type { UseCalculatorProjectControllerResult } from "../project/use";
import { LIFT_OPTIONS } from "./header-data";

type CalculatorProjectForm = UseCalculatorProjectControllerResult;

type CompactTextFieldProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
};

type CompactSelectFieldProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  options: Array<{ value: string; label: string }>;
};

function CompactTextField(props: CompactTextFieldProps) {
  return (
    <label className="calculator-inline-field">
      <span className="calculator-inline-field-prefix">{props.placeholder}</span>
      <input
        className="calculator-inline-field-input"
        value={props.value}
        onChange={(event) => props.onChange(event.target.value)}
        aria-label={props.placeholder}
      />
    </label>
  );
}

function CompactSelectField(props: CompactSelectFieldProps) {
  return (
    <label className="calculator-inline-field">
      <span className="calculator-inline-field-prefix">{props.placeholder}</span>
      <select
        className="calculator-inline-field-select"
        value={props.value}
        onChange={(event) => props.onChange(event.target.value)}
        aria-label={props.placeholder}
      >
        <option value="">Не выбрано</option>
        {props.options
          .filter((option) => option.value !== "")
          .map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
      </select>
    </label>
  );
}

export function ObjectIdentityCard(props: { projectForm: CalculatorProjectForm }) {
  const { projectForm } = props;

  return (
    <div className="calculator-object-form">
      <CompactTextField value={projectForm.projectName} onChange={projectForm.setProjectName} placeholder="Название объекта" />
      <CompactTextField
        value={projectForm.residentialComplex}
        onChange={projectForm.setResidentialComplex}
        placeholder="Название ЖК"
      />
      <CompactTextField value={projectForm.projectAddress} onChange={projectForm.setProjectAddress} placeholder="Адрес" />
      <CompactTextField
        value={projectForm.entranceSection}
        onChange={projectForm.setEntranceSection}
        placeholder="Подъезд / секция"
      />
      <div className="calculator-object-form-pair calculator-object-form-pair-compact">
        <CompactTextField value={projectForm.floorNumber} onChange={projectForm.setFloorNumber} placeholder="Этаж" />
        <CompactTextField value={projectForm.unitNumber} onChange={projectForm.setUnitNumber} placeholder="Квартира" />
      </div>
    </div>
  );
}

export function ObjectAccessCard(props: { projectForm: CalculatorProjectForm }) {
  const { projectForm } = props;

  return (
    <div className="calculator-object-form">
      <div className="calculator-object-form-pair">
        <CompactSelectField value={projectForm.liftType} onChange={projectForm.setLiftType} placeholder="Лифт" options={LIFT_OPTIONS} />
        <CompactTextField value={projectForm.accessMode} onChange={projectForm.setAccessMode} placeholder="Доступ" />
      </div>
      <CompactTextField
        value={projectForm.intercomCode}
        onChange={projectForm.setIntercomCode}
        placeholder="Домофон / код"
      />
      <CompactTextField
        value={projectForm.loadingZone}
        onChange={projectForm.setLoadingZone}
        placeholder="Парковка / разгрузка"
      />
      <CompactTextField
        value={projectForm.responsiblePerson}
        onChange={projectForm.setResponsiblePerson}
        placeholder="Ответственный"
      />
      <CompactTextField value={projectForm.projectNote} onChange={projectForm.setProjectNote} placeholder="Заметка" />
    </div>
  );
}
