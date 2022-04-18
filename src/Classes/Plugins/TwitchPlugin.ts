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

export default class TwitchPlugin extends Plugin {
  name = "Twitch";
  description = "A Twitch plugin for Hahnrich!";
  emoji = "💬";

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

      // Downloading
      this.log("DownloadRequest: " + id);
      client.clips
        .getClipById(id)
        .then(async (clip) => {
          if (!clip) throw new Error("Clip not found");
          let alreadyDownloaded = false;

          await fauna
            .query(Get(Match(Index("videos_by_id"), clip.id)))
            .then((res) => {
              TwitchPlugin.events.emit(
                "DownloadAlreadyThere",
                clip.title,
                (res as FaunaClip).ref.id
              );
              alreadyDownloaded = true;
            })
            .catch(async (err) => {
              if (err.name !== "NotFound")
                throw new Error("Failed accessing database: " + err);
            });

          if (alreadyDownloaded) return;

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

          const link = info.thumbnailUrl.split("-preview")[0] + ".mp4";
          Axios({
              method: 'get',
              url: link,
              responseType: 'stream'
          }).then(async (video) => {
            const writer = fs.createWriteStream(__dirname + "/../../../Clips/" + info.id + ".mp4");
            await video.data.pipe(writer);

            const res = await fauna.query(
              Create(Collection("videos"), {data: info})
            );
            if(!res)  {
                TwitchPlugin.events.emit("DownloadFailed");
                this.error("Something went wrong when trying to create the video document in fauna!")
            }
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
  async stop(): Promise<boolean> {
    throw new Error("Method not implemented.");
  }
}

interface FaunaClip {
  ref: {
    id: number;
  };
}
