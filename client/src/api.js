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

export const attributesApi = {
  getAll: () => api.get('/attributes'),
  create: (data) => api.post('/attributes', data),
  update: (id, data) => api.put(`/attributes/${id}`, data),
  delete: (id) => api.delete(`/attributes/${id}`),
  reorder: (id, direction) => api.post(`/attributes/${id}/reorder`, { direction }),
  addValue: (attrId, data) => api.post(`/attributes/${attrId}/values`, data),
  updateValue: (attrId, valueId, data) => api.put(`/attributes/${attrId}/values/${valueId}`, data),
  deleteValue: (attrId, valueId) => api.delete(`/attributes/${attrId}/values/${valueId}`),
};

export const mirrorClassesApi = {
  getAll: () => api.get('/mirror-classes'),
  create: (data) => api.post('/mirror-classes', data),
  update: (id, data) => api.put(`/mirror-classes/${id}`, data),
  delete: (id) => api.delete(`/mirror-classes/${id}`),
};

// Cloudinary returns full https:// URLs stored directly in DB
export const getImageUrl = (url) => url;
