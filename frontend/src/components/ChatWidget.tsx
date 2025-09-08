// src/components/ChatWidget.tsx - FINAL CORRECTED VERSION

import { useState, useEffect, useRef } from "react";
import useWebSocket, { ReadyState } from "react-use-websocket";
import { useSelector, useDispatch } from "react-redux";
import {
  selectToken,
  selectCurrentUser,
  logout,
} from "../features/auth/authSlice";
import { addMessage, setConversation } from "../features/chat/chatSlice";
// --- FIX: REMOVE THE UNUSED IMPORT ---
// import { useGetMessageHistoryQuery } from "../features/api/apiSlice";
import { MessageSquare, X } from "lucide-react";
import type { Message } from "../types";
import type { RootState } from "../app/store";
import ReactMarkdown from "react-markdown";

export function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);

  const dispatch = useDispatch();
  const token = useSelector(selectToken);
  const currentUser = useSelector(selectCurrentUser);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const connectionOpened = useRef(false);

  const userId = currentUser?.user_id;

  // --- FIX: REMOVE THE OBSOLETE useGetMessageHistoryQuery HOOK AND EFFECT ---
  // The backend now sends history on connect, so this HTTP fetch is no longer needed.

  const messageHistory = useSelector((state: RootState) =>
    userId ? state.chat.conversations[userId] || [] : []
  );

  // Clear conversation history when widget opens to avoid showing old data
  useEffect(() => {
    if (isOpen && userId) {
      dispatch(setConversation({ userId, messages: [] }));
    }
  }, [isOpen, userId, dispatch]);

  const socketUrl = `ws://127.0.0.1:8000/ws/chat/?token=${token}`;
  const { sendMessage, lastMessage, readyState } = useWebSocket(socketUrl, {
    shouldReconnect: () => true,
    onOpen: () => {
      console.log("WebSocket connection established");
      connectionOpened.current = true;
      setAuthError(null);
    },
  });

  useEffect(() => {
    if (readyState === ReadyState.CLOSED && !connectionOpened.current) {
      console.error(
        "WebSocket connection failed. Potentially an expired token."
      );
      setAuthError(
        "Connection failed. Your session may have expired. Please log in again."
      );
      const timer = setTimeout(() => {
        dispatch(logout());
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [readyState, dispatch]);

  // This useEffect now handles BOTH historical and new messages from the stream
  useEffect(() => {
    if (lastMessage !== null && userId) {
      const messageData: Message = JSON.parse(lastMessage.data);
      // The user for our own messages is our email, so we dispatch all messages received.
      dispatch(addMessage({ userId, message: messageData }));
    }
  }, [lastMessage, userId, dispatch]);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messageHistory, isOpen]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (newMessage.trim() && userId && currentUser?.email) {
      sendMessage(JSON.stringify({ message: newMessage }));
      const optimisticMessage: Message = {
        id: Date.now(),
        user: currentUser.email, // Optimistically show our own message
        message: newMessage,
        timestamp: new Date().toISOString(),
      };
      dispatch(addMessage({ userId, message: optimisticMessage }));
      setNewMessage("");
    }
  };

  const connectionStatus =
    {
      [ReadyState.CONNECTING]: "Connecting...",
      [ReadyState.OPEN]: "Connected",
      [ReadyState.CLOSING]: "Closing...",
      [ReadyState.CLOSED]: "Disconnected",
      [ReadyState.UNINSTANTIATED]: "Uninstantiated",
    }[readyState] || "Loading...";

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end">
      {isOpen && (
        <div className="w-80 h-96 bg-white rounded-lg shadow-xl flex flex-col border mb-2">
          <div className="p-3 bg-blue-600 text-white rounded-t-lg flex justify-between items-center">
            <h3 className="font-semibold">Support Chat</h3>
            <p className="text-xs text-blue-200">{connectionStatus}</p>
          </div>
          <div className="flex-1 p-4 overflow-y-auto bg-gray-50">
            {authError && (
              <div className="p-2 my-2 text-center text-sm bg-red-100 text-red-700 rounded">
                {authError}
              </div>
            )}
            {messageHistory.map((msg, idx) => (
              <div
                key={msg.id || idx}
                className={`flex flex-col my-2 ${
                  msg.user === currentUser?.email ? "items-end" : "items-start"
                }`}
              >
                <p className="text-xs text-gray-500 px-1">
                  {msg.user === currentUser?.email ? "You" : msg.user} -{" "}
                  {new Date(msg.timestamp).toLocaleTimeString()}
                </p>
                <div
                  className={`p-2 rounded-lg text-sm inline-block max-w-xs break-words ${
                    msg.user === currentUser?.email
                      ? "bg-blue-500 text-white"
                      : "bg-gray-200 text-gray-800"
                  }`}
                >
                  <ReactMarkdown>{msg.message}</ReactMarkdown>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
          <form onSubmit={handleSendMessage} className="p-3 border-t flex">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type your message..."
              className="flex-1 min-w-0 border rounded-l-md px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
              disabled={readyState !== ReadyState.OPEN || !!authError}
            />
            <button
              type="submit"
              className="bg-blue-600 text-white px-4 py-1 rounded-r-md hover:bg-blue-700 disabled:bg-blue-300"
              disabled={readyState !== ReadyState.OPEN || !!authError}
            >
              Send
            </button>
          </form>
        </div>
      )}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="bg-blue-600 text-white rounded-full p-4 shadow-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2"
        aria-label="Toggle Chat"
      >
        {isOpen ? <X size={24} /> : <MessageSquare size={24} />}
      </button>
    </div>
  );
}
