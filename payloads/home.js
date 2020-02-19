module.exports = {
    home: (context) => {
        return {
            type: 'home',
            blocks: [
                {
                    type: 'section',
                    text: {
                        type: 'mrkdwn',
                        text: '*Here\'s what you can do with Stickers:*'
                    }
                },
                {
                    type: 'actions',
                    elements: [
                        {
                            type: 'button',
                            action_id: 'set:create',
                            text: {
                                type: 'plain_text',
                                text: 'Create New Stickerset',
                                emoji: true
                            },
                            style: 'primary',
                            value: 'set:create'
                        }
                    ]
                },
                {
                    type: 'context',
                    elements: [
                        {
                            type: 'mrkdwn',
                            text: '_Disclaimer: All images uploaded through Stickers will be accessible through a public endpoint._'
                        }
                    ]
                }
            ]
        }
    },
    stickerHeader: (context) => {
        return [
            {
                type: 'section',
                text: {
                    type: 'mrkdwn',
                    text: `*Your stickers*`
                }
            },
            { type: 'divider' }
        ]
    },
    stickerSet: (context) => {
        return [
            {
                type: 'section',
                text: {
                    type: 'mrkdwn',
                    text: `*${context.sticker.name}*`
                }
            },
            {
                type: 'actions',
                elements: [
                    {
                        action_id: 'set:view',
                        type: 'button',
                        text: {
                            type: 'plain_text',
                            text: 'View Sticker Set',
                            emoji: true
                        },
                        value: context.sticker.ts
                    },
                    {
                        type: 'button',
                        text: {
                            type: 'plain_text',
                            text: 'Edit Sticker Set',
                            emoji: true
                        },
                        value: 'delete'
                    },
                    {
                        type: 'button',
                        text: {
                            type: 'plain_text',
                            text: 'Delete Sticker Set',
                            emoji: true
                        },
                        style: 'danger',
                        value: 'delete'
                    }
                ]
            },
        ]
    }
}