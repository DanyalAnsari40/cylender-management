import axios from 'axios';

const employeeSalesAPI = {
  create: (data: any) => axios.post('/api/employee-sales', data),
  getAll: () => axios.get('/api/employee-sales'),
  update: (id: string, data: any) => axios.put(`/api/employee-sales/${id}`, data),
  delete: (id: string) => axios.delete(`/api/employee-sales/${id}`),
};

export default employeeSalesAPI;
