import {
  GuildChannel, MessageActionRow, MessageButton,
  MessageComponentInteraction, InteractionCollector
} from 'discord.js';

import Command from ".";
import * as constants from '../core/constants';

import type { ButtonInteraction, PermissionString, CommandInteraction, Guild } from "discord.js";
import { Webhook } from 'discord.js';

/**
 * Create a promise that resolves with the first interaction received
 * @param collector The collector to wait for
 * @returns The first interaction received
 */
function waitForCollect(collector: InteractionCollector<ButtonInteraction>): Promise<MessageComponentInteraction | undefined> {
  return new Promise((resolve) => {
    collector.once('end', (collected) => resolve(collected.first()));
  });
}

export default class SetupCommand extends Command {
  name = 'setup';
  description = 'Setup giveaways for a channel.';
  permissions: Array<PermissionString> = ['SEND_MESSAGES', 'MANAGE_WEBHOOKS'];
  // We only want to allow this for the owner
  authorPermissions: Array<PermissionString> = ['MANAGE_GUILD'];
  options = [
    {
      type: 'CHANNEL' as const,
      name: 'channel',
      description: 'The channel to setup giveaways for, defaults to the current channel.',
      required: false,
    },
  ];
  ignoreDMs = true;

  /**
   * A helper function to ask the user something
   * @param interaction The interaction received from Discord
   * @param message The message to ask the user
   */
  async prompt(webhook: Webhook, message: string): Promise<boolean | null> {
    const msg = await webhook.send({
      content: message,
      components: [
        new MessageActionRow()
          .addComponents(
            new MessageButton()
              .setCustomId('YES')
              .setLabel('Yes')
              .setStyle('DANGER'),
            new MessageButton()
              .setCustomId('NO')
              .setLabel('No')
              .setStyle('SECONDARY')
          )
      ],
    });

    const collected = await waitForCollect(new InteractionCollector<ButtonInteraction>(
      webhook.client, { message: msg, max: 1, time: 1000 * 60 * 1 }
    ));
    webhook.deleteMessage(msg);
    return collected ? collected.customId === 'YES' : null;
  }

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
      const cancel = !await this.prompt(webhook, 'You already have a webhook, would you like to continue?');
      if (cancel) {
        return void await interaction.followUp({ content: 'Cancelling...' });
      }

      await webhook.delete('Replacing old GiveawayBot webhook.');
      await interaction.client.db.guilds.remove((<Guild>interaction.guild).id);
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
              .setCustomId('TEST')
              .setLabel('Press me!')
              .setStyle('PRIMARY')
          )
      ]
    });

    const collected = await waitForCollect(new InteractionCollector<ButtonInteraction>(
      interaction.client, { message: msg, max: 1, time: constants.GIVEAWAY_WAIT }
    ));

    await webhook.deleteMessage(msg);

    if (!collected) {
      await interaction.followUp({
        content: 'Something went wrong, please try again.',
      });
      return await webhook.delete('Setting up GiveawayBot failed.');
    }

    await interaction.client.db.guilds.update((<Guild>interaction.guild).id, webhook.id, webhook.token as string);

    await interaction.followUp({
      content: 'Everything setup correctly, you will now receive giveaways through this webhook.'
    });
  }
}
