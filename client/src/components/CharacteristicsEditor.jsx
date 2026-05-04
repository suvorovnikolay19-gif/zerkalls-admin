import { useState } from 'react';

function findNode(nodes, id) {
  for (const n of nodes) {
    if (n.id === id) return n;
    const found = findNode(n.children || [], id);
    if (found) return found;
  }
  return null;
}

function getPathIds(nodes, id) {
  for (const n of nodes) {
    if (n.id === id) return [n.id];
    const sub = getPathIds(n.children || [], id);
    if (sub) return [n.id, ...sub];
  }
  return null;
}

function pathString(nodes, id) {
  const ids = getPathIds(nodes, id) || [];
  return ids.map((pid) => findNode(nodes, pid)?.value || '').join(' › ');
}

function CascadeSelect({ values, selectedId, onChange }) {
  if (!values || values.length === 0) return null;
  const pathIds = selectedId ? (getPathIds(values, selectedId) || []) : [];
  const levels = [];
  let current = values;
  for (let i = 0; ; i++) {
    if (current.length === 0) break;
    const sel = pathIds[i] ?? null;
    levels.push({ options: current, selectedId: sel });
    if (sel == null) break;
    const node = current.find((n) => n.id === sel);
    current = node?.children || [];
    if (current.length === 0) break;
  }
  return (
    <div className="cascade-select">
      {levels.map((level, i) => (
        <select
          key={i}
          className="form-input form-select cascade-level"
          value={level.selectedId ?? ''}
          onChange={(e) => {
            const newId = e.target.value ? parseInt(e.target.value) : null;
            const newPath = pathIds.slice(0, i).concat(newId ? [newId] : []);
            onChange(newPath.length > 0 ? newPath[newPath.length - 1] : null);
          }}
        >
          <option value="">— выбрать —</option>
          {level.options.map((v) => (
            <option key={v.id} value={v.id}>{v.value}</option>
          ))}
        </select>
      ))}
    </div>
  );
}

export default function CharacteristicsEditor({ value, onChange, attributes = [] }) {
  // customRows: indices of rows in "free text" mode (for non-strict attrs with tree values)
  const [customRows, setCustomRows] = useState(() => {
    const s = new Set();
    value.forEach((c, i) => {
      if (c.attribute_value_id == null && c.value && c.value.trim()) s.add(i);
    });
    return s;
  });

  // attrs already used (by attribute_id) across all rows
  const usedAttrIds = new Set(value.map((c) => c.attribute_id).filter(Boolean));

  // available attrs for a given row index: unused attrs + current row's own attr
  const availableAttrs = (i) => {
    const currId = value[i]?.attribute_id;
    return attributes.filter((a) => !usedAttrIds.has(a.id) || a.id === currId);
  };

  const shiftCustomRows = (afterIdx, delta) => {
    setCustomRows((prev) => {
      const s = new Set();
      prev.forEach((idx) => {
        if (delta > 0) s.add(idx <= afterIdx ? idx : idx + 1);
        else s.add(idx < afterIdx ? idx : idx > afterIdx ? idx - 1 : null);
      });
      s.delete(null);
      return s;
    });
  };

  const updateAttr = (i, attrId) => {
    const attr = attributes.find((a) => a.id === attrId);
    const next = [...value];
    next[i] = { ...next[i], attribute_id: attrId, attribute_value_id: null, name: attr?.name || '', value: '' };
    // leaving custom mode when changing attr
    setCustomRows((prev) => { const s = new Set(prev); s.delete(i); return s; });
    onChange(next);
  };

  const updateVal = (i, valueId) => {
    const char = value[i];
    const attr = attributes.find((a) => a.id === char.attribute_id);
    const next = [...value];
    next[i] = { ...next[i], attribute_value_id: valueId, value: valueId ? pathString(attr?.values || [], valueId) : '' };
    onChange(next);
  };

  const updateCustomText = (i, text) => {
    const next = [...value];
    next[i] = { ...next[i], value: text, attribute_value_id: null };
    onChange(next);
  };

  const toggleCustom = (i) => {
    const isCustom = customRows.has(i);
    if (isCustom) {
      setCustomRows((prev) => { const s = new Set(prev); s.delete(i); return s; });
      const next = [...value];
      next[i] = { ...next[i], value: '', attribute_value_id: null };
      onChange(next);
    } else {
      setCustomRows((prev) => new Set([...prev, i]));
      const next = [...value];
      next[i] = { ...next[i], attribute_value_id: null, value: '' };
      onChange(next);
    }
  };

  const remove = (i) => {
    shiftCustomRows(i, -1);
    onChange(value.filter((_, idx) => idx !== i));
  };

  // Add another value row for the same attribute, inserted right after row i
  const addAnotherValue = (i) => {
    const char = value[i];
    if (!char.attribute_id) return;
    const newRow = { attribute_id: char.attribute_id, attribute_value_id: null, name: char.name, value: '' };
    const next = [...value.slice(0, i + 1), newRow, ...value.slice(i + 1)];
    shiftCustomRows(i, 1);
    onChange(next);
  };

  const add = () => {
    onChange([...value, { attribute_id: null, attribute_value_id: null, name: '', value: '' }]);
  };

  return (
    <div>
      {value.length > 0 && (
        <div className="char-rows">
          {value.map((char, i) => {
            const selAttr = attributes.find((a) => a.id === char.attribute_id);
            const hasValues = (selAttr?.values || []).length > 0;
            const isStrict = selAttr?.strict_values ?? false;
            const isCustom = !isStrict && hasValues && customRows.has(i);
            // detect loaded-product custom values: has a value text but no tree id, attr has tree values
            const effectiveCustom = isCustom || (!isStrict && hasValues && !char.attribute_value_id && !!char.value);

            return (
              <div key={i} className="char-row">
                <select
                  className="form-input form-select char-row-attr"
                  value={char.attribute_id ?? ''}
                  onChange={(e) => updateAttr(i, e.target.value ? parseInt(e.target.value) : null)}
                >
                  <option value="">— характеристика —</option>
                  {availableAttrs(i).map((a) => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>

                <div className="char-row-val">
                  {selAttr && hasValues ? (
                    effectiveCustom ? (
                      <>
                        <input
                          className="form-input"
                          placeholder="Своё значение..."
                          value={char.value}
                          autoFocus
                          onChange={(e) => updateCustomText(i, e.target.value)}
                        />
                        <button
                          type="button"
                          className="char-mode-toggle"
                          onClick={() => toggleCustom(i)}
                          title="Выбрать из вариантов"
                        >↩</button>
                      </>
                    ) : (
                      <>
                        <CascadeSelect
                          values={selAttr.values}
                          selectedId={char.attribute_value_id}
                          onChange={(vid) => updateVal(i, vid)}
                        />
                        {!isStrict && (
                          <button
                            type="button"
                            className="char-mode-toggle"
                            onClick={() => toggleCustom(i)}
                            title="Ввести своё значение"
                          >✏</button>
                        )}
                      </>
                    )
                  ) : (
                    <input
                      className="form-input"
                      placeholder={selAttr ? (isStrict ? 'Нет вариантов' : 'Значение...') : '—'}
                      value={char.value}
                      disabled={!selAttr || isStrict}
                      onChange={(e) => updateCustomText(i, e.target.value)}
                    />
                  )}
                </div>

                <button
                  type="button"
                  className="char-add-val"
                  disabled={!char.attribute_id}
                  onClick={() => addAnotherValue(i)}
                  title="Добавить ещё значение для этой характеристики"
                >+</button>

                <button type="button" className="char-del" onClick={() => remove(i)} title="Удалить">✕</button>
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
