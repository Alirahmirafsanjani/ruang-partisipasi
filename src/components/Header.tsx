import { Leaf } from 'lucide-react';

interface HeaderProps {
  dateLabel: string;
}

export function Header({ dateLabel }: HeaderProps) {
  return (
    <header className="site-header">
      <div className="container header-inner">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">
            <Leaf size={19} strokeWidth={2} />
          </span>
          <span className="brand-name">Ruang Partisipasi</span>
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
