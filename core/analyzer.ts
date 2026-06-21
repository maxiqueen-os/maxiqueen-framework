import ecosystemData from "../data/ecosystem.json";
import { Ecosystem, ArchitectureIssue, SystemModule } from "../lib/types";

export function analyzeEcosystem(): { status: string; issues: ArchitectureIssue[] } {
  const ecosystem = ecosystemData as Ecosystem;
  const issues: ArchitectureIssue[] = [];

  // 1. Validación del Core Único
  const cores = ecosystem.modules.filter(m => m.tier === 'CORE');
  if (cores.length !== 1) {
    issues.push({
      type: "CRITICAL",
      message: `Anomalía de Núcleo: Se detectaron ${cores.length} cores definidos.`,
      actionRequired: "Asegura que solo maxiqueen-os actúe como ENTRY_POINT."
    });
  }

  // 2. Detección de Bucles y Dependencias Circulares
  ecosystem.modules.forEach((mod: SystemModule) => {
    if (mod.dependsOn?.includes(mod.name)) {
      issues.push({
        type: "LOOP",
        system: mod.name,
        message: `Dependencia circular autónoma en ${mod.name}.`,
        actionRequired: "Elimina el auto-consumo en la configuración de dependencias."
      });
    }
  });

  // 3. IA Engine: Detección Automática de Redundancia de Repositorios
  const repoMap: { [key: string]: string[] } = {};
  ecosystem.modules.forEach(mod => {
    if (!repoMap[mod.repo]) repoMap[mod.repo] = [];
    repoMap[mod.repo].push(mod.name);
  });

  Object.keys(repoMap).forEach(repo => {
    if (repoMap[repo].length > 1) {
      issues.push({
        type: "REDUNDANCY",
        message: `El repositorio físico [${repo}] sostiene múltiples despliegues lógicos: (${repoMap[repo].join(", ")}).`,
        actionRequired: "Mantén los despliegues independientes en Vercel, pero unifica la documentación en CONTROL.md."
      });
    }
  });

  // 4. IA Engine: Recomendación Inteligente de Fusiones Lógicas (Laboratorios)
  const labs = ecosystem.modules.filter(m => m.tier === 'LAB');
  if (labs.length >= 3) {
    issues.push({
      type: "SUGGESTION",
      message: `Sobrecarga cognitiva potencial: Tienes ${labs.length} laboratorios activos en paralelo.`,
      actionRequired: "Agrupa lógicamente maxiqueen-ver y maxiqueen-os-play dentro del sub-menú Sandbox sin romper despliegues."
    });
  }

  return {
    status: issues.some(i => i.type === 'CRITICAL' || i.type === 'LOOP') ? "CRITICAL_RISK" : issues.length > 0 ? "OPTIMIZATION_REQUIRED" : "PERFECT_HEALTH",
    issues
  };
}
