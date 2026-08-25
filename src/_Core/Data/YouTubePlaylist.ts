export interface YouTubePlaylist {
    "kind": "youtube#playlist",
    /**
     Etag
     */
    "etag": string,
    "id": string,
    "snippet": {
      "publishedAt": Date,
      "channelId": string,
      "title": string,
      "description": string,
      "thumbnails": {
        (key): {
          "url": string,
          "width": number,
          "height": number
        }
      },
      "channelTitle": string,
      "defaultLanguage": string,
      "localized": {
        "title": string,
        "description": string
      }
    },
    "status": {
      "privacyStatus": string
    },
    "contentDetails": {
      "itemCount": number
    },
    "player": {
      "embedHtml": string
    },
    "localizations": {
      (key): {
        "title": string,
        "description": string
      }
    }
  }