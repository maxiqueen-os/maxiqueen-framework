import { analyzeEcosystem } from "@/core/analyzer";

export async function GET() {
  const analysis = analyzeEcosystem();

  return Response.json({
    timestamp: new Date().toISOString(),
    ecosystem: "MAXIQUEEN OS INTERTEK",
    ...analysis
  });
}
