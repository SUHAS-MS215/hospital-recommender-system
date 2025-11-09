export interface MedicalTriageRequest {
  sessionId: string;
  user_input: string;
  location_coordnates: string;
  location_str: string;
  within_distance: number;
  "system prompt": string;
}

export interface MedicalFacility {
  name: string;
  address: string;
  rating: number;
  url?: string;
  reviews?: string;
  hours?: string;
}

export interface MedicalAdviceResponse {
  severity: string;
  precautions: string; // Single string, not array
  otc_medications: string; // Single string, not array
  facilities: MedicalFacility[];
}

export interface StreamEvent {
  type: "begin" | "item" | "end";
  content?: string;
  metadata?: Record<string, unknown>;
}

const API_ENDPOINT = "https://poc-1.app.n8n.cloud/webhook/medical-triage";

export const SYSTEM_PROMPT = `You are an intelligent medical-triage assistant with access to a healthcare facility search tool. You receive symptom and location data via webhook.

Your workflow:

1) Analyze the provided symptoms and classify as emergency or non-emergency.

2) Provide immediate guidance with early precautions and safe OTC medication advice.

3) Use the search tool to find appropriate healthcare providers based on the location.

4) Present recommendations with facility details.

For symptom analysis:

- Classify severity as emergency vs non-emergency

- Provide immediate precautions

- Suggest safe OTC medications when appropriate (paracetamol, ORS, antacids, etc.)

- NEVER prescribe antibiotics or injections or prescription drugs

- Always include safety note to consult a doctor before taking any medication

- For emergencies include first-aid steps

When using the locations search tool:

- current user location is {{ $json.body.location_str }} co-ordinates  {{ $json.body.location_coordnates }}

- Use {{ $json.body.within_distance }} kilometers radius as default or adjust based on urgency

- Choose keyword based on symptoms:

  - For emergency cases use "emergency hospital" or "trauma center"

  - For specialized care use "urology hospital" for kidney issues or "cardiology hospital" for heart issues or "orthopedic clinic" for bones

  - For general care use "clinic" or "general hospital"

  - For pharmacy needs use "pharmacy" or "24 hour pharmacy"

When presenting results:

- List at least 5 relevant facilities (up to 10 if available)

- Include name, address, rating, location URL (Google Maps link), top reviews (1-2 line summary), and opening hours/status

- Prioritize by rating and distance and relevance to symptoms

- For emergencies emphasize calling emergency services first

**FORMATTING INSTRUCTIONS:**

- Format your entire response using Markdown syntax

- Use **bold** for important terms and severity levels

- Use bullet points (-) for lists of precautions and medications

- Use numbered lists (1., 2., 3.) for sequential steps or first-aid instructions

- Use ### headings for main sections like "Severity Assessment", "Precautions", "OTC Medications", "Nearby Healthcare Facilities"

- For facilities, format each as:
  - **Facility Name** (⭐ rating)
    - 📍 Address details
    - 🔗 [View on Map](location_url)
    - ⏰ Opening hours or status (e.g., "Open now · Closes 10 PM" or "Open 24 hours")
    - 💬 Top review summary in 1-2 lines

- Use > blockquotes for important safety warnings

- Keep paragraphs short and well-spaced for readability

- Use *italic* for emphasis when needed

Important rules:

- Keep language simple and clear

- Never diagnose diseases

- Use the search tool to provide real nearby facilities

- Adapt keyword based on symptom severity and type

- Format response in clean, readable Markdown (NOT JSON)`;

/**
 * Send a message to the medical triage API and handle streaming response
 */
export async function sendMessage(
  request: MedicalTriageRequest,
  onChunk: (chunk: string) => void,
  onComplete: (response: MedicalAdviceResponse | null) => void,
  onError: (error: string) => void
): Promise<void> {
  try {
    const response = await fetch(API_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error("No response body");
    }

    const decoder = new TextDecoder();
    let buffer = "";
    let accumulatedContent = "";

    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        break;
      }

      // Decode the chunk and add to buffer
      const decoded = decoder.decode(value, { stream: true });
      buffer += decoded;

      // Split by newlines (JSON objects are newline-separated)
      const lines = buffer.split("\n");

      // Keep the last line if it's incomplete (doesn't end with })
      if (lines.length > 0) {
        const lastLine = lines[lines.length - 1];
        if (lastLine && !lastLine.trim().endsWith("}")) {
          buffer = lines.pop() || "";
        } else {
          buffer = "";
        }
      }

      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed) {
          try {
            const event = JSON.parse(trimmed) as StreamEvent;

            // Reset accumulated content on new message begin
            if (event.type === "begin") {
              accumulatedContent = "";
            }

            if (event.type === "item" && event.content) {
              accumulatedContent += event.content;
              onChunk(event.content);
            }

            if (event.type === "end") {
              // Just complete without parsing - display raw content
              onComplete(null);

              // Reset for potential next message
              accumulatedContent = "";
            }
          } catch (e) {
            console.error("Failed to parse event:", e);
          }
        }
      }
    }
  } catch (error) {
    console.error("API Error:", error);
    onError(
      error instanceof Error ? error.message : "Failed to connect to service"
    );
  }
}

/**
 * Generate a unique session ID
 */
export function generateSessionId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}
