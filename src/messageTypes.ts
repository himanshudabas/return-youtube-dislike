interface BaseMessage {
  from?: string;
}

interface DefaultMessage {
  message: "update" | "getVideoID";
}

interface GetVideoIdResponse {
  videoID: string;
}

export type Message = BaseMessage & DefaultMessage;

export type MessageResponse = GetVideoIdResponse | Record<string, never>;