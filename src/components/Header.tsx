interface HeaderProps {
  dateLabel: string;
  title: string;
}

export function Header({ dateLabel, title }: HeaderProps) {
  return (
    <header className="site-header">
      <div className="container header-inner">
        <div className="brand" aria-label={title}>
          <div className="brand-logos" aria-hidden="true">
            <img src="/logo-uaa.png" alt="" className="brand-logo" width="40" height="40" loading="eager" decoding="async" />
            <img src="/logo-himsi.jpeg" alt="" className="brand-logo" width="40" height="40" loading="eager" decoding="async" />
          </div>
          <div className="brand-text">
            <span className="brand-name">{title}</span>
            <span className="brand-sub">HIMSI Universitas Alma Ata</span>
          </div>
        </div>
        {dateLabel && (
          <span className="header-date">
            <span className="header-date-dot" aria-hidden="true" />
            {dateLabel}
          </span>
        )}
      </div>
    </header>
  );
}
