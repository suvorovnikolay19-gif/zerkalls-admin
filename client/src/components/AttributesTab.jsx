import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { attributesApi } from '../api';
import { useToast } from '../ToastContext';

export default function AttributesTab() {
  const qc = useQueryClient();
  const toast = useToast();

  const [search, setSearch] = useState('');
  const [newAttrName, setNewAttrName] = useState('');
  const [addError, setAddError] = useState('');
  const [expanded, setExpanded] = useState({});
  const [newValues, setNewValues] = useState({});

  // Inline editing state
  const [editingAttr, setEditingAttr] = useState(null); // {id, value}
  const [editAttrError, setEditAttrError] = useState('');
  const [editingValue, setEditingValue] = useState(null); // {attrId, valueId, value}

  const { data: attributes = [], isLoading } = useQuery({
    queryKey: ['attributes'],
    queryFn: () => attributesApi.getAll().then((r) => r.data),
  });

  const addAttr = useMutation({
    mutationFn: (name) => attributesApi.create({ name }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['attributes'] });
      setNewAttrName('');
      setAddError('');
      toast('Характеристика добавлена');
    },
    onError: () => setAddError('Характеристика с таким названием уже существует'),
  });

  const updateAttr = useMutation({
    mutationFn: ({ id, name }) => attributesApi.update(id, { name }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['attributes'] });
      setEditingAttr(null);
      setEditAttrError('');
      toast('Переименовано');
    },
    onError: () => setEditAttrError('Такое название уже существует'),
  });

  const deleteAttr = useMutation({
    mutationFn: (id) => attributesApi.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['attributes'] }); toast('Удалено'); },
  });

  const reorder = useMutation({
    mutationFn: ({ id, direction }) => attributesApi.reorder(id, direction),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['attributes'] }),
  });

  const addValue = useMutation({
    mutationFn: ({ attrId, value }) => attributesApi.addValue(attrId, { value }),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['attributes'] });
      setNewValues((prev) => ({ ...prev, [vars.attrId]: '' }));
      toast('Вариант добавлен');
    },
  });

  const updateValue = useMutation({
    mutationFn: ({ attrId, valueId, value }) => attributesApi.updateValue(attrId, valueId, { value }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['attributes'] });
      setEditingValue(null);
      toast('Вариант обновлён');
    },
  });

  const deleteValue = useMutation({
    mutationFn: ({ attrId, valueId }) => attributesApi.deleteValue(attrId, valueId),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['attributes'] }); toast('Вариант удалён'); },
  });

  const toggle = (id) => setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));

  const handleAddAttr = () => {
    const name = newAttrName.trim();
    if (!name) return;
    const dup = attributes.some((a) => a.name.toLowerCase() === name.toLowerCase());
    if (dup) { setAddError('Характеристика с таким названием уже существует'); return; }
    setAddError('');
    addAttr.mutate(name);
  };

  const handleAddValue = (attrId) => {
    const v = (newValues[attrId] || '').trim();
    if (v) addValue.mutate({ attrId, value: v });
  };

  const startEditAttr = (attr) => {
    setEditingAttr({ id: attr.id, value: attr.name });
    setEditAttrError('');
  };

  const saveAttrEdit = () => {
    const name = editingAttr.value.trim();
    if (!name) return;
    const dup = attributes.some(
      (a) => a.name.toLowerCase() === name.toLowerCase() && a.id !== editingAttr.id
    );
    if (dup) { setEditAttrError('Такое название уже существует'); return; }
    updateAttr.mutate({ id: editingAttr.id, name });
  };

  const startEditValue = (attrId, v) => {
    setEditingValue({ attrId, valueId: v.id, value: v.value });
  };

  const saveValueEdit = () => {
    const value = editingValue.value.trim();
    if (!value) return;
    updateValue.mutate({ attrId: editingValue.attrId, valueId: editingValue.valueId, value });
  };

  const filteredAttrs = search
    ? attributes.filter((a) => a.name.toLowerCase().includes(search.toLowerCase()))
    : attributes;

  if (isLoading) return <div className="empty-state"><p>Загрузка...</p></div>;

  return (
    <div className="tab-content">
      <div className="tab-toolbar">
        <h2 className="tab-heading">Характеристики</h2>
        <div className="add-row">
          <input
            className="form-input"
            placeholder="Название (напр. Форма)"
            value={newAttrName}
            onChange={(e) => { setNewAttrName(e.target.value); setAddError(''); }}
            onKeyDown={(e) => e.key === 'Enter' && handleAddAttr()}
          />
          <button
            className="btn btn-primary"
            disabled={!newAttrName.trim() || addAttr.isPending}
            onClick={handleAddAttr}
          >
            + Добавить
          </button>
        </div>
      </div>
      {addError && <div className="form-error tab-error">{addError}</div>}

      {attributes.length > 0 && (
        <div className="tab-search-wrap">
          <input
            className="form-input search-input tab-search"
            placeholder="Поиск характеристик..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      )}

      {filteredAttrs.length === 0 && attributes.length === 0 ? (
        <div className="empty-state"><h3>Нет характеристик</h3><p>Добавьте первую характеристику выше</p></div>
      ) : filteredAttrs.length === 0 ? (
        <div className="empty-state"><p>Ничего не найдено</p></div>
      ) : (
        <div className="attr-list">
          {filteredAttrs.map((attr) => {
            const originalIdx = attributes.findIndex((a) => a.id === attr.id);
            const isEditingThisAttr = editingAttr?.id === attr.id;

            return (
              <div key={attr.id} className="attr-item">
                <div className="attr-header">
                  <div className="attr-priority">{originalIdx + 1}</div>

                  {isEditingThisAttr ? (
                    <>
                      <input
                        className="form-input attr-edit-input"
                        value={editingAttr.value}
                        autoFocus
                        onChange={(e) => { setEditingAttr({ ...editingAttr, value: e.target.value }); setEditAttrError(''); }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') saveAttrEdit();
                          if (e.key === 'Escape') { setEditingAttr(null); setEditAttrError(''); }
                        }}
                      />
                      <button className="btn btn-ghost btn-icon btn-sm edit-confirm" onClick={saveAttrEdit} title="Сохранить">✓</button>
                      <button className="btn btn-ghost btn-icon btn-sm" onClick={() => { setEditingAttr(null); setEditAttrError(''); }} title="Отмена">✗</button>
                    </>
                  ) : (
                    <>
                      <button type="button" className="attr-name-btn" onClick={() => toggle(attr.id)}>
                        <span className="attr-name-text">{attr.name}</span>
                        <span className="attr-values-count">{attr.values.length} вар.</span>
                        <span className="attr-chevron">{expanded[attr.id] ? '▲' : '▼'}</span>
                      </button>
                      <button className="btn btn-ghost btn-icon btn-sm pencil-btn" onClick={() => startEditAttr(attr)} title="Переименовать">✏</button>
                    </>
                  )}

                  <div className="attr-actions">
                    <button
                      className="btn btn-ghost btn-icon btn-sm reorder-btn"
                      onClick={() => reorder.mutate({ id: attr.id, direction: 'up' })}
                      disabled={originalIdx === 0 || reorder.isPending}
                      title="Повысить приоритет"
                    >↑</button>
                    <button
                      className="btn btn-ghost btn-icon btn-sm reorder-btn"
                      onClick={() => reorder.mutate({ id: attr.id, direction: 'down' })}
                      disabled={originalIdx === attributes.length - 1 || reorder.isPending}
                      title="Понизить приоритет"
                    >↓</button>
                    <button
                      className="btn btn-ghost btn-icon btn-sm char-del"
                      onClick={() => deleteAttr.mutate(attr.id)}
                      title="Удалить"
                    >✕</button>
                  </div>
                </div>

                {isEditingThisAttr && editAttrError && (
                  <div className="form-error attr-inline-error">{editAttrError}</div>
                )}

                {expanded[attr.id] && (
                  <div className="attr-values-panel">
                    {attr.values.length === 0 && (
                      <p className="attr-empty-vals">Вариантов пока нет</p>
                    )}
                    {attr.values.map((v) => {
                      const isEditingThisValue =
                        editingValue?.attrId === attr.id && editingValue?.valueId === v.id;
                      return (
                        <div key={v.id} className="attr-value-row">
                          {isEditingThisValue ? (
                            <>
                              <input
                                className="form-input attr-val-edit-input"
                                value={editingValue.value}
                                autoFocus
                                onChange={(e) => setEditingValue({ ...editingValue, value: e.target.value })}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') saveValueEdit();
                                  if (e.key === 'Escape') setEditingValue(null);
                                }}
                              />
                              <button className="btn btn-ghost btn-icon btn-sm edit-confirm" onClick={saveValueEdit} title="Сохранить">✓</button>
                              <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setEditingValue(null)} title="Отмена">✗</button>
                            </>
                          ) : (
                            <>
                              <span className="attr-value-text">{v.value}</span>
                              <div className="attr-value-actions">
                                <button
                                  type="button"
                                  className="btn btn-ghost btn-icon btn-sm pencil-btn"
                                  onClick={() => startEditValue(attr.id, v)}
                                  title="Редактировать"
                                >✏</button>
                                <button
                                  type="button"
                                  className="btn btn-ghost btn-icon btn-sm char-del"
                                  onClick={() => deleteValue.mutate({ attrId: attr.id, valueId: v.id })}
                                  title="Удалить"
                                >✕</button>
                              </div>
                            </>
                          )}
                        </div>
                      );
                    })}

                    <div className="attr-add-value">
                      <input
                        className="form-input"
                        placeholder="Новый вариант (напр. Круглая)"
                        value={newValues[attr.id] || ''}
                        onChange={(e) => setNewValues((prev) => ({ ...prev, [attr.id]: e.target.value }))}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddValue(attr.id)}
                      />
                      <button
                        className="btn btn-ghost btn-icon check-add-btn"
                        disabled={!(newValues[attr.id] || '').trim() || addValue.isPending}
                        onClick={() => handleAddValue(attr.id)}
                        title="Добавить вариант"
                      >✓</button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
