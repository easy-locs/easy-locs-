/**
 * DINO V8 — Content Generation Engine
 * Generates localized descriptions, labels, and messages.
 */

export interface ContentRequest {
  type: "category_description" | "store_description" | "onboarding_message" | "notification" | "menu_label";
  entityName: string;
  category: string;
  country: string;
  language: string;
  context?: Record<string, string>;
}

export interface GeneratedContent {
  type: string;
  content: string;
  language: string;
  confidence: number;
  requiresReview: boolean;
}

const TEMPLATES: Record<string, Record<string, string>> = {
  category_description: {
    fr: "Découvrez les meilleurs {{category}} près de chez vous. Commandez en quelques clics.",
    en: "Discover the best {{category}} near you. Order in just a few clicks.",
    ar: "اكتشف أفضل {{category}} بالقرب منك. اطلب بنقرات قليلة.",
    th: "ค้นพบ {{category}} ที่ดีที่สุดใกล้คุณ สั่งซื้อได้ในไม่กี่คลิก",
  },
  store_description: {
    fr: "{{entityName}} vous propose une sélection de {{category}} de qualité. Bienvenue!",
    en: "{{entityName}} offers a quality selection of {{category}}. Welcome!",
    ar: "{{entityName}} يقدم لكم مجموعة مختارة من {{category}} عالية الجودة. مرحباً!",
    th: "{{entityName}} นำเสนอ {{category}} คุณภาพดี ยินดีต้อนรับ!",
  },
  onboarding_message: {
    fr: "Bienvenue sur Easy Locs! Complétez votre profil {{category}} pour commencer à recevoir des clients.",
    en: "Welcome to Easy Locs! Complete your {{category}} profile to start receiving customers.",
    ar: "مرحباً بك في Easy Locs! أكمل ملفك الشخصي لـ {{category}} لبدء استقبال العملاء.",
    th: "ยินดีต้อนรับสู่ Easy Locs! กรอกโปรไฟล์ {{category}} ของคุณเพื่อเริ่มรับลูกค้า",
  },
  notification: {
    fr: "Votre profil {{entityName}} n'est pas complet. Ajoutez des photos pour attirer plus de clients!",
    en: "Your {{entityName}} profile is incomplete. Add photos to attract more customers!",
    ar: "ملفك الشخصي {{entityName}} غير مكتمل. أضف صوراً لجذب المزيد من العملاء!",
    th: "โปรไฟล์ {{entityName}} ของคุณยังไม่สมบูรณ์ เพิ่มรูปภาพเพื่อดึงดูดลูกค้ามากขึ้น!",
  },
};

function interpolate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? key);
}

export function generateContent(request: ContentRequest): GeneratedContent {
  const templates = TEMPLATES[request.type];
  if (!templates) {
    return { type: request.type, content: "", language: request.language, confidence: 0, requiresReview: true };
  }

  const template = templates[request.language] ?? templates.en ?? "";
  const vars: Record<string, string> = {
    entityName: request.entityName,
    category: request.category,
    ...request.context,
  };

  const content = interpolate(template, vars);
  const hasTemplate = !!templates[request.language];

  return {
    type: request.type,
    content,
    language: request.language,
    confidence: hasTemplate ? 0.9 : 0.6,
    requiresReview: !hasTemplate,
  };
}

export function batchGenerateContent(requests: ContentRequest[]): GeneratedContent[] {
  return requests.map(generateContent);
}
