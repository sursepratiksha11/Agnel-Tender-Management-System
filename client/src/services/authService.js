import { apiRequest } from './apiClient';

export const authService = {
  login: (email, password) =>
    apiRequest('/auth/login', { method: 'POST', body: { email, password } }),

  signup: (payload) =>
    apiRequest('/auth/signup', { method: 'POST', body: payload }),

  me: (token) =>
    apiRequest('/auth/me', { method: 'GET', token }),
};
