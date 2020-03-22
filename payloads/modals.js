const utils = require("./utils");

module.exports = {
  // views
  createSet: () => {
    return {
      callback_id: "set:create",
      type: "modal",
      title: {
        type: "plain_text",
        text: "Create a sticker set",
        emoji: true
      },
      submit: {
        type: "plain_text",
        text: "Create",
        emoji: true
      },
      close: {
        type: "plain_text",
        text: "Cancel",
        emoji: true
      },
      blocks: [
        {
          block_id: "name",
          type: "input",
          element: {
            action_id: "data",
            type: "plain_text_input",
            placeholder: {
              type: "plain_text",
              text: "Enter a name",
              emoji: true
            }
          },
          label: {
            type: "plain_text",
            text: "Sticker set name",
            emoji: true
          }
        },
        {
          block_id: "privacy",
          type: "input",
          element: {
            action_id: "data",
            type: "radio_buttons",
            options: [
              {
                text: {
                  type: "plain_text",
                  text: ":globe_with_meridians: Public",
                  emoji: true
                },
                description: {
                  type: "plain_text",
                  text: "This sticker set is publicly available for all teams."
                },
                value: "public"
              },
              {
                text: {
                  type: "plain_text",
                  text: ":busts_in_silhouette: Team",
                  emoji: true
                },
                description: {
                  type: "plain_text",
                  text: "This sticker set is only available for my team."
                },
                value: "team"
              },
              {
                text: {
                  type: "plain_text",
                  text: ":lock: Private",
                  emoji: true
                },
                description: {
                  type: "plain_text",
                  text: "This sticker set is only for me."
                },
                value: "private"
              }
            ],
            initial_option: {
              text: {
                type: "plain_text",
                text: ":busts_in_silhouette: Team",
                emoji: true
              },
              description: {
                type: "plain_text",
                text: "This sticker set is only available for my team."
              },
              value: "team"
            }
          },
          label: {
            type: "plain_text",
            text: "Privacy settings",
            emoji: true
          }
        }
      ]
    };
  },
  setsView: context => {
    return {
      callback_id: "sets:view",
      type: "modal",
      title: {
        type: "plain_text",
        text: "Your sticker sets",
        emoji: true
      },
      close: {
        type: "plain_text",
        text: "Close",
        emoji: true
      },
      blocks: [],
      private_metadata: JSON.stringify(context.metadata)
    };
  },
  setView: context => {
    return {
      callback_id: "set:view",
      type: "modal",
      title: {
        type: "plain_text",
        text:
          context.name.length > 24 ? context.name.substr(0, 23) : context.name,
        emoji: true
      },
      close: {
        type: "plain_text",
        text: "Close",
        emoji: true
      },
      blocks: [],
      private_metadata: JSON.stringify(context.metadata)
    };
  },
  stickerEdit: context => {
    return {
      callback_id: "sticker:edit",
      type: "modal",
      title: {
        type: "plain_text",
        text: "Edit sticker",
        emoji: true
      },
      submit: {
        type: "plain_text",
        text: "Save",
        emoji: true
      },
      close: {
        type: "plain_text",
        text: "Cancel",
        emoji: true
      },
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
          block_id: "name",
          type: "input",
          element: {
            action_id: "data",
            type: "plain_text_input",
            initial_value: context.name
          },
          label: {
            type: "plain_text",
            text: "Name",
            emoji: true
          }
        }
      ],
      private_metadata: JSON.stringify({
        setId: context.setId,
        id: context.id
      })
    };
  },
  // components
  setChoose: context => {
    return [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*${context.set.name}*`
        },
        accessory: {
          action_id: "set:choose",
          type: "button",
          text: {
            type: "plain_text",
            text: "Choose Sticker Set",
            emoji: true
          },
          value: context.setId
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
      },
      { type: "divider" }
    ];
  },
  stickerView: context => {
    return {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*${context.name}*`
      },
      accessory: {
        type: "image",
        image_url: context.url,
        alt_text: context.name
      }
    };
  },
  stickerEditButtons: context => {
    return {
      type: "actions",
      elements: [
        {
          action_id: "sticker:edit",
          type: "button",
          text: {
            type: "plain_text",
            text: "Edit Name",
            emoji: true
          },
          value: context.setId + ":" + context.id
        },
        {
          action_id: "sticker:delete",
          type: "button",
          text: {
            type: "plain_text",
            text: "Delete",
            emoji: true
          },
          style: "danger",
          value: context.setId + ":" + context.id,
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
    };
  },
  stickerSendButtons: context => {
    return {
      type: "actions",
      elements: [
        {
          action_id: "sticker:choose",
          type: "button",
          text: {
            type: "plain_text",
            text: "Choose",
            emoji: true
          },
          value: context.setId + ":" + context.id
        }
      ]
    };
  },
  stickerSelectedButtons: context => {
    return {
      type: "actions",
      elements: [
        {
          action_id: "sticker:choose",
          type: "button",
          text: {
            type: "plain_text",
            text: "✓ Chosen",
            emoji: true
          },
          style: "primary",
          value: context.setId + ":" + context.id
        }
      ]
    };
  },
  conversationsSelect: {
    block_id: "channel",
    type: "input",
    element: {
      action_id: "data",
      type: "conversations_select",
      placeholder: {
        type: "plain_text",
        text: "Select a conversation",
        emoji: true
      },
      filter: {
        exclude_bot_users: true
      },
      response_url_enabled: true
    },
    label: {
      type: "plain_text",
      text: "Send to conversation",
      emoji: true
    }
  }
};
