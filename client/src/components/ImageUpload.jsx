import { useRef, useState, useCallback } from 'react';
import { uploadApi, getImageUrl } from '../api';

export default function ImageUpload({ images, onChange }) {
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef(null);

  const handleFiles = useCallback(
    async (files) => {
      const valid = Array.from(files).filter((f) => f.type.startsWith('image/'));
      if (!valid.length) return;
      setUploading(true);
      try {
        const { data } = await uploadApi.upload(valid);
        onChange([...images, ...data.filenames]);
      } catch (err) {
        console.error('Upload error', err);
      } finally {
        setUploading(false);
      }
    },
    [images, onChange]
  );

  const onDrop = useCallback(
    (e) => { e.preventDefault(); setDragging(false); handleFiles(e.dataTransfer.files); },
    [handleFiles]
  );
  const onDragOver = (e) => { e.preventDefault(); setDragging(true); };
  const onDragLeave = () => setDragging(false);

  const remove = (url) => onChange(images.filter((u) => u !== url));

  return (
    <div>
      <div
        className={`drop-zone ${dragging ? 'over' : ''}`}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onClick={() => !uploading && inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          style={{ display: 'none' }}
          onChange={(e) => handleFiles(e.target.files)}
        />
        {uploading ? (
          <div className="drop-zone-uploading">
            <div className="spinner" /> Загрузка...
          </div>
        ) : (
          <>
            <div className="drop-zone-arrow">↑</div>
            <p><strong>Нажмите или перетащите</strong> фотографии</p>
            <p>JPG, PNG, WebP · до 10 МБ каждый</p>
          </>
        )}
      </div>

      {images.length > 0 && (
        <div className="thumb-grid">
          {images.map((url, i) => (
            <div key={url} className={`thumb ${i === 0 ? 'primary' : ''}`}>
              <img src={getImageUrl(url)} alt="" loading="lazy" />
              <button
                type="button"
                className="thumb-del"
                onClick={() => remove(url)}
                title="Удалить"
              >
                ✕
              </button>
              {i === 0 && <div className="thumb-badge">ГЛАВНОЕ</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
