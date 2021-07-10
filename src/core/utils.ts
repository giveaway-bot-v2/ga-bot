import { MessageEmbed, WebhookMessageOptions, MessageActionRow, MessageButton } from 'discord.js';

import type { Giveaway } from '../database/GiveawayTable';

export function generateGiveawayEmbed(giveaway: Giveaway): MessageEmbed {
  return new MessageEmbed({
    title: 'New giveaway!',
    description: `Someone is giving out a game!`,
    color: 0x5865F2,
    footer: {
      // Convert the giveaway ID to a string with radix of 36
      text: `GIVEAWAY-${giveaway.id.toString(36).toUpperCase()}`,
    },
  });
}

export function generateEnterAction(id: number): MessageActionRow {
  return new MessageActionRow()
    .addComponents(
      new MessageButton()
        .setCustomId(`GIVEAWAY-${id.toString(36).toUpperCase()}`)
        .setLabel('Enter 🎉')
        .setStyle('PRIMARY')
    )
}

export function generateAnnouncement(giveaway: Giveaway): WebhookMessageOptions {
  return {
    content: '@ping',
    embeds: [generateGiveawayEmbed(giveaway)],
    components: [generateEnterAction(giveaway.id)]
  }
}
