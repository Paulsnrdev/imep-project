import { createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';
import { setCredentials, setError, setLoading, logout } from './authSlice';

export const loginThunk = createAsyncThunk(
  'auth/login',
  async ({ email, password }, { dispatch, rejectWithValue }) => {
    try {
      dispatch(setLoading(true));
      const { data } = await api.post('/auth/login', { email, password });
      dispatch(setCredentials(data.data));
      return data.data;
    } catch (err) {
      const message = err.response?.data?.message ?? 'Login failed';
      dispatch(setError(message));
      return rejectWithValue(message);
    } finally {
      dispatch(setLoading(false));
    }
  }
);

export const registerThunk = createAsyncThunk(
  'auth/register',
  async (payload, { dispatch, rejectWithValue }) => {
    try {
      dispatch(setLoading(true));

      // Build FormData so we can include the optional profile photo file
      const formData = new FormData();
      Object.entries(payload).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          formData.append(key, value);
        }
      });

      const { data } = await api.post('/auth/register', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      dispatch(setCredentials(data.data));
      return data.data;
    } catch (err) {
      const message = err.response?.data?.message ?? 'Registration failed';
      dispatch(setError(message));
      return rejectWithValue(message);
    } finally {
      dispatch(setLoading(false));
    }
  }
);

export const getMeThunk = createAsyncThunk(
  'auth/getMe',
  async (_, { dispatch, rejectWithValue }) => {
    try {
      const { data } = await api.get('/auth/me');
      dispatch(setCredentials(data.data));
      return data.data;
    } catch (err) {
      dispatch(logout());
      return rejectWithValue(err.response?.data?.message);
    }
  }
);

export const logoutThunk = createAsyncThunk(
  'auth/logout',
  async (_, { dispatch }) => {
    try {
      await api.post('/auth/logout');
    } finally {
      dispatch(logout());
    }
  }
);
