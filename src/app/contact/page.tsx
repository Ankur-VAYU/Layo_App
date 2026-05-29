'use client';

import { useRouter } from 'next/navigation';
import Logo from '@/components/Logo';

const PHONE = '8730852481';
const WHATSAPP_MSG = encodeURIComponent('Hi Layo! I have a question about shipping from India to Canada.');

export default function ContactPage() {
  const router = useRouter();

  return (
    <div className="bg-[#131313] min-h-screen text-white flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#131313]/95 backdrop-blur-md border-b border-white/10 flex items-center gap-3 px-5 h-[10vh]">
        <button onClick={() => router.back()} className="w-9 h-9 flex items-center justify-center text-on-surface-variant hover:text-white transition-colors">
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <Logo showTagline={false} />
        <div className="flex-1" />
        <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Contact Us</span>
      </header>

      <main className="flex-grow px-5 py-6 max-w-lg mx-auto w-full space-y-6">

        {/* Hero */}
        <div className="text-center pt-4 pb-2">
          <span className="material-symbols-outlined text-primary text-5xl">support_agent</span>
          <h1 className="text-2xl font-bold text-white mt-3">We're Here to Help</h1>
          <p className="text-on-surface-variant text-sm mt-2 leading-relaxed">
            Reach out any time — we typically respond within a few hours.
          </p>
        </div>

        {/* Call & WhatsApp CTAs */}
        <div className="grid grid-cols-2 gap-3">
          <a
            href={`tel:+91${PHONE}`}
            className="flex flex-col items-center gap-2 bg-[#1a1a1a] border border-white/10 rounded-2xl py-5 hover:border-primary/30 hover:bg-primary/5 active:scale-95 transition-all"
          >
            <span className="material-symbols-outlined text-primary text-3xl">call</span>
            <span className="text-xs font-bold text-white">Call Us</span>
            <span className="text-[10px] text-on-surface-variant">+91 {PHONE}</span>
          </a>
          <a
            href={`https://wa.me/91${PHONE}?text=${WHATSAPP_MSG}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col items-center gap-2 bg-[#1a1a1a] border border-white/10 rounded-2xl py-5 hover:border-[#25D366]/30 hover:bg-[#25D366]/5 active:scale-95 transition-all"
          >
            {/* WhatsApp icon using SVG */}
            <svg width="30" height="30" viewBox="0 0 24 24" fill="#25D366">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
            <span className="text-xs font-bold text-white">WhatsApp</span>
            <span className="text-[10px] text-on-surface-variant">Chat now</span>
          </a>
        </div>

        {/* Contact details */}
        <section className="space-y-3">
          <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary border-l-4 border-primary pl-3">Contact Details</h2>

          <div className="bg-[#1a1a1a] border border-white/10 rounded-xl px-4 py-4 flex items-start gap-3">
            <span className="material-symbols-outlined text-primary text-xl leading-none flex-shrink-0 mt-0.5">phone</span>
            <div>
              <p className="text-[9px] uppercase tracking-widest font-bold text-on-surface-variant mb-0.5">Phone</p>
              <a href={`tel:+91${PHONE}`} className="text-sm font-bold text-white hover:text-primary transition-colors">
                +91 {PHONE}
              </a>
              <p className="text-[10px] text-on-surface-variant mt-0.5">Available Mon–Sat, 10 AM – 7 PM IST</p>
            </div>
          </div>
        </section>

        {/* Address */}
        <section className="space-y-3">
          <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary border-l-4 border-primary pl-3">Our Address</h2>

          <div className="bg-[#1a1a1a] border border-white/10 rounded-xl px-4 py-4 flex items-start gap-3">
            <span className="material-symbols-outlined text-primary text-xl leading-none flex-shrink-0 mt-0.5">location_on</span>
            <div>
              <p className="text-[9px] uppercase tracking-widest font-bold text-on-surface-variant mb-1">Gurugram Facility</p>
              <p className="text-sm text-white leading-relaxed font-medium">
                Shop No. 12, 2, Old Delhi Gurugram Rd,<br />
                In front of Maruti Gate,<br />
                Sector 18, Gurugram,<br />
                Haryana 122008
              </p>
              <a
                href="https://maps.google.com/?q=Shop+No+12+Old+Delhi+Gurugram+Rd+Sector+18+Gurugram+Haryana+122008"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 mt-2 text-[10px] text-primary font-bold hover:underline"
              >
                <span className="material-symbols-outlined text-xs leading-none">open_in_new</span>
                Open in Maps
              </a>
            </div>
          </div>
        </section>

        {/* Hours */}
        <section className="space-y-3">
          <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary border-l-4 border-primary pl-3">Business Hours</h2>
          <div className="bg-[#1a1a1a] border border-white/10 rounded-xl px-4 py-4 space-y-2">
            {[
              { day: 'Monday – Friday', hours: '10:00 AM – 7:00 PM' },
              { day: 'Saturday', hours: '10:00 AM – 5:00 PM' },
              { day: 'Sunday', hours: 'Closed' },
            ].map(row => (
              <div key={row.day} className="flex justify-between items-center">
                <span className="text-xs text-on-surface-variant font-semibold">{row.day}</span>
                <span className={`text-xs font-bold ${row.hours === 'Closed' ? 'text-red-400' : 'text-white'}`}>{row.hours}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Quick WhatsApp CTA */}
        <a
          href={`https://wa.me/91${PHONE}?text=${WHATSAPP_MSG}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 w-full py-4 bg-[#25D366] text-white font-bold text-sm uppercase tracking-widest rounded-2xl hover:brightness-110 active:scale-[0.98] transition-all shadow-[0_8px_30px_rgba(37,211,102,0.2)]"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
          </svg>
          Message Us on WhatsApp
        </a>

        <div className="pb-8" />
      </main>
    </div>
  );
}
