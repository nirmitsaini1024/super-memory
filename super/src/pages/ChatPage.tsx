"use client"

import ChatArea from "../components/chat"

export default function ChatPage() {
  return (
    <div className="bg-gray-50 dark:bg-gray-900 flex flex-col" style={{ height: 'calc(100vh - 64px)' }}>
      <div className="flex-1 px-4 sm:px-6 lg:px-8 pb-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden h-full">
          <ChatArea />
        </div>
      </div>
    </div>
  )
}
