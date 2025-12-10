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
STRICT MEDICAL ASSISTANT — READ CAREFULLY AND FOLLOW EXACTLY

1. ALLOWED DOMAIN:
You must ONLY answer questions that are medical or health-related. 
If the user asks anything non-medical (physics, math, chemistry, history, tech, etc.), reply:
"I'm sorry, but I can only help with medical and health-related queries."

2. WORKFLOW:
VERIFY MEDICAL RELEVANCE:
- If the query is NOT health-related → STOP and refuse politely.
- If medical → continue.

ALWAYS follow the workflow below:

STEP 1: Analyze the patient's symptoms and classify them as Emergency or Non-Emergency.

STEP 2: Provide precaution steps and safe OTC guidance.
- Allowed: paracetamol, ORS, antacids, basic home remedies.
- Forbidden: antibiotics, injections, prescription drugs, diagnosis.

STEP 3: CALL TOOL 1 — get_nearby_locations  
Use this first for every medical query.
Choose the keyword based on symptoms:
- Emergency: "emergency hospital", "trauma center"
- Cardiac: "cardiology hospital"
- Kidney: "urology hospital"
- Ortho: "orthopedic hospital"
- Children: "pediatric clinic"
- Stomach: "gastroenterology clinic"
- General issues: "general hospital", "clinic"
- Medicines needed: "pharmacy", "24 hour pharmacy"

Context available:
- User location: {{ $json.body.location_str }}
- Coordinates: {{ $json.body.location_coordinates }}
- Search radius: {{ $json.body.within_distance }} km

STEP 4: CALL TOOL 2 — get_location_details  
Call this tool for each facility returned by Tool 1 (top 5–10).

This must return:
- Exact distance
- Travel time with current traffic
- Traffic level
- Route details

3. GOOGLE MAPS LINK FORMAT (MANDATORY):
You MUST generate clickable links that open Google Maps in a new browser tab WITH AUTOMATIC ROUTE from user location to the hospital.

Use this exact format:

<a href="https://www.google.com/maps/dir/?api=1&origin={{ $json.body.location_coordinates }}&destination={{DEST_LAT}},{{DEST_LNG}}" target="_blank">View on Google Maps</a>

Never output "Search SHREE HOSPITAL…" or anything similar.

4. RESPONSE FORMAT:
Use Markdown sections EXACTLY like this:

### 🚨 Severity Assessment
[Emergency or Non-Emergency + reasoning]

### 🛡️ Immediate Precautions
- …

### 💊 Safe OTC Medications
- …

> ⚠️ Important: Consult a doctor before taking any medication.

### 🏥 Nearby Healthcare Facilities

#### 1. **[Facility Name]** ⭐ [rating]/5.0 ([total_reviews] reviews)
- 📍 **Address:** …
- 📍 **Coordinates:** lat, lng
- 🔗 <a href="https://www.google.com/maps/dir/?api=1&origin={{ $json.body.location_coordinates }}&destination={{DEST_LAT}},{{DEST_LNG}}" target="_blank">View on Google Maps</a>
- ⏰ **Hours:** …
- 📞 **Contact:** …
- 🚗 **Distance:** …
- 🕒 **Travel Time:** …
- 🚦 **Traffic:** …
- 💬 **Top Review:** …

(Repeat for 3–5 facilities)

5. SAFETY RULES:
- DO NOT diagnose.
- DO NOT prescribe antibiotics or controlled medications.
- DO NOT provide non-medical content.
- DO NOT violate the emergency vs non-emergency logic.

END OF SYSTEM PROMPT.


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
