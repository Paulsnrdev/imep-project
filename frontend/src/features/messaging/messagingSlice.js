import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  conversations: [],
  activeConversationId: null,
  messages: {},
  unreadTotal: 0,
  contacts: [],
  sending: false,
  loading: false,
  error: null,
};

const messagingSlice = createSlice({
  name: 'messaging',
  initialState,
  reducers: {
    setConversations: (state, action) => { state.conversations = action.payload; },
    setActiveConversation: (state, action) => { state.activeConversationId = action.payload; },
    setMessages: (state, action) => {
      const { conversationId, messages } = action.payload;
      state.messages[conversationId] = messages;
    },
    appendMessage: (state, action) => {
      const { conversationId, message } = action.payload;
      if (!state.messages[conversationId]) state.messages[conversationId] = [];
      state.messages[conversationId].push(message);
    },
    setUnreadTotal: (state, action) => { state.unreadTotal = action.payload; },
    setContacts: (state, action) => { state.contacts = action.payload; },
    markRead: (state, action) => {
      const conversationId = action.payload;
      const conv = state.conversations.find((c) => c._id === conversationId);
      if (conv) conv.unreadCount = 0;
    },
    setSending: (state, action) => { state.sending = action.payload; },
    setLoading: (state, action) => { state.loading = action.payload; },
    setError: (state, action) => { state.error = action.payload; },
    clearError: (state) => { state.error = null; },
  },
});

export const {
  setConversations, setActiveConversation, setMessages, appendMessage,
  setUnreadTotal, setContacts, markRead, setSending, setLoading, setError, clearError,
} = messagingSlice.actions;

export default messagingSlice.reducer;

export const selectConversations = (state) => state.messaging.conversations;
export const selectActiveConversationId = (state) => state.messaging.activeConversationId;
export const selectMessagesByConversation = (id) => (state) => state.messaging.messages[id] ?? [];
export const selectUnreadTotal = (state) => state.messaging.unreadTotal;
