import { YouTubePlaylist } from "./YouTubePlaylist"

export interface YouTubePlaylistListResponse {
    "kind": "youtube#playlistListResponse",
    "etag": string,
    "nextPageToken": string,
    "prevPageToken": string,
    "pageInfo": {
      "totalResults": number,
      "resultsPerPage": number
    },
    "items": YouTubePlaylist[]
  }