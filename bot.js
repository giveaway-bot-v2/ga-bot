const Discord = require('discord.js')
const client = new Discord.Client()

client.on('ready', () => {
    //When ready let console know
    console.log("Connected as " + client.user.tag)
    
    // List servers the bot is serving in
    console.log("Serving in " + client.guilds.cache.size)
    
    // Setting activity and presence of bot on startup
    client.user.setActivity("24/7 Giveaways!", {type: "WATCHING"})
    
    client.user.setPresence({
        status: 'online',
        activity: {
          name: '24/7 Giveaways!',
          type: 'WATCHING',
        }
    })
})

client.on('message', (message) => {
    // Prevent bot from responding to other bots
    if (message.author.bot) return
    
    // Check if the bot's user was tagged in the message
    if (message.content.startsWith(client.user.toString())) {
        // Send acknowledgement message
        message.channel.send("Hey there, " +
            message.author.toString() + "! My prefix is `!` ")
    }
})

client.login(process.env.TOKEN)
