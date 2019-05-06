from ..colorfight import Colorfight
from ..constants import GAME_WIDTH, GAME_HEIGHT
from ..constants import BLD_GOLD_MINE, BLD_ENERGY_WELL
from .util import *
import pytest

def test_create_instance():
    try:
        game = Colorfight()
    except Exception as e:
        print(e)
        assert(False)

def test_join():
    try:
        game = Colorfight()
        uid = join(game, 'a', 'a')
        assert(uid > 0)
        info = game.get_game_info()
        assert(uid in info['users'])
        user = info['users'][uid]
        assert(user['uid'] == uid)
        assert(len(user['cells']) == 1)
        x, y = user['cells'][0]
        assert(info['game_map'][y][x]['owner'] == user['uid'])
        home = info['game_map'][y][x]
        assert(home['energy'] == 10)
        assert(home['gold'] == 10)
        assert(home['attack_cost'] == 1000)
        x, y = home['position']
    except Exception as e:
        print(e)
        assert(False)


def test_get_game_info():
    try:
        game = Colorfight()
        info = game.get_game_info()
        assert(isinstance(info, dict))
        # Turn
        assert("turn" in info)
        assert(info["turn"] >= 0)
        # Game Map
        assert("game_map" in info)
        game_map = info["game_map"]
        assert(len(game_map) == GAME_HEIGHT)
        assert(len(game_map[0]) == GAME_WIDTH)
        # User
        assert("users" in info)
    except Exception as e:
        print(e)
        assert(False)

def test_update():
    game = Colorfight()
    info = game.get_game_info()
    assert(info['turn'] == 0)
    game.update(force = True)
    info = game.get_game_info()
    assert(info['turn'] == 1)

def test_attack():
    game = Colorfight()
    uid = join(game, 'a', 'a')
    game.update(True)
    info = game.get_game_info()
    x, y = info['users'][uid]['cells'][0]
    game.users[uid].energy = 10000
    if y == 0:
        attack_y = 1
    else:
        attack_y = y - 1
    game.game_map._cells[attack_y][x].natural_cost = 200
    result = attack(game, uid, x, attack_y, 100)
    assert(result["success"])
    game.update(True)
    assert(game.users[uid].energy < 10000)

    result = attack(game, uid, x, attack_y, 300)
    assert(result["success"])
    game.update(True)
    assert(len(game.errors[uid]) == 0)
    assert(game.users[uid].energy < 9800)
    assert(len(game.users[uid].cells) == 2)

def test_build():
    game = Colorfight()
    uid = join(game, 'a', 'a')
    game.update(True)
    info = game.get_game_info()
    x, y = info['users'][uid]['cells'][0]
    game.users[uid].energy = 10000
    game.users[uid].gold = 10000
    if y == 0:
        attack_y = 1
    else:
        attack_y = y - 1
    result = attack(game, uid, x, attack_y, 1000)
    game.update(True)
    result = build(game, uid, x, attack_y, BLD_GOLD_MINE)
    game.update(True)
    info = game.get_game_info()
    cell = info['game_map'][attack_y][x]
    assert(not info['error'][1])
    assert(cell['owner'] == uid)
    assert(cell['building']['name'] == 'gold_mine')
    assert(cell['gold'] == cell['natural_gold'] * 2)

def test_upgrade():
    game = Colorfight()
    uid = join(game, 'a', 'a')
    game.update(True)
    info = game.get_game_info()
    x, y = info['users'][uid]['cells'][0]
    game.users[uid].energy = 10000
    game.users[uid].gold = 10000

    result = upgrade(game, uid, x, y)
    assert(result['success'])
    game.update(True)
    info = game.get_game_info()
    assert(len(info['error'][uid]) == 0)
    cell = info['game_map'][y][x]
    assert(cell['building']['level'] == 2)
    assert(info['users'][uid]['tech_level'] == 2)
