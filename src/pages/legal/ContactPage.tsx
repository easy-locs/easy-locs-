import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import { useI18n } from "@/lib/i18n";
import SEOHead from "@/components/SEOHead";
import { Mail, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { toast } from "@/hooks/use-toast";

const ContactPage = () => {
  const { t } = useI18n();
  const [sending, setSending] = useState(false);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSending(true);
    setTimeout(() => {
      setSending(false);
      toast({ title: t("legal.contact.sent") });
      (e.target as HTMLFormElement).reset();
    }, 1000);
  };

  return (
    <div className="app-mobile-page flex flex-col">
      <SEOHead
        title="Contact Easy-Locs — Support & Inquiries"
        description="Get in touch with the Easy-Locs team. Support, partnerships, and inquiries for our property management platform."
        canonical="https://www.easy-locs.com/contact"
        jsonLd={{ "@context": "https://schema.org", "@type": "ContactPage", name: "Contact Easy-Locs", url: "https://www.easy-locs.com/contact" }}
      />
      <Navbar />
      <main className="flex-1 pt-24 pb-16">
        <div className="container max-w-2xl">
          <h1 className="text-3xl font-bold text-foreground mb-2">{t("legal.contact.title")}</h1>
          <p className="text-muted-foreground mb-8">{t("legal.contact.subtitle")}</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
            <div className="border border-border rounded-lg p-5 bg-card flex items-start gap-3">
              <Mail className="h-5 w-5 text-accent mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold text-foreground text-sm">Email</p>
                <a href="mailto:contact@easy-locs.com" className="text-sm text-accent hover:underline">contact@easy-locs.com</a>
              </div>
            </div>
            <div className="border border-border rounded-lg p-5 bg-card flex items-start gap-3">
              <MessageCircle className="h-5 w-5 text-accent mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold text-foreground text-sm">{t("legal.contact.response")}</p>
                <p className="text-sm text-muted-foreground">24-48h</p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input placeholder={t("legal.contact.name")} required className="h-11" />
              <Input type="email" placeholder={t("legal.contact.email")} required className="h-11" />
            </div>
            <Input placeholder={t("legal.contact.subject")} required className="h-11" />
            <Textarea placeholder={t("legal.contact.message")} required rows={5} />
            <Button type="submit" disabled={sending} className="w-full sm:w-auto">
              {sending ? "..." : t("legal.contact.send")}
            </Button>
          </form>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default ContactPage;
