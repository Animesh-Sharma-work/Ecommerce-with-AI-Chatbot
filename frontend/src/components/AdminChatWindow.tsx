// src/components/AdminChatWindow.tsx - Corrected

import { useState, useEffect, useRef } from "react";
import useWebSocket, { ReadyState } from "react-use-websocket";
import { useSelector, useDispatch } from "react-redux";
import { selectToken, selectCurrentUser } from "../features/auth/authSlice";
import {
  addMessage,
  setConversation,
  clearConversation,
} from "../features/chat/chatSlice";
import { useGetMessageHistoryQuery } from "../features/api/apiSlice";
import type { Message } from "../types";
import type { RootState } from "../app/store";

export function AdminChatWindow({ userId }: { userId: number }) {
  const dispatch = useDispatch();
  const token = useSelector(selectToken);
  const currentUser = useSelector(selectCurrentUser);

  const { data: paginatedHistory, isLoading: historyLoading } =
    useGetMessageHistoryQuery(userId);

  // This effect now correctly populates the Redux store
  useEffect(() => {
    if (paginatedHistory) {
      dispatch(setConversation({ userId, messages: paginatedHistory.results }));
    }
    // When the component unmounts (i.e., we switch users), clear this conversation
    return () => {
      dispatch(clearConversation(userId));
    };
  }, [paginatedHistory, userId, dispatch]);

  const messageHistory = useSelector(
    (state: RootState) => state.chat.conversations[userId] || []
  );
  const [newMessage, setNewMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const socketUrl = `ws://127.0.0.1:8000/ws/chat/${userId}/?token=${token}`;
  const { sendMessage, lastMessage, readyState } = useWebSocket(socketUrl, {
    shouldReconnect: () => true,
  });

  // This effect correctly adds new live messages
  useEffect(() => {
    if (lastMessage !== null) {
      const messageData: Message = JSON.parse(lastMessage.data);
      dispatch(addMessage({ userId, message: messageData }));
    }
  }, [lastMessage, userId, dispatch]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messageHistory]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (newMessage.trim()) {
      sendMessage(JSON.stringify({ message: newMessage }));
      setNewMessage("");
    }
  };

  if (historyLoading) {
    return <div className="p-4 text-center">Loading message history...</div>;
  }

  return (
    <div className="h-full flex flex-col bg-gray-700">
      <div className="p-4 border-b border-gray-600">
        <h3 className="font-semibold">Chat with User #{userId}</h3>
      </div>
      <div className="flex-1 p-4 overflow-y-auto">
        {messageHistory.map((msg: Message, idx) => (
          <div
            key={msg.id || idx}
            className={`flex flex-col my-2 ${
              msg.user === currentUser?.email ? "items-end" : "items-start"
            }`}
          >
            <p className="text-xs text-gray-400">
              {msg.user} - {new Date(msg.timestamp).toLocaleTimeString()}
            </p>
            <div
              className={`p-2 rounded-lg text-sm inline-block ${
                msg.user === currentUser?.email
                  ? "bg-blue-600 text-white"
                  : "bg-gray-800 text-gray-200"
              }`}
            >
              {msg.message}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      <form
        onSubmit={handleSendMessage}
        className="p-3 border-t border-gray-600 flex"
      >
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          className="flex-1 bg-gray-800 rounded-l-md px-3 py-2 focus:outline-none"
          disabled={readyState !== ReadyState.OPEN}
        />
        <button
          type="submit"
          className="bg-blue-600 px-4 py-2 rounded-r-md"
          disabled={readyState !== ReadyState.OPEN}
        >
          Send
        </button>
      </form>
    </div>
  );
}
