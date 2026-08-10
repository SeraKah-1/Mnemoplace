import { fsrs, createEmptyCard, Rating, Card, State } from "ts-fsrs";
import { SRSCardState, ReviewRating } from "./types";

const f = fsrs({});

export function createNewSRSCard(): SRSCardState {
  const emptyCard: Card = createEmptyCard();
  return {
    due: emptyCard.due.getTime(),
    stability: emptyCard.stability,
    difficulty: emptyCard.difficulty,
    elapsed_days: emptyCard.elapsed_days,
    scheduled_days: emptyCard.scheduled_days,
    reps: emptyCard.reps,
    lapses: emptyCard.lapses,
    state: emptyCard.state,
    learning_steps: emptyCard.learning_steps || 0,
  };
}

export function processSRSReview(cardState: SRSCardState, rating: ReviewRating, now: Date = new Date()): SRSCardState {
  const card: Card = {
    due: new Date(cardState.due),
    stability: cardState.stability,
    difficulty: cardState.difficulty,
    elapsed_days: cardState.elapsed_days,
    scheduled_days: cardState.scheduled_days,
    reps: cardState.reps,
    lapses: cardState.lapses,
    state: cardState.state as State,
    learning_steps: cardState.learning_steps || 0,
    last_review: cardState.last_review ? new Date(cardState.last_review) : undefined,
  };

  let ratingEnum: Rating;
  switch (rating) {
    case 1:
      ratingEnum = Rating.Again;
      break;
    case 2:
      ratingEnum = Rating.Hard;
      break;
    case 3:
      ratingEnum = Rating.Good;
      break;
    case 4:
      ratingEnum = Rating.Easy;
      break;
    default:
      ratingEnum = Rating.Good;
  }

  const schedulingCards = f.repeat(card, now);
  const updatedCard: Card = schedulingCards[ratingEnum].card;

  return {
    due: updatedCard.due.getTime(),
    stability: updatedCard.stability,
    difficulty: updatedCard.difficulty,
    elapsed_days: updatedCard.elapsed_days,
    scheduled_days: updatedCard.scheduled_days,
    reps: updatedCard.reps,
    lapses: updatedCard.lapses,
    state: updatedCard.state,
    learning_steps: updatedCard.learning_steps || 0,
    last_review: now.getTime(),
  };
}

