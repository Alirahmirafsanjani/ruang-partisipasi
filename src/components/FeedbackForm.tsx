import { AlertCircle, ArrowLeft, BadgeCheck, Send } from 'lucide-react';
import type { FormEvent } from 'react';
import type { FeedbackQuestion, Participant } from '../types';

interface FeedbackFormProps {
  participant: Participant;
  questions: FeedbackQuestion[];
  values: Record<string, string | number>;
  errors: Record<string, string>;
  onAnswer: (id: string, value: string | number) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onBack: () => void;
  loading: boolean;
  submitError: string | null;
}

const RATING_SCALE = [1, 2, 3, 4, 5];

export function FeedbackForm({
  participant,
  questions,
  values,
  errors,
  onAnswer,
  onSubmit,
  onBack,
  loading,
  submitError,
}: FeedbackFormProps) {
  return (
    <div className="panel">
      <div className="panel-heading">
        <span className="step-tag">LANGKAH 02</span>
        <h2>Bagikan pengalamanmu</h2>
        <p>
          Jawabanmu membantu kami membuat kegiatan berikutnya lebih bermakna. Tidak ada jawaban
          yang salah — kami hanya ingin mendengar sudut pandangmu.
        </p>
      </div>

      <div className="verified-card">
        <span className="verified-icon" aria-hidden="true">
          <BadgeCheck size={20} strokeWidth={2} />
        </span>
        <div>
          <span className="verified-caption">Terverifikasi sebagai</span>
          <strong>{participant.fullName}</strong>
          <span className="verified-nim">NIM {participant.nim}</span>
        </div>
      </div>

      {submitError && (
        <div className="alert" role="alert" aria-live="polite">
          <AlertCircle size={18} aria-hidden="true" />
          <div>
            <strong>Pengiriman belum berhasil</strong>
            <p>{submitError}</p>
          </div>
        </div>
      )}

      <form onSubmit={onSubmit} noValidate>
        <div className="question-list">
          {questions.map((question, index) => {
            const value = values[question.id];
            const error = errors[question.id];
            const maxLength = question.maxLength ?? 1000;
            return (
              <fieldset
                key={question.id}
                className={`question-card${error ? ' has-error' : ''}`}
                aria-describedby={error ? `error-${question.id}` : undefined}
              >
                <legend>
                  <span className="question-index">{String(index + 1).padStart(2, '0')}</span>
                  <span className="question-label">{question.label}</span>
                  <span className={`required-tag${question.required ? '' : ' is-optional'}`}>
                    {question.required ? 'Wajib' : 'Opsional'}
                  </span>
                </legend>

                {question.hint && <p className="question-hint">{question.hint}</p>}

                {question.type === 'rating' ? (
                  <div className="rating-options" role="group" aria-label={question.label}>
                    {RATING_SCALE.map((rating) => (
                      <button
                        key={rating}
                        type="button"
                        className={`rating-option${value === rating ? ' is-selected' : ''}`}
                        aria-pressed={value === rating}
                        onClick={() => onAnswer(question.id, rating)}
                      >
                        {rating}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="textarea-wrap">
                    <textarea
                      id={`answer-${question.id}`}
                      value={typeof value === 'string' ? value : ''}
                      onChange={(event) => onAnswer(question.id, event.target.value)}
                      placeholder={question.placeholder ?? 'Tulis jawabanmu di sini...'}
                      maxLength={maxLength}
                      rows={4}
                      aria-invalid={Boolean(error)}
                      aria-label={question.label}
                    />
                    <span className="char-count">
                      {typeof value === 'string' ? value.length : 0}/{maxLength}
                    </span>
                  </div>
                )}

                {error && (
                  <p id={`error-${question.id}`} className="field-error" role="alert">
                    {error}
                  </p>
                )}
              </fieldset>
            );
          })}
        </div>

        <div className="form-actions">
          <button type="button" className="button button-ghost" onClick={onBack} disabled={loading}>
            <ArrowLeft size={16} aria-hidden="true" />
            Ganti NIM
          </button>
          <button type="submit" className="button button-primary" disabled={loading}>
            {loading ? 'Mengirim feedback...' : 'Kirim feedback'}
            {!loading && <Send size={16} aria-hidden="true" />}
          </button>
        </div>
      </form>
    </div>
  );
}
