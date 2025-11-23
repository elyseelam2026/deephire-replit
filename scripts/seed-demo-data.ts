/**
 * Demo Data Seeding Script
 * 
 * Usage: npx tsx scripts/seed-demo-data.ts
 * 
 * Creates realistic demo data for all 10 features:
 * - Companies and users
 * - Candidates with full profiles
 * - War rooms with voting data
 * - Salary benchmarks
 * - Predictive scores
 * - Video interview records
 * - Diversity metrics
 * - Competitor alerts
 * - ATS connections
 * - Passive talent pool
 * - Slack integrations
 * - White-label clients
 */

import { neon } from "@neondatabase/serverless";
import * as schema from "../shared/schema";
import { drizzle } from "drizzle-orm/neon-http";

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql, { schema });

async function seedDemoData() {
  console.log("🌱 Starting demo data seeding...\n");

  try {
    // 1. Insert Companies
    console.log("📋 Creating companies...");
    const companies = await db
      .insert(schema.companies)
      .values([
        {
          name: "TechCorp Inc",
          industry: "Technology",
          size: 500,
          email: "hr@techcorp.example",
        },
        {
          name: "FinanceFlow",
          industry: "Finance",
          size: 200,
          email: "careers@financeflow.example",
        },
        {
          name: "HealthFirst",
          industry: "Healthcare",
          size: 150,
          email: "jobs@healthfirst.example",
        },
      ])
      .returning({ id: schema.companies.id });

    console.log(`✅ Created ${companies.length} companies\n`);

    // 2. Insert Users
    console.log("👥 Creating users...");
    const users = await db
      .insert(schema.users)
      .values([
        {
          name: "Alice Johnson",
          email: "alice@techcorp.example",
          companyId: companies[0].id,
          role: "recruiter",
        },
        {
          name: "Bob Smith",
          email: "bob@techcorp.example",
          companyId: companies[0].id,
          role: "hiring_manager",
        },
        {
          name: "Carol Davis",
          email: "carol@financeflow.example",
          companyId: companies[1].id,
          role: "recruiter",
        },
      ])
      .returning({ id: schema.users.id });

    console.log(`✅ Created ${users.length} users\n`);

    // 3. Insert Candidates
    console.log("🎯 Creating candidates...");
    const candidates = await db
      .insert(schema.candidates)
      .values([
        {
          name: "John Developer",
          email: "john@example.com",
          phone: "+1-555-0101",
          title: "Senior Software Engineer",
          experience: 8,
          skills: ["JavaScript", "TypeScript", "React", "Node.js"],
          linkedinUrl: "https://linkedin.com/in/johndeveloper",
          status: "prospect",
        },
        {
          name: "Sarah Analytics",
          email: "sarah@example.com",
          phone: "+1-555-0102",
          title: "Data Scientist",
          experience: 6,
          skills: ["Python", "SQL", "Machine Learning", "Analytics"],
          linkedinUrl: "https://linkedin.com/in/sarah-analytics",
          status: "prospect",
        },
        {
          name: "Michael Product",
          email: "michael@example.com",
          phone: "+1-555-0103",
          title: "Product Manager",
          experience: 10,
          skills: ["Product Strategy", "Analytics", "Communication"],
          linkedinUrl: "https://linkedin.com/in/michael-product",
          status: "prospect",
        },
      ])
      .returning({ id: schema.candidates.id });

    console.log(`✅ Created ${candidates.length} candidates\n`);

    // 4. Create War Rooms
    console.log("🏛️  Creating war rooms...");
    const warRooms = await db
      .insert(schema.warRooms)
      .values([
        {
          companyId: companies[0].id,
          candidateId: candidates[0].id,
          votingDeadline: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
          status: "active",
        },
        {
          companyId: companies[1].id,
          candidateId: candidates[1].id,
          votingDeadline: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
          status: "active",
        },
      ])
      .returning({ id: schema.warRooms.id });

    console.log(`✅ Created ${warRooms.length} war rooms\n`);

    // 5. Add War Room Votes
    console.log("✋ Adding war room votes...");
    await db.insert(schema.warRoomVotes).values([
      {
        warRoomId: warRooms[0].id,
        voterId: users[0].id,
        vote: "strong_yes",
        reasoning: "Excellent technical skills and team fit",
      },
      {
        warRoomId: warRooms[0].id,
        voterId: users[1].id,
        vote: "yes",
        reasoning: "Good experience but needs to strengthen leadership",
      },
      {
        warRoomId: warRooms[1].id,
        voterId: users[2].id,
        vote: "strong_yes",
        reasoning: "Perfect for analytics role, strong track record",
      },
    ]);

    console.log(`✅ Added war room votes\n`);

    // 6. Create Salary Benchmarks
    console.log("💰 Creating salary benchmarks...");
    await db.insert(schema.salaryBenchmarks).values([
      {
        jobTitle: "Senior Software Engineer",
        location: "San Francisco",
        experience: 8,
        industry: "Technology",
        benchmarkSalary: 185000,
        benchmarkBonus: 27750,
        benchmarkEquity: 1.0,
      },
      {
        jobTitle: "Data Scientist",
        location: "New York",
        experience: 6,
        industry: "Finance",
        benchmarkSalary: 165000,
        benchmarkBonus: 45000,
        benchmarkEquity: 0.5,
      },
      {
        jobTitle: "Product Manager",
        location: "San Francisco",
        experience: 10,
        industry: "Technology",
        benchmarkSalary: 175000,
        benchmarkBonus: 35000,
        benchmarkEquity: 1.5,
      },
    ]);

    console.log(`✅ Created salary benchmarks\n`);

    // 7. Create Predictive Scores
    console.log("🔮 Creating predictive scores...");
    const jobs = await db
      .insert(schema.jobs)
      .values([
        {
          companyId: companies[0].id,
          title: "Senior Software Engineer",
          description: "Looking for experienced software engineer",
          department: "Engineering",
          status: "open",
        },
        {
          companyId: companies[1].id,
          title: "Data Scientist",
          description: "Seeking data scientist for analytics team",
          department: "Analytics",
          status: "open",
        },
      ])
      .returning({ id: schema.jobs.id });

    await db.insert(schema.predictiveScores).values([
      {
        candidateId: candidates[0].id,
        jobId: jobs[0].id,
        successScore: 82,
        tenurePrediction: 36,
        retentionRisk: "low",
      },
      {
        candidateId: candidates[1].id,
        jobId: jobs[1].id,
        successScore: 78,
        tenurePrediction: 30,
        retentionRisk: "low",
      },
    ]);

    console.log(`✅ Created predictive scores\n`);

    // 8. Create Video Interviews
    console.log("🎥 Creating video interviews...");
    await db.insert(schema.videoInterviews).values([
      {
        jobId: jobs[0].id,
        candidateId: candidates[0].id,
        status: "scored",
        communicationScore: "82.5",
        enthusiasmScore: "78.3",
        clarityScore: "85.1",
        overallScore: "81.9",
        videoUrl: "https://storage.example.com/video1.mp4",
      },
      {
        jobId: jobs[1].id,
        candidateId: candidates[1].id,
        status: "scored",
        communicationScore: "79.2",
        enthusiasmScore: "81.5",
        clarityScore: "80.3",
        overallScore: "80.3",
        videoUrl: "https://storage.example.com/video2.mp4",
      },
    ]);

    console.log(`✅ Created video interviews\n`);

    // 9. Create Diversity Metrics
    console.log("🌍 Creating diversity metrics...");
    await db.insert(schema.diversityMetrics).values([
      {
        jobId: jobs[0].id,
        companyId: companies[0].id,
        gender: "M",
        ethnicity: "Asian",
        age: 35,
        status: "interviewed",
      },
      {
        jobId: jobs[0].id,
        companyId: companies[0].id,
        gender: "F",
        ethnicity: "White",
        age: 28,
        status: "applied",
      },
      {
        jobId: jobs[1].id,
        companyId: companies[1].id,
        gender: "F",
        ethnicity: "Black",
        age: 32,
        status: "interviewed",
      },
    ]);

    console.log(`✅ Created diversity metrics\n`);

    // 10. Create Competitor Alerts
    console.log("🏢 Creating competitor alerts...");
    await db.insert(schema.competitorInterviews).values([
      {
        candidateId: candidates[0].id,
        competitorCompany: "Google",
        interviewStage: "final",
      },
      {
        candidateId: candidates[1].id,
        competitorCompany: "Meta",
        interviewStage: "technical",
      },
    ]);

    console.log(`✅ Created competitor alerts\n`);

    // 11. Create ATS Connections
    console.log("🔗 Creating ATS connections...");
    await db.insert(schema.atsConnections).values([
      {
        companyId: companies[0].id,
        atsType: "greenhouse",
        oauthToken: "greenhouse_token_demo",
        refreshToken: "greenhouse_refresh_demo",
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      },
    ]);

    console.log(`✅ Created ATS connections\n`);

    // 12. Create Passive Talent Pool
    console.log("💼 Creating passive talent pool...");
    await db.insert(schema.passiveTalentPool).values([
      {
        candidateId: candidates[2].id,
        companyId: companies[2].id,
        reason: "Strong product background, good fit for future roles",
        status: "saved",
      },
    ]);

    console.log(`✅ Created passive talent pool\n`);

    // 13. Create Integration Connections
    console.log("📱 Creating integration connections...");
    await db.insert(schema.integrationConnections).values([
      {
        companyId: companies[0].id,
        integrationType: "slack",
        webhookUrl: "https://hooks.slack.com/services/demo/webhook",
        isActive: true,
      },
    ]);

    console.log(`✅ Created integration connections\n`);

    // 14. Create White-Label Clients
    console.log("🏷️  Creating white-label clients...");
    await db.insert(schema.whitelabelClients).values([
      {
        partnerCompanyName: "Staffing Pro",
        customDomain: "staffing-pro.deephire.example",
        brandingColor: "#FF6B35",
        logoUrl: "https://cdn.example.com/staffing-pro-logo.png",
        status: "active",
      },
    ]);

    console.log(`✅ Created white-label clients\n`);

    // Summary
    console.log("✨ Demo data seeding complete!\n");
    console.log("📊 Summary:");
    console.log(`   ✅ ${companies.length} companies`);
    console.log(`   ✅ ${users.length} users`);
    console.log(`   ✅ ${candidates.length} candidates`);
    console.log(`   ✅ ${warRooms.length} war rooms`);
    console.log(`   ✅ 3 salary benchmarks`);
    console.log(`   ✅ 2 predictive scores`);
    console.log(`   ✅ 2 video interviews`);
    console.log(`   ✅ 3 diversity metrics`);
    console.log(`   ✅ 2 competitor alerts`);
    console.log(`   ✅ 1 ATS connection`);
    console.log(`   ✅ 1 passive talent entry`);
    console.log(`   ✅ 1 Slack integration`);
    console.log(`   ✅ 1 white-label client\n`);

    process.exit(0);
  } catch (error) {
    console.error("❌ Error seeding demo data:", error);
    process.exit(1);
  }
}

seedDemoData();
