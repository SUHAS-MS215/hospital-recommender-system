"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { ChatMessage } from "@/components/chat-message";
import { ChatInput } from "@/components/chat-input";
import { MedicalAdvice } from "@/components/medical-advice";
import { LocationPrompt } from "@/components/location-prompt";
import { 
  requestLocation, 
  isLocationData, 
  type LocationData 
} from "@/lib/location";
import { 
  sendMessage, 
  generateSessionId, 
  SYSTEM_PROMPT,
  type MedicalAdviceResponse 
} from "@/lib/api";
import { saveSession, type Message } from "@/lib/storage";
import { Stethoscope } from "lucide-react";

export default function Home() {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [locationData, setLocationData] = useState<LocationData | null>(null);
  const [locationError, setLocationError] = useState<string>("");
  const [locationLoading, setLocationLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [sessionId] = useState(() => generateSessionId());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [shouldRedirect, setShouldRedirect] = useState(false);

  const handleLocationRequest = async () => {
    setLocationLoading(true);
    setLocationError("");
    
    const result = await requestLocation();
    
    if (isLocationData(result)) {
      setLocationData(result);
      setLocationError("");
    } else {
      setLocationError(result.message);
    }
    
    setLocationLoading(false);
  };

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Request location on mount
  useEffect(() => {
    const initLocation = async () => {
      await handleLocationRequest();
    };
    void initLocation();
  }, []);

  // Handle redirect after first message
  useEffect(() => {
    if (shouldRedirect && locationData && messages.length >= 2) {
      saveSession(sessionId, messages, locationData);
      router.push(`/chat/${sessionId}`);
    }
  }, [shouldRedirect, locationData, messages, sessionId, router]);

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
          // Trigger redirect after state update
          setShouldRedirect(true);
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

  // Show location prompt if location not available
  if (!locationData) {
    return (
      <div className="flex flex-col h-screen bg-background">
        <header className="flex items-center gap-3 p-4 border-b bg-background">
          <Stethoscope className="h-6 w-6 text-primary" />
          <h1 className="text-lg font-semibold">Medical Triage Assistant</h1>
        </header>
        <main className="flex-1 flex items-center justify-center p-4">
          <LocationPrompt
            onRequestLocation={handleLocationRequest}
            error={locationError}
            loading={locationLoading}
          />
        </main>
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
          <p className="text-xs text-muted-foreground">{locationData.locationString}</p>
        </div>
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
