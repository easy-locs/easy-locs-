import { Mail, Phone, MessageCircle, Send } from "lucide-react";
import { useI18n } from "@/lib/i18n";

interface Props {
  contactEmail?: string | null;
  contactPhone?: string | null;
  whatsappNumber?: string | null;
  telegramUsername?: string | null;
  listingTitle?: string;
}

const ListingContactButtons = ({
  contactEmail,
  contactPhone,
  whatsappNumber,
  telegramUsername,
  listingTitle = "",
}: Props) => {
  const { t } = useI18n();

  const hasAny = contactEmail || contactPhone || whatsappNumber || telegramUsername;
  if (!hasAny) return null;

  const whatsappUrl = whatsappNumber
    ? `https://wa.me/${whatsappNumber.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(`Hi, I'm interested in "${listingTitle}"`)}`
    : null;

  const telegramUrl = telegramUsername
    ? telegramUsername.startsWith("http")
      ? telegramUsername
      : `https://t.me/${telegramUsername.replace(/^@/, "")}`
    : null;

  const mailUrl = contactEmail
    ? `mailto:${contactEmail}?subject=${encodeURIComponent(`Inquiry: ${listingTitle}`)}`
    : null;

  const phoneUrl = contactPhone ? `tel:${contactPhone}` : null;

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        {t("page.listing.contact_direct") || "Contact directly"}
      </p>
      <div className="flex flex-wrap gap-2">
        {whatsappUrl && (
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 bg-[#25D366]/10 text-[#25D366] hover:bg-[#25D366]/20 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors"
          >
            <MessageCircle className="h-4 w-4" />
            WhatsApp
          </a>
        )}
        {telegramUrl && (
          <a
            href={telegramUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 bg-[#0088cc]/10 text-[#0088cc] hover:bg-[#0088cc]/20 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors"
          >
            <Send className="h-4 w-4" />
            Telegram
          </a>
        )}
        {mailUrl && (
          <a
            href={mailUrl}
            className="flex items-center gap-2 bg-accent/10 text-accent hover:bg-accent/20 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors"
          >
            <Mail className="h-4 w-4" />
            Email
          </a>
        )}
        {phoneUrl && (
          <a
            href={phoneUrl}
            className="flex items-center gap-2 bg-muted text-muted-foreground hover:bg-muted/80 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors"
          >
            <Phone className="h-4 w-4" />
            {contactPhone}
          </a>
        )}
      </div>
    </div>
  );
};

export default ListingContactButtons;
