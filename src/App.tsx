import { useEffect, useState, type FormEvent } from 'react';
import { AlertCircle, LoaderCircle } from 'lucide-react';
import { FeedbackForm } from './components/FeedbackForm';
import { Footer } from './components/Footer';
import { Header } from './components/Header';
import { Hero } from './components/Hero';
import { Stepper } from './components/Stepper';
import { SuccessCard } from './components/SuccessCard';
import { VerificationForm } from './components/VerificationForm';
import { ApiError, getEventConfig, submitFeedback, verifyParticipant } from './services/api';
import type {
  AnswerPayload,
  EventConfig,
  FeedbackQuestion,
  Participant,
  SubmitFeedbackResponse,
} from './types';

const FALLBACK = {
  title: import.meta.env.VITE_EVENT_TITLE || 'Ruang Partisipasi 2026',
  subtitle:
    import.meta.env.VITE_EVENT_SUBTITLE ||
    'Ruang untuk berbagi pengalaman, menyampaikan gagasan, dan memberikan kontribusi bagi kegiatan yang lebih baik.',
  dateLabel: import.meta.env.VITE_EVENT_DATE || '21 November 2026',
  organizer: import.meta.env.VITE_EVENT_ORGANIZER || 'Komunitas Ruang Partisipasi',
};

type Step = 1 | 2 | 3;

function App() {
  const [config, setConfig] = useState<EventConfig | null>(null);
  const [configError, setConfigError] = useState<string | null>(null);

  const [step, setStep] = useState<Step>(1);
  const [nim, setNim] = useState('');
  const [fullName, setFullName] = useState('');
  const [participant, setParticipant] = useState<Participant | null>(null);

  const [verifyLoading, setVerifyLoading] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [verifyErrorCode, setVerifyErrorCode] = useState<string | undefined>();

  const [answers, setAnswers] = useState<Record<string, string | number>>({});
  const [answerErrors, setAnswerErrors] = useState<Record<string, string>>({});
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [result, setResult] = useState<SubmitFeedbackResponse | null>(null);

  useEffect(() => {
    let active = true;
    getEventConfig()
      .then((data) => {
        if (active) setConfig(data);
      })
      .catch((error: unknown) => {
        if (active) {
          setConfigError(
            error instanceof ApiError
              ? error.message
              : 'Konfigurasi kegiatan belum dapat dimuat. Silakan muat ulang halaman.',
          );
        }
      });
    return () => {
      active = false;
    };
  }, []);

  const goTo = (next: Step) => {
    setStep(next);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleVerify = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedNim = nim.trim();
    const normalizedFullName = fullName.trim();
    setNim(normalizedNim);
    setFullName(normalizedFullName);
    setVerifyError(null);
    setVerifyErrorCode(undefined);
    setVerifyLoading(true);

    try {
      const response = await verifyParticipant(normalizedNim, normalizedFullName);
      setParticipant(response.participant);
      goTo(2);
    } catch (error) {
      const apiError = error as ApiError;
      setVerifyError(apiError.message);
      setVerifyErrorCode(apiError.code);
    } finally {
      setVerifyLoading(false);
    }
  };

  const handleAnswer = (id: string, value: string | number) => {
    setAnswers((previous) => ({ ...previous, [id]: value }));
    setAnswerErrors((previous) => {
      if (!previous[id]) return previous;
      const next = { ...previous };
      delete next[id];
      return next;
    });
  };

  const validateFeedback = (questions: FeedbackQuestion[]): boolean => {
    const nextErrors: Record<string, string> = {};

    for (const question of questions) {
      const value = answers[question.id];

      if (question.type === 'rating') {
        if (value === undefined || value === '') {
          if (question.required) nextErrors[question.id] = 'Pilih salah satu nilai terlebih dahulu.';
          continue;
        }
        if (typeof value !== 'number' || value < 1 || value > 5) {
          nextErrors[question.id] = 'Pilih nilai antara 1 sampai 5.';
        }
        continue;
      }

      const text = typeof value === 'string' ? value.trim() : '';
      const limit = question.maxLength ?? 1000;
      if (!text) {
        if (question.required) nextErrors[question.id] = 'Jawaban ini wajib diisi.';
        continue;
      }
      if (text.length > limit) {
        nextErrors[question.id] = `Jawaban maksimal ${limit} karakter.`;
      }
    }

    setAnswerErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmitFeedback = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!config || !participant) return;
    setSubmitError(null);

    if (!validateFeedback(config.questions)) return;

    const payload: AnswerPayload[] = config.questions.flatMap<AnswerPayload>((question) => {
      const value = answers[question.id];
      if (question.type === 'rating') {
        return typeof value === 'number' ? [{ id: question.id, value }] : [];
      }
      const text = typeof value === 'string' ? value.trim() : '';
      return text ? [{ id: question.id, value: text }] : [];
    });

    setSubmitLoading(true);
    try {
      const response = await submitFeedback({
        nim: participant.nim,
        fullName: participant.fullName,
        answers: payload,
      });
      setResult(response);
      goTo(3);
    } catch (error) {
      const apiError = error as ApiError;
      if (apiError.code === 'ALREADY_SUBMITTED') {
        setVerifyError(apiError.message);
        setVerifyErrorCode(apiError.code);
        setParticipant(null);
        goTo(1);
        return;
      }
      setSubmitError(apiError.message);
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleBackToVerification = () => {
    setParticipant(null);
    setAnswers({});
    setAnswerErrors({});
    setSubmitError(null);
    goTo(1);
  };

  const eventTitle = config?.title ?? FALLBACK.title;
  const eventSubtitle = config?.subtitle ?? FALLBACK.subtitle;
  const dateLabel = config?.dateLabel ?? FALLBACK.dateLabel;
  const organizer = config?.organizer ?? FALLBACK.organizer;

  return (
    <div className="app-shell">
      <Header dateLabel={dateLabel} />
      <main>
        <Hero
          eventTitle={eventTitle}
          subtitle={eventSubtitle}
          organizer={organizer}
          dateLabel={dateLabel}
        />

        <section className="container flow-section" aria-label="Formulir kegiatan">
          <Stepper current={step} />

          {step === 1 && (
            <VerificationForm
              nim={nim}
              onNimChange={setNim}
              fullName={fullName}
              onFullNameChange={setFullName}
              onSubmit={handleVerify}
              loading={verifyLoading}
              error={verifyError}
              errorCode={verifyErrorCode}
            />
          )}

          {step === 2 && (
            <>
              {config && participant ? (
                <FeedbackForm
                  participant={participant}
                  questions={config.questions}
                  values={answers}
                  errors={answerErrors}
                  onAnswer={handleAnswer}
                  onSubmit={handleSubmitFeedback}
                  onBack={handleBackToVerification}
                  loading={submitLoading}
                  submitError={submitError}
                />
              ) : (
                <div className="panel state-panel">
                  {configError ? (
                    <div className="alert" role="alert">
                      <AlertCircle size={18} aria-hidden="true" />
                      <div>
                        <strong>Konfigurasi belum tersedia</strong>
                        <p>{configError}</p>
                      </div>
                    </div>
                  ) : (
                    <p className="loading-state">
                      <LoaderCircle size={18} className="spin" aria-hidden="true" />
                      Menyiapkan pertanyaan feedback...
                    </p>
                  )}
                </div>
              )}
            </>
          )}

          {step === 3 && result && <SuccessCard result={result} />}
        </section>
      </main>
      <Footer organizer={organizer} dateLabel={dateLabel} />
    </div>
  );
}

export default App;
