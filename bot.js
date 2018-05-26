const Discord = require("discord.js")
const YTDL = require("ytdl-core")
const bot = new Discord.Client()
const config = require("./config.js")
const token = config.token
const prefix = "!"

let servers = {}

bot.on("ready", function (){
    console.log("Bot Ready Bruh")
})
bot.login(token)

bot.on("message", function(message) {
    console.log(message.content)
    if (message.author.equals(bot.user)) return

    if(!message.content.startsWith(prefix)) return;

    var args = message.content.substring(prefix.length).split(" ")

    switch (args[0].toLowerCase()) { 
        case "ping":
            message.channel.send("Pong!")
        break;
        case "play":
            
            let urlTest = new RegExp(/(?:http(s)?:\/\/)?[\w.-]+(?:\.[\w\.-]+)+[\w\-\._~:/?#[\]@!\$&'\(\)\*\+,;=.]+$/)
            if (!args[1]) {
                message.channel.send("Please provide a link to the song you'd like to play.")
                return
            }
    
            if (!message.member.voiceChannel) {
                message.channel.send("Can't request a song if you arent in a voice channel, bro.")
                return
            }

            if (!servers[message.guild.id]) servers[message.guild.id] = {
                queue: []
            }
            
            if (!urlTest.test(args[1])){
                message.channel.send("Please provide a link to the song you'd like to play.")
                return
            } else {
                var server = servers[message.guild.id]
                server.queue.push(args[1])
            }

            if (!message.guild.voiceConnection) message.member.voiceChannel.join().then(function(connection) {
                play(connection, message)
            })
        break;
        case "skip":
            var server = servers[message.guild.id];
            if (server.dispatcher) server.dispatcher.end()
        break;
        case "stop":
            var server = servers[message.guild.id]
            if(message.guild.voiceConnection) message.guild.voiceConnection.disconnect()
        break;
        case "queue":
            var server = servers[message.guild.id]
            message.channel.send(server.queue)
        break;
    }
    
    
})

bot.login(token)

function play(connection, message) {
    let server = servers[message.guild.id]
    server.dispatcher = connection.playStream(YTDL(server.queue[0], {filter: "audioonly"}))
    server.queue.shift()
    server.dispatcher.on("end", function(){
        if (server.queue[0]) play(connection, message)
        else connection.disconnect()
    })
}