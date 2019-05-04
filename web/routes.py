import pathlib
import aiohttp_cors

from views import *

PROJECT_ROOT = pathlib.Path(__file__).parent

def setup_routes(app):
    # Web pages
    app.router.add_get('/', index)
    app.router.add_get('/gameroom', gameroom_list)
    app.router.add_get('/getstarted', get_started)
    app.router.add_get('/document', game_rules)
    app.router.add_get('/document/game_rules', game_rules)
    app.router.add_get('/document/api', api_documentation)
    app.router.add_get('/contact', contact)

    # RPC
    app.router.add_post('/start'  , start_game)
    app.router.add_post('/restart', restart)
    app.router.add_post('/creategameroom', create_gameroom)
    app.router.add_post('/deletegameroom', delete_gameroom)

    # Gameroom related
    app.router.add_get('/gameroom/{gameroom_id}/play', game_room)
    app.router.add_get('/gameroom/{gameroom_id}/replay', download_replay)
    app.router.add_get('/gameroom/{gameroom_id}/game_channel', game_channel)
    app.router.add_get('/gameroom/{gameroom_id}/action_channel', action_channel)

    app.router.add_get('/replay_list', replay_list)
    app.router.add_get('/replay', game_room)

    cors = aiohttp_cors.setup(app, defaults = {
        "*": aiohttp_cors.ResourceOptions(
            allow_credentials = True,
            expose_headers = "*",
            allow_headers = "*"
        )
    })

    for route in list(app.router.routes()):
        cors.add(route)

def setup_static_routes(app):
    app.router.add_static('/static/', path = PROJECT_ROOT/'static', name = 'static')
