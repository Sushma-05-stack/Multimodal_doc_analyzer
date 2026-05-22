import { create } from 'zustand';
import { io } from 'socket.io-client';
import { useDocumentStore } from './documentStore';
import toast from 'react-hot-toast';

export const useSocketStore = create((set, get) => ({
  socket: null,
  connected: false,

  connect: (token) => {
    if (get().socket?.connected) return;
    const serverUrl = import.meta.env.VITE_API_URL
      || (import.meta.env.PROD ? 'https://multimodal-doc-analyzer.onrender.com' : window.location.origin);
    const socket = io(serverUrl, { auth: { token }, transports: ['websocket', 'polling'] });

    socket.on('connect', () => {
      set({ connected: true });
    });

    socket.on('disconnect', () => {
      set({ connected: false });
    });

    socket.on('document:processing', ({ docId, stage, progress }) => {
      useDocumentStore.getState().updateDocumentInList({ _id: docId, status: 'processing', _progress: progress });
    });

    socket.on('document:completed', ({ docId, document }) => {
      useDocumentStore.getState().updateDocumentInList({ ...document, _id: docId });
      toast.success(`"${document.title}" analysis complete!`, { icon: '✅' });
    });

    socket.on('document:failed', ({ docId, error }) => {
      useDocumentStore.getState().updateDocumentInList({ _id: docId, status: 'failed' });
      toast.error(`Processing failed: ${error}`);
    });

    set({ socket });
  },

  disconnect: () => {
    get().socket?.disconnect();
    set({ socket: null, connected: false });
  },

  joinDocument: (documentId) => {
    get().socket?.emit('join:document', documentId);
  },

  leaveDocument: (documentId) => {
    get().socket?.emit('leave:document', documentId);
  }
}));
