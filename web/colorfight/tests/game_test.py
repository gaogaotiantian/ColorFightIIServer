from ..colorfight import Colorfight
from ..constants import GAME_WIDTH, GAME_HEIGHT
from ..constants import BLD_GOLD_MINE, BLD_ENERGY_WELL
from .util import *
import pytest

def test_game_restart():
    try:
        game = Colorfight()
        uid = join(game, 'a', 'a')
        assert (uid > 0)
        game.update(True)
        info = game.get_game_info()
        assert(len(info['users']) == 1)
        game.restart()
        info = game.get_game_info()
        assert(info['turn'] == 0)
        assert(not info['users'])
        assert(not info['error'])
    except Exception as e:
        print(e)
        assert (False)


def test_register_with_same_username_and_password():
    try:
        game = Colorfight()
        uid = join(game, 'a', 'a')
        assert (uid > 0)
        uid = join(game, 'a', 'a')
        assert (uid > 0)
        info = game.get_game_info()
        assert(len(info["users"]) == 1)
    except Exception as e:
        print(e)
        assert (False)

def test_register_with_same_username_different_password():
    try:
        game = Colorfight()
        uid = join(game, 'a', 'a')
        assert (uid > 0)
        uid = join(game, 'a', 'ab')
        assert (uid > 0)
        info = game.get_game_info()
        assert(len(info["users"]) == 2)
    except Exception as e:
        print(e)
        assert (False)

def test_initial_user_info():
    try:
        game = Colorfight()
        uid = join(game, 'a', 'a')
        assert (uid > 0)
        info = game.get_game_info()
        user = info['users'][uid]
        assert (user['uid'] == uid)
        assert (len(user['cells']) == 1)
        assert(user['energy'] == 100)
        assert(user['gold'] == 0)
        assert(not user['dead'])
        assert(user['gold_source'] == 10)
        assert(user['energy_source'] == 10)
    except Exception as e:
        print(e)
        assert (False)