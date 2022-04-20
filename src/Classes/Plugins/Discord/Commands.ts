import DownloadClipCommand from "./Commands/DownloadClipCommand";
import MediaPlayerCommand from "./Commands/MediaPlayerCommand";
import RestartCommand from "./Commands/RestartCommand";
import SongQuizCommand from "./Commands/SongQuizCommand";

/**
 * Exports all enabled commands
 */
export default [
    MediaPlayerCommand,
    SongQuizCommand,
    DownloadClipCommand,
    RestartCommand
]