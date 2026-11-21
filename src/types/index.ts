export type QuestionType = 'rating' | 'text';

export interface FeedbackQuestion {
  id: string;
  label: string;
  type: QuestionType;
  required: boolean;
  hint?: string;
  placeholder?: string;
  maxLength?: number;
}

export interface EventConfig {
  eventId: string;
  title: string;
  subtitle: string;
  dateLabel: string;
  organizer: string;
  questions: FeedbackQuestion[];
}

export interface Participant {
  nim: string;
  fullName: string;
}

export interface VerifyResponse {
  verified: boolean;
  participant: Participant;
  event: {
    title: string;
    dateLabel: string;
    organizer: string;
  };
}

export interface AnswerPayload {
  id: string;
  value: string | number;
}

export interface SubmitFeedbackPayload {
  nim: string;
  fullName: string;
  answers: AnswerPayload[];
}

export interface SubmitFeedbackResponse {
  success: boolean;
  participant: Participant;
  feedback: {
    submitted: boolean;
    submittedAt: string;
  };
  certificate: {
    number: string;
    letterNumber: string;
    ready: boolean;
    url: string | null;
    expiresInSeconds: number | null;
  };
}
