import { GoogleGenAI } from '@google/genai';

const geminiApiKey = process.env.GEMINI_API_KEY || '';
const ai = new GoogleGenAI({ apiKey: geminiApiKey });

export const isGeminiConfigured = Boolean(geminiApiKey);

export const geminiModel = 'gemini-3-flash-preview';

export const systemInstruction = `
Eres un asistente experto en puericultura, cálido y empático, diseñado para apoyar a padres primerizos (especialmente a Pedrito y Vanessa).
Tu tono debe ser tranquilizador, práctico y lleno de apoyo.
Ayuda con dudas sobre el embarazo, preparación para el parto, cuidado del recién nacido y bienestar emocional de los padres.
Si te preguntan sobre la aplicación, recuerda que tiene una lista de regalos (Wishlist) y un panel de control privado para tareas.
`;

export async function askGemini(prompt: string) {
  if (!isGeminiConfigured) {
    return 'La IA no está configurada todavía. Agrega GEMINI_API_KEY para habilitar el asistente.';
  }

  try {
    const response = await ai.models.generateContent({
      model: geminiModel,
      contents: prompt,
      config: {
        systemInstruction,
      },
    });
    return response.text;
  } catch (error) {
    console.error('Error calling Gemini:', error);
    return 'Lo siento, tuve un problema al procesar tu consulta. Por favor, intenta de nuevo.';
  }
}
