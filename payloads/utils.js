module.exports = {
  divider: { type: "divider" },
  text: value => {
    return {
      type: "section",
      text: {
        type: "mrkdwn",
        text: value
      }
    };
  },
  submit: value => {
    return {
      type: "plain_text",
      text: value,
      emoji: true
    };
  },
  privacy: {
    public: ":globe_with_meridians: Public",
    team: ":busts_in_silhouette: Team",
    private: ":lock: Private"
  },
  spacer: {
    type: "context",
    elements: [
      {
        type: "image",
        image_url:
          "https://api.slack.com/img/blocks/bkb_template_images/placeholder.png",
        alt_text: "placeholder"
      }
    ]
  }
};
