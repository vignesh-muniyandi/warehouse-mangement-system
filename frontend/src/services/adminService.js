import api from '../api/axios';

const adminService = {
  fetchUsers: async () => {
    const response = await api.get('/admin/users');
    return response.data;
  },

  searchUsers: async (query) => {
    const encoded = encodeURIComponent(query || '');
    const response = await api.get(`/admin/users/search?q=${encoded}`);
    return response.data;
  },

  createUser: async (payload) => {
    const response = await api.post('/admin/users', payload);
    return response.data;
  },

  updateUser: async (id, payload) => {
    const response = await api.put(`/admin/users/${id}`, payload);
    return response.data;
  },

  fetchRoles: async () => {
    const response = await api.get('/admin/roles');
    return response.data;
  },

  fetchWarehouses: async () => {
    const response = await api.get('/admin/warehouses');
    return response.data;
  },
};

export default adminService;
