import DownloadClipCommand from "./Commands/DownloadClipCommand";
import DownloadSongCommand from "./Commands/DownloadSongCommand";
import MediaPlayerCommand from "./Commands/MediaPlayerCommand";
import RandomQuoteCommand from "./Commands/RandomQuoteCommand";
import RestartCommand from "./Commands/RestartCommand";
import SongQuizCommand from "./Commands/SongQuizCommand";

/**
 * Exports all enabled commands
 */
export default [
    MediaPlayerCommand,
    SongQuizCommand,
    DownloadClipCommand,
    DownloadSongCommand,
    RestartCommand,
    RandomQuoteCommand
]