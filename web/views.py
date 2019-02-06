import aiohttp
from aiohttp import web
import asyncio
import aiohttp_jinja2

@aiohttp_jinja2.template('index.html')
async def index(request):
    return {}

@aiohttp_jinja2.template('gameroom.html')
async def game_room(request):
    return {}

@aiohttp_jinja2.template('get_started.html')
async def get_started(request):
    return {}

@aiohttp_jinja2.template('document.html')
async def document(request):
    return {}

@aiohttp_jinja2.template('contact.html')
async def contact(request):
    return {}

async def game_channel(request):
    ws = web.WebSocketResponse()
    await ws.prepare(request)

    curr_turn = 0 
    game = request.app['game']

    try:
        while True:
            game.update()
            if curr_turn != game.turn:
                curr_turn = game.turn
                await ws.send_json(game.get_game_info())
            await asyncio.sleep(0.1)
    finally:
        pass
    return ws

async def action_channel(request):
    ws = web.WebSocketResponse()
    await ws.prepare(request)

    uid = None

    try:
        request.app['game_sockets'].append(ws)
        while True:
            msg = await ws.receive()
            if msg.type == aiohttp.WSMsgType.text:
                result = request.app['game'].parse_action(uid, msg.data)
                uid = result.get('uid', uid)
                await ws.send_json(result)
            else:
                break
    finally:
        pass
    return ws

async def restart(request):
    request.app['game'].restart()
    for ws in request.app['game_sockets']:
        ws.close()
    request.app['game_sockets'] = []
    return web.json_response({"success": True})
