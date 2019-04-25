import os
import pathlib 

from aiohttp import web
import aiohttp_jinja2
import jinja2

from routes import setup_routes, setup_static_routes
from colorfight import Colorfight

PROJECT_ROOT = pathlib.Path(__file__).parent

async def init_app():

    app = web.Application()

    aiohttp_jinja2.setup(app, loader=jinja2.FileSystemLoader(str(PROJECT_ROOT / 'templates')))
    app['game'] = {}
    app['game']['public'] = Colorfight()
    app['game_sockets'] = []
    app['admin_password'] = os.getenv('ADMIN_PASSWORD', "")
    setup_routes(app)
    setup_static_routes(app)
    
    return app

def main():
    app = init_app()
    web.run_app(app, port = os.getenv('PORT', 5000))

if __name__ == '__main__':
    main()
