export interface ComputeGraceHoursOptions {
  movieGraceHours: number;
  episodeGraceHours: number;
  thresholdDays: number;
  now?: Date;
}

/**
 * Pure function to compute the grace period in hours for a Waitlist entry.
 *
 * Rules:
 * - tv_show and anime: always returns opts.episodeGraceHours
 * - movie with null / unknown date: returns opts.movieGraceHours (conservative default)
 * - movie with known date within thresholdDays: returns opts.movieGraceHours
 * - movie with known date older than thresholdDays: returns opts.episodeGraceHours
 */
export function computeGraceHours(
  mediaType: 'movie' | 'tv_show' | 'anime' | string,
  tmdbReleaseDate: string | null | undefined,
  opts: ComputeGraceHoursOptions
): number {
  if (mediaType === 'tv_show' || mediaType === 'anime') {
    return opts.episodeGraceHours;
  }

  if (!tmdbReleaseDate || !tmdbReleaseDate.trim()) {
    return opts.movieGraceHours;
  }

  const releaseDate = new Date(tmdbReleaseDate);
  if (isNaN(releaseDate.getTime())) {
    return opts.movieGraceHours;
  }

  const now = opts.now ?? new Date();
  const diffMs = now.getTime() - releaseDate.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);

  if (diffDays <= opts.thresholdDays) {
    return opts.movieGraceHours;
  }

  return opts.episodeGraceHours;
}
