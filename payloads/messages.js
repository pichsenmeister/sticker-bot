const utils = require("./utils");

module.exports = {
  stickerSet: context => {
    return [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `:sparkles: Here\'s your new sticker set: *${context.name}*`
        }
      },
      {
        type: "context",
        elements: [
          {
            type: "mrkdwn",
            text: utils.privacy[context.privacy]
          }
        ]
      },
      {
        type: "actions",
        elements: [
          {
            action_id: "set:edit",
            type: "button",
            text: {
              type: "plain_text",
              text: "Edit Sticker set",
              emoji: true
            },
            value: context.setId
          },
          {
            action_id: "set:delete",
            type: "button",
            text: {
              type: "plain_text",
              text: "Delete Sticker set",
              emoji: true
            },
            style: "danger",
            value: context.setId,
            confirm: {
              title: {
                type: "plain_text",
                text: "Are you sure?"
              },
              text: {
                type: "mrkdwn",
                text: `This will delete *${context.name}*.`
              },
              confirm: {
                type: "plain_text",
                text: "Yes"
              },
              deny: {
                type: "plain_text",
                text: "Nevermind"
              }
            }
          }
        ]
      },
      {
        type: "context",
        elements: [
          {
            type: "mrkdwn",
            text: "Upload images in thread to append them to this sticker set."
          }
        ]
      }
    ];
  },
  sendSticker: context => {
    return {
      response_type: "in_channel",
      text: `:frame_with_picture: ${context.name}`,
      blocks: [
        {
          type: "image",
          title: {
            type: "plain_text",
            text: context.name,
            emoji: true
          },
          image_url: context.url,
          alt_text: context.name
        },
        {
          type: "context",
          elements: [
            {
              type: "mrkdwn",
              text: `sent by *<@${context.userId}>*`
            }
          ]
        }
      ]
    };
  }
};
