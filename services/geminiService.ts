
import { GoogleGenAI, Type } from "@google/genai";
import { Employee } from "../types";
import { PORTO_VELHO_HOLIDAYS } from "../constants";

export const parseFinancialDocument = async (text: string): Promise<any[]> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const modelId = "gemini-3-flash-preview";

  const prompt = `
    Analise o texto de OCR de uma Ficha Financeira Anual e extraia os dados mensais.
    Identifique as colunas de meses (Jan a Dez) e as linhas de:
    - VENCIMENTO (TOTAL DE PROVENTOS ou similar)
    - IMPOSTO DE RENDA (6003 ou similar)
    - INSS (6004 ou similar)
    - TOTAL LIQUIDO (9998 ou similar)

    Retorne APENAS um JSON array de objetos para cada mês encontrado que contenha dados.
    Texto do documento: ${text}
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
              month: { type: Type.INTEGER, description: "Mês de 0 (Jan) a 11 (Dez)" },
              year: { type: Type.INTEGER },
              gross: { type: Type.NUMBER, description: "Total de Proventos" },
              ir: { type: Type.NUMBER, description: "Imposto de Renda" },
              inss: { type: Type.NUMBER, description: "INSS" },
              net: { type: Type.NUMBER, description: "Valor Líquido" }
            },
            required: ["month", "year", "gross", "ir", "inss", "net"]
          }
        }
      }
    });

    const result = response.text;
    return result ? JSON.parse(result.trim()) : [];
  } catch (error) {
    console.error("Erro no processamento da IA Fiscal:", error);
    return [];
  }
};

export const generateSmartSchedule = async (
  employees: Employee[],
  year: number,
  month: number,
  currentSchedulesContext?: any
): Promise<any[]> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const modelId = "gemini-3-flash-preview"; 
  
  const monthPadded = String(month).padStart(2, '0');
  const activeHolidays = PORTO_VELHO_HOLIDAYS
    .filter(h => h.startsWith(monthPadded))
    .map(h => `${h.split('-')[1]}/${monthPadded}`)
    .join(', ');

  const prompt = `
    Atue como um gestor de RH sênior. Sua tarefa é COMPLETAR a escala de trabalho do mês ${month}/${year}.
    
    DIRETRIZES PARA PREENCHIMENTO:
    1. DIAS NÃO DIGITADOS (LACUNAS): Identifique dias úteis que não possuem turnos atribuídos e marque-os como 'OFF' (Folga).
    2. FINAIS DE SEMANA E FERIADOS: Estes dias (${activeHolidays || 'Nenhum feriado no período'}) devem ser OBRIGATORIAMENTE marcados como 'OFF'.
    3. MANUTENÇÃO: Não altere turnos (T1, Q1, PLAN) que já foram definidos pelo usuário no contexto.
    
    Funcionários para processar: ${employees.map(e => e.name).join(', ')}.
    Contexto Atual da Escala: ${JSON.stringify(currentSchedulesContext || "Vazio")}

    Retorne um JSON array de objetos por funcionário com a lista de dias e o tipo de turno ('OFF').
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
              shifts: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    day: { type: Type.INTEGER },
                    type: { type: Type.STRING, enum: ["OFF"] }
                  },
                  required: ["day", "type"]
                }
              }
            },
            required: ["employeeId", "shifts"]
          }
        }
      }
    });

    const text = response.text; 
    return text ? JSON.parse(text.trim()) : [];

  } catch (error) {
    console.error("AI Node Failure:", error);
    return [];
  }
};

export const analyzeScheduleInsights = async (scheduleData: any): Promise<string> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const modelId = "gemini-3-flash-preview";
    try {
        const response = await ai.models.generateContent({
            model: modelId,
            contents: `Realize uma análise executiva desta escala de trabalho. Identifique gargalos de ociosidade, sobrecarga de colaboradores ou falhas na cobertura de unidades. Seja curto, direto e técnico: ${JSON.stringify(scheduleData).substring(0, 1500)}...`
        });
        return response.text || "Diagnostic analysis unavailable.";
    } catch (e) {
        return "Critical analysis engine offline.";
    }
}
