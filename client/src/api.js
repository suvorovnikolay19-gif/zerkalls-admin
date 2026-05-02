import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

export const productsApi = {
  getAll: (params) => api.get('/products', { params }),
  getById: (id) => api.get(`/products/${id}`),
  create: (data) => api.post('/products', data),
  update: (id, data) => api.put(`/products/${id}`, data),
  delete: (id) => api.delete(`/products/${id}`),
};

export const uploadApi = {
  upload: (files) => {
    const form = new FormData();
    files.forEach((f) => form.append('images', f));
    return api.post('/upload', form);
  },
  delete: (filename) => api.delete(`/upload/${filename}`),
};

// Cloudinary returns full https:// URLs stored directly in DB
export const getImageUrl = (url) => url;
