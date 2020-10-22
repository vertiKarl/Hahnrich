const meta = require('music-metadata')
module.exports = class MediaPlayer {
  now_playing = ""
  queue = []
  connection = undefined
  currentLength = undefined
  leaveTimer = undefined
  next = function() {
    if(this.leaveTimer) {
      clearTimeout(this.leaveTimer)
    }
    if(!this.repeat) {
      if(this.queue.length > 0) {
        if(this.queue[0].startsWith('https://www.youtube.com/watch') || this.queue[0].startsWith('https://youtube.com/watch')) {
          this.now_playing = this.queue[0]
          this.queue.splice(0, 1)
          if(typeof this.connection !== "undefined") {
            const dispatcher = this.connection.play(ytdl(this.now_playing))
            dispatcher.on('finish', () => {
              client.mediaPlayer.next()
            })
          }
        } else {
          this.now_playing = this.queue[0]
          meta.parseFile(__dirname + "/songs/" + this.now_playing).then((data) => {
            let length = {
              total: parseInt(data.format.duration),
              after: parseInt(data.format.duration),
              minutes: 0,
              seconds: 0
            }
            length.minutes = Math.floor(length.after / 60)
            length.after = Math.floor(length.after - (length.minutes * 60) )
            length.seconds = length.after
            let lengthformat = ""
            if(length.seconds > 10) {
              lengthformat = `${length.minutes}:${length.seconds}`
            } else {
              lengthformat = `${length.minutes}:0${length.seconds}`
            }
            this.currentLength = lengthformat
          })
          this.queue.splice(0, 1)
          if(typeof this.connection !== "undefined") {
            const dispatcher = this.connection.play(__dirname + "/songs/" + this.now_playing)
            dispatcher.on('finish', () => {
              this.next()
            })
          }
        }
      } else {
        this.now_playing = ""
        if(this.connection.speaking) {
          this.connection.play('');
        }
        this.leaveTimer = setTimeout(() => {
          this.queue = [];
          this.connection.disconnect()
          this.connection = undefined;
        }, 20 /*Minutes*/ * 60 /*Seconds*/ * 1000 /*Milliseconds*/)
        // nothing to play
      }
    } else {
      // play again
      if(typeof this.connection !== "undefined") {
        const dispatcher = this.connection.play(__dirname + "/songs/" + this.now_playing)
        dispatcher.on('finish', () => {
          this.next()
        })
      }
    }
  }
  skip = function() {
    this.repeat = false
    this.next()
  }
  shuffle = function() {
    let currentIndex = this.queue.length, temporaryValue, randomIndex;

    // While there remain elements to shuffle...
    while (0 !== currentIndex) {

      // Pick a remaining element...
      randomIndex = Math.floor(Math.random() * currentIndex);
      currentIndex -= 1;

      // And swap it with the current element.
      temporaryValue = this.queue[currentIndex];
      this.queue[currentIndex] = this.queue[randomIndex];
      this.queue[randomIndex] = temporaryValue;
    }
  }
  repeat = false
}
