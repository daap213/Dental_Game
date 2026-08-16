
import { GoogleGenAI } from "@google/genai";
import { Language } from "../types";

const apiKey = process.env.API_KEY || '';
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

export const generateBriefing = async (lang: Language): Promise<string> => {
  const fallback = lang === 'es' ? "Misión: Limpiar todas las bacterias. Buena suerte, soldado." : "Mission: Scrub all bacteria. Good luck, soldier.";
  if (!ai) return fallback;
  
  try {
    const prompt = lang === 'es' 
        ? "Escribe una misión corta, intensa y estilo retro-game para un soldado que es un Diente luchando dentro de una boca contra el 'General Gingivitis'. Máximo 2 oraciones. Usa juegos de palabras dentales. En ESPAÑOL."
        : "Write a very short, intense, retro-game style mission briefing for a soldier who is a Tooth fighting inside a mouth against 'General Gingivitis'. Max 2 sentences. Use dental puns.";

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        maxOutputTokens: 60,
      }
    });
    return response.text ? response.text.trim() : fallback;
  } catch (error) {
    console.error("Gemini Error:", error);
    return lang === 'es' ? "Misión: Limpiar bacterias. Fallo de Enlace. Suerte." : "Mission: Scrub all bacteria. System Link Failure. Good luck.";
  }
};

export const generateGameOverMessage = async (score: number, cause: string, lang: Language): Promise<string> => {
  const fallback = lang === 'es' ? `Diagnóstico: Necesitas cepillarte más. Puntaje: ${score}` : `Diagnosis: You need to brush more. Score: ${score}`;
  if (!ai) return fallback;

  try {
    const prompt = lang === 'es'
        ? `El jugador (un Diente valiente) murió en un juego estilo Contra. Puntaje: ${score}. Causa: ${cause}. Escribe un 'Diagnóstico Médico' sarcástico del villano 'General Gingivitis'. Max 2 oraciones. Cruel pero gracioso con juegos de palabras dentales. En ESPAÑOL.`
        : `The player (a brave Tooth) died in a Contra-style game. Score: ${score}. Cause of death: ${cause}. Write a sarcastic 'Medical Diagnosis' from the villain 'General Gingivitis'. Max 2 sentences. Cruel but funny dental puns.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
       config: {
        maxOutputTokens: 60,
      }
    });
    return response.text ? response.text.trim() : fallback;
  } catch (error) {
    console.error("Gemini Error:", error);
    return lang === 'es' ? `Diagnóstico: Fallo Estructural Crítico. Puntaje: ${score}` : `Diagnosis: Critical Structural Failure. Score: ${score}`;
  }
};
