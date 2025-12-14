import { GoogleGenAI, Type } from "@google/genai";
import { Employee, ShiftType } from "../types";
import { PORTO_VELHO_HOLIDAYS } from "../constants";

// Initialize Gemini Client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateSmartSchedule = async (
  employees: Employee[],
  year: number,
  month: number
): Promise<any[]> => {
  const modelId = "gemini-2.5-flash"; // Using Flash for speed/efficiency in logic tasks
  
  // Identify holidays in the requested month for the prompt context
  const monthPadded = String(month).padStart(2, '0');
  const activeHolidays = PORTO_VELHO_HOLIDAYS
    .filter(h => h.startsWith(monthPadded))
    .map(h => `${h.split('-')[1]}/${monthPadded}`) // Format DD/MM
    .join(', ');

  const prompt = `
    Atue como um planejador de escalas experiente.
    Gere uma escala de trabalho para o mês ${month}/${year} para os seguintes funcionários:
    ${employees.map(e => e.name).join(', ')}.
    
    Regras de Negócio (Rígidas):
    1. FINAIS DE SEMANA (Sábado e Domingo) e FERIADOS (${activeHolidays || 'Nenhum feriado neste mês'}) DEVEM ser preenchidos automaticamente com o tipo 'FINAL'.
    2. Dias úteis devem ser preenchidos preferencialmente com 'T1' (Turno Técnico Padrão) ou 'Q1' (Turno Qualidade/Complementar).
    3. Use 'PLAN' para dias administrativos/planejamento.
    4. O tipo 'OFF' deve ser usado para folgas obrigatórias.
    
    Retorne APENAS um JSON array onde cada objeto representa um funcionário e seus turnos diários.
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
                    type: { type: Type.STRING, enum: ["T1", "Q1", "PLAN", "FINAL", "OFF"] }
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