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
        if name != 'public' and time.time() - gameroom.last_update > 10 * 60:
            delete_rooms.append(name)
    for name in delete_rooms:
        if name in request.app['game']:
            request.app['game'].pop(name)

# =============================================================================
#    Web pages
# =============================================================================

@aiohttp_jinja2.template('index.html')
async def index(request):
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
    headers = ['Name', 'Players', 'Turns', 'Lock']
    gamerooms = []
    for name, game in request.app['game'].items():
        gameroom = {}
        gameroom['Name'] = '{0}'.format(name)
        gameroom['Players'] = len(game.users)
        gameroom['Turns'] = '{} / {}'.format(game.turn, game.max_turn)
        gameroom['link'] = '/gameroom/{0}/play'.format(name)
        gameroom['Lock'] = game.join_key != ""
        gamerooms.append(gameroom)
    return {'gamerooms': gamerooms, 'headers': headers}

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
                game.update()
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
                    uid = result.get('uid', uid)
                    await ws.send_json(result)
                else:
                    break
        finally:
            pass
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
        result, err_msg = game.config(data['config'])
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

async def create_gameroom(request):
    data = await request.json()
    try:
        gameroom_id = data['gameroom_id']
        if not url_safe(gameroom_id):
            return web.json_response({"success": False, "err_msg": "You have illegal special characters in you gameroom id"})

        if gameroom_id in request.app['game']:
            return web.json_response({"success": False, "err_msg": "Same id exists"})

        if len(request.app['game']) >= 10:
            return web.json_response({"success": False, "err_msg": "Max room number reached"})

        if 'config' in data:
            # If it's an official game, we require a password
            if data['config'] == 'official':
                if 'admin_password' not in data:
                    return web.json_response({"success": False, "err_msg": "You need to set a password for official game!"})
            config = get_config(data['config'])
        else:
            config = get_config('default')

        request.app['game'][gameroom_id] = Colorfight(config = config)
        request.app['game'][gameroom_id].save_replay = lambda replay, data: request.app['firebase'].upload_replay(replay, data)

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

        if request.app['game'][gameroom_id].admin_password == admin_password or \
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
        print(request.app['game'].keys())
        return web.Response(status = 400)
    else:
        game = request.app['game'][gameroom_id]
        if ((game.replay_enable == 'end' and game.turn == game.max_turn) or \
                game.replay_enable == 'always'):
            return web.Response(body = request.app['game'][gameroom_id].get_log())
        else:
            return web.Response(status = 400)



    

