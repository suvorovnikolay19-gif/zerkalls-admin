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

const SearchIcon = () => (
  <svg width="13" height="13" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M10 6.5C10 8.433 8.433 10 6.5 10C4.567 10 3 8.433 3 6.5C3 4.567 4.567 3 6.5 3C8.433 3 10 4.567 10 6.5ZM9.30377 10.0118C8.53487 10.6245 7.55917 11 6.5 11C4.01472 11 2 8.98528 2 6.5C2 4.01472 4.01472 2 6.5 2C8.98528 2 11 4.01472 11 6.5C11 7.55917 10.6245 8.53487 10.0118 9.30377L12.8536 12.1464C13.0488 12.3417 13.0488 12.6583 12.8536 12.8536C12.6583 13.0488 12.3417 13.0488 12.1464 12.8536L9.30377 10.0118Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd"/>
  </svg>
);

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
          <span className="search-icon"><SearchIcon /></span>
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
          Ошибка загрузки. Проверьте подключение к серверу.
        </div>
      ) : products.length === 0 ? (
        <div className="empty-state">
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
