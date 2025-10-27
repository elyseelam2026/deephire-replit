/**
 * Embeddings Service - Multi-AI Platform Architecture
 * Uses Voyage AI for semantic embeddings (xAI Grok embeddings not yet available)
 */

const VOYAGE_API_KEY = process.env.VOYAGE_API_KEY;
const VOYAGE_API_BASE = "https://api.voyageai.com/v1";

interface VoyageEmbeddingResponse {
  object: string;
  data: Array<{
    object: string;
    embedding: number[];
    index: number;
  }>;
  model: string;
  usage: {
    total_tokens: number;
  };
}

/**
 * Generate embedding for text using Voyage AI
 * Using voyage-2 model optimized for general-purpose semantic search
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  if (!VOYAGE_API_KEY) {
    throw new Error("VOYAGE_API_KEY is not configured");
  }

  // Clean and truncate text if needed (Voyage supports up to 32k tokens)
  const cleanText = text.trim().substring(0, 100000); // ~25k tokens max

  try {
    const response = await fetch(`${VOYAGE_API_BASE}/embeddings`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${VOYAGE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "voyage-2", // General-purpose embedding model, 1024 dimensions
        input: cleanText,
        input_type: "document", // Optimize for document retrieval
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Voyage AI embeddings API error: ${response.status} - ${errorText}`);
    }

    const data: VoyageEmbeddingResponse = await response.json();
    
    if (!data.data || data.data.length === 0) {
      throw new Error("No embedding data returned from Voyage AI API");
    }

    return data.data[0].embedding;
  } catch (error) {
    console.error("Error generating embedding:", error);
    throw error;
  }
}

/**
 * Generate query embedding (optimized for search queries)
 */
export async function generateQueryEmbedding(query: string): Promise<number[]> {
  if (!VOYAGE_API_KEY) {
    throw new Error("VOYAGE_API_KEY is not configured");
  }

  const cleanQuery = query.trim().substring(0, 10000);

  try {
    const response = await fetch(`${VOYAGE_API_BASE}/embeddings`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${VOYAGE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "voyage-2",
        input: cleanQuery,
        input_type: "query", // Optimize for query matching
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Voyage AI query embedding error: ${response.status} - ${errorText}`);
    }

    const data: VoyageEmbeddingResponse = await response.json();
    
    if (!data.data || data.data.length === 0) {
      throw new Error("No embedding data returned from Voyage AI API");
    }

    return data.data[0].embedding;
  } catch (error) {
    console.error("Error generating query embedding:", error);
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
