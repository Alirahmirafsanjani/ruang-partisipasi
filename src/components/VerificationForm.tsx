import { AlertCircle, ArrowRight, Clock3, ShieldCheck } from 'lucide-react';
import type { FormEvent } from 'react';

interface VerificationFormProps {
  nim: string;
  onNimChange: (value: string) => void;
  fullName: string;
  onFullNameChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  loading: boolean;
  error: string | null;
  errorCode?: string;
}

export function VerificationForm({
  nim,
  onNimChange,
  fullName,
  onFullNameChange,
  onSubmit,
  loading,
  error,
  errorCode,
}: VerificationFormProps) {
  const alreadySubmitted = errorCode === 'ALREADY_SUBMITTED';

  return (
    <div className="panel">
      <div className="panel-heading">
        <span className="step-tag">LANGKAH 01</span>
        <h2>Mari mulai dari identitasmu</h2>
        <p>
          Masukkan NIM yang terdaftar pada kegiatan ini, lalu ketik nama lengkapmu persis seperti
          yang ingin tercetak di sertifikat.
        </p>
      </div>

      {error && (
        <div className={`alert${alreadySubmitted ? ' alert-info' : ''}`} role="alert" aria-live="polite">
          {alreadySubmitted ? <Clock3 size={18} aria-hidden="true" /> : <AlertCircle size={18} aria-hidden="true" />}
          <div>
            <strong>{alreadySubmitted ? 'Feedback sudah dikirim' : 'Verifikasi belum berhasil'}</strong>
            <p>{error}</p>
          </div>
        </div>
      )}

      <form onSubmit={onSubmit} noValidate>
        <div className="field">
          <label htmlFor="nim">Nomor Induk Mahasiswa (NIM)</label>
          <input
            id="nim"
            name="nim"
            type="text"
            inputMode="text"
            autoComplete="off"
            spellCheck={false}
            placeholder="Contoh: 12345678"
            value={nim}
            onChange={(event) => onNimChange(event.target.value)}
            disabled={loading || alreadySubmitted}
            aria-invalid={Boolean(error) && !alreadySubmitted}
            aria-describedby="nim-help"
          />
          <p id="nim-help" className="field-help">
            NIM bersifat rahasia dan tidak akan ditampilkan kepada peserta lain.
          </p>
        </div>

        <div className="field">
          <label htmlFor="fullName">Nama Lengkap</label>
          <input
            id="fullName"
            name="fullName"
            type="text"
            autoComplete="name"
            placeholder="Contoh: Nama Lengkap Peserta"
            value={fullName}
            onChange={(event) => onFullNameChange(event.target.value)}
            disabled={loading || alreadySubmitted}
            aria-invalid={Boolean(error) && !alreadySubmitted}
            aria-describedby="fullname-help"
          />
          <p id="fullname-help" className="field-help">
            Nama ini akan tercetak di sertifikat. Pastikan ejaannya sudah benar.
          </p>
        </div>

        <button
          className="button button-primary"
          type="submit"
          disabled={loading || !nim.trim() || !fullName.trim() || alreadySubmitted}
        >
          {loading ? 'Memverifikasi...' : 'Verifikasi NIM'}
          {!loading && <ArrowRight size={17} aria-hidden="true" />}
        </button>
      </form>

      <div className="privacy-note">
        <ShieldCheck size={16} aria-hidden="true" />
        <span>Data peserta disimpan aman dan hanya digunakan untuk keperluan kegiatan ini.</span>
      </div>
    </div>
  );
}
