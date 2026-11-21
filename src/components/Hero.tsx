import { CalendarDays, Handshake } from 'lucide-react';
import { ParticipationArt } from './ParticipationArt';

interface HeroProps {
  eventTitle: string;
  subtitle: string;
  organizer: string;
  dateLabel: string;
}

export function Hero({ eventTitle, subtitle, organizer, dateLabel }: HeroProps) {
  return (
    <section className="hero container" aria-labelledby="hero-title">
      <div className="hero-copy">
        <p className="eyebrow">RUANG PARTISIPASI</p>
        <h1 id="hero-title" className="hero-title">
          Setiap pengalaman punya arti.
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
