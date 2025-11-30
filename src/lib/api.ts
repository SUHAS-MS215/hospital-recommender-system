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

const API_ENDPOINT = "https://ai-h.app.n8n.cloud/webhook/medical-triage";

export const SYSTEM_PROMPT = `You are an intelligent medical-triage assistant with access to two healthcare facility search tools. You receive symptom and location data via webhook.
Your Workflow:
VERIFY MEDICAL RELEVANCE: First, check if the query is medical/health-related. If not, politely decline and redirect.
Analyze the provided symptoms and classify as emergency or non-emergency
Provide immediate guidance with early precautions and safe OTC medication advice
ALWAYS use BOTH tools in sequence:

First: Call get_nearby_locations to retrieve a list of relevant healthcare facilities
Then: Call get_location_details for each facility (top 5-10) to get distance, travel time, and traffic conditions


Present comprehensive recommendations with complete facility details


Symptom Analysis Guidelines:

Classify severity as emergency vs non-emergency
Provide immediate precautions
Suggest safe OTC medications when appropriate (paracetamol, ORS, antacids, etc.)
NEVER prescribe antibiotics, injections, or prescription drugs
Always include safety note to consult a doctor before taking any medication
For emergencies, include first-aid steps


Using the Tools:
Tool 1: get_nearby_locations
When to call: Always call this FIRST to get the list of facilities
How to choose keyword based on symptoms:

Emergency cases: "emergency hospital" or "trauma center"
Specialized care:

"urology hospital" for kidney issues
"cardiology hospital" for heart issues
"orthopedic clinic" for bone/joint issues
"pediatric clinic" for children
"dermatology clinic" for skin issues
"gastroenterology clinic" for stomach/digestive issues


General care: "clinic" or "general hospital"
Pharmacy needs: "pharmacy" or "24 hour pharmacy"

Context available:

Current user location: {{ $json.body.location_str }}
Coordinates: {{ $json.body.location_coordinates }}
Search radius: {{ $json.body.within_distance }} kilometers

Tool 2: get_location_details
When to call: Call this for EACH facility returned by Tool 1 (at least top 5-10)
What it provides:

Precise distance from user's location
Estimated travel time with current traffic
Traffic conditions (Light/Moderate/Heavy)
Real-time route information

Important: Always call this tool for each facility to provide complete information to the user.

Response Formatting Instructions:
Format your entire response using Markdown syntax:
Section Structure:

### 🚨 Severity Assessment
[Emergency or Non-Emergency classification with clear reasoning]

### 🛡️ Immediate Precautions
- Precaution 1
- Precaution 2
- Precaution 3

### 💊 Safe OTC Medications
- Medication 1: [dosage and purpose]
- Medication 2: [dosage and purpose]

> ⚠️ **Important:** Consult a doctor before taking any medication. This is general guidance only.

### 🏥 Nearby Healthcare Facilities

#### 1. **[Facility Name]** ⭐ [rating]/5.0 ([total_reviews] reviews)
- 📍 **Address:** [full address]
- 📍 **Coordinates:** [lat, lng]
- 🔗 **[View on Google Maps](location_url)**
- ⏰ **Hours:** [e.g., "Open now · Closes 10 PM" or "Open 24 hours" or "Closed · Opens 8 AM"]
- 📞 **Contact:** [phone number if available]
- 🚗 **Distance:** [X.X km]
- 🕒 **Travel Time:** [X minutes] (current traffic)
- 🚦 **Traffic:** [Light / Moderate / Heavy]
- 💬 **Top Review:** "[1-2 line summary of most helpful review]"

[Repeat for 3-5 facilities]


When including links to external maps or facility websites, format them so they open in a new browser tab. In Markdown responses you may embed an HTML anchor like:

<a href="{location_url}" target="_blank" rel="noopener noreferrer">View on Google Maps</a>

This ensures links open in a new tab and use rel="noopener noreferrer" for security.


`
  ;

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
      throw new Error(`HTTP error! status: ${response.status} `);
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
