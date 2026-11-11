type RadioSelectorProps = {
  label: string;
  options: string[];
  value: string;
  onChange: (value: string) => void;
  name: string;
};

export function RadioSelector({ label, options, value, onChange, name }: RadioSelectorProps) {
  return <fieldset className="radio-selector">
    <legend className="field-label">{label}</legend>
    <div className="radio-option-list">
      {options.map((option) => <label className="radio-option" key={option}>
        <input checked={value === option} name={name} onChange={() => onChange(option)} type="radio" value={option} />
        <span aria-hidden="true" className="radio-mark" />
        <span>{option}</span>
      </label>)}
    </div>
  </fieldset>;
}
