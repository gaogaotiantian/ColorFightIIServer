from ..colorfight import Colorfight
from ..constants import GAME_WIDTH, GAME_HEIGHT
from ..constants import BLD_GOLD_MINE, BLD_ENERGY_WELL
from .util import *
import pytest

def test_build_on_base():
    game = Colorfight()
    uid = join(game, 'a', 'a')
    game.update(True)
    info = game.get_game_info()
    x, y = info['users'][uid]['cells'][0]
    game.users[uid].energy = 10000
    game.users[uid].gold = 10000
    result = build(game, uid, x, y, BLD_GOLD_MINE)
    assert(result['success'])
    game.update(force=True)
    info = game.get_game_info()
    assert(info['error'])
    expected_err_msg = 'b ' + str(x) + ' ' + str(y) + ' ' + 'g failed, There is a building on this cell already.'
    assert(info['error']["1"][0] == expected_err_msg)

def test_build_without_enough_resource():
    game = Colorfight()
    uid = join(game, 'a', 'a')
    game.update(True)
    info = game.get_game_info()
    x, y = info['users'][uid]['cells'][0]
    game.users[uid].energy = 10000
    game.users[uid].gold = 10
    if y == 0:
        attack_y = 1
    else:
        attack_y = y - 1
    result = attack(game, uid, x, attack_y, 1000)
    assert (result["success"])
    game.update(True)
    result = build(game, uid, x, attack_y, BLD_GOLD_MINE)
    assert (result["success"])
    game.update(True)
    info = game.get_game_info()
    assert (info['error'])

def test_invalid_building_type():
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
    assert (result["success"])
    game.update(True)
    building = 'r' # wrong building type
    result = build(game,uid,x,attack_y,building)
    assert(result['success'])
    game.update(True)
    info = game.get_game_info()
    assert(info['error'])
    expected_err_msg = 'b ' + str(x) + ' ' + str(attack_y) + ' ' + 'r failed, Not a correct building.'
    assert(info['error']['1'][0] == expected_err_msg)

def test_build_on_invalid_cell():
    game = Colorfight()
    uid = join(game, 'a', 'a')
    game.update(True)
    info = game.get_game_info()
    x, y = info['users'][uid]['cells'][0]
    game.users[uid].energy = 10000
    game.users[uid].gold = 10000
    if y == 0:
        new_y = 1
    else:
        new_y = y - 1
    result = build(game, uid, x, new_y, BLD_GOLD_MINE)
    assert (result["success"])
    game.update(True)
    info = game.get_game_info()
    assert (info['error'])
    expected_err_msg = 'b ' + str(x) + ' ' + str(new_y) + ' ' + 'g failed, You need to build on your own cell.'
    assert (info['error']['1'][0] == expected_err_msg)

    result = build(game, uid, -1, -1, BLD_GOLD_MINE)
    assert(result["success"])
    game.update(True)
    info = game.get_game_info()
    assert(info["error"])
