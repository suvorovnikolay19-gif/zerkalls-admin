import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { attributesApi, mirrorClassesApi } from '../api';
import { useToast } from '../ToastContext';

export default function ClassesTab() {
  const qc = useQueryClient();
  const toast = useToast();
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [formName, setFormName] = useState('');
  const [selectedAttrs, setSelectedAttrs] = useState([]);

  const { data: attributes = [] } = useQuery({
    queryKey: ['attributes'],
    queryFn: () => attributesApi.getAll().then((r) => r.data),
  });

  const { data: classes = [], isLoading } = useQuery({
    queryKey: ['mirror-classes'],
    queryFn: () => mirrorClassesApi.getAll().then((r) => r.data),
  });

  const saveClass = useMutation({
    mutationFn: (data) =>
      editId ? mirrorClassesApi.update(editId, data) : mirrorClassesApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['mirror-classes'] });
      toast(editId ? 'Класс обновлён' : 'Класс создан');
      cancelForm();
    },
  });

  const deleteClass = useMutation({
    mutationFn: (id) => mirrorClassesApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['mirror-classes'] });
      toast('Класс удалён');
    },
  });

  const openCreate = () => {
    setEditId(null);
    setFormName('');
    setSelectedAttrs([]);
    setShowForm(true);
  };

  const openEdit = (cls) => {
    setEditId(cls.id);
    setFormName(cls.name);
    setSelectedAttrs(cls.attributes.map((a) => a.id));
    setShowForm(true);
  };

  const cancelForm = () => {
    setShowForm(false);
    setEditId(null);
    setFormName('');
    setSelectedAttrs([]);
  };

  const toggleAttr = (id) =>
    setSelectedAttrs((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );

  const handleSave = () => {
    if (!formName.trim()) return;
    saveClass.mutate({ name: formName.trim(), attribute_ids: selectedAttrs });
  };

  if (isLoading) return <div className="empty-state"><p>Загрузка...</p></div>;

  return (
    <div className="tab-content">
      <div className="tab-toolbar">
        <h2 className="tab-heading">Классы зеркал</h2>
        {!showForm && (
          <button className="btn btn-primary" onClick={openCreate}>
            + Создать класс
          </button>
        )}
      </div>

      {showForm && (
        <div className="class-form">
          <div className="form-group" style={{ marginBottom: '1rem' }}>
            <label className="form-label">Название класса</label>
            <input
              className="form-input"
              placeholder="Например: Настенное зеркало"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              autoFocus
            />
          </div>
          <div className="form-group">
            <label className="form-label">Характеристики класса</label>
            {attributes.length === 0 ? (
              <p className="hint-text">
                Сначала добавьте характеристики на вкладке «Характеристики»
              </p>
            ) : (
              <div className="attr-check-list">
                {attributes.map((attr, idx) => (
                  <label key={attr.id} className="attr-check-item">
                    <input
                      type="checkbox"
                      checked={selectedAttrs.includes(attr.id)}
                      onChange={() => toggleAttr(attr.id)}
                    />
                    <span className="attr-check-num">{idx + 1}</span>
                    <span>{attr.name}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
          <div className="form-actions">
            <button type="button" className="btn btn-secondary" onClick={cancelForm}>
              Отмена
            </button>
            <button
              type="button"
              className="btn btn-primary"
              disabled={!formName.trim() || saveClass.isPending}
              onClick={handleSave}
            >
              {saveClass.isPending ? 'Сохранение...' : editId ? 'Сохранить' : 'Создать'}
            </button>
          </div>
        </div>
      )}

      {!isLoading && classes.length === 0 && !showForm && (
        <div className="empty-state">
          <h3>Нет классов</h3>
          <p>Создайте первый класс зеркала</p>
        </div>
      )}

      {classes.length > 0 && (
        <div className="class-list">
          {classes.map((cls) => (
            <div key={cls.id} className="class-item">
              <div className="class-info">
                <div className="class-name">{cls.name}</div>
                <div className="class-attrs">
                  {cls.attributes.length === 0 ? (
                    <span className="attr-tag attr-tag-empty">без характеристик</span>
                  ) : (
                    cls.attributes.map((a) => (
                      <span key={a.id} className="attr-tag">{a.name}</span>
                    ))
                  )}
                </div>
              </div>
              <div className="class-actions">
                <button className="btn btn-secondary btn-sm" onClick={() => openEdit(cls)}>
                  Изменить
                </button>
                <button
                  className="btn btn-danger btn-sm"
                  onClick={() => deleteClass.mutate(cls.id)}
                  disabled={deleteClass.isPending}
                >
                  Удалить
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
