const utils = require("./utils");

module.exports = {
  home: context => {
    return {
      type: "home",
      blocks: [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: "*Here's what you can do with Stickers:*"
          }
        },
        {
          type: "actions",
          elements: [
            {
              type: "button",
              action_id: "set:create",
              text: {
                type: "plain_text",
                text: "Create New Stickerset",
                emoji: true
              },
              style: "primary",
              value: "set:create"
            }
          ]
        },
        {
          type: "context",
          elements: [
            {
              type: "mrkdwn",
              text:
                "_Disclaimer: All images uploaded through Stickers will be accessible through a public endpoint._"
            }
          ]
        }
      ]
    };
  },
  stickerHeader: context => {
    return [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*${context.text}*`
        }
      },
      { type: "divider" }
    ];
  },
  stickerSet: context => {
    return [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*${context.set.name}*`
        }
      },
      {
        type: "context",
        elements: [
          {
            type: "mrkdwn",
            text: utils.privacy[context.set.privacy]
          }
        ]
      }
    ];
  },
  setEditButtons: context => {
    return {
      type: "actions",
      elements: [
        {
          action_id: "set:edit",
          type: "button",
          text: {
            type: "plain_text",
            text: "Edit Sticker Set",
            emoji: true
          },
          value: context.setId
        },
        {
          action_id: "set:delete",
          type: "button",
          text: {
            type: "plain_text",
            text: "Delete Sticker Set",
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
              text: `This will delete *${context.set.name}*.`
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
    };
  },
  setAddButtons: context => {
    return {
      type: "actions",
      elements: [
        {
          action_id: "set:view",
          type: "button",
          text: {
            type: "plain_text",
            text: "View Sticker Set",
            emoji: true
          },
          value: context.setId
        },
        {
          action_id: "set:add",
          type: "button",
          text: {
            type: "plain_text",
            text: "Add Sticker Set",
            emoji: true
          },
          style: "primary",
          value: context.setId
        }
      ]
    };
  },
  setRemoveButtons: context => {
    return {
      type: "actions",
      elements: [
        {
          action_id: "set:view",
          type: "button",
          text: {
            type: "plain_text",
            text: "View Sticker Set",
            emoji: true
          },
          value: context.setId
        },
        {
          action_id: "set:remove",
          type: "button",
          text: {
            type: "plain_text",
            text: "Remove Sticker Set",
            emoji: true
          },
          style: "danger",
          value: context.setId
        }
      ]
    };
  }
};
