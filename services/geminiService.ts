
import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const parseTravelRequest = async (text: string) => {
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Extraia as informações de viagem deste texto para o ano de 2026. 
    Se o mês não for mencionado, assuma o mês atual do contexto. 
    Retorne um objeto JSON com o nome do técnico, data de saída (YYYY-MM-DD) e data de retorno (YYYY-MM-DD).
    
    Texto: "${text}"`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          technicianName: { type: Type.STRING },
          startDate: { type: Type.STRING, description: "Format YYYY-MM-DD" },
          endDate: { type: Type.STRING, description: "Format YYYY-MM-DD" },
          destination: { type: Type.STRING }
        },
        required: ["technicianName", "startDate", "endDate"]
      }
    }
  });

  try {
    return JSON.parse(response.text);
  } catch (e) {
    console.error("Failed to parse AI response", e);
    return null;
  }
};
