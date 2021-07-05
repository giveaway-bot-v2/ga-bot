import {
  GuildChannel, MessageActionRow, MessageButton,
  MessageComponentInteraction, MessageComponentInteractionCollector
} from 'discord.js';

import Command from ".";
import * as constants from '../core/constants';

import type { PermissionString, CommandInteraction, Guild } from "discord.js";
import { Webhook } from 'discord.js';

/**
 * Create a promise that resolves with the first interaction received
 * @param collector The collector to wait for
 * @returns The first interaction received
 */
function waitForCollect(collector: MessageComponentInteractionCollector): Promise<MessageComponentInteraction | undefined> {
  return new Promise((resolve) => {
    collector.once('end', (collected) => resolve(collected.first()));
  });
}

export default class SetupCommand extends Command {
  name = 'setup';
  description = 'Setup giveaways for a channel.';
  permissions: Array<PermissionString> = ['SEND_MESSAGES', 'MANAGE_WEBHOOKS'];
  options = [
    {
      type: 'CHANNEL' as const,
      name: 'channel',
      description: 'The channel to setup giveaways for, defaults to the current channel.',
      required: false,
    },
  ];
  ignoreDMs = true;

  async run(interaction: CommandInteraction): Promise<void> {
    const channel = interaction.options.get('channel')?.channel ?? interaction.channel;

    if (!(channel instanceof GuildChannel)) {
      return await interaction.reply('I do not have access to that channel.');
    } else if (!channel.isText()) {
      return await interaction.reply('That is not a text channel.');
    }

    await interaction.defer();

    const record = await interaction.client.db.guilds.get((<Guild>interaction.guild).id);
    if (record) {
      // There is already an inserted guild record
      const webhook = new Webhook(interaction.client, {id: record.webhook_id, token: record.webhook_token});
      await webhook.send({ content: 'You already have a webhook setup, this one will be replaced.' });
      await webhook.delete('Replacing old GiveawayBot webhook.');
    }
    const webhook = await channel.createWebhook('GiveawayBot', {
      // Only PNGs will render a transparent background
      avatar: interaction.client.application?.iconURL({ format: 'png' }) ?? undefined
    });

    const msg = await webhook.send({
      content: 'Please use the following button so that we can make sure the webhook is working correctly..',
      components: [
        new MessageActionRow()
          .addComponents(
            new MessageButton()
              .setCustomID('TEST')
              .setLabel('Press me!')
              .setStyle('PRIMARY')
          )
      ]
    });

    const collected = await waitForCollect(new MessageComponentInteractionCollector(
      msg, { max: 1, time: constants.GIVEAWAY_WAIT
    }));

    await webhook.deleteMessage(msg);

    if (!collected) {
      await interaction.followUp({
        content: 'Something went wrong, please try again.',
      });
      return void await webhook.delete('Setting up GiveawayBot failed.');
    }

    await interaction.client.db.guilds.update((<Guild>interaction.guild).id, webhook.id, webhook.token as string);

    await interaction.followUp({
      content: 'Everything setup correctly, you will now receive giveaways through this webhook.'
    });
  }
}