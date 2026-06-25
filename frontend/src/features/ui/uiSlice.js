import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  sidebarOpen: true,
  mobileSidebarOpen: false,
  activeModal: null,
  modalData: null,
  globalLoading: false,
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    toggleSidebar: (state) => {
      state.sidebarOpen = !state.sidebarOpen;
    },
    toggleMobileSidebar: (state) => {
      state.mobileSidebarOpen = !state.mobileSidebarOpen;
    },
    closeMobileSidebar: (state) => {
      state.mobileSidebarOpen = false;
    },
    openModal: (state, action) => {
      state.activeModal = action.payload.modal;
      state.modalData = action.payload.data ?? null;
    },
    closeModal: (state) => {
      state.activeModal = null;
      state.modalData = null;
    },
    setGlobalLoading: (state, action) => {
      state.globalLoading = action.payload;
    },
  },
});

export const {
  toggleSidebar,
  toggleMobileSidebar,
  closeMobileSidebar,
  openModal,
  closeModal,
  setGlobalLoading,
} = uiSlice.actions;

export default uiSlice.reducer;

export const selectSidebarOpen = (state) => state.ui.sidebarOpen;
export const selectMobileSidebarOpen = (state) => state.ui.mobileSidebarOpen;
export const selectActiveModal = (state) => state.ui.activeModal;
export const selectModalData = (state) => state.ui.modalData;
