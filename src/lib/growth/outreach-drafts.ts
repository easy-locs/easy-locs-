export function buildMerchantActivationMessage(params: {
  merchantName: string;
  city: string;
  activationLink: string;
  locale?: "en" | "ar";
}) {
  const locale = params.locale ?? "en";

  if (locale === "ar") {
    return {
      subject: `تفعيل ${params.merchantName} على Easy-Locs`,
      body:
        `مرحباً،\n\n` +
        `تم تجهيز صفحة ${params.merchantName} في ${params.city} على Easy-Locs.\n` +
        `يمكنك تفعيل متجرك مجاناً الآن وإدارة القائمة والطلبات من نفس المكان.\n\n` +
        `رابط التفعيل:\n${params.activationLink}\n\n` +
        `Easy-Locs`,
    };
  }

  return {
    subject: `Activate ${params.merchantName} on Easy-Locs`,
    body:
      `Hello,\n\n` +
      `${params.merchantName} in ${params.city} is already prepared on Easy-Locs.\n` +
      `You can activate your store now for free and manage menu, orders, and delivery in one place.\n\n` +
      `Activation link:\n${params.activationLink}\n\n` +
      `Easy-Locs`,
  };
}
