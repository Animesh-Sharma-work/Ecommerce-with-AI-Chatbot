// src/components/AdminChatInterface.tsx
import { useState } from "react";
import { useGetChatUsersQuery } from "../features/api/apiSlice";
import { AdminChatWindow } from "./AdminChatWindow";

export function AdminChatInterface() {
  const { data: users, isLoading, isError } = useGetChatUsersQuery();
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);

  if (isLoading) return <p>Loading user chats...</p>;
  if (isError) return <p>Error loading chats.</p>;

  return (
    <div className="flex h-[calc(100vh-150px)]">
      {/* User List Panel */}
      <div className="w-1/3 border-r border-gray-600 overflow-y-auto">
        <h2 className="text-lg font-semibold p-4 bg-gray-800 sticky top-0">
          Conversations
        </h2>
        <ul>
          {users?.map((user) => (
            <li
              key={user.id}
              onClick={() => setSelectedUserId(user.id)}
              className={`p-4 cursor-pointer hover:bg-gray-600 ${
                selectedUserId === user.id ? "bg-blue-600" : ""
              }`}
            >
              {user.email}
            </li>
          ))}
        </ul>
      </div>

      {/* Chat Window Panel */}
      <div className="w-2/3">
        {selectedUserId ? (
          <AdminChatWindow userId={selectedUserId} />
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-400">
              Select a conversation to start chatting.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
