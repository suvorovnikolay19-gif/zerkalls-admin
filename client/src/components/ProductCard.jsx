import { useState } from 'react';
import { getImageUrl } from '../api';

export default function ProductCard({ product, onEdit, onDelete }) {
  const [pendingDelete, setPendingDelete] = useState(false);
  const primary = product.images?.[0]?.filename;
  const imgCount = product.images?.length ?? 0;
  const price = parseFloat(product.price);
  const charCount = product.characteristics?.length ?? 0;

  return (
    <div className="card" onClick={!pendingDelete ? onEdit : undefined}>
      <div className="card-image">
        {primary ? (
          <>
            <img src={getImageUrl(primary)} alt={product.name} loading="lazy" />
            {imgCount > 1 && <span className="card-img-count">+{imgCount - 1}</span>}
          </>
        ) : (
          <div className="card-placeholder">
            <div className="card-placeholder-box" />
          </div>
        )}
      </div>

      <div className="card-body">
        <div className="card-name">{product.name}</div>
        {price > 0 ? (
          <div className="card-price">{price.toLocaleString('ru-RU')} ₽</div>
        ) : (
          <div className="card-price-empty">Цена не указана</div>
        )}
        {charCount > 0 && <div className="card-meta">{charCount} характеристик</div>}
      </div>

      <div className="card-footer">
        {pendingDelete ? (
          <div className="card-delete-confirm">
            <span>Удалить?</span>
            <button
              className="btn btn-secondary btn-sm"
              onClick={(e) => { e.stopPropagation(); setPendingDelete(false); }}
            >
              Нет
            </button>
            <button
              className="btn btn-danger btn-sm"
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
            >
              Да
            </button>
          </div>
        ) : (
          <>
            <button
              className="btn btn-secondary btn-sm"
              onClick={(e) => { e.stopPropagation(); onEdit(); }}
            >
              Изменить
            </button>
            <button
              className="btn btn-danger btn-sm"
              onClick={(e) => { e.stopPropagation(); setPendingDelete(true); }}
            >
              Удалить
            </button>
          </>
        )}
      </div>
    </div>
  );
}
