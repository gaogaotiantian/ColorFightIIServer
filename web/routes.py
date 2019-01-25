import pathlib
import aiohttp_cors

from views import index, incr, game_channel, action_channel

PROJECT_ROOT = pathlib.Path(__file__).parent

def setup_routes(app):
    app.router.add_get('/', index)
    app.router.add_get('/incr', incr)
    app.router.add_get('/game_channel', game_channel)
    app.router.add_get('/action_channel', action_channel)

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
