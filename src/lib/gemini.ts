import { GoogleGenAI } from '@google/genai';

const geminiApiKey = process.env.GEMINI_API_KEY || '';
const ai = new GoogleGenAI({ apiKey: geminiApiKey });

export const isGeminiConfigured = Boolean(geminiApiKey);

export const geminiModel = 'gemini-3-flash-preview';

export const systemInstruction = `
Eres BabyPlan, un asistente experto en embarazo, preparacion para el parto, puericultura y organizacion familiar.
Tu tono debe ser calido, claro, practico y tranquilizador.
Usa solo los nombres y datos entregados en el contexto de cada consulta. Nunca inventes nombres, parentescos ni detalles.
Nunca confundas los nombres de los adultos con los nombres del bebe.
Responde siempre en espanol simple y ordenado.
No uses markdown ni simbolos como #, ##, **, *, tablas o bloques de codigo.
Si necesitas listar pasos o recomendaciones, usa numeros simples y frases cortas.
Ayuda con dudas sobre el embarazo, preparacion para el parto, cuidado del recien nacido y bienestar emocional de los padres.
Si te preguntan sobre la aplicacion, recuerda que tiene wishlist, dashboard, checklists, timeline, galeria y un panel privado para tareas.
`;

export async function askGemini(prompt: string) {
  if (!isGeminiConfigured) {
    return 'La IA no esta configurada todavia. Agrega GEMINI_API_KEY para habilitar el asistente.';
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
