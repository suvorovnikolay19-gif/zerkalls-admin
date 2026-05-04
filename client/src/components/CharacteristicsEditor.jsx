import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

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

function flattenTree(nodes, prefix = '') {
  const items = [];
  for (const n of nodes) {
    const label = prefix ? `${prefix} › ${n.value}` : n.value;
    items.push({ id: n.id, label });
    if (n.children?.length) items.push(...flattenTree(n.children, label));
  }
  return items;
}

function FlyoutItem({ node, onSelect, usedIds }) {
  const [subOpen, setSubOpen] = useState(false);
  const [subPos, setSubPos] = useState({ top: 0, left: 0 });
  const itemRef = useRef(null);
  const closeTimer = useRef(null);
  const hasChildren = (node.children || []).length > 0;
  const isUsed = usedIds.has(node.id);

  const clearClose = () => { if (closeTimer.current) clearTimeout(closeTimer.current); };
  const scheduleClose = () => { closeTimer.current = setTimeout(() => setSubOpen(false), 180); };

  const showSub = () => {
    clearClose();
    if (itemRef.current) {
      const r = itemRef.current.getBoundingClientRect();
      setSubPos({ top: r.top - 4, left: r.right + 4 });
    }
    setSubOpen(true);
  };

  useEffect(() => () => clearClose(), []);

  return (
    <>
      <div
        ref={itemRef}
        className={`val-dropdown-item${subOpen ? ' active' : ''}${isUsed ? ' used' : ''}`}
        onMouseEnter={() => { if (hasChildren) showSub(); else clearClose(); }}
        onMouseLeave={() => { if (hasChildren) scheduleClose(); }}
        onClick={() => { if (!isUsed) onSelect(node.id); }}
        data-picker
      >
        <span className="val-item-text">{node.value}</span>
        {isUsed && <span className="val-item-used">✓</span>}
        {!isUsed && hasChildren && <span className="val-item-arrow">›</span>}
      </div>
      {subOpen && hasChildren && createPortal(
        <div
          className="val-picker-dropdown"
          style={{ position: 'fixed', top: subPos.top, left: subPos.left, minWidth: 200 }}
          onMouseEnter={clearClose}
          onMouseLeave={scheduleClose}
          data-picker
        >
          {node.children.map((child) => (
            <FlyoutItem key={child.id} node={child} onSelect={onSelect} usedIds={usedIds} />
          ))}
        </div>,
        document.body
      )}
    </>
  );
}

function ValueFlyoutPicker({ values, selectedId, selectedText, onSelectId, onSelectText, isStrict, usedIds = new Set() }) {
  const [open, setOpen] = useState(false);
  const [dropPos, setDropPos] = useState({ top: 0, left: 0, width: 0 });
  const [query, setQuery] = useState('');
  const inputRef = useRef(null);

  const displayLabel = selectedId ? pathString(values, selectedId) : (selectedText || '');
  const allFlat = flattenTree(values);
  const filtered = query
    ? allFlat.filter((item) => item.label.toLowerCase().includes(query.toLowerCase()))
    : [];

  const openDrop = () => {
    if (inputRef.current) {
      const r = inputRef.current.getBoundingClientRect();
      setDropPos({ top: r.bottom + 3, left: r.left, width: r.width });
    }
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (!e.target.closest('[data-picker]')) {
        setOpen(false);
        setQuery('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const handleSelect = (id) => {
    if (usedIds.has(id)) return;
    onSelectId(id);
    setOpen(false);
    setQuery('');
  };

  return (
    <div className="val-picker" data-picker>
      <input
        ref={inputRef}
        className="form-input val-picker-input"
        placeholder="Значение..."
        value={open ? query : displayLabel}
        readOnly={isStrict}
        style={isStrict ? { cursor: 'pointer' } : undefined}
        onFocus={openDrop}
        onClick={openDrop}
        onChange={(e) => {
          if (isStrict) return;
          const t = e.target.value;
          setQuery(t);
          setOpen(true);
          onSelectText(t);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Escape') { setOpen(false); setQuery(''); }
          if (e.key === 'Enter' && query && filtered.length > 0) handleSelect(filtered[0].id);
        }}
        data-picker
      />
      {open && createPortal(
        <div
          className="val-picker-dropdown"
          style={{ position: 'fixed', top: dropPos.top, left: dropPos.left, width: dropPos.width }}
          data-picker
        >
          {query ? (
            filtered.length > 0 ? (
              filtered.map((item) => (
                <div
                  key={item.id}
                  className={`val-dropdown-item${usedIds.has(item.id) ? ' used' : ''}`}
                  onClick={() => handleSelect(item.id)}
                  data-picker
                >
                  <span className="val-item-text">{item.label}</span>
                  {usedIds.has(item.id) && <span className="val-item-used">✓</span>}
                </div>
              ))
            ) : (
              <div className="val-dropdown-empty">Нет совпадений</div>
            )
          ) : values.length > 0 ? (
            values.map((v) => (
              <FlyoutItem key={v.id} node={v} onSelect={handleSelect} usedIds={usedIds} />
            ))
          ) : (
            <div className="val-dropdown-empty">Нет вариантов</div>
          )}
        </div>,
        document.body
      )}
    </div>
  );
}

export default function CharacteristicsEditor({ value, onChange, attributes = [] }) {
  const usedAttrIds = new Set(value.map((c) => c.attribute_id).filter(Boolean));

  const availableAttrs = (i) => {
    const currId = value[i]?.attribute_id;
    return attributes.filter((a) => !usedAttrIds.has(a.id) || a.id === currId);
  };

  const updateAttr = (i, attrId) => {
    const attr = attributes.find((a) => a.id === attrId);
    const next = [...value];
    next[i] = { attribute_id: attrId, attribute_value_id: null, name: attr?.name || '', value: '' };
    onChange(next);
  };

  const updateVal = (i, valueId) => {
    const char = value[i];
    const attr = attributes.find((a) => a.id === char.attribute_id);
    const next = [...value];
    next[i] = {
      ...next[i],
      attribute_value_id: valueId,
      value: valueId ? pathString(attr?.values || [], valueId) : '',
    };
    onChange(next);
  };

  const updateText = (i, text) => {
    const next = [...value];
    next[i] = { ...next[i], value: text, attribute_value_id: null };
    onChange(next);
  };

  const remove = (i) => { onChange(value.filter((_, idx) => idx !== i)); };

  const addAnotherValue = (i) => {
    const char = value[i];
    if (!char.attribute_id) return;
    const newRow = { attribute_id: char.attribute_id, attribute_value_id: null, name: char.name, value: '' };
    onChange([...value.slice(0, i + 1), newRow, ...value.slice(i + 1)]);
  };

  const add = () => {
    onChange([...value, { attribute_id: null, attribute_value_id: null, name: '', value: '' }]);
  };

  return (
    <div>
      {value.length > 0 && (
        <div className="char-rows">
          {value.map((char, i) => {
            const isCont = i > 0 && char.attribute_id != null && char.attribute_id === value[i - 1]?.attribute_id;
            const selAttr = attributes.find((a) => a.id === char.attribute_id);
            const hasValues = (selAttr?.values || []).length > 0;
            const isStrict = selAttr?.strict_values ?? false;
            const siblingUsedIds = new Set(
              value
                .filter((c, idx) => idx !== i && c.attribute_id === char.attribute_id && c.attribute_value_id != null)
                .map((c) => c.attribute_value_id)
            );

            return (
              <div key={i} className={`char-row${isCont ? ' char-row-cont' : ''}`}>
                {isCont ? (
                  <div className="char-row-attr char-row-attr-cont">—</div>
                ) : (
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
                )}

                <div className="char-row-val">
                  {selAttr && hasValues ? (
                    <ValueFlyoutPicker
                      values={selAttr.values}
                      selectedId={char.attribute_value_id}
                      selectedText={char.value}
                      onSelectId={(id) => updateVal(i, id)}
                      onSelectText={(text) => updateText(i, text)}
                      isStrict={isStrict}
                      usedIds={siblingUsedIds}
                    />
                  ) : (
                    <input
                      className="form-input"
                      placeholder={selAttr ? (isStrict ? 'Нет вариантов' : 'Значение...') : '—'}
                      value={char.value}
                      disabled={!selAttr || isStrict}
                      onChange={(e) => updateText(i, e.target.value)}
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
