/**
 * Embeddings Service - xAI Grok Integration
 * Generates vector embeddings for semantic search
 */

const XAI_API_KEY = process.env.XAI_API_KEY;
const XAI_API_BASE = "https://api.x.ai/v1";

interface EmbeddingResponse {
  object: string;
  data: Array<{
    object: string;
    embedding: number[];
    index: number;
  }>;
  model: string;
  usage: {
    prompt_tokens: number;
    total_tokens: number;
  };
}

/**
 * Generate embedding for text using xAI Grok
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  if (!XAI_API_KEY) {
    throw new Error("XAI_API_KEY is not configured");
  }

  // Clean and truncate text if needed (most models have token limits)
  const cleanText = text.trim().substring(0, 50000); // ~12k tokens max

  try {
    const response = await fetch(`${XAI_API_BASE}/embeddings`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${XAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "embedding-model", // xAI embedding model
        input: cleanText,
        dimensions: 1024,
        encoding_format: "float",
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`xAI embeddings API error: ${response.status} - ${errorText}`);
    }

    const data: EmbeddingResponse = await response.json();
    
    if (!data.data || data.data.length === 0) {
      throw new Error("No embedding data returned from xAI API");
    }

    return data.data[0].embedding;
  } catch (error) {
    console.error("Error generating embedding:", error);
    throw error;
  }
}

/**
 * Generate embedding text from candidate data
 * Combines multiple fields for comprehensive semantic representation
 */
export function buildCandidateEmbeddingText(candidate: {
  firstName: string;
  lastName: string;
  currentTitle?: string | null;
  currentCompany?: string | null;
  skills?: string[] | null;
  biography?: string | null;
  careerSummary?: string | null;
  cvText?: string | null;
  location?: string | null;
  industry?: string[] | null;
}): string {
  const parts: string[] = [];

  // Basic identity
  parts.push(`${candidate.firstName} ${candidate.lastName}`);

  // Current role
  if (candidate.currentTitle) {
    parts.push(`Current role: ${candidate.currentTitle}`);
  }
  if (candidate.currentCompany) {
    parts.push(`at ${candidate.currentCompany}`);
  }

  // Location
  if (candidate.location) {
    parts.push(`Based in ${candidate.location}`);
  }

  // Skills
  if (candidate.skills && candidate.skills.length > 0) {
    parts.push(`Skills: ${candidate.skills.join(", ")}`);
  }

  // Industries
  if (candidate.industry && candidate.industry.length > 0) {
    parts.push(`Industries: ${candidate.industry.join(", ")}`);
  }

  // Biography (most valuable context)
  if (candidate.biography) {
    parts.push(candidate.biography);
  } else if (candidate.careerSummary) {
    parts.push(candidate.careerSummary);
  }

  // CV text as fallback (use first 5000 chars to avoid token limits)
  if (!candidate.biography && !candidate.careerSummary && candidate.cvText) {
    parts.push(candidate.cvText.substring(0, 5000));
  }

  return parts.join("\n\n");
}

/**
 * Calculate cosine similarity between two vectors
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error("Vectors must have the same dimensions");
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const magnitude = Math.sqrt(normA) * Math.sqrt(normB);
  
  if (magnitude === 0) {
    return 0;
  }

  return dotProduct / magnitude;
}
