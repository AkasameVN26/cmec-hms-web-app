import { ExplainResponse } from '@/types/ai';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

export const aiService = {
  getSummaryStreamUrl: (recordId: string) => `${API_BASE_URL}/api/summarize-stream/${recordId}`,

  fetchExplanation: async (recordId: string, summaryText: string): Promise<ExplainResponse> => {
    const response = await fetch(`${API_BASE_URL}/api/explain/${recordId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ summary: summaryText })
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch explanation: ${response.statusText}`);
    }

    return response.json();
  }
};
