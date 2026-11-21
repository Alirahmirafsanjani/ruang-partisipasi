import { CalendarDays, Handshake, MapPin } from 'lucide-react';
import { ParticipationArt } from './ParticipationArt';

interface HeroProps {
  eventTitle: string;
  subtitle: string;
  organizer: string;
  dateLabel: string;
  location: string;
  theme: string;
}

export function Hero({ eventTitle, subtitle, organizer, dateLabel, location, theme }: HeroProps) {
  return (
    <section className="hero container" aria-labelledby="hero-title">
      <div className="hero-copy">
        <div className="hero-logos" aria-label="Logo penyelenggara">
          <img src="/logo-uaa.png" alt="Logo Universitas Alma Ata" className="hero-logo" width="56" height="56" loading="eager" decoding="async" />
          <img src="/logo-himsi.jpeg" alt="Logo HIMSI UAA" className="hero-logo" width="56" height="56" loading="eager" decoding="async" />
        </div>
        <p className="eyebrow">BAKTI SOSIAL HIMSI UAA</p>
        <h1 id="hero-title" className="hero-title">
          {theme}
        </h1>
        <p className="hero-subtitle">{subtitle}</p>

        <div className="event-meta" aria-label="Informasi kegiatan">
          <div className="meta-item">
            <CalendarDays size={17} strokeWidth={1.8} aria-hidden="true" />
            <div>
              <span className="meta-label">Tanggal kegiatan</span>
              <strong>{dateLabel}</strong>
            </div>
          </div>
          <div className="meta-item">
            <MapPin size={17} strokeWidth={1.8} aria-hidden="true" />
            <div>
              <span className="meta-label">Lokasi</span>
              <strong>{location}</strong>
            </div>
          </div>
          <div className="meta-item">
            <Handshake size={17} strokeWidth={1.8} aria-hidden="true" />
            <div>
              <span className="meta-label">Penyelenggara</span>
              <strong>{organizer}</strong>
            </div>
          </div>
        </div>

        <p className="hero-event-name">{eventTitle}</p>
      </div>

      <ParticipationArt />
    </section>
  );
}
