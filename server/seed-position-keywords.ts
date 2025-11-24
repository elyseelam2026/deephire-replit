/**
 * SEED DATA for position keywords learning system
 * Run once to populate initial position keyword mappings
 */

import { db } from "./storage";
import { positionKeywords } from "@shared/schema";
import { DEFAULT_POSITION_KEYWORDS } from "./position-keywords";

export async function seedPositionKeywords() {
  console.log("📚 Seeding position keywords intelligence...");
  
  for (const [position, data] of Object.entries(DEFAULT_POSITION_KEYWORDS)) {
    try {
      await db.insert(positionKeywords).values({
        position,
        keywords: data.keywords,
        certifications: data.certifications,
        skills: data.skills,
        industries: data.industries,
        seniority: data.seniority,
        source: "seed",
        searchCount: 0
      }).onConflictDoUpdate({
        target: positionKeywords.position,
        set: {
          keywords: data.keywords,
          certifications: data.certifications,
          skills: data.skills,
          industries: data.industries,
          seniority: data.seniority
        }
      });
      console.log(`✅ Seeded: ${position}`);
    } catch (error) {
      console.error(`❌ Failed to seed ${position}:`, error);
    }
  }
  
  console.log("✅ Position keywords seeding complete!");
}
