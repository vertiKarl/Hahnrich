require('../MessageHandler.js');
const twitch = require('twitch');
const auth = require('twitch-auth');
const chatClient = require('twitch-chat-client');
const pubSub = require('twitch-pubsub-client');

process.on('message', (msg) => {
  // handle messages from parent
})
