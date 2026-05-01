const PRESETS = [
  'Размер', 'Форма', 'Тип подсветки', 'Цвет подсветки',
  'Мощность', 'IP защита', 'Цвет рамки', 'Материал рамки',
  'Управление', 'Напряжение', 'Гарантия', 'Вес', 'Крепление',
];

export default function CharacteristicsEditor({ value, onChange }) {
  const activeNames = value.map((c) => c.name);

  const addPreset = (name) => {
    if (activeNames.includes(name)) return;
    onChange([...value, { name, value: '' }]);
  };

  const addCustom = () => onChange([...value, { name: '', value: '' }]);

  const update = (i, field, val) => {
    const next = [...value];
    next[i] = { ...next[i], [field]: val };
    onChange(next);
  };

  const remove = (i) => onChange(value.filter((_, idx) => idx !== i));

  return (
    <div>
      <div className="chips">
        {PRESETS.map((name) => (
          <button
            key={name}
            type="button"
            className={`chip ${activeNames.includes(name) ? 'on' : ''}`}
            onClick={() => addPreset(name)}
          >
            {activeNames.includes(name) ? '✓ ' : '+ '}
            {name}
          </button>
        ))}
      </div>

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
              <button type="button" className="char-del" onClick={() => remove(i)}>
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      <button type="button" className="btn btn-secondary btn-sm" onClick={addCustom}>
        + Своя характеристика
      </button>
    </div>
  );
}
