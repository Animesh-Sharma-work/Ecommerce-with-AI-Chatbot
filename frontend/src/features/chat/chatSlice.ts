// src/features/chat/chatSlice.ts

import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { RootState } from "../../app/store";
import type { Message } from "../../types";

interface ChatState {
  // Store messages in an object where the key is the user ID
  // and the value is an array of messages for that conversation.
  conversations: {
    [userId: number]: Message[];
  };
}

const initialState: ChatState = {
  conversations: {},
};

const chatSlice = createSlice({
  name: "chat",
  initialState,
  reducers: {
    setConversation: (
      state,
      action: PayloadAction<{ userId: number; messages: Message[] }>
    ) => {
      state.conversations[action.payload.userId] = action.payload.messages;
    },
    clearConversation: (state, action: PayloadAction<number>) => {
      delete state.conversations[action.payload];
    },
    addMessage: (
      state,
      action: PayloadAction<{ userId: number; message: Message }>
    ) => {
      const { userId, message } = action.payload;
      if (!state.conversations[userId]) {
        state.conversations[userId] = [];
      }
      // Prevent adding duplicate messages
      if (!state.conversations[userId].find((m) => m.id === message.id)) {
        state.conversations[userId].push(message);
      }
    },
    // Clears all chat history (e.g., on logout)
    clearChats: (state) => {
      state.conversations = {};
    },
  },
});

export const { addMessage, clearChats, setConversation, clearConversation } =
  chatSlice.actions;

// Selector to get the messages for a specific conversation
export const selectMessagesForUser = (userId: number) => (state: RootState) =>
  state.chat.conversations[userId] || [];

export default chatSlice.reducer;
