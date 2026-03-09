interface FAQ { question: string; answer: string; }

const FAQSection = ({ faqs, title = "Frequently Asked Questions" }: { faqs: FAQ[]; title?: string }) => (
  <section className="py-16 md:py-24">
    <div className="container mx-auto px-4 max-w-3xl">
      <h2 className="text-3xl font-bold text-center text-foreground mb-10">{title}</h2>
      {faqs.map((q) => (
        <details key={q.question} className="mb-4 border border-border rounded-lg">
          <summary className="p-4 font-medium text-foreground cursor-pointer">{q.question}</summary>
          <p className="px-4 pb-4 text-muted-foreground text-sm leading-relaxed">{q.answer}</p>
        </details>
      ))}
    </div>
  </section>
);

export default FAQSection;
export type { FAQ };
