interface FooterProps {
  organizer: string;
  dateLabel: string;
}

export function Footer({ organizer, dateLabel }: FooterProps) {
  return (
    <footer className="site-footer">
      <div className="container footer-inner">
        <span>© {new Date().getFullYear()} Ruang Partisipasi</span>
        <span>
          {organizer} · {dateLabel}
        </span>
      </div>
    </footer>
  );
}
