from ..colorfight import Colorfight
from ..constants import GAME_WIDTH, GAME_HEIGHT
from ..constants import BLD_GOLD_MINE, BLD_ENERGY_WELL
from .util import *
import pytest

def test_attack_cell_with_less_attack_cost():
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
    # home with level one provide 10 energy each round
    assert (not game.errors[uid])
    assert(game.users[uid].energy == 9910)
    assert(len(game.users[uid].cells) == 1)

def test_attack_without_enough_energy():
    game = Colorfight()
    uid = join(game, 'a', 'a')
    game.update(True)
    info = game.get_game_info()
    x, y = info['users'][uid]['cells'][0]
    game.users[uid].energy = 100
    if y == 0:
        attack_y = 1
    else:
        attack_y = y - 1
    game.game_map._cells[attack_y][x].natural_cost = 200
    result = attack(game, uid, x, attack_y, 200)
    assert (result["success"])
    game.update(True)
    # home with level one provide 10 energy each round
    assert (game.errors[uid])
    assert (game.users[uid].energy == 110)
    assert (len(game.users[uid].cells) == 1)


def test_update_attack_cost():
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
    result = attack(game, uid, x, attack_y, 300)
    assert(result["success"])
    game.update(True)
    expected_energy = 10000 - 300 + 10 + game.game_map._cells[attack_y][x].natural_energy
    assert (game.users[uid].energy == expected_energy)
    expected_force_field = 2 * (300-200) + 2
    assert (game.game_map._cells[attack_y][x].force_field == min(1000,expected_force_field))
    expected_attack_cost = expected_force_field + 200
    assert(len(game.errors[uid]) == 0)
    assert(game.game_map._cells[attack_y][x].attack_cost == expected_attack_cost)
    assert(len(game.users[uid].cells) == 2)

def test_force_field_max():
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
    result = attack(game, uid, x, attack_y, 800)
    assert(result["success"])
    game.update(True)
    home_natural_energy = 10
    occupied_cell_natural_energy = game.game_map._cells[attack_y][x].natural_energy
    expected_energy = 10000 - 800 + home_natural_energy + occupied_cell_natural_energy
    assert (game.users[uid].energy == expected_energy)
    # The expected force field will be greater than 1000
    expected_force_field = 2 * (800 - 200) + 5
    assert (game.game_map._cells[attack_y][x].force_field == min(1000,expected_force_field))
    assert (len(game.errors[uid]) == 0)