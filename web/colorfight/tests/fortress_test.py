from ..colorfight import Colorfight
from ..constants import GAME_WIDTH, GAME_HEIGHT
from ..constants import BLD_GOLD_MINE, BLD_ENERGY_WELL, BLD_FORTRESS
from .util import *
import pytest

def test_build_fortress():
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
    game.game_map._cells[attack_y][x].natural_cost = 200
    result = attack(game, uid, x, attack_y, 200)
    game.update(True)
    result = build(game, uid, x, attack_y, BLD_FORTRESS)
    game.update(True)
    info = game.get_game_info()
    cell = info['game_map'][attack_y][x]
    assert (not info['error'][1])
    assert (cell['owner'] == uid)
    assert (cell['building']['name'] == 'fortress')

    assert (game.game_map._cells[y][x].force_field == 5)
    cur_level = cell['building']['level']
    expected_force_field = 2*2 + cur_level*5
    expected_attack_cost = (game.game_map._cells[attack_y][x].natural_cost + expected_force_field) * (1+cur_level)
    assert (game.game_map._cells[attack_y][x].force_field == expected_force_field)
    assert (game.game_map._cells[attack_y][x].attack_cost == expected_attack_cost)






