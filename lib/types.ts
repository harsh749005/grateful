/** A saved moment, as the UI sees it. */
export interface Memory {
  id: string;
  text: string;
  /** When the moment happened, in ms since epoch. The user can edit this. */
  createdAt: number;
  /** Time-limited signed URLs, safe to use as <img src>. */
  photoUrls: string[];
  /** Storage paths, in the same order as `photoUrls`. */
  photoPaths: string[];
}