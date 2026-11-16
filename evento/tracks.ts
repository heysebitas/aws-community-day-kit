import type { Track } from "@/config/contenido";

/**
 * Los tracks del evento. Es la única lista: de acá salen las tarjetas de la
 * portada, las opciones del Call for Speakers, los filtros del directorio y
 * los distintivos del panel. El color de cada uno se asigna solo, por orden.
 */
export const tracks: Track[] = [
  {
    id: "foundations",
    titulo: { label: "AWS Foundations", en: "AWS Foundations" },
    corto: "Foundations",
    nivel: { label: "Principiante", en: "Beginner" },
    temas: ["EC2", "S3", "VPC", "IAM"],
    postula: {
      label: "EC2, S3, VPC, IAM · primeros pasos · arquitectura y costos",
      en: "EC2, S3, VPC, IAM · first steps · architecture and cost",
    },
  },
  {
    id: "cloud-ai",
    titulo: { label: "Cloud, Automation & AI", en: "Cloud, Automation & AI" },
    corto: "Cloud & AI",
    nivel: { label: "Intermedio", en: "Intermediate" },
    temas: ["Serverless", "Bedrock", "DevOps"],
    postula: {
      label: "Serverless · IA y GenAI · DevOps y CI/CD",
      en: "Serverless · AI and GenAI · DevOps and CI/CD",
    },
  },
  {
    id: "security",
    titulo: { label: "Security & Cloud Governance", en: "Security & Cloud Governance" },
    corto: "Security",
    nivel: { label: "Intermedio", en: "Intermediate" },
    temas: ["IAM", "IaC", "DevSecOps"],
    postula: {
      label: "Identidades · IaC · DevSecOps y detección",
      en: "Identity · IaC · DevSecOps and detection",
    },
  },
  {
    id: "career",
    titulo: { label: "Soft Skills & Carrera", en: "Soft Skills & Career" },
    corto: "Soft Skills",
    nivel: { label: "Para todos", en: "Everyone" },
    temas: ["CV", "LinkedIn", "Certificaciones"],
    postula: {
      label: "Perfil profesional · certificaciones · empleabilidad",
      en: "Professional profile · certifications · employability",
    },
  },
];
