from ..colorfight import Colorfight
from ..constants import GAME_WIDTH, GAME_HEIGHT
from ..constants import BLD_GOLD_MINE, BLD_ENERGY_WELL, BLD_FORTRESS
from ..building import Fortress
from ..position import Position
from .util import *
import pytest

def test_build_fortress():
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
    game.game_map._cells[attack_y][x].natural_cost = 200
    result = attack(game, uid, x, attack_y, 500)
    game.update(True)
    info = game.get_game_info()
    cell = info['game_map'][attack_y][x]
    assert (cell['owner'] == uid)
    result = build(game, uid, x, attack_y, BLD_FORTRESS)
    game.update(True)
    info = game.get_game_info()
    cell = info['game_map'][attack_y][x]
    assert (cell['building']['name'] == 'fortress')

    cur_level = cell['building']['level']
    expected_force_field = (500-200)*2 + 2*2 + cur_level*4
    expected_attack_cost = (game.game_map._cells[attack_y][x].natural_cost + expected_force_field)*(cur_level+1)
    assert (game.game_map._cells[attack_y][x].force_field == expected_force_field)
    assert (game.game_map._cells[attack_y][x].attack_cost == expected_attack_cost)

def test_upgrade_fortress_with_lower_homelevel():
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
    game.game_map._cells[attack_y][x].natural_cost = 200
    result = attack(game, uid, x, attack_y, 300)
    game.update(True)
    result = build(game, uid, x, attack_y, BLD_FORTRESS)
    game.update(True)
    info = game.get_game_info()
    cell = info['game_map'][attack_y][x]
    assert (not info['error'][1])
    assert (cell['owner'] == uid)
    assert (cell['building']['name'] == 'fortress')

    result = upgrade(game, uid, x, attack_y)
    assert(result["success"])
    game.update(True)
    info = game.get_game_info()
    assert (info['error'][uid])
    cell = info['game_map'][attack_y][x]
    assert (cell['building']['level'] == 1)

def test_upgrade_fortress():
    game = Colorfight()
    uid = join(game, 'a', 'a')
    game.update(True)
    info = game.get_game_info()
    x, y = info['users'][uid]['cells'][0]
    game.users[uid].energy = 10000
    game.users[uid].gold = 10000
    result = upgrade(game, uid, x, y)
    assert (result['success'])
    if y == 0:
        attack_y = 1
    else:
        attack_y = y - 1
    game.game_map._cells[attack_y][x].natural_cost = 200
    result = attack(game, uid, x, attack_y, 300)
    game.update(True)
    result = build(game, uid, x, attack_y, BLD_FORTRESS)
    game.update(True)

    for i in range (2):
        result = upgrade(game, uid, x, y)
        game.update(True)
        result = upgrade(game, uid, x, attack_y)
        assert (result['success'])
        game.update(True)
        info = game.get_game_info()
        assert (len(info['error'][uid]) == 0)
        cell = info['game_map'][attack_y][x]
        assert (cell['building']['level'] == i+2)
        assert (info['users'][uid]['tech_level'] == i+2)

    game.update(True)
    info = game.get_game_info()
    assert (not len(info['error'][uid]))
    cell = info['game_map'][attack_y][x]
    assert (cell['building']['level'] == 3)

def test_fortress_decr():
    game = Colorfight()
    attack_uid = join(game, 'a', 'a')
    defense_uid = join(game, 'b', 'b')

    game.update(True)
    info = game.get_game_info()

    game.users[attack_uid].energy = 100000
    game.users[attack_uid].gold = 100000
    game.users[defense_uid].energy = 100000
    game.users[defense_uid].gold = 100000
    home_x, home_y = info['users'][defense_uid]['cells'][0]
    for pos in Position(home_x, home_y).get_surrounding_cardinals():
        if game.game_map[pos].owner == 0:
            cell_x = pos.x
            cell_y = pos.y
            attack(game, defense_uid, cell_x, cell_y, 2000)
            break

    game.update(True)
    info = game.get_game_info()

    total_cell_num = 0
    for pos in Position(cell_x, cell_y).get_surrounding_cardinals():
        game.game_map[pos].owner = attack_uid
        game.game_map[pos].building = Fortress()
        total_cell_num += 1

    game.update(True)
    info = game.get_game_info()

    assert(info['game_map'][cell_y][cell_x]['force_field'] == 1000 - total_cell_num * 16 )
