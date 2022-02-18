module.exports = function(client, message, args) {
  message.channel.server.channels.forEach(channel => {
    if(channel.name === "huso") {
      channel.joinCall().then(resp => {
        console.log(resp)
      });
    }
  })
  // client.servers.forEach(server => {
  //   server.fetchMembers().then(users => {
  //     users.users.forEach(user => {
  //       user.
  //     })
  //   })
    // server.users.users.forEach(user => {
    //   console.log(user)
    // })
  // message.author_id
  // let user = message.guild.members.cache.get(message.author.id)
  // client[message.guild.id].connection = user.voice.channel.join();
  // return client[message.guild.id].connection;
}
