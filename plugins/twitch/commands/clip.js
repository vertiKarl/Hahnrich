module.exports = function(twitch, chat, pubAPI, channel, user, args) {
  twitch.helix.clips.createClip({
    channelId: channel,
    createAfterDelay: true
  }).then((id) => {
    chat.action(channel, "Created clip: https://clips.twitch.tv/" + id)
  }).catch((e) => {
    chat.action(channel, "error creating clip")
  })
}
