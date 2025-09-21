import { PromptInputBox } from "./ui/ai-prompt-box"

export default function chatarea() {
  const handleSendMessage = (message: string, files?: File[]) => {
    console.log("Message:", message)
    console.log("Files:", files)
  }

  return (
    <div className="flex w-full h-screen justify-center items-center bg-gray-800">
      <div className="p-4 w-full max-w-[500px] flex justify-center">
        <PromptInputBox onSend={handleSendMessage} />
      </div>
    </div>
  )
}
