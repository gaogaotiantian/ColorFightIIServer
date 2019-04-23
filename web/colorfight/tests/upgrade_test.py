from ..colorfight import Colorfight
from ..constants import GAME_WIDTH, GAME_HEIGHT
from ..constants import BLD_GOLD_MINE, BLD_ENERGY_WELL
from .util import *
import pytest

def test_upgrade_without_enough_resource():
    game = Colorfight()
    uid = join(game, 'a', 'a')
    info = game.get_game_info()
    x, y = info['users'][uid]['cells'][0]
    game.users[uid].energy = 0
    game.users[uid].gold = 0

    result = upgrade(game, uid, x, y)
    assert (result['success'])
    game.update(True)
    info = game.get_game_info()
    assert (len(info['error'][uid]))
    cell = info['game_map'][y][x]
    assert (cell['building']['level'] == 1)
    assert (info['users'][uid]['tech_level'] == 1)

    game.users[uid].energy = 10000
    game.users[uid].gold = 0
    result = upgrade(game, uid, x, y)
    assert (result['success'])
    game.update(True)
    info = game.get_game_info()
    assert (len(info['error'][uid]))
    cell = info['game_map'][y][x]
    assert (cell['building']['level'] == 1)
    assert (info['users'][uid]['tech_level'] == 1)


def test_invalid_upgrade():
    game = Colorfight()
    uid = join(game, 'a', 'a')
    info = game.get_game_info()

    #Upgrade cell on invalid position
    result = upgrade(game,uid,-1,-1)
    assert(result["success"])
    game.update(True)
    info = game.get_game_info()
    assert(info["error"][uid])

    #Upgrade cells which are not belong to you
    x, y = info['users'][uid]['cells'][0]
    if y == 0:
        upgrade_y = 1
    else:
        upgrade_y = y - 1
    result = upgrade(game,uid,x,upgrade_y)
    assert(result["success"])
    game.update(True)
    info = game.get_game_info()
    assert(info["error"][uid])

    #Upgrade empty cell
    game.users[uid].energy = 10000
    game.users[uid].gold = 10000
    attack(game, uid, x, upgrade_y, 1000)
    game.update(True)
    result = upgrade(game,uid,x,upgrade_y)
    assert(result["success"])
    game.update(True)
    info = game.get_game_info()
    assert(info["error"][uid])

def test_upgrade_building_with_lower_home_level():
    game = Colorfight()
    uid = join(game, 'a', 'a')
    info = game.get_game_info()
    x, y = info['users'][uid]['cells'][0]
    game.users[uid].energy = 10000
    game.users[uid].gold = 10000
    if y == 0:
        attack_y = 1
    else:
        attack_y = y - 1
    attack(game, uid, x, attack_y, 1000)
    game.update(True)

    build(game, uid, x, attack_y, BLD_GOLD_MINE)
    game.update(True)

    result = upgrade(game, uid, x, attack_y)
    assert(result["success"])
    game.update(True)
    info = game.get_game_info()
    assert (info['error'][uid])
    cell = info['game_map'][attack_y][x]
    #The level of building cannot be higher than home
    assert (cell['building']['level'] == 1)
    assert [info['users'][uid]['tech_level'] == 1]

def test_build_over_maximum_tech_level():
    game = Colorfight()
    uid = join(game, 'a', 'a')
    info = game.get_game_info()
    x, y = info['users'][uid]['cells'][0]
    game.users[uid].energy = 10000
    game.users[uid].gold = 10000

    for i in range (2):
        result = upgrade(game, uid, x, y)
        assert (result['success'])
        game.update(True)
        info = game.get_game_info()
        assert (len(info['error'][uid]) == 0)
        cell = info['game_map'][y][x]
        assert (cell['building']['level'] == i+2)
        assert [info['users'][uid]['tech_level'] == i+2]

    result = upgrade(game, uid, x, y)
    assert (result['success'])
    game.update(True)
    info = game.get_game_info()
    assert (len(info['error'][uid]))
    cell = info['game_map'][y][x]
    assert (cell['building']['level'] == 3)
    assert (info['users'][uid]['tech_level'] == 3)