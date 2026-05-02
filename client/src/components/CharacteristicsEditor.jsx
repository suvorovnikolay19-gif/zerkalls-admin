export default function CharacteristicsEditor({ value, onChange }) {
  const update = (i, field, val) => {
    const next = [...value];
    next[i] = { ...next[i], [field]: val };
    onChange(next);
  };

  const remove = (i) => onChange(value.filter((_, idx) => idx !== i));

  const addCustom = () => onChange([...value, { name: '', value: '' }]);

  return (
    <div>
      {value.length > 0 && (
        <div className="char-rows">
          {value.map((char, i) => (
            <div key={i} className="char-row">
              <input
                className="form-input"
                placeholder="Характеристика"
                value={char.name}
                onChange={(e) => update(i, 'name', e.target.value)}
              />
              <input
                className="form-input"
                placeholder="Значение"
                value={char.value}
                onChange={(e) => update(i, 'value', e.target.value)}
              />
              <button type="button" className="char-del" onClick={() => remove(i)} title="Удалить">
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
      <button type="button" className="btn btn-secondary btn-sm" onClick={addCustom}>
        + Добавить характеристику
      </button>
    </div>
  );
}
