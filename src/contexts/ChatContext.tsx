import { createContext, useContext, type ReactNode } from "react";

interface ChatContextValue {
  // Extend as needed
}

const ChatContext = createContext<ChatContextValue>({});

export function ChatProvider({ children }: { children: ReactNode }) {
  return <ChatContext.Provider value={{}}>{children}</ChatContext.Provider>;
}

export function useChat() {
  return useContext(ChatContext);
}
