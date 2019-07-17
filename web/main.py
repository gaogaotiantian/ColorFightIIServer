import os
import pathlib 
import concurrent.futures

from aiohttp import web
import aiohttp_jinja2
import asyncio
import jinja2
import uvloop

from routes import setup_routes, setup_static_routes

from colorfight import Colorfight
from colorfight.config import get_config
from firebase import Firebase

PROJECT_ROOT = pathlib.Path(__file__).parent

def init_gamerooms(app):
    app['game'] = {}
    app['game']['public'] = Colorfight(admin_room = True)
    app['game']['duel']   = Colorfight(config = get_config('duel'), admin_room = True)

async def init_app():

    app = web.Application()

    aiohttp_jinja2.setup(app, loader=jinja2.FileSystemLoader(str(PROJECT_ROOT / 'templates')))
    init_gamerooms(app)
    app['config'] = {}
    app['config']['max_gameroom_number'] = 15
    app['config']['idle_clear_time'] = 600
    app['config']['allow_create_room'] = True
    app['game_sockets'] = []
    app['admin_password'] = os.getenv('ADMIN_PASSWORD', "")
    app['firebase'] = Firebase()
    app['process_executor'] = concurrent.futures.ProcessPoolExecutor()
    app['thread_executor'] = concurrent.futures.ThreadPoolExecutor()
    setup_routes(app)
    setup_static_routes(app)
    
    return app

def main():
    asyncio.set_event_loop_policy(uvloop.EventLoopPolicy())
    app = init_app()
    web.run_app(app, port = os.getenv('PORT', 5000))

if __name__ == '__main__':
    main()
