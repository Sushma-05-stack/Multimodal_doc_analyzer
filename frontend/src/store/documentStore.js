import { create } from 'zustand';
import api from '../lib/api';
import toast from 'react-hot-toast';

export const useDocumentStore = create((set, get) => ({
  documents: [],
  currentDocument: null,
  isLoading: false,
  isUploading: false,
  uploadProgress: {},
  pagination: { total: 0, page: 1, limit: 12, pages: 0 },
  filters: { category: '', fileType: '', search: '', sortBy: 'createdAt', order: 'desc' },

  setFilters: (filters) => set({ filters: { ...get().filters, ...filters } }),

  fetchDocuments: async (params = {}) => {
    set({ isLoading: true });
    try {
      const { filters, pagination } = get();
      const query = { ...filters, ...params, page: params.page || pagination.page, limit: pagination.limit };
      const { data } = await api.get('/documents', { params: query });
      set({ documents: data.documents, pagination: data.pagination, isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      toast.error(error.message || 'Failed to fetch documents');
    }
  },

  fetchDocument: async (id) => {
    set({ isLoading: true });
    try {
      const { data } = await api.get(`/documents/${id}`);
      set({ currentDocument: data.document, isLoading: false });
      return data.document;
    } catch (error) {
      set({ isLoading: false });
      toast.error('Document not found');
      return null;
    }
  },

  uploadDocuments: async (files, onProgress) => {
    set({ isUploading: true });
    try {
      const formData = new FormData();
      files.forEach(file => formData.append('files', file));

      const { data } = await api.post('/documents/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (e) => {
          const pct = Math.round((e.loaded * 100) / e.total);
          onProgress?.(pct);
        }
      });

      set({ isUploading: false });
      toast.success(`${data.documents.length} file(s) uploaded! Processing started.`);
      return data.documents;
    } catch (error) {
      set({ isUploading: false });
      toast.error(error.message || 'Upload failed');
      return [];
    }
  },

  deleteDocument: async (id) => {
    try {
      await api.delete(`/documents/${id}`);
      set({ documents: get().documents.filter(d => d._id !== id) });
      toast.success('Document deleted');
    } catch (error) {
      toast.error('Failed to delete document');
    }
  },

  reanalyzeDocument: async (id) => {
    try {
      await api.post(`/documents/${id}/reanalyze`);
      toast.success('Reanalysis started');
    } catch (error) {
      toast.error('Failed to start reanalysis');
    }
  },

  updateDocumentInList: (updatedDoc) => {
    set({
      documents: get().documents.map(d => d._id === updatedDoc._id ? { ...d, ...updatedDoc } : d),
      currentDocument: get().currentDocument?._id === updatedDoc._id
        ? { ...get().currentDocument, ...updatedDoc }
        : get().currentDocument
    });
  }
}));
