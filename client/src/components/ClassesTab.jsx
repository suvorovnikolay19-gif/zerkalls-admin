import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { attributesApi, mirrorClassesApi } from '../api';
import { useToast } from '../ToastContext';

export default function ClassesTab() {
  const qc = useQueryClient();
  const toast = useToast();

  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [formName, setFormName] = useState('');
  const [selectedAttrs, setSelectedAttrs] = useState([]);
  const [saveError, setSaveError] = useState('');
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [pendingDeleteClass, setPendingDeleteClass] = useState(null);

  const { data: attributes = [] } = useQuery({
    queryKey: ['attributes'],
    queryFn: () => attributesApi.getAll().then((r) => r.data),
  });

  const { data: classes = [], isLoading } = useQuery({
    queryKey: ['mirror-classes'],
    queryFn: () => mirrorClassesApi.getAll().then((r) => r.data),
  });

  const saveClass = useMutation({
    mutationFn: (data) => editId ? mirrorClassesApi.update(editId, data) : mirrorClassesApi.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['mirror-classes'] }); toast(editId ? 'Класс обновлён' : 'Класс создан'); resetForm(); },
    onError: () => setSaveError('Класс с таким названием уже существует'),
  });

  const deleteClass = useMutation({
    mutationFn: (id) => mirrorClassesApi.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['mirror-classes'] }); setPendingDeleteClass(null); toast('Класс удалён'); },
  });

  const isDirty = editId
    ? formName.trim() !== (classes.find((c) => c.id === editId)?.name ?? '') ||
      JSON.stringify([...selectedAttrs].sort()) !==
        JSON.stringify([...(classes.find((c) => c.id === editId)?.attributes.map((a) => a.id) ?? [])].sort())
    : formName.trim() !== '' || selectedAttrs.length > 0;

  const openCreate = () => { setEditId(null); setFormName(''); setSelectedAttrs([]); setSaveError(''); setShowCancelConfirm(false); setShowForm(true); };
  const openEdit = (cls) => { setEditId(cls.id); setFormName(cls.name); setSelectedAttrs(cls.attributes.map((a) => a.id)); setSaveError(''); setShowCancelConfirm(false); setShowForm(true); };
  const tryCancel = () => { if (isDirty) { setShowCancelConfirm(true); } else { resetForm(); } };
  const resetForm = () => { setShowForm(false); setEditId(null); setFormName(''); setSelectedAttrs([]); setSaveError(''); setShowCancelConfirm(false); };

  const toggleAttr = (id) => setSelectedAttrs((p) => p.includes(id) ? p.filter((x) => x !== id) : [...p, id]);

  const handleSave = () => {
    const name = formName.trim();
    if (!name) return;
    if (classes.some((c) => c.name.toLowerCase() === name.toLowerCase() && c.id !== editId)) {
      setSaveError('Класс с таким названием уже существует'); return;
    }
    setSaveError('');
    saveClass.mutate({ name, attribute_ids: selectedAttrs });
  };

  const filteredClasses = search
    ? classes.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()))
    : classes;

  if (isLoading) return <div className="empty-state"><p>Загрузка...</p></div>;

  return (
    <div className="tab-content">
      <div className="tab-toolbar">
        <h2 className="tab-heading">Классы зеркал</h2>
        {!showForm && (
          <button className="btn btn-primary" onClick={openCreate}>+ Создать класс</button>
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
              onChange={(e) => { setFormName(e.target.value); setSaveError(''); }}
              autoFocus
            />
          </div>
          {saveError && <div className="form-error" style={{ marginBottom: '0.75rem' }}>{saveError}</div>}

          <div className="form-group">
            <label className="form-label">Характеристики класса</label>
            {attributes.length === 0 ? (
              <p className="hint-text">Сначала добавьте характеристики на вкладке «Характеристики»</p>
            ) : (
              <div className="attr-check-list">
                {attributes.map((attr, idx) => (
                  <label key={attr.id} className="attr-check-item">
                    <input type="checkbox" checked={selectedAttrs.includes(attr.id)} onChange={() => toggleAttr(attr.id)} />
                    <span className="attr-check-num">{idx + 1}</span>
                    <span>{attr.name}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {showCancelConfirm ? (
            <div className="confirm-bar" style={{ marginTop: '1.25rem', borderRadius: 'var(--radius)' }}>
              <span>Изменения не сохранятся. Прервать?</span>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowCancelConfirm(false)}>Продолжить</button>
              <button className="btn btn-danger btn-sm" onClick={resetForm}>Да, прервать</button>
            </div>
          ) : (
            <div className="form-actions">
              <button type="button" className="btn btn-secondary" onClick={tryCancel}>Отмена</button>
              <button type="button" className="btn btn-primary" disabled={!formName.trim() || saveClass.isPending} onClick={handleSave}>
                {saveClass.isPending ? 'Сохранение...' : editId ? 'Сохранить' : 'Создать'}
              </button>
            </div>
          )}
        </div>
      )}

      {classes.length > 0 && !showForm && (
        <div className="tab-search-wrap">
          <input className="form-input tab-search" placeholder="Поиск классов..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      )}

      {!showForm && filteredClasses.length === 0 && classes.length === 0 && (
        <div className="empty-state"><h3>Нет классов</h3><p>Создайте первый класс зеркала</p></div>
      )}
      {!showForm && filteredClasses.length === 0 && classes.length > 0 && (
        <div className="empty-state"><p>Ничего не найдено</p></div>
      )}

      {filteredClasses.length > 0 && (
        <div className="class-list">
          {filteredClasses.map((cls) => (
            <div key={cls.id} className="class-item">
              <div className="class-info">
                <div className="class-name">{cls.name}</div>
                <div className="class-attrs">
                  {cls.attributes.length === 0 ? (
                    <span className="attr-tag attr-tag-empty">без характеристик</span>
                  ) : (
                    cls.attributes.map((a) => <span key={a.id} className="attr-tag">{a.name}</span>)
                  )}
                </div>
              </div>

              {pendingDeleteClass === cls.id ? (
                <div className="inline-confirm">
                  <span>Удалить «{cls.name}»?</span>
                  <button className="btn btn-secondary btn-sm" onClick={() => setPendingDeleteClass(null)}>Нет</button>
                  <button className="btn btn-danger btn-sm" disabled={deleteClass.isPending} onClick={() => deleteClass.mutate(cls.id)}>Да</button>
                </div>
              ) : (
                <div className="class-actions">
                  <button className="btn btn-secondary btn-sm" onClick={() => openEdit(cls)}>Изменить</button>
                  <button className="btn btn-danger btn-sm" onClick={() => setPendingDeleteClass(cls.id)}>Удалить</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
