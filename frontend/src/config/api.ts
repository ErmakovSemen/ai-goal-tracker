// API configuration
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

export const getApiUrl = (endpoint: string = ''): string => {
  const baseUrl = API_URL.replace(/\/$/, ''); // Remove trailing slash
  const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${baseUrl}${path}`;
};

export default API_URL;

