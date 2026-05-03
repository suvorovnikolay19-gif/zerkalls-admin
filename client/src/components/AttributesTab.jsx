import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { attributesApi } from '../api';
import { useToast } from '../ToastContext';

const EditIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>
);

export default function AttributesTab() {
  const qc = useQueryClient();
  const toast = useToast();

  const [search, setSearch] = useState('');
  const [newAttrName, setNewAttrName] = useState('');
  const [addError, setAddError] = useState('');
  const [expanded, setExpanded] = useState({});
  const [newValues, setNewValues] = useState({});

  // Inline editing
  const [editingAttr, setEditingAttr] = useState(null);   // {id, value}
  const [editAttrError, setEditAttrError] = useState('');
  const [editingValue, setEditingValue] = useState(null); // {attrId, valueId, value}

  // Delete confirmations
  const [pendingDeleteAttr, setPendingDeleteAttr] = useState(null);   // attr.id
  const [pendingDeleteValue, setPendingDeleteValue] = useState(null); // {attrId, valueId}

  const { data: attributes = [], isLoading } = useQuery({
    queryKey: ['attributes'],
    queryFn: () => attributesApi.getAll().then((r) => r.data),
  });

  const addAttr = useMutation({
    mutationFn: (name) => attributesApi.create({ name }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['attributes'] }); setNewAttrName(''); setAddError(''); toast('Характеристика добавлена'); },
    onError: () => setAddError('Характеристика с таким названием уже существует'),
  });

  const updateAttr = useMutation({
    mutationFn: ({ id, name }) => attributesApi.update(id, { name }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['attributes'] }); setEditingAttr(null); setEditAttrError(''); toast('Переименовано'); },
    onError: () => setEditAttrError('Такое название уже существует'),
  });

  const deleteAttr = useMutation({
    mutationFn: (id) => attributesApi.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['attributes'] }); setPendingDeleteAttr(null); toast('Удалено'); },
  });

  const reorder = useMutation({
    mutationFn: ({ id, direction }) => attributesApi.reorder(id, direction),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['attributes'] }),
  });

  const addValue = useMutation({
    mutationFn: ({ attrId, value }) => attributesApi.addValue(attrId, { value }),
    onSuccess: (_, vars) => { qc.invalidateQueries({ queryKey: ['attributes'] }); setNewValues((p) => ({ ...p, [vars.attrId]: '' })); toast('Вариант добавлен'); },
  });

  const updateValue = useMutation({
    mutationFn: ({ attrId, valueId, value }) => attributesApi.updateValue(attrId, valueId, { value }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['attributes'] }); setEditingValue(null); toast('Вариант обновлён'); },
  });

  const deleteValue = useMutation({
    mutationFn: ({ attrId, valueId }) => attributesApi.deleteValue(attrId, valueId),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['attributes'] }); setPendingDeleteValue(null); toast('Вариант удалён'); },
  });

  const toggle = (id) => setExpanded((p) => ({ ...p, [id]: !p[id] }));

  const handleAddAttr = () => {
    const name = newAttrName.trim();
    if (!name) return;
    if (attributes.some((a) => a.name.toLowerCase() === name.toLowerCase())) {
      setAddError('Характеристика с таким названием уже существует'); return;
    }
    setAddError(''); addAttr.mutate(name);
  };

  const handleAddValue = (attrId) => {
    const v = (newValues[attrId] || '').trim();
    if (v) addValue.mutate({ attrId, value: v });
  };

  const startEditAttr = (attr) => { setEditingAttr({ id: attr.id, value: attr.name }); setEditAttrError(''); setPendingDeleteAttr(null); };
  const saveAttrEdit = () => {
    const name = editingAttr.value.trim();
    if (!name) return;
    if (attributes.some((a) => a.name.toLowerCase() === name.toLowerCase() && a.id !== editingAttr.id)) {
      setEditAttrError('Такое название уже существует'); return;
    }
    updateAttr.mutate({ id: editingAttr.id, name });
  };

  const startEditValue = (attrId, v) => { setEditingValue({ attrId, valueId: v.id, value: v.value }); setPendingDeleteValue(null); };
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
          <button className="btn btn-primary" disabled={!newAttrName.trim() || addAttr.isPending} onClick={handleAddAttr}>
            + Добавить
          </button>
        </div>
      </div>
      {addError && <div className="form-error tab-error">{addError}</div>}

      {attributes.length > 0 && (
        <div className="tab-search-wrap">
          <input className="form-input tab-search" placeholder="Поиск характеристик..." value={search} onChange={(e) => setSearch(e.target.value)} />
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
            const isPendingDelete = pendingDeleteAttr === attr.id;

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
                        onKeyDown={(e) => { if (e.key === 'Enter') saveAttrEdit(); if (e.key === 'Escape') { setEditingAttr(null); setEditAttrError(''); } }}
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
                      <button className="btn btn-ghost btn-icon btn-sm pencil-btn" onClick={() => startEditAttr(attr)} title="Переименовать">
                        <EditIcon />
                      </button>
                    </>
                  )}

                  <div className="attr-actions">
                    <button className="btn btn-ghost btn-icon btn-sm reorder-btn" onClick={() => reorder.mutate({ id: attr.id, direction: 'up' })} disabled={originalIdx === 0 || reorder.isPending} title="Повысить приоритет">↑</button>
                    <button className="btn btn-ghost btn-icon btn-sm reorder-btn" onClick={() => reorder.mutate({ id: attr.id, direction: 'down' })} disabled={originalIdx === attributes.length - 1 || reorder.isPending} title="Понизить приоритет">↓</button>
                    <button className="btn btn-ghost btn-icon btn-sm char-del" onClick={() => { setPendingDeleteAttr(attr.id); setEditingAttr(null); }} title="Удалить">✕</button>
                  </div>
                </div>

                {isEditingThisAttr && editAttrError && (
                  <div className="form-error attr-inline-error">{editAttrError}</div>
                )}

                {isPendingDelete && (
                  <div className="confirm-bar">
                    <span>Удалить «{attr.name}» и все её варианты?</span>
                    <button className="btn btn-secondary btn-sm" onClick={() => setPendingDeleteAttr(null)}>Нет</button>
                    <button className="btn btn-danger btn-sm" disabled={deleteAttr.isPending} onClick={() => deleteAttr.mutate(attr.id)}>Да, удалить</button>
                  </div>
                )}

                {expanded[attr.id] && (
                  <div className="attr-values-panel">
                    {attr.values.length === 0 && <p className="attr-empty-vals">Вариантов пока нет</p>}

                    {attr.values.map((v) => {
                      const isEditingVal = editingValue?.attrId === attr.id && editingValue?.valueId === v.id;
                      const isPendingDelVal = pendingDeleteValue?.attrId === attr.id && pendingDeleteValue?.valueId === v.id;

                      return (
                        <div key={v.id} className="attr-value-row">
                          {isEditingVal ? (
                            <>
                              <input
                                className="form-input attr-val-edit-input"
                                value={editingValue.value}
                                autoFocus
                                onChange={(e) => setEditingValue({ ...editingValue, value: e.target.value })}
                                onKeyDown={(e) => { if (e.key === 'Enter') saveValueEdit(); if (e.key === 'Escape') setEditingValue(null); }}
                              />
                              <button className="btn btn-ghost btn-icon btn-sm edit-confirm" onClick={saveValueEdit} title="Сохранить">✓</button>
                              <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setEditingValue(null)} title="Отмена">✗</button>
                            </>
                          ) : isPendingDelVal ? (
                            <>
                              <span className="attr-value-text del-pending-text">Удалить «{v.value}»?</span>
                              <div className="attr-value-actions">
                                <button className="btn btn-secondary btn-sm" onClick={() => setPendingDeleteValue(null)}>Нет</button>
                                <button className="btn btn-danger btn-sm" disabled={deleteValue.isPending} onClick={() => deleteValue.mutate({ attrId: attr.id, valueId: v.id })}>Да</button>
                              </div>
                            </>
                          ) : (
                            <>
                              <span className="attr-value-text">{v.value}</span>
                              <div className="attr-value-actions">
                                <button type="button" className="btn btn-ghost btn-icon btn-sm pencil-btn" onClick={() => startEditValue(attr.id, v)} title="Редактировать"><EditIcon /></button>
                                <button type="button" className="btn btn-ghost btn-icon btn-sm char-del" onClick={() => { setPendingDeleteValue({ attrId: attr.id, valueId: v.id }); setEditingValue(null); }} title="Удалить">✕</button>
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
                        onChange={(e) => setNewValues((p) => ({ ...p, [attr.id]: e.target.value }))}
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
