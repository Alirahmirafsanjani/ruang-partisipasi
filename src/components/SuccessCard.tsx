import { Check, CheckCircle2, Clock3, Download, FileText } from 'lucide-react';
import type { SubmitFeedbackResponse } from '../types';

interface SuccessCardProps {
  result: SubmitFeedbackResponse;
}

export function SuccessCard({ result }: SuccessCardProps) {
  const { certificate, participant } = result;
  const canDownload = certificate.ready && Boolean(certificate.url);

  return (
    <div className="panel success-panel">
      <div className="success-mark" aria-hidden="true">
        <Check size={30} strokeWidth={2.2} />
      </div>
      <span className="step-tag">LANGKAH 03</span>
      <h2 className="success-title">Suaramu berarti.</h2>
      <p className="success-lead">
        Terima kasih telah berpartisipasi.{' '}
        {canDownload
          ? 'Sertifikat partisipasimu sudah siap.'
          : 'Feedbackmu sudah tersimpan dan sertifikat sedang disiapkan.'}
      </p>

      <div className="success-details">
        <div className="success-detail">
          <span>Nama peserta</span>
          <strong>{participant.fullName}</strong>
        </div>
        <div className="success-detail">
          <span>Nomor sertifikat</span>
          <strong className="certificate-number">{certificate.letterNumber}</strong>
        </div>
      </div>

      <p className="feedback-confirmation">
        <CheckCircle2 size={17} aria-hidden="true" />
        Feedback berhasil dikirim.
      </p>

      {canDownload ? (
        <a className="button button-primary button-download" href={certificate.url ?? '#'}>
          <Download size={17} aria-hidden="true" />
          Unduh sertifikat PDF
        </a>
      ) : (
        <div className="alert alert-info" role="status">
          <Clock3 size={18} aria-hidden="true" />
          <div>
            <strong>Sertifikat sedang disiapkan</strong>
            <p>
              Feedbackmu sudah aman tersimpan. Jika sertifikat tidak muncul, hubungi penyelenggara
              dengan menyebutkan nomor sertifikat di atas.
            </p>
          </div>
        </div>
      )}

      <div className="certificate-note">
        <FileText size={15} aria-hidden="true" />
        <span>
          Sertifikat berbentuk PDF A4 landscape. Tautan unduh berlaku selama 7 hari dan bersifat
          pribadi.
        </span>
      </div>
    </div>
  );
}
