export default function CharacteristicsEditor({ value, onChange, attributes = [] }) {
  const updateAttr = (i, attrId) => {
    const attr = attributes.find((a) => a.id === attrId);
    const next = [...value];
    next[i] = { ...next[i], attribute_id: attrId, attribute_value_id: null, name: attr?.name || '', value: '' };
    onChange(next);
  };

  const updateVal = (i, valId) => {
    const char = value[i];
    const attr = attributes.find((a) => a.id === char.attribute_id);
    const av = attr?.values?.find((v) => v.id === valId);
    const next = [...value];
    next[i] = { ...next[i], attribute_value_id: valId, value: av?.value || '' };
    onChange(next);
  };

  const remove = (i) => onChange(value.filter((_, idx) => idx !== i));

  const add = () =>
    onChange([...value, { attribute_id: null, attribute_value_id: null, name: '', value: '' }]);

  return (
    <div>
      {value.length > 0 && (
        <div className="char-rows">
          {value.map((char, i) => {
            const selAttr = attributes.find((a) => a.id === char.attribute_id);
            return (
              <div key={i} className="char-row">
                <select
                  className="form-input form-select"
                  value={char.attribute_id ?? ''}
                  onChange={(e) => updateAttr(i, e.target.value ? parseInt(e.target.value) : null)}
                >
                  <option value="">— характеристика —</option>
                  {attributes.map((a) => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
                <select
                  className="form-input form-select"
                  value={char.attribute_value_id ?? ''}
                  onChange={(e) => updateVal(i, e.target.value ? parseInt(e.target.value) : null)}
                  disabled={!selAttr}
                >
                  <option value="">— значение —</option>
                  {selAttr?.values?.map((v) => (
                    <option key={v.id} value={v.id}>{v.value}</option>
                  ))}
                </select>
                <button type="button" className="char-del" onClick={() => remove(i)} title="Удалить">
                  ✕
                </button>
              </div>
            );
          })}
        </div>
      )}
      <button type="button" className="btn btn-secondary btn-sm" onClick={add}>
        + Добавить характеристику
      </button>
    </div>
  );
}
