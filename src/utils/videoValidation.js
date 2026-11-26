export const isValidShortDuration = (duration) =>
    Number.isFinite(duration) && duration > 0 && duration <= 60;
