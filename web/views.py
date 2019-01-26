from aiohttp import web
import asyncio
import aiohttp_jinja2

@aiohttp_jinja2.template('index.html')
async def index(request):
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
        while True:
            msg = await ws.receive()
            if msg_type == aiohttp.WSMsgType.text:
                result = request.app['game'].parse_action(uid, msg)
                if result.get('action', None) == 'join':
                    uid = result['uid']
                await ws.send_json(result)
            else:
                break
    finally:
        pass
    return ws

async def restart(request):
    app['game'].restart()
    return web.json_response({"success": True})
