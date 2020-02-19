module.exports = {
    createSet: () => {
        return {
            callback_id: 'set:create',
            type: 'modal',
            title: {
                type: 'plain_text',
                text: 'Create a Stickerset',
                emoji: true
            },
            submit: {
                type: 'plain_text',
                text: 'Create',
                emoji: true
            },
            close: {
                type: 'plain_text',
                text: 'Cancel',
                emoji: true
            },
            blocks: [
                {
                    block_id: 'name',
                    type: 'input',
                    element: {
                        action_id: 'value',
                        type: 'plain_text_input',
                        placeholder: {
                            type: 'plain_text',
                            text: 'Enter a name',
                            emoji: true
                        }
                    },
                    label: {
                        type: 'plain_text',
                        text: 'Stickerset name',
                        emoji: true
                    }
                },
                {
                    block_id: 'public',
                    type: 'input',
                    element: {
                        action_id: 'value',
                        type: 'checkboxes',
                        options: [
                            {
                                text: {
                                    type: 'plain_text',
                                    text: 'I acknowledge that other teams can use this sticker set.',
                                    emoji: true
                                },
                                value: 'public'
                            }
                        ]
                    },
                    label: {
                        type: 'plain_text',
                        text: 'Public distribution',
                        emoji: true
                    },
                    optional: true
                }
            ]
        }
    },
    viewSet: (context) => {
        return {
            callback_id: 'set:view',
            type: 'modal',
            title: {
                type: 'plain_text',
                text: context.name,
                emoji: true
            },
            close: {
                type: 'plain_text',
                text: 'Close',
                emoji: true
            },
            blocks: []
        }
    },
    viewSticker: (context) => {
        return {
            type: 'section',
            text: {
                type: 'mrkdwn',
                text: context.key
            },
            accessory: {
                type: 'image',
                image_url: context.thumb,
                alt_text: context.key
            }
        }
    }
}