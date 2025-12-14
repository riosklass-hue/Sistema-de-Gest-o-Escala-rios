import { GoogleGenAI, Type } from "@google/genai";
import { Employee, ShiftType } from "../types";

// Initialize Gemini Client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateSmartSchedule = async (
  employees: Employee[],
  year: number,
  month: number
): Promise<any[]> => {
  const modelId = "gemini-2.5-flash"; // Using Flash for speed/efficiency in logic tasks
  
  const prompt = `
    Gere uma escala de trabalho realista para o mês ${month}/${year} para os seguintes funcionários:
    ${employees.map(e => e.name).join(', ')}.
    
    Regras:
    1. Tipos de turno: T1 (Técnico), PLAN (Planejamento), FINAL (Final de Semana), OFF (Folga).
    2. Distribua os turnos de forma equilibrada.
    3. Nos finais de semana (Sábado e Domingo), use preferencialmente 'FINAL' ou 'OFF'.
    4. Durante a semana, alterne entre 'T1' e 'PLAN'.
    5. Cada funcionário deve ter pelo menos 8 folgas (OFF) no mês.
    
    Retorne APENAS um JSON array onde cada objeto representa um funcionário e seus turnos.
  `;

  try {
    const response = await ai.models.generateContent({
      model: modelId,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              employeeId: { type: Type.STRING }, // Just map by name index conceptually for simplicity in prompt
              employeeName: { type: Type.STRING },
              shifts: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    day: { type: Type.INTEGER },
                    type: { type: Type.STRING, enum: ["T1", "PLAN", "FINAL", "OFF"] }
                  }
                }
              }
            }
          }
        }
      }
    });

    const text = response.text;
    if (!text) return [];
    
    return JSON.parse(text);

  } catch (error) {
    console.error("Erro ao gerar escala com Gemini:", error);
    return [];
  }
};

export const analyzeScheduleInsights = async (scheduleData: any): Promise<string> => {
    const modelId = "gemini-2.5-flash";
    try {
        const response = await ai.models.generateContent({
            model: modelId,
            contents: `Analise esta escala de trabalho e forneça 3 insights curtos e executivos sobre a distribuição de carga de trabalho e possíveis pontos de atenção (em Português): ${JSON.stringify(scheduleData).substring(0, 1000)}...`
        });
        return response.text || "Sem insights disponíveis.";
    } catch (e) {
        return "Erro ao analisar dados.";
    }
}
