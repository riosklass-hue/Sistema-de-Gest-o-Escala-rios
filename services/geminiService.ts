
import { GoogleGenAI, Type } from "@google/genai";
import { Employee, ShiftType } from "../types";
import { PORTO_VELHO_HOLIDAYS } from "../constants";

// Initialize Gemini Client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateSmartSchedule = async (
  employees: Employee[],
  year: number,
  month: number,
  currentSchedulesContext?: any // Added context to help AI understand what's missing
): Promise<any[]> => {
  const modelId = "gemini-3-flash-preview"; 
  
  const monthPadded = String(month).padStart(2, '0');
  const activeHolidays = PORTO_VELHO_HOLIDAYS
    .filter(h => h.startsWith(monthPadded))
    .map(h => `${h.split('-')[1]}/${monthPadded}`)
    .join(', ');

  const prompt = `
    Atue como um especialista em logística de pessoal. 
    Sua tarefa é PREENCHER AS LACUNAS (espaços em branco) de uma escala de trabalho para o mês ${month}/${year}.
    
    Funcionários: ${employees.map(e => e.name).join(', ')}.
    
    Regras de Preenchimento:
    1. Respeite as atribuições já existentes (não sugira mudanças para dias já ocupados).
    2. FINAIS DE SEMANA e FERIADOS (${activeHolidays || 'Nenhum'}) devem ser marcados como 'OFF' (Folga) caso estejam vazios.
    3. Dias úteis vazios devem ser preenchidos de forma equilibrada com 'T1', 'Q1' ou 'PLAN'.
    4. Mantenha uma carga horária saudável para os colaboradores.
    
    Contexto Atual (Dias já preenchidos por ID): ${JSON.stringify(currentSchedulesContext || "Vazio")}

    Retorne APENAS um JSON array de sugestões para os espaços vazios.
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
              employeeId: { type: Type.STRING },
              employeeName: { type: Type.STRING },
              shifts: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    day: { type: Type.INTEGER },
                    type: { type: Type.STRING, enum: ["T1", "Q1", "PLAN", "OFF"] }
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
    const modelId = "gemini-3-flash-preview";
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
