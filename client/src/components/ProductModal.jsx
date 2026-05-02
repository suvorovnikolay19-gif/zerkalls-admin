import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { productsApi } from '../api';
import { useToast } from '../ToastContext';
import ImageUpload from './ImageUpload';
import CharacteristicsEditor from './CharacteristicsEditor';

const DEFAULT_CHARS = [
  { name: 'Размер', value: '' },
  { name: 'Форма', value: '' },
  { name: 'Тип подсветки', value: '' },
  { name: 'Цвет подсветки', value: '' },
  { name: 'Мощность', value: '' },
  { name: 'IP защита', value: '' },
  { name: 'Цвет рамки', value: '' },
  { name: 'Материал рамки', value: '' },
  { name: 'Управление', value: '' },
  { name: 'Напряжение', value: '' },
  { name: 'Гарантия', value: '' },
  { name: 'Вес', value: '' },
  { name: 'Крепление', value: '' },
];

export default function ProductModal({ product, onClose }) {
  const isEdit = !!product;
  const qc = useQueryClient();
  const toast = useToast();

  const [name, setName] = useState(product?.name ?? '');
  const [price, setPrice] = useState(product?.price ?? '');
  const [description, setDescription] = useState(product?.description ?? '');
  const [images, setImages] = useState(
    product?.images?.map((i) => i.filename) ?? []
  );
  const [chars, setChars] = useState(
    product?.characteristics?.length > 0
      ? product.characteristics.map((c) => ({ name: c.name, value: c.value }))
      : DEFAULT_CHARS
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) { setError('Введите название товара'); return; }
    setSaving(true);
    setError('');
    try {
      const payload = {
        name: name.trim(),
        description,
        price: parseFloat(price) || 0,
        images,
        characteristics: chars.filter((c) => c.name.trim()),
      };
      if (isEdit) {
        await productsApi.update(product.id, payload);
        toast('Товар обновлён');
      } else {
        await productsApi.create(payload);
        toast('Товар добавлен');
      }
      qc.invalidateQueries({ queryKey: ['products'] });
      onClose();
    } catch {
      setError('Ошибка при сохранении. Попробуйте ещё раз.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h2 className="modal-title">
            {isEdit ? 'Редактировать товар' : 'Добавить товар'}
          </h2>
          <button type="button" className="btn btn-ghost btn-icon" onClick={onClose}>
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'contents' }}>
          <div className="modal-body">
            {error && <div className="form-error">{error}</div>}

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">
                  Название <span className="form-required">*</span>
                </label>
                <input
                  className="form-input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Зеркало с подсветкой..."
                  autoFocus
                />
              </div>
              <div className="form-group">
                <label className="form-label">Цена, ₽</label>
                <input
                  className="form-input"
                  type="number"
                  min="0"
                  step="1"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="0"
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Описание</label>
              <textarea
                className="form-textarea"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Опишите товар: особенности, материалы, способы использования..."
                rows={4}
              />
            </div>

            <div>
              <div className="section-title">Фотографии</div>
              <ImageUpload images={images} onChange={setImages} />
            </div>

            <div>
              <div className="section-title">Характеристики</div>
              <CharacteristicsEditor value={chars} onChange={setChars} />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Отмена
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Сохранение...' : isEdit ? 'Сохранить' : 'Добавить товар'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
