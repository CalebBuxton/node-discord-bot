const Discord = require("discord.js");
const YTDL = require("ytdl-core");
const bot = new Discord.Client();
const chalk = require("chalk");
const fs = require("fs-extra");
const config = require("./config.json");

let servers = {};

class SongRequest {
  constructor(songInfo, requestor) {
    this.songInfo = songInfo;
    this.requestor = requestor;
    this.nowPlaying = false;
  }
}

if (!config.token) {
  console.log(
    chalk.redBright(
      "No token was found. Make sure you had your bot token to config.json"
    )
  );
  process.exit(0);
}

bot.login(config.token).catch(err => {
  console.log(chalk.redBright("Incorrect token provided."));
  process.exit(0);
});

bot.on("ready", function() {
  console.log(chalk.blueBright("Loading guilds..."));
  bot.guilds.forEach(guild => {
    servers[guild.id] = { queue: [] };
  });
  console.log(chalk.greenBright("Bot Ready Bruh"));
});

bot.on("guildCreate", guild => {
  if (!servers[guild.id]) Y;
  servers[message.guild.id] = {
    queue: []
  };
});

bot.on("message", async function(message) {
  if (message.author.equals(bot.user)) return;

  if (!message.content.startsWith(config.prefix)) return;

  var args = message.content.substring(config.prefix.length).split(" ");

  switch (args[0].toLowerCase()) {
    case "ping":
      message.channel.send("Pong!");
      break;
    case "play":
      let urlTest = new RegExp(
        /(?:http(s)?:\/\/)?[\w.-]+(?:\.[\w\.-]+)+[\w\-\._~:/?#[\]@!\$&'\(\)\*\+,;=.]+$/
      );
      if (!args[1]) {
        message.channel.send(
          "Please provide a link to the song you'd like to play."
        );
        return;
      }

      if (!message.member.voiceChannel) {
        message.channel.send(
          "Can't request a song if you arent in a voice channel, bro."
        );
        return;
      }

      if (!urlTest.test(args[1])) {
        message.channel.send(
          "Please provide a link to the song you'd like to play."
        );
        return;
      } else {
        var server = servers[message.guild.id];
        let songInfo = await YTDL.getInfo(args[1]);

        server.queue.push(new SongRequest(songInfo, message.author));
      }

      if (!message.guild.voiceConnection)
        message.member.voiceChannel.join().then(function(connection) {
          play(connection, message);
        });

      break;
    case "skip":
      var server = servers[message.guild.id];
      if (server.dispatcher) server.dispatcher.end();
      break;
    case "stop":
      var server = servers[message.guild.id];
      if (message.guild.voiceConnection)
        message.guild.voiceConnection.disconnect();
      break;
    case "queue":
      var server = servers[message.guild.id];
      let queueOutput = "";

      server.queue.forEach((request, i) => {
        queueOutput += `${i + 1}. ${request.requestor.username} - ${
          request.nowPlaying ? "(Now Playing)" : ""
        } ${request.songInfo.title}\n`;
      });

      message.channel.send(
        queueOutput === ""
          ? "The queue is empty"
          : "```\n" + queueOutput + "```"
      );
      break;
    case "vol":
    case "volume":
      if (typeof args[1] === "undefined") {
        message.channel.send(`Current volume: ${config.volume * 100}`);
        return;
      }

      let volume = parseFloat(args[1]);

      if (volume > 100 || volume < 0) {
        message.channel.send("Valid volume range is 0 - 100");
        return;
      }

      volume = (volume / 100).toFixed(2);

      if (config.volume === volume) return;

      config.volume = volume;

      if (servers[message.guild.id].dispatcher) {
        try {
          servers[message.guild.id].dispatcher.setVolume(volume);
        } catch (err) {
          message.channel.send("Unable to change volume.");
        }
      }

      await fs.writeJson("./config.json", config, { spaces: 2 });

      break;
  }
});

function play(connection, message) {
  let server = servers[message.guild.id];

  server.dispatcher = connection.playStream(
    YTDL.downloadFromInfo(server.queue[0].songInfo, { filter: "audioonly" })
  );

  server.queue[0].nowPlaying = true;

  server.dispatcher.setVolume(config.volume);

  server.dispatcher.on("end", function(t) {
    server.queue.shift();

    if (server.queue[0]) play(connection, message);
    else connection.disconnect();
  });
}
