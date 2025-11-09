"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { ChatMessage } from "@/components/chat-message";
import { ChatInput } from "@/components/chat-input";
import { MedicalAdvice } from "@/components/medical-advice";
import { 
  type LocationData 
} from "@/lib/location";
import { 
  sendMessage, 
  SYSTEM_PROMPT,
  type MedicalAdviceResponse 
} from "@/lib/api";
import { loadSession, saveSession, type Message } from "@/lib/storage";
import { Stethoscope, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ChatSessionPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.sessionId as string;
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [locationData, setLocationData] = useState<LocationData | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load session from localStorage on mount
  useEffect(() => {
    const session = loadSession(sessionId);
    
    if (!session) {
      // Session not found, redirect to home
      router.push("/");
      return;
    }

    setMessages(session.messages);
    setLocationData(session.locationData);
    setIsLoading(false);
  }, [sessionId, router]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Auto-save when messages change
  useEffect(() => {
    if (messages.length > 0 && locationData) {
      saveSession(sessionId, messages, locationData);
    }
  }, [messages, sessionId, locationData]);

  const handleSendMessage = async (userInput: string) => {
    if (!locationData || isProcessing) return;

    // Add user message
    const userMessageId = `user-${Date.now()}`;
    const userMessage: Message = {
      id: userMessageId,
      content: userInput,
      isUser: true,
    };
    setMessages((prev) => [...prev, userMessage]);

    // Add streaming AI message placeholder
    const aiMessageId = `ai-${Date.now()}`;
    const aiMessage: Message = {
      id: aiMessageId,
      content: "",
      isUser: false,
      isStreaming: true,
    };
    setMessages((prev) => [...prev, aiMessage]);

    setIsProcessing(true);

    try {
      await sendMessage(
        {
          sessionId,
          user_input: userInput,
          location_coordnates: locationData.coordinates,
          location_str: locationData.locationString,
          within_distance: 100,
          "system prompt": SYSTEM_PROMPT,
        },
        // On chunk received
        (chunk: string) => {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === aiMessageId
                ? { ...msg, content: msg.content + chunk }
                : msg
            )
          );
        },
        // On complete
        (response: MedicalAdviceResponse | null) => {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === aiMessageId
                ? { 
                    ...msg, 
                    isStreaming: false, 
                    advice: response || undefined,
                    // Clear content if we have structured advice (to hide raw JSON)
                    content: response ? "" : msg.content
                  }
                : msg
            )
          );
          setIsProcessing(false);
        },
        // On error
        (error: string) => {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === aiMessageId
                ? { 
                    ...msg, 
                    content: `Error: ${error}`, 
                    isStreaming: false 
                  }
                : msg
            )
          );
          setIsProcessing(false);
        }
      );
    } catch (error) {
      console.error("Failed to send message:", error);
      setIsProcessing(false);
    }
  };

  const handleNewChat = () => {
    router.push("/");
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-muted-foreground">Loading session...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <header className="flex items-center gap-3 p-4 border-b bg-background shrink-0">
        <Stethoscope className="h-6 w-6 text-primary" />
        <div className="flex-1">
          <h1 className="text-lg font-semibold">Medical Triage Assistant</h1>
          <p className="text-xs text-muted-foreground">{locationData?.locationString}</p>
        </div>
        <Button
          onClick={handleNewChat}
          variant="outline"
          size="sm"
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          New Chat
        </Button>
      </header>

      {/* Messages Area */}
      <main className="flex-1 overflow-y-auto">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-8 text-center">
            <Stethoscope className="h-16 w-16 text-muted-foreground/50 mb-4" />
            <h2 className="text-xl font-semibold mb-2">How can I help you today?</h2>
            <p className="text-sm text-muted-foreground max-w-md">
              Describe your symptoms, and I&apos;ll provide medical advice, precautions, 
              and help you find nearby healthcare facilities.
            </p>
          </div>
        ) : (
          <div className="pb-4">
            {messages.map((message) => (
              <div key={message.id}>
                {/* Show chat message only if it has content and (is user message or doesn't have advice) */}
                {message.content && (message.isUser || !message.advice) && (
                  <ChatMessage
                    content={message.content}
                    isUser={message.isUser}
                    isStreaming={message.isStreaming}
                  />
                )}
                {/* Show structured medical advice if available */}
                {message.advice && (
                  <MedicalAdvice advice={message.advice} />
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </main>

      {/* Input Area */}
      <div className="shrink-0">
        <ChatInput
          onSend={handleSendMessage}
          disabled={isProcessing}
          placeholder="Describe your symptoms..."
        />
      </div>
    </div>
  );
}

