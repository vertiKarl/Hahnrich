let MediaPlayer = {
  now_playing: "",
  queue: [],
  next: function() {
    if(!this.repeat) {
      if(this.queue.length > 0) {
        this.now_playing = this.queue[0]
        this.queue.splice(0, 1)
        // play next song
      } else {
        this.now_playing = ""
        // nothing to play
      }
    } else {
      // play again
    }
  },
  skip: function() {
    this.repeat = false
    next()
  },
  shuffle: function() {
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
  },
  repeat: true
}

MediaPlayer.queue = ["Never Gonna Give You Up", "Take On Me"]
MediaPlayer.shuffle()

console.log(MediaPlayer)
