const Discord = require('discord.js')
const client = new Discord.Client()

client.on('ready', () => {
    //When ready let console know
    console.log("Connected as " + client.user.tag)
    
    // List servers the bot is serving in
    console.log("Serving in: " + client.guilds.cache.size)
})

bot_secret_token = "token here"  //we may want to move to a .env later

client.login(bot_secret_token)
