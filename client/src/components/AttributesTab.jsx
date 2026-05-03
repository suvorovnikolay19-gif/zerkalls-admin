import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { attributesApi } from '../api';
import { useToast } from '../ToastContext';

export default function AttributesTab() {
  const qc = useQueryClient();
  const toast = useToast();
  const [newAttrName, setNewAttrName] = useState('');
  const [expanded, setExpanded] = useState({});
  const [newValues, setNewValues] = useState({});

  const { data: attributes = [], isLoading } = useQuery({
    queryKey: ['attributes'],
    queryFn: () => attributesApi.getAll().then((r) => r.data),
  });

  const addAttr = useMutation({
    mutationFn: (name) => attributesApi.create({ name }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['attributes'] });
      setNewAttrName('');
      toast('Характеристика добавлена');
    },
  });

  const deleteAttr = useMutation({
    mutationFn: (id) => attributesApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['attributes'] });
      toast('Характеристика удалена');
    },
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

  const deleteValue = useMutation({
    mutationFn: ({ attrId, valueId }) => attributesApi.deleteValue(attrId, valueId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['attributes'] });
      toast('Вариант удалён');
    },
  });

  const toggle = (id) => setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));

  const handleAddAttr = () => {
    if (newAttrName.trim()) addAttr.mutate(newAttrName.trim());
  };

  const handleAddValue = (attrId) => {
    const v = (newValues[attrId] || '').trim();
    if (v) addValue.mutate({ attrId, value: v });
  };

  if (isLoading) return <div className="empty-state"><p>Загрузка...</p></div>;

  return (
    <div className="tab-content">
      <div className="tab-toolbar">
        <h2 className="tab-heading">Характеристики</h2>
        <div className="add-row">
          <input
            className="form-input"
            placeholder="Название характеристики (напр. Форма)"
            value={newAttrName}
            onChange={(e) => setNewAttrName(e.target.value)}
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

      {attributes.length === 0 ? (
        <div className="empty-state">
          <h3>Нет характеристик</h3>
          <p>Добавьте первую характеристику выше</p>
        </div>
      ) : (
        <div className="attr-list">
          {attributes.map((attr, idx) => (
            <div key={attr.id} className="attr-item">
              <div className="attr-header">
                <div className="attr-priority">{idx + 1}</div>
                <button
                  type="button"
                  className="attr-name-btn"
                  onClick={() => toggle(attr.id)}
                >
                  <span className="attr-name-text">{attr.name}</span>
                  <span className="attr-values-count">{attr.values.length} вар.</span>
                  <span className="attr-chevron">{expanded[attr.id] ? '▲' : '▼'}</span>
                </button>
                <div className="attr-actions">
                  <button
                    className="btn btn-ghost btn-icon btn-sm reorder-btn"
                    onClick={() => reorder.mutate({ id: attr.id, direction: 'up' })}
                    disabled={idx === 0 || reorder.isPending}
                    title="Повысить приоритет"
                  >
                    ↑
                  </button>
                  <button
                    className="btn btn-ghost btn-icon btn-sm reorder-btn"
                    onClick={() => reorder.mutate({ id: attr.id, direction: 'down' })}
                    disabled={idx === attributes.length - 1 || reorder.isPending}
                    title="Понизить приоритет"
                  >
                    ↓
                  </button>
                  <button
                    className="btn btn-ghost btn-icon btn-sm char-del"
                    onClick={() => deleteAttr.mutate(attr.id)}
                    disabled={deleteAttr.isPending}
                    title="Удалить"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {expanded[attr.id] && (
                <div className="attr-values-panel">
                  {attr.values.length === 0 && (
                    <p className="attr-empty-vals">Вариантов пока нет</p>
                  )}
                  {attr.values.map((v) => (
                    <div key={v.id} className="attr-value-row">
                      <span className="attr-value-text">{v.value}</span>
                      <button
                        type="button"
                        className="btn btn-ghost btn-icon btn-sm char-del"
                        onClick={() => deleteValue.mutate({ attrId: attr.id, valueId: v.id })}
                        title="Удалить вариант"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                  <div className="attr-add-value">
                    <input
                      className="form-input"
                      placeholder="Новый вариант (напр. Круглая)"
                      value={newValues[attr.id] || ''}
                      onChange={(e) =>
                        setNewValues((prev) => ({ ...prev, [attr.id]: e.target.value }))
                      }
                      onKeyDown={(e) => e.key === 'Enter' && handleAddValue(attr.id)}
                    />
                    <button
                      className="btn btn-secondary btn-sm"
                      disabled={!(newValues[attr.id] || '').trim() || addValue.isPending}
                      onClick={() => handleAddValue(attr.id)}
                    >
                      + Добавить вариант
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
