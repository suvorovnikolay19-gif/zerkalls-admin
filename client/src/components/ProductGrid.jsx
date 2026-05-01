import { useState, useRef, useEffect } from 'react';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { productsApi } from '../api';
import { useToast } from '../ToastContext';
import ProductCard from './ProductCard';

function Skeleton() {
  return (
    <div className="skeleton">
      <div className="sk-img" />
      <div className="sk-body">
        <div className="sk-line w-80" />
        <div className="sk-line w-50" />
        <div className="sk-line w-35" />
      </div>
    </div>
  );
}

export default function ProductGrid({ onEdit }) {
  const [search, setSearch] = useState('');
  const [debSearch, setDebSearch] = useState('');
  const loadRef = useRef(null);
  const qc = useQueryClient();
  const toast = useToast();

  useEffect(() => {
    const t = setTimeout(() => setDebSearch(search), 350);
    return () => clearTimeout(t);
  }, [search]);

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, error } =
    useInfiniteQuery({
      queryKey: ['products', debSearch],
      queryFn: ({ pageParam }) =>
        productsApi.getAll({ page: pageParam, limit: 12, search: debSearch }),
      getNextPageParam: (last) =>
        last.data.pagination.hasMore ? last.data.pagination.page + 1 : undefined,
      initialPageParam: 1,
    });

  useEffect(() => {
    if (!loadRef.current) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && hasNextPage && !isFetchingNextPage) fetchNextPage();
      },
      { threshold: 0.1 }
    );
    obs.observe(loadRef.current);
    return () => obs.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const handleDelete = async (id, name) => {
    if (!confirm(`Удалить "${name}"?`)) return;
    try {
      await productsApi.delete(id);
      qc.invalidateQueries({ queryKey: ['products'] });
      toast('Товар удалён');
    } catch {
      toast('Ошибка при удалении', 'error');
    }
  };

  const products = data?.pages.flatMap((p) => p.data.products) ?? [];
  const total = data?.pages[0]?.data.pagination.total ?? 0;

  return (
    <div>
      <div className="controls">
        <div className="search-wrap">
          <span className="search-icon">🔍</span>
          <input
            className="search-input"
            placeholder="Поиск по названию..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {!isLoading && (
          <span className="count-label">
            Товаров: <strong>{total}</strong>
          </span>
        )}
      </div>

      {isLoading ? (
        <div className="skeleton-grid">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} />)}
        </div>
      ) : error ? (
        <div className="error-state">
          <p>Ошибка загрузки. Проверьте подключение к серверу.</p>
        </div>
      ) : products.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🪞</div>
          <h3>{debSearch ? 'Ничего не найдено' : 'Каталог пуст'}</h3>
          <p>{debSearch ? 'Попробуйте другой запрос' : 'Добавьте первый товар через кнопку выше'}</p>
        </div>
      ) : (
        <>
          <div className="product-grid">
            {products.map((p) => (
              <ProductCard
                key={p.id}
                product={p}
                onEdit={() => onEdit(p)}
                onDelete={() => handleDelete(p.id, p.name)}
              />
            ))}
          </div>
          <div ref={loadRef} className="load-more">
            {isFetchingNextPage && <div className="spinner" />}
          </div>
        </>
      )}
    </div>
  );
}
