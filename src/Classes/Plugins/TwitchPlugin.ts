import Plugin from "../Plugin";
import fs from "fs";
import {
  clientId,
  clientSecret,
  faunaDomain,
  faunaToken,
} from "./Twitch/config.json";
import { RefreshingAuthProvider } from "@twurple/auth";
import { ApiClient } from "@twurple/api";
import faunadb, { Collection, Create, Get, Index, Match } from "faunadb";
import Axios from "axios";

/**
 * A plugin for interaction with the streaming platform Twitch!
 */
export default class TwitchPlugin extends Plugin {
  name = "Twitch";
  description = "A Twitch plugin for Hahnrich!";
  emoji = "💬";

    /**
     * Starts the Twitch-client and EventListeners
     * @returns Success-state
     */
  async execute(): Promise<boolean> {
    const tokenData = JSON.parse(
      fs.readFileSync(__dirname + "/../../../tokens.json", "utf-8").toString()
    );
    const authProvider = new RefreshingAuthProvider(
      {
        clientId,
        clientSecret,
        onRefresh: async (newTokenData) =>
          fs.writeFileSync(
            __dirname + "/../../../tokens.json",
            JSON.stringify(newTokenData, null, 4),
            { encoding: "utf-8" }
          ),
      },
      tokenData
    );

    const client = new ApiClient({ authProvider });

    const fauna = new faunadb.Client({
      domain: faunaDomain,
      secret: faunaToken,
    });

    // Handle download-requests for twitch clips!
    TwitchPlugin.events.on("DownloadRequest", (url: string) => {
      this.debug("DownloadRequest: " + url);
      let id = "";

      // Clip-ID Parsing
      if (url.startsWith("https://clips.twitch.tv/")) {
        id = url.replace("https://clips.twitch.tv/", "").split("?")[0];
      } else if (url.includes("clip/")) {
        id = url.split("clip/")[1].split("?")[0];
      } else {
        TwitchPlugin.events.emit("DownloadInvalidURL");
        return;
      }

      this.log("DownloadRequest: " + id);
      // Fetching from Twitch
      client.clips
        .getClipById(id)
        .then(async (clip) => {
          if (!clip) throw new Error("Clip not found");
          let alreadyDownloaded = false;

          // check if already in database
          await fauna
            .query(Get(Match(Index("videos_by_id"), clip.id)))
            .then((res) => {
              // Reply with already downloaded
              TwitchPlugin.events.emit(
                "DownloadAlreadyThere",
                clip.title,
                (res as FaunaClip).ref.id
              );
              alreadyDownloaded = true;
            })
            .catch(async (err) => {
              // If there was an error fetching from the database
              if (err.name !== "NotFound") throw new Error("Failed accessing database: " + err);
            });

          // break if it got downloaded already
          if (alreadyDownloaded) return;

          // as twurple doesn't provide the raw data
          // we need to assign all data to the object manually via twurple's getters
          const info = {
            "id": clip.id,
            "broadcaster_id": clip.broadcasterId,
            "broadcaster_name": clip.broadcasterDisplayName,
            "creator_id": clip.creatorId,
            "creator_name": clip.creatorDisplayName,
            "video_id": clip.videoId,
            "game_id": clip.gameId,
            "language": clip.language,
            "title": clip.title,
            "view_count": clip.views,
            "created_at": new Date(clip.creationDate).toISOString(),
            "thumbnailUrl": clip.thumbnailUrl,
          };

          // Twitch Videos are saved under the same prefix as their
          // thumbnails. So we can use this to simply modify the
          // URL to remove the thumbnail part and replace it with .mp4
          const link = info.thumbnailUrl.split("-preview")[0] + ".mp4";

          // Now we start downloading the clip
          Axios({
              method: 'get',
              url: link,
              responseType: 'stream'
          }).then(async (video) => {
            // Start a write stream on a file with the id of the clip in the directory
            // Clips in the project root directory
            const writer = fs.createWriteStream(__dirname + "/../../../Clips/" + info.id + ".mp4");
            await video.data.pipe(writer);

            // Push the video data to the Fauna database
            const res = await fauna.query(
              Create(Collection("videos"), {data: info})
            );

            // When the data couldn't get pushed to the Database
            // Handle as if failed because we can't provide the user
            // with the additional data
            if(!res)  {
                TwitchPlugin.events.emit("DownloadFailed");
                this.error("Something went wrong when trying to create the video document in fauna!")
            }

            // Otherwise we reply with success!
            TwitchPlugin.events.emit(
              "DownloadFinished",
              info.title,
              (res as FaunaClip).ref.id
            );
          });
        })
        .catch((err) => {
          this.error("Error when downloading clip: " + err);
          TwitchPlugin.events.emit("DownloadError");
        });
    });

    return true;
  }
}

/**
 * A interface for what the data on fauna looks like
 */
interface FaunaClip {
  ref: {
    id: number;
  };
}
