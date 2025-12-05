import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.API_KEY || '';
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

export const generateBriefing = async (): Promise<string> => {
  if (!ai) return "Mission: Scrub all bacteria. Good luck, soldier.";
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: "Write a very short, intense, retro-game style mission briefing for a soldier who is a Tooth fighting inside a mouth against 'General Gingivitis'. Max 2 sentences. Use dental puns.",
      config: {
        maxOutputTokens: 60,
      }
    });
    return response.text ? response.text.trim() : "Mission: Scrub all bacteria. Good luck, soldier.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Mission: Scrub all bacteria. System Link Failure. Good luck.";
  }
};

export const generateGameOverMessage = async (score: number, cause: string): Promise<string> => {
  if (!ai) return `Diagnosis: You need to brush more. Score: ${score}`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `The player (a brave Tooth) died in a Contra-style game. Score: ${score}. Cause of death: ${cause}. Write a sarcastic 'Medical Diagnosis' from the villain 'General Gingivitis'. Max 2 sentences. Cruel but funny dental puns.`,
       config: {
        maxOutputTokens: 60,
      }
    });
    return response.text ? response.text.trim() : `Diagnosis: You need to brush more. Score: ${score}`;
  } catch (error) {
    console.error("Gemini Error:", error);
    return `Diagnosis: Critical Structural Failure. Score: ${score}`;
  }
};