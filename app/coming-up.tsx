import { PhoneCall, ReceiptText } from 'lucide-react';

const copy = {
  'en-IN': {
    heading: 'Coming up',
    note: 'Planned features · not available in this draft',
    invoice: 'Invoice management & GST',
    invoiceText: 'Create and manage invoices, with GST billing and tax summaries.',
    phone: 'Phone calls with Saathi',
    phoneText: 'Answer customer calls and send voice reminders over the phone.',
    badge: 'Coming up',
  },
  'hi-IN': {
    heading: 'जल्द आने वाली सुविधाएँ',
    note: 'योजनाबद्ध सुविधाएँ · इस डेमो में अभी उपलब्ध नहीं',
    invoice: 'इनवॉइस प्रबंधन और GST',
    invoiceText: 'इनवॉइस बनाना और संभालना, GST बिलिंग और टैक्स सारांश के साथ।',
    phone: 'साथी के साथ फ़ोन कॉल',
    phoneText: 'ग्राहकों के फ़ोन कॉल का जवाब और फ़ोन पर आवाज़ में रिमाइंडर।',
    badge: 'आने वाली सुविधा',
  },
  'mr-IN': {
    heading: 'लवकरच येणाऱ्या सुविधा',
    note: 'नियोजित सुविधा · या डेमोमध्ये अद्याप उपलब्ध नाहीत',
    invoice: 'इनव्हॉइस व्यवस्थापन आणि GST',
    invoiceText: 'GST बिलिंग आणि कर सारांशासह इनव्हॉइस तयार करा आणि सांभाळा.',
    phone: 'साथीसोबत फोन कॉल',
    phoneText: 'ग्राहकांच्या फोन कॉलला उत्तर आणि फोनवर आवाजात स्मरणपत्रे.',
    badge: 'लवकरच',
  },
};

export default function ComingUp({ language }: { language: string }) {
  const t = copy[language as keyof typeof copy] || copy['en-IN'];
  return (
    <section className="coming-up" aria-label={t.heading}>
      <div className="section-title">
        <h2>{t.heading}</h2>
        <p className="coming-up-note">{t.note}</p>
      </div>
      <div className="coming-up-grid">
        <article className="coming-up-card">
          <span className="tile-icon peach"><ReceiptText /></span>
          <div><h3>{t.invoice}</h3><p>{t.invoiceText}</p></div>
          <span className="pill">{t.badge}</span>
        </article>
        <article className="coming-up-card">
          <span className="tile-icon blue"><PhoneCall /></span>
          <div><h3>{t.phone}</h3><p>{t.phoneText}</p></div>
          <span className="pill">{t.badge}</span>
        </article>
      </div>
    </section>
  );
}
