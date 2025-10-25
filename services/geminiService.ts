
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";

if (!process.env.API_KEY) {
  console.warn(
    "API_KEY environment variable not set. App may not function correctly."
  );
}

const getAiClient = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

interface GenerateContentStreamParams {
  prompt: string;
  location?: { latitude: number; longitude: number };
}

export async function* generateContentStream({ prompt, location }: GenerateContentStreamParams): AsyncGenerator<GenerateContentResponse> {
  const ai = getAiClient();
  const model = 'gemini-2.5-pro';
  
  const config: any = {
    tools: [{ googleSearch: {} }, { googleMaps: {} }],
    thinkingConfig: { thinkingBudget: 32768 },
  };

  if (location) {
    config.toolConfig = {
      retrievalConfig: {
        latLng: {
          latitude: location.latitude,
          longitude: location.longitude,
        },
      },
    };
  }

  const responseStream = await ai.models.generateContentStream({
    model,
    contents: prompt,
    config,
  });

  for await (const chunk of responseStream) {
    yield chunk;
  }
}
