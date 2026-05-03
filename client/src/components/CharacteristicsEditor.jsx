export default function CharacteristicsEditor({ value, onChange, attributes = [] }) {
  const updateAttr = (i, attrId) => {
    const attr = attributes.find((a) => a.id === attrId);
    const next = [...value];
    next[i] = { ...next[i], attribute_id: attrId, attribute_value_id: null, name: attr?.name || '', value: '' };
    onChange(next);
  };

  const updateVal = (i, text) => {
    const char = value[i];
    const attr = attributes.find((a) => a.id === char.attribute_id);
    const match = attr?.values?.find((v) => v.value === text);
    const next = [...value];
    next[i] = { ...next[i], value: text, attribute_value_id: match?.id ?? null };
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
            const listId = `char-vals-${i}`;
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

                <input
                  className="form-input"
                  list={selAttr?.values?.length ? listId : undefined}
                  placeholder={selAttr ? 'Значение...' : '—'}
                  value={char.value}
                  disabled={!selAttr}
                  onChange={(e) => updateVal(i, e.target.value)}
                />
                {selAttr?.values?.length > 0 && (
                  <datalist id={listId}>
                    {selAttr.values.map((v) => (
                      <option key={v.id} value={v.value} />
                    ))}
                  </datalist>
                )}

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
