
import { GoogleGenAI, Type } from "@google/genai";
import { Employee } from "../types";
import { PORTO_VELHO_HOLIDAYS } from "../constants";

// Inicialização conforme diretrizes oficiais
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateSmartSchedule = async (
  employees: Employee[],
  year: number,
  month: number,
  currentSchedulesContext?: any
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
    1. Respeite as atribuições já existentes.
    2. FINAIS DE SEMANA e FERIADOS (${activeHolidays || 'Nenhum'}) devem ser marcados como 'OFF'.
    3. Dias úteis vazios devem ser preenchidos com 'T1', 'Q1' ou 'PLAN'.
    4. Mantenha uma carga horária saudável.
    
    Contexto Atual: ${JSON.stringify(currentSchedulesContext || "Vazio")}

    Retorne APENAS um JSON array de sugestões.
  `;

  try {
    // Chamada unificada conforme documentação v0.22
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

    const text = response.text; // Acesso direto à propriedade .text
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
