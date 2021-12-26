export type extApi = typeof chrome | typeof browser;

export type StorageChangesObject = { [key: string]: chrome.storage.StorageChange | browser.storage.StorageChange };

export interface FetchResponse {
  responseText: string,
  status: number,
  ok: boolean,
}

export interface PuzzleSolution {
  solution: string,
}

export interface VideoDislikesResponse {
  id: string,
  dateCreated: string,
  likes: number,
  dislikes: number,
  rating: number,
  viewCount: number,
  deleted: boolean,
}

interface PuzzleResponse {
  challenge: string,
  difficulty: number,
  solved: boolean | null,
}

export interface RegistrationPuzzleResponse extends PuzzleResponse {}

export interface VotePuzzleResponse extends PuzzleResponse {}

interface VideoId {
  videoId: string,
}

export interface VideoDislikePayload extends VideoId {
  likeCount?: number,
}

export interface VoteSubmissionPayload extends VideoId {
  value: number,
  userId: string,
}

export enum VideoState {
  LIKED_STATE = "LIKED_STATE",
  DISLIKED_STATE = "DISLIKED_STATE",
  NEUTRAL_STATE = "NEUTRAL_STATE",
}

export interface VideoData {
  likes: number,
  dislikes: number,
  previousState: VideoState,
}