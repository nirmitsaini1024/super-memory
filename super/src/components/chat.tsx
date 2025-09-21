"use client"

import { PromptInputBox } from "./ui/ai-prompt-box"
import { useState } from "react"

export default function Home() {
  const [messages, setMessages] = useState<Array<{ id: string; text: string; timestamp: Date }>>([])

  const handleSendMessage = (message: string, files?: File[]) => {
    console.log("Message:", message)
    console.log("Files:", files)

    const newMessage = {
      id: Date.now().toString(),
      text: message,
      timestamp: new Date(),
    }
    setMessages((prev) => [...prev, newMessage])
  }

  return (
    <div className="flex flex-col w-full h-screen bg-gray-800">
      <div
        className={`flex-1 flex justify-center ${messages.length > 0 ? "items-end pb-8" : "items-center"} transition-all duration-500 ease-in-out`}
      >
        <div
          className={`p-4 ${messages.length > 0 ? "w-full max-w-4xl" : "w-[500px]"} transition-all duration-500 ease-in-out`}
        >
          <PromptInputBox onSend={handleSendMessage} />
        </div>
      </div>
    </div>
  )
}
