import {
  MessageEmbed, WebhookMessageOptions, MessageActionRow, MessageButton,
  Webhook, InteractionCollector, ButtonInteraction,
  MessageComponentInteraction, Client, Snowflake 
} from 'discord.js';

import type { Giveaway } from '../database/GiveawayTable';
import type { Guild } from '../database/GuildTable';

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

export function generateClaim(giveaway: Giveaway, member: Snowflake): WebhookMessageOptions {
  return {
    content: `<@!${member}> please claim your key`,
    embeds: [new MessageEmbed({
      title: 'Claim your key!',
      description: 'Please use the following button to claim your key.',
      color: 0x5865F2,
      footer: {
        text: `CLAIM-${giveaway.id.toString(36).toUpperCase()}`,
      },
    })],
    components: [
      new MessageActionRow()
        .addComponents(
          new MessageButton()
            .setCustomId(`CLAIM-${giveaway.id.toString(36).toUpperCase()}`)
            .setLabel('Claim!')
            .setStyle('PRIMARY')
        ),
    ],
  };
}

export function generateFinished(giveaway: Giveaway, member: Snowflake): WebhookMessageOptions {
  return {
    embeds: [new MessageEmbed({
      title: 'Giveaway finished',
      description: `<@!${member}> won the giveaway.`,
      color: 0x4F545C,
    })],
  };
}

/**
 * Helper function to sleep for a duration
 * @param ms The time to sleep before resolving
 * @returns A promise that resolves after the duration
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Extract the giveaway ID from a button's customID
 */
export function getId(customID: string): number {
  return parseInt(customID.slice(9), 36);
}

/**
 * Construct a new webhook from its guild row
 * @param bot The running discord.js bot
 * @param guild The guild row with details
 * @returns The webhook constructed
 */
export function newWebhook(bot: Client, guild: Guild): Webhook {
  return new Webhook(bot, {id: guild.webhook_id, token: guild.webhook_token});
}

/**
 * Create a promise that resolves with the first interaction received
 * @param collector The collector to wait for
 * @returns The first interaction received
 */
export function waitForCollect(collector: InteractionCollector<ButtonInteraction>): Promise<MessageComponentInteraction | undefined> {
  return new Promise((resolve) => {
    collector.once('end', (collected) => resolve(collected.first()));
  });
}
