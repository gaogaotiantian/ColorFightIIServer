from ..colorfight import Colorfight, get_building_class
from ..constants import GAME_WIDTH, GAME_HEIGHT
from ..constants import BLD_GOLD_MINE, BLD_ENERGY_WELL
from .util import *
import pytest

def test_tax_level_0():
    game = Colorfight()
    uid = join(game, 'a', 'a')
    game.update(True)
    assert (game.users[uid].tax_amount == 0)

def test_tax_level_1():
    game = Colorfight()
    uid = join(game, 'a', 'a')
    game.update(True)
    for x in range (30):
        for y in range (4):
            game.game_map._cells[x][y].owner = uid
    game.update(True)
    info = game.get_game_info()
    cell_num = len(info['users'][uid]['cells'])
    expected_tax = (cell_num - 100)
    assert (game.users[uid].tax_amount == expected_tax)

def test_tax_level_max():
    game = Colorfight()
    uid = join(game, 'a', 'a')
    game.update(True)
    for x in range(30):
        for y in range(30):
            game.game_map._cells[x][y].owner = uid
    game.update(True)
    info = game.get_game_info()
    cell_num = len(info['users'][uid]['cells'])
    expected_tax = 2800 + 8 * (cell_num-800)
    assert (game.users[uid].tax_amount == expected_tax)

def test_tax_level_with_building():
    game = Colorfight()
    uid = join(game, 'a', 'a')
    game.update(True)
    game.users[uid].energy = 100000
    game.users[uid].gold = 100000
    info = game.get_game_info()
    home_x, home_y = info['users'][uid]['cells'][0]

    for x in range (30):
        for y in range (9):
            game.game_map[(x,y)].owner = uid
    # building
    count = 0
    for x in range (30):
        for y in range (4):
            if ((x,y) != (home_x,home_y)):
                result = build(game,uid,x,y,BLD_GOLD_MINE)
                assert(result["success"])
                game.update(True)
                info = game.get_game_info()
                assert(info['game_map'][y][x]['building']['name'] == "gold_mine")
                count += 1

    game.update(True)
    info = game.get_game_info()
    cell_num = len(info['users'][uid]['cells'])
    assert(cell_num == 270 or 271)
    assert(count == 120 or 119)
    expected_tax = 100 + (cell_num - 200)*2 + (count - 100)
    assert (game.users[uid].tax_amount == expected_tax)
