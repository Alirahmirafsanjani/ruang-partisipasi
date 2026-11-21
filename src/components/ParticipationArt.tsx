/**
 * Ilustrasi abstrak: simpul-simpul yang saling terhubung.
 * Sengaja tanpa figur manusia agar tetap netral dan profesional.
 */
export function ParticipationArt() {
  return (
    <div className="participation-art" aria-hidden="true">
      <svg viewBox="0 0 480 360" role="presentation" focusable="false">
        <circle cx="246" cy="182" r="126" fill="#D8E2D5" opacity="0.55" />
        <circle cx="246" cy="182" r="96" fill="none" stroke="#698675" strokeWidth="1" opacity="0.55" />
        <circle cx="246" cy="182" r="64" fill="none" stroke="#698675" strokeWidth="1" opacity="0.35" />

        <path
          d="M114 252 C 168 214, 196 214, 246 182 S 330 118, 374 104"
          fill="none"
          stroke="#698675"
          strokeWidth="1.4"
          opacity="0.75"
        />
        <path
          d="M118 110 C 176 138, 202 156, 246 182 S 316 232, 372 256"
          fill="none"
          stroke="#698675"
          strokeWidth="1.4"
          opacity="0.75"
        />
        <path
          d="M246 58 L246 306"
          fill="none"
          stroke="#698675"
          strokeWidth="1"
          strokeDasharray="4 7"
          opacity="0.45"
        />

        <circle cx="114" cy="252" r="12" fill="#FAFAF6" stroke="#294F42" strokeWidth="2" />
        <circle cx="118" cy="110" r="9" fill="#FAFAF6" stroke="#698675" strokeWidth="2" />
        <circle cx="374" cy="104" r="12" fill="#FAFAF6" stroke="#294F42" strokeWidth="2" />
        <circle cx="372" cy="256" r="10" fill="#FAFAF6" stroke="#698675" strokeWidth="2" />

        <circle cx="246" cy="182" r="34" fill="#294F42" />
        <circle cx="246" cy="182" r="8" fill="#FAFAF6" />
        <circle cx="246" cy="182" r="48" fill="none" stroke="#AE9260" strokeWidth="1" opacity="0.8" />
        <circle cx="404" cy="180" r="3.5" fill="#AE9260" />
        <circle cx="88" cy="182" r="3" fill="#AE9260" opacity="0.8" />
      </svg>
    </div>
  );
}
