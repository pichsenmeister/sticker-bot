require('dotenv').config()
const qs = require('qs')
const axios = require('axios')
const store = require('./store')

// TODO add enterpriseId support
const authorize = async ({ teamId, enterpriseId }) => {
    const team = await store.findTeam(teamId)
    if (!team) throw new Error('No matching authorizations')

    return {
        botToken: team.token,
        botId: team.bot_id,
        botUserId: team.bot_user_id
    }
}

const install = async (req, res) => {
    let scopes = ['commands', 'chat:write', 'im:history', 'im:write', 'reactions:write', 'files:read']

    let params = {
        client_id: process.env.SLACK_CLIENT_ID,
        scope: scopes.join(' '),
        redirect_uri: process.env.SLACK_REDIRECT_URL
    }

    let url = getUrlWithParams(
        'https://slack.com/oauth/v2/authorize',
        params
    )
    return res.redirect(url)
}

const redirect = async (req, res) => {

    if (!req.query.code) {
        throw new Error('invalid_code')
        return res.send('Invalid code parameter')
    }

    let params = {
        client_id: process.env.SLACK_CLIENT_ID,
        client_secret: process.env.SLACK_CLIENT_SECRET,
        redirect_uri: process.env.SLACK_REDIRECT_URL,
        code: req.query.code
    }

    const result = await axios({
        method: 'POST',
        url: `${process.env.SLACK_API_URL}/oauth.v2.access`,
        data: qs.stringify(params),
        headers: {
            'Content-type': 'application/x-www-form-urlencoded;charset=utf-8'
        }
    })

    if (!result.data.ok) throw new Error('invalid_auth')

    const token = result.data.access_token
    const auth = await axios({
        method: 'POST',
        url: `${process.env.SLACK_API_URL}/auth.test`,
        data: qs.stringify({ token }),
        headers: {
            'Content-type': 'application/x-www-form-urlencoded;charset=utf-8'
        }
    })

    const context = {
        team_id: result.data.team.id,
        bot_id: auth.data.bot_id,
        bot_user_id: result.data.bot_user_id,
        scopes: result.data.scope.split(','),
        authed_user: result.data.authed_user.id,
        token: token
    }

    if (result.data.enterprise) context.enterprise_id = result.data.enterprise.id
    await store.saveTeam(result.data.team.id, context)
    return res.redirect('https://slack.com/app_redirect?app=ATR11DD1A')
}

const getUrlWithParams = (url, params) => {
    if (url.indexOf("?") < 0) url += "?";
    url += Object.keys(params)
        .map(key => key + "=" + params[key])
        .join("&");
    return url;
};

module.exports = {
    authorize,
    install,
    redirect
}