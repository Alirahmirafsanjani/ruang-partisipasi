interface FooterProps {
  organizer: string;
  dateLabel: string;
  location: string;
}

export function Footer({ organizer, dateLabel, location }: FooterProps) {
  return (
    <footer className="site-footer">
      <div className="container footer-inner">
        <div className="footer-brand">
          <div className="footer-logos" aria-hidden="true">
            <img src="/logo-uaa.png" alt="" className="footer-logo" width="28" height="28" loading="lazy" decoding="async" />
            <img src="/logo-himsi.jpeg" alt="" className="footer-logo" width="28" height="28" loading="lazy" decoding="async" />
          </div>
          <span>© {new Date().getFullYear()} {organizer}</span>
        </div>
        <span className="footer-meta">{location} · {dateLabel}</span>
      </div>
    </footer>
  );
}
