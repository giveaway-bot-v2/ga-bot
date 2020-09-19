const Discord = require('discord.js')
const client = new Discord.Client()

client.on('ready', () => {
    //When ready let console know
    console.log("Connected as " + client.user.tag)
    
    // List servers the bot is serving in
    console.log("Serving in: " + client.guilds.cache.size)
    
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


client.on('message', (receivedMessage) => {
    // Prevent bot from responding to its own messages
    if (receivedMessage.author == client.user) {
        return
    }
    
    // Check if the bot's user was tagged in the message
    if (receivedMessage.content.startsWith(client.user.toString())) {
        // Send acknowledgement message
        receivedMessage.channel.send("Hey there, " +
            receivedMessage.author.toString() + "! My prefix is `!` ")
    }
})

bot_secret_token = "token here"  //we may want to move to a .env later

client.login(bot_secret_token)
