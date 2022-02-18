module.exports = function(client, message, args) {
  const mediaPlayer = client[message.guild.id]

  args[0] = parseInt(args[0])

  if(Number.isNaN(args[0]) || args[0] < 0) {
    args[0] = 1
  }

  console.log(args[0])
  
  for(let i = 0; i < args[0]; i++) {
    console.log("skipped. "+i)
    mediaPlayer.skip()
  }
}
