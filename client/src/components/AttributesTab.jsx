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

const PlusChildIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
);

const LockIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
  </svg>
);

const UnlockIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/>
  </svg>
);

function countAll(nodes) {
  return nodes.reduce((s, n) => s + 1 + countAll(n.children || []), 0);
}

export default function AttributesTab() {
  const qc = useQueryClient();
  const toast = useToast();

  const [search, setSearch] = useState('');
  const [newAttrName, setNewAttrName] = useState('');
  const [addError, setAddError] = useState('');
  const [expanded, setExpanded] = useState({});
  const [expandedValues, setExpandedValues] = useState({});

  // Single "add value" form: {attrId, parentId: null|number}
  const [addingFor, setAddingFor] = useState(null);
  const [addingText, setAddingText] = useState('');

  const [editingAttr, setEditingAttr] = useState(null);
  const [editAttrError, setEditAttrError] = useState('');
  const [editingValue, setEditingValue] = useState(null); // {attrId, valueId, value}

  const [pendingDeleteAttr, setPendingDeleteAttr] = useState(null);
  const [pendingDeleteValue, setPendingDeleteValue] = useState(null); // {attrId, valueId, label}

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
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['attributes'] });
      setPendingDeleteAttr(null);
      toast('Удалено');
    },
  });

  const reorder = useMutation({
    mutationFn: ({ id, direction }) => attributesApi.reorder(id, direction),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['attributes'] }),
    onError: () => toast('Ошибка изменения порядка'),
  });

  const setStrict = useMutation({
    mutationFn: ({ id, strict_values }) => attributesApi.setStrict(id, strict_values),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['attributes'] }),
    onError: () => toast('Ошибка'),
  });

  const addValue = useMutation({
    mutationFn: ({ attrId, value, parent_id }) =>
      attributesApi.addValue(attrId, { value, parent_id }),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['attributes'] });
      toast('Добавлено');
      setAddingFor(null);
      setAddingText('');
      if (vars.parent_id != null) {
        setExpandedValues((p) => ({ ...p, [vars.parent_id]: true }));
      }
    },
    onError: () => toast('Ошибка при добавлении'),
  });

  const updateValue = useMutation({
    mutationFn: ({ attrId, valueId, value }) =>
      attributesApi.updateValue(attrId, valueId, { value }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['attributes'] });
      setEditingValue(null);
      toast('Переименовано');
    },
    onError: () => toast('Ошибка при переименовании'),
  });

  const deleteValue = useMutation({
    mutationFn: ({ attrId, valueId }) => attributesApi.deleteValue(attrId, valueId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['attributes'] });
      setPendingDeleteValue(null);
      toast('Удалено');
    },
    onError: () => toast('Ошибка при удалении'),
  });

  const toggle = (id) => setExpanded((p) => ({ ...p, [id]: !p[id] }));
  const toggleValue = (id) => setExpandedValues((p) => ({ ...p, [id]: !p[id] }));

  const handleAddAttr = () => {
    const name = newAttrName.trim();
    if (!name) return;
    if (attributes.some((a) => a.name.toLowerCase() === name.toLowerCase())) {
      setAddError('Характеристика с таким названием уже существует');
      return;
    }
    setAddError('');
    addAttr.mutate(name);
  };

  const handleAddValue = (attrId, parentId) => {
    const v = addingText.trim();
    if (!v) return;
    addValue.mutate({ attrId, value: v, parent_id: parentId });
  };

  const startAddingFor = (attrId, parentId) => {
    setAddingFor({ attrId, parentId });
    setAddingText('');
    if (parentId != null) setExpandedValues((p) => ({ ...p, [parentId]: true }));
  };

  const startEditAttr = (attr) => {
    setEditingAttr({ id: attr.id, value: attr.name });
    setEditAttrError('');
    setPendingDeleteAttr(null);
  };

  const saveAttrEdit = () => {
    const name = editingAttr.value.trim();
    if (!name) return;
    if (
      attributes.some(
        (a) => a.name.toLowerCase() === name.toLowerCase() && a.id !== editingAttr.id
      )
    ) {
      setEditAttrError('Такое название уже существует');
      return;
    }
    updateAttr.mutate({ id: editingAttr.id, name });
  };

  const startEditValue = (attrId, node) => {
    setEditingValue({ attrId, valueId: node.id, value: node.value });
    setPendingDeleteValue(null);
  };

  const saveValueEdit = () => {
    const value = editingValue.value.trim();
    if (!value) return;
    updateValue.mutate({
      attrId: editingValue.attrId,
      valueId: editingValue.valueId,
      value,
    });
  };

  // Recursive tree renderer
  const renderValueTree = (nodes, attrId) =>
    nodes.map((node) => {
      const isEditingThis =
        editingValue?.attrId === attrId && editingValue?.valueId === node.id;
      const isPendingDel =
        pendingDeleteValue?.attrId === attrId && pendingDeleteValue?.valueId === node.id;
      const isExpanded = expandedValues[node.id];
      const hasChildren = (node.children || []).length > 0;
      const isAddingChild =
        addingFor?.attrId === attrId && addingFor?.parentId === node.id;

      return (
        <div key={node.id}>
          <div className="attr-value-row">
            <button
              type="button"
              className="value-tree-toggle"
              onClick={() => toggleValue(node.id)}
              style={{ visibility: hasChildren ? 'visible' : 'hidden' }}
              title={isExpanded ? 'Свернуть' : 'Развернуть'}
            >
              {isExpanded ? '▾' : '▸'}
            </button>

            {isEditingThis ? (
              <>
                <input
                  className="form-input attr-val-edit-input"
                  value={editingValue.value}
                  autoFocus
                  onChange={(e) =>
                    setEditingValue({ ...editingValue, value: e.target.value })
                  }
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') saveValueEdit();
                    if (e.key === 'Escape') setEditingValue(null);
                  }}
                />
                <button
                  className="btn btn-ghost btn-icon btn-sm edit-confirm"
                  onClick={saveValueEdit}
                  title="Сохранить"
                >✓</button>
                <button
                  className="btn btn-ghost btn-icon btn-sm"
                  onClick={() => setEditingValue(null)}
                  title="Отмена"
                >✗</button>
              </>
            ) : isPendingDel ? (
              <>
                <span className="attr-value-text del-pending-text">
                  {hasChildren
                    ? `Удалить «${node.value}» и вложенные?`
                    : `Удалить «${node.value}»?`}
                </span>
                <div className="attr-value-actions">
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => setPendingDeleteValue(null)}
                  >Нет</button>
                  <button
                    className="btn btn-danger btn-sm"
                    disabled={deleteValue.isPending}
                    onClick={() => deleteValue.mutate({ attrId, valueId: node.id })}
                  >Да</button>
                </div>
              </>
            ) : (
              <>
                <span
                  className="attr-value-text"
                  onClick={hasChildren ? () => toggleValue(node.id) : undefined}
                  style={hasChildren ? { cursor: 'pointer' } : undefined}
                >{node.value}</span>
                <div className="attr-value-actions">
                  <button
                    type="button"
                    className="btn btn-ghost btn-icon btn-sm btn-add-child"
                    onClick={() => startAddingFor(attrId, node.id)}
                    title="Добавить дочерний узел"
                  ><PlusChildIcon /></button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-icon btn-sm pencil-btn"
                    onClick={() => startEditValue(attrId, node)}
                    title="Переименовать"
                  ><EditIcon /></button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-icon btn-sm char-del"
                    onClick={() => {
                      setPendingDeleteValue({ attrId, valueId: node.id });
                      setEditingValue(null);
                    }}
                    title="Удалить"
                  >✕</button>
                </div>
              </>
            )}
          </div>

          {/* Children + inline add-child form */}
          {(hasChildren || isAddingChild) && (isExpanded || isAddingChild) && (
            <div className="value-tree-child">
              {hasChildren && renderValueTree(node.children, attrId)}
              {isAddingChild && (
                <div className="attr-add-value">
                  <input
                    className="form-input"
                    placeholder="Название дочернего узла..."
                    value={addingText}
                    autoFocus
                    onChange={(e) => setAddingText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleAddValue(attrId, node.id);
                      if (e.key === 'Escape') setAddingFor(null);
                    }}
                  />
                  <button
                    className="btn btn-ghost btn-icon check-add-btn"
                    disabled={!addingText.trim() || addValue.isPending}
                    onClick={() => handleAddValue(attrId, node.id)}
                    title="Добавить"
                  >✓</button>
                  <button
                    className="btn btn-ghost btn-icon btn-sm"
                    onClick={() => setAddingFor(null)}
                    title="Отмена"
                  >✗</button>
                </div>
              )}
            </div>
          )}
        </div>
      );
    });

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
            className="btn btn-success"
            disabled={!newAttrName.trim() || addAttr.isPending}
            onClick={handleAddAttr}
          >
            Добавить
          </button>
        </div>
      </div>
      {addError && <div className="form-error tab-error">{addError}</div>}

      {attributes.length > 0 && (
        <div className="tab-search-wrap">
          <input
            className="form-input tab-search"
            placeholder="Поиск характеристик..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      )}

      {filteredAttrs.length === 0 && attributes.length === 0 ? (
        <div className="empty-state">
          <h3>Нет характеристик</h3>
          <p>Добавьте первую характеристику выше</p>
        </div>
      ) : filteredAttrs.length === 0 ? (
        <div className="empty-state"><p>Ничего не найдено</p></div>
      ) : (
        <div className="attr-list">
          {filteredAttrs.map((attr) => {
            const originalIdx = attributes.findIndex((a) => a.id === attr.id);
            const isEditingThisAttr = editingAttr?.id === attr.id;
            const isPendingDelete = pendingDeleteAttr === attr.id;
            const totalCount = countAll(attr.values);

            return (
              <div key={attr.id} className={`attr-item${attr.strict_values ? ' attr-item-strict' : ''}`}>
                <div className="attr-header">
                  <div className="attr-priority">{originalIdx + 1}</div>

                  {isEditingThisAttr ? (
                    <>
                      <input
                        className="form-input attr-edit-input"
                        value={editingAttr.value}
                        autoFocus
                        onChange={(e) => {
                          setEditingAttr({ ...editingAttr, value: e.target.value });
                          setEditAttrError('');
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') saveAttrEdit();
                          if (e.key === 'Escape') { setEditingAttr(null); setEditAttrError(''); }
                        }}
                      />
                      <button
                        className="btn btn-ghost btn-icon btn-sm edit-confirm"
                        onClick={saveAttrEdit}
                        title="Сохранить"
                      >
                        ✓
                      </button>
                      <button
                        className="btn btn-ghost btn-icon btn-sm"
                        onClick={() => { setEditingAttr(null); setEditAttrError(''); }}
                        title="Отмена"
                      >
                        ✗
                      </button>
                    </>
                  ) : (
                    <>
                      <button type="button" className="attr-name-btn" onClick={() => toggle(attr.id)}>
                        <span className="attr-name-text">{attr.name}</span>
                        <span className="attr-values-count">
                          {totalCount} {totalCount === 1 ? 'узел' : totalCount < 5 ? 'узла' : 'узлов'}
                        </span>
                        <span className="attr-chevron">{expanded[attr.id] ? '▲' : '▼'}</span>
                      </button>
                      <button
                        className="btn btn-ghost btn-icon btn-sm pencil-btn"
                        onClick={() => startEditAttr(attr)}
                        title="Переименовать"
                      >
                        <EditIcon />
                      </button>
                    </>
                  )}

                  <div className="attr-actions">
                    <button
                      className={`btn btn-ghost btn-icon btn-sm ${attr.strict_values ? 'strict-on' : ''}`}
                      onClick={() => setStrict.mutate({ id: attr.id, strict_values: !attr.strict_values })}
                      disabled={setStrict.isPending}
                      title={attr.strict_values ? 'Строгий выбор (только из вариантов) — нажмите чтобы разрешить свободный ввод' : 'Свободный ввод — нажмите чтобы разрешить только выбор из вариантов'}
                    >
                      {attr.strict_values ? <LockIcon /> : <UnlockIcon />}
                    </button>
                    <button
                      className="btn btn-ghost btn-icon btn-sm reorder-btn"
                      onClick={() => reorder.mutate({ id: attr.id, direction: 'up' })}
                      disabled={originalIdx === 0 || reorder.isPending}
                      title="Повысить приоритет"
                    >
                      ↑
                    </button>
                    <button
                      className="btn btn-ghost btn-icon btn-sm reorder-btn"
                      onClick={() => reorder.mutate({ id: attr.id, direction: 'down' })}
                      disabled={originalIdx === attributes.length - 1 || reorder.isPending}
                      title="Понизить приоритет"
                    >
                      ↓
                    </button>
                    <button
                      className="btn btn-ghost btn-icon btn-sm char-del"
                      onClick={() => { setPendingDeleteAttr(attr.id); setEditingAttr(null); }}
                      title="Удалить"
                    >
                      ✕
                    </button>
                  </div>
                </div>

                {isEditingThisAttr && editAttrError && (
                  <div className="form-error attr-inline-error">{editAttrError}</div>
                )}

                {isPendingDelete && (
                  <div className="confirm-bar">
                    <span>Удалить «{attr.name}» и все её узлы?</span>
                    <button className="btn btn-secondary btn-sm" onClick={() => setPendingDeleteAttr(null)}>
                      Нет
                    </button>
                    <button
                      className="btn btn-danger btn-sm"
                      disabled={deleteAttr.isPending}
                      onClick={() => deleteAttr.mutate(attr.id)}
                    >
                      Да, удалить
                    </button>
                  </div>
                )}

                {expanded[attr.id] && (
                  <div className="attr-values-panel">
                    {attr.values.length === 0 && !(addingFor?.attrId === attr.id && addingFor?.parentId === null) && (
                      <p className="attr-empty-vals">Значений пока нет — добавьте первое</p>
                    )}

                    {renderValueTree(attr.values, attr.id)}

                    {/* Add root value */}
                    {addingFor?.attrId === attr.id && addingFor?.parentId === null ? (
                      <div className="attr-add-value" style={{ marginTop: attr.values.length ? '0.5rem' : 0 }}>
                        <input
                          className="form-input"
                          placeholder="Новое значение..."
                          value={addingText}
                          autoFocus
                          onChange={(e) => setAddingText(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleAddValue(attr.id, null);
                            if (e.key === 'Escape') setAddingFor(null);
                          }}
                        />
                        <button
                          className="btn btn-ghost btn-icon check-add-btn"
                          disabled={!addingText.trim() || addValue.isPending}
                          onClick={() => handleAddValue(attr.id, null)}
                          title="Добавить"
                        >
                          ✓
                        </button>
                        <button
                          className="btn btn-ghost btn-icon btn-sm"
                          onClick={() => setAddingFor(null)}
                          title="Отмена"
                        >
                          ✗
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm btn-add-root-val"
                        style={{ marginTop: attr.values.length ? '0.35rem' : 0, alignSelf: 'flex-start' }}
                        onClick={() => startAddingFor(attr.id, null)}
                      >
                        + Добавить значение
                      </button>
                    )}
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
