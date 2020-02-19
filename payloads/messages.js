module.exports = {
    stickerSet: (context) => {
        return [
            {
                type: 'section',
                text: {
                    type: 'mrkdwn',
                    text: `:sparkles: Here\'s your new sticker set: *${context.name}*`
                }
            },
            {
                type: 'context',
                elements: [
                    {
                        type: 'mrkdwn',
                        text: context.privacy
                    }
                ]
            },
            {
                type: 'actions',
                elements: [
                    {
                        action_id: 'set:edit',
                        type: 'button',
                        text: {
                            type: 'plain_text',
                            text: 'Edit Sticker set',
                            emoji: true
                        },
                        value: context.setId
                    },
                    {
                        action_id: 'set:delete',
                        type: 'button',
                        text: {
                            type: 'plain_text',
                            text: 'Delete Sticker set',
                            emoji: true
                        },
                        style: 'danger',
                        value: context.setId
                    }
                ]
            },
            {
                type: 'context',
                elements: [
                    {
                        type: 'mrkdwn',
                        text: 'Upload images in thread to append them to this sticker set.'
                    }
                ]
            }
        ]
    }
}