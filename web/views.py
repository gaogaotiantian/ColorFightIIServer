import time
import re

import aiohttp
from aiohttp import web
import asyncio
import aiohttp_jinja2

from colorfight import Colorfight
from colorfight.config import get_config

# =============================================================================
#    Utility
# =============================================================================

def url_safe(s):
    if re.search('[^0-9a-zA-Z-_.]', s):
        return False
    return True

def clean_gameroom(request):
    delete_rooms = []
    for name, gameroom in request.app['game'].items():
        # clear the rooms that's inactivate for more than 10 minutes
        if not gameroom.admin_room and time.time() - gameroom.last_update > request.app['config']['idle_clear_time']:
            delete_rooms.append(name)
    for name in delete_rooms:
        if name in request.app['game']:
            request.app['game'].pop(name)

async def clean_leaderboard(request):
    await request.app["firebase"].clean_leaderboard()

# =============================================================================
#    Web pages
# =============================================================================

@aiohttp_jinja2.template('index.html')
async def index(request):
    return {}

@aiohttp_jinja2.template('admin.html')
async def admin(request):
    headers = ['Name', 'Players', 'Turns', 'Lock', 'Rank']
    gamerooms = []
    for name, game in request.app['game'].items():
        gameroom = {}
        gameroom['Name'] = '{0}'.format(name)
        gameroom['Players'] = "{} / {}".format(len(game.users), game.max_player)
        gameroom['Turns'] = '{} / {}'.format(game.turn, game.max_turn)
        gameroom['link'] = '/gameroom/{0}/play'.format(name)
        gameroom['Lock'] = game.join_key != ""
        gameroom['Rank'] = game.rank
        gameroom['Admin'] = game.admin_room
        gamerooms.append(gameroom)
    return {
        'gamerooms': gamerooms, 
        'headers': headers,
        'max_gameroom_number': request.app['config']['max_gameroom_number'],
        'idle_clear_time'    : request.app['config']['idle_clear_time'],
        'allow_create_room'  : request.app['config']['allow_create_room']
    }
@aiohttp_jinja2.template('signin.html')
async def signin(request):
    return {}

@aiohttp_jinja2.template('dashboard.html')
async def dashboard(request):
    return {}

@aiohttp_jinja2.template('terms_of_service.html')
async def terms_of_service(request):
    return {}

@aiohttp_jinja2.template('privacy_policy.html')
async def privacy_policy(request):
    return {}

@aiohttp_jinja2.template('gameroom.html')
async def game_room(request):
    if 'replay' in request.url.path:
        return {'allow_manual_mode': False, 'replay_mode': True}

    gameroom_id = request.match_info['gameroom_id']
    if gameroom_id in request.app['game']:
        return {'allow_manual_mode': request.app['game'][gameroom_id].allow_manual_mode, 
                'replay_enable'    : request.app['game'][gameroom_id].replay_enable}
    else:
        return {}

@aiohttp_jinja2.template('gameroom_list.html')
async def gameroom_list(request):
    clean_gameroom(request)
    headers = ['Name', 'Players', 'Turns', 'Lock', 'Rank', 'Description']
    gamerooms = []
    for name, game in request.app['game'].items():
        gameroom = {}
        gameroom['Name'] = '{0}'.format(name)
        gameroom['Players'] = "{} / {}".format(len(game.users), game.max_player)
        gameroom['Turns'] = '{} / {}'.format(game.turn, game.max_turn)
        gameroom['link'] = '/gameroom/{0}/play'.format(name)
        gameroom['Lock'] = game.join_key != ""
        gameroom['Rank'] = game.rank
        gameroom['Description'] = game.room_description
        gameroom['Admin'] = game.admin_room
        gamerooms.append(gameroom)
    gamerooms.sort(key = lambda x: -x['Admin'])
    return {'gamerooms': gamerooms, 'headers': headers}

@aiohttp_jinja2.template('replay_list.html')
async def replay_list(request):
    return {}

@aiohttp_jinja2.template('leaderboard.html')
async def leaderboard(request):
    await clean_leaderboard(request)
    return {}

@aiohttp_jinja2.template('get_started.html')
async def get_started(request):
    return {}

@aiohttp_jinja2.template('game_rules.html')
async def game_rules(request):
    return {}

@aiohttp_jinja2.template('api.html')
async def api_documentation(request):
    return {}

@aiohttp_jinja2.template('contact.html')
async def contact(request):
    return {}

# =============================================================================
#    Websockets
# =============================================================================

async def game_channel(request):
    ws = web.WebSocketResponse()
    await ws.prepare(request)

    key_frame = 0 
    gameroom_id = request.match_info['gameroom_id']
    game_id = None
    last_send = time.time()

    if gameroom_id in request.app['game']:
        game = request.app['game'][gameroom_id]

        try:
            while True:
                required_actions = game.update()
                for action in required_actions:
                    if action == "update_result":
                        await request.app['firebase'].update_result(required_actions[action])
                if key_frame != game.key_frame or game_id != game.game_id or time.time() - last_send > 30:
                    game_id   = game.game_id
                    key_frame = game.key_frame
                    last_send = time.time()
                    await ws.send_json(game.get_compressed_game_info())
                await asyncio.sleep(0.04)
        finally:
            pass
    return ws

async def action_channel(request):
    ws = web.WebSocketResponse()
    await ws.prepare(request)

    uid = None

    gameroom_id = request.match_info['gameroom_id']

    if gameroom_id in request.app['game']:
        game = request.app['game'][gameroom_id]

        try:
            request.app['game_sockets'].append(ws)
            while True:
                msg = await ws.receive()
                if msg.type == aiohttp.WSMsgType.text:
                    result = game.parse_action(uid, msg.data)
                    # If this is a registration, the user is created but not 
                    # added into the game. We need to verify it. 
                    # The reason that we can't do this in Colorfight Object is
                    # that verify_user() should be an async function.
                    if "callback" in result:
                        if result["callback"]:
                            cb_type = result["callback"]["type"]
                            cb_data = result["callback"]["data"]
                            if cb_type == "verify_user":
                                data = await request.app['firebase'].verify_user(cb_data["username"], cb_data["password"])
                            result = game.callback(result["callback"], data)
                        else:
                            result.pop("callback")

                    uid = result.get('uid', uid)
                    await ws.send_json(result)
                else:
                    break
        finally:
            game.disconnect(uid)
    return ws

# =============================================================================
#    RPC to server
# =============================================================================

async def restart(request):
    data = await request.json()
    if 'gameroom_id' in data:
        gameroom_id = data['gameroom_id']
    else:
        return web.json_response({"success": False, "err_msg": "You need to specify room id"})
    if 'config' in data:
        config = data['config']
    else:
        return web.json_response({"success": False, "err_msg": "You need to specify config"})

    admin_password = ""
    if 'admin_password' in data:
        admin_password = data['admin_password']

    if gameroom_id not in request.app['game']:
        return web.json_response({"success": False, "err_msg": "No such room"})

    game = request.app['game'][gameroom_id]

    if admin_password == game.admin_password or admin_password == request.app['admin_password']:
        result, err_msg = game.config(config)
        if result:
            game.restart()
            return web.json_response({"success": True})
        else:
            return web.json_response({"success": False, "err_msg": err_msg})
    else:
        return web.json_response({"success": False, "err_msg": "You are not allowed to do this"})

async def start_game(request):
    data = await request.json()
    if 'gameroom_id' in data:
        gameroom_id = data['gameroom_id']
    else:
        return web.json_response({"success": False, "err_msg": "You need to specify room id"})

    admin_password = ""
    if 'admin_password' in data:
        admin_password = data['admin_password']

    if gameroom_id not in request.app['game']:
        return web.json_response({"success": False, "err_msg": "No such room"})

    game = request.app['game'][gameroom_id]

    if admin_password == game.admin_password or admin_password == request.app['admin_password']:
        game.start()
    else:
        return web.json_response({"success": False, "err_msg": "You are not allowed to do this"})

    return web.json_response({"success": True})

async def config_admin(request):
    data = await request.json()
    if 'admin_password' not in data:
        return web.json_response({"success": False, "err_msg": "You need admin password"})

    if data['admin_password'] != request.app['admin_password']:
        return web.json_response({"success": False, "err_msg": "Admin password is wrong"})

    try:
        if 'max_gameroom_number' in data:
            request.app['config']['max_gameroom_number'] = int(data['max_gameroom_number'])
        if 'idle_clear_time' in data:
            request.app['config']['idle_clear_time']     = int(data['idle_clear_time'])
        if 'allow_create_room' in data:
            request.app['config']['allow_create_room']   = bool(data['allow_create_room'])
    except Exception as e:
        return web.json_response({"success": False, "err_msg": "Wrong config, {}, {}".format(data, e)})

    return web.json_response({"success": True})

async def create_gameroom(request):
    data = await request.json()
    try:
        if not request.app['config']['allow_create_room']:
            return web.json_response({"success": False, "err_msg": "Creating room is disabled now"})

        gameroom_id = data['gameroom_id']
        if not url_safe(gameroom_id):
            return web.json_response({"success": False, "err_msg": "You have illegal special characters in you gameroom id"})

        if gameroom_id in request.app['game']:
            return web.json_response({"success": False, "err_msg": "Same id exists"})

        if len(request.app['game']) >= request.app['config']['max_gameroom_number']:
            return web.json_response({"success": False, "err_msg": "Max room number reached"})

        if 'config' in data:
            # If it's an official game, we require a password
            if data['config'] == 'official':
                if 'admin_password' not in data:
                    return web.json_response({"success": False, "err_msg": "You need to set a password for official game!"})
            config = get_config(data['config'])
        else:
            config = get_config('default')

        # If this is an admin room
        admin_room = False
        if 'admin' in request.query and request.query['admin'].lower() == 'true':
            if 'master_admin_password' in data and data['master_admin_password'] == request.app['admin_password']:
                admin_room = True
            else:
                return web.json_response({"success": False, "err_msg": "To create an admin room, you need admin"})

        request.app['game'][gameroom_id] = Colorfight(config = config, admin_room = admin_room)
        request.app['game'][gameroom_id].save_replay = lambda replay, data: request.app['firebase'].upload_replay(replay, data)
        request.app['game'][gameroom_id].replay_lock = asyncio.Lock(loop = asyncio.get_event_loop())

        if 'admin_password' in data:
            request.app['game'][gameroom_id].admin_password = data['admin_password']

        if 'join_key' in data:
            request.app['game'][gameroom_id].join_key = data['join_key']

    except Exception as e:
        return web.json_response({"success": False, "err_msg": str(e)})

    return web.json_response({"success": True})

async def delete_gameroom(request):
    data = await request.json()
    try:
        gameroom_id = data['gameroom_id']
        if gameroom_id not in request.app['game']:
            return web.json_response({"success": False, "err_msg": "No such room"})

        admin_password = data.get('admin_password', "")

        game = request.app['game'][gameroom_id]
        if (not game.admin_room and game.admin_password == admin_password) or \
                request.app['admin_password'] == admin_password:
            request.app['game'].pop(gameroom_id)
        else:
            return web.json_response({"success": False, "err_msg": "Wrong password"})

    except Exception as e:
        return web.json_response({"success": False, "err_msg": str(e)})

    return web.json_response({"success": True})

async def download_replay(request):
    gameroom_id = request.match_info['gameroom_id']
    if gameroom_id not in request.app['game']:
        return web.Response(status = 400)
    else:
        game = request.app['game'][gameroom_id]
        if ((game.replay_enable == 'end' and game.turn == game.max_turn) or \
                game.replay_enable == 'always'):
            await game.replay_lock.acquire()
            try:
                loop = asyncio.get_event_loop()
                log = await loop.run_in_executor(request.app['thread_executor'], 
                        request.app['game'][gameroom_id].get_log)
            finally:
                game.replay_lock.release()
            return web.Response(body = log)
        else:
            return web.Response(status = 400)

async def reset_leaderboard(request):
    data = await request.json()
    if 'admin_password' not in data:
        return web.json_response({"success": False, "err_msg": "You need admin password"})

    if data['admin_password'] != request.app['admin_password']:
        return web.json_response({"success": False, "err_msg": "Admin password is wrong"})

    if 'tag' in data:
        tag = str(data['tag'])
    else:
        tag = None

    request.app['firebase'].reset_leaderboard(tag)
    