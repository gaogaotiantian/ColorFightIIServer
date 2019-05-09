from ..colorfight import Colorfight
from ..constants import GAME_WIDTH, GAME_HEIGHT
from ..constants import BLD_GOLD_MINE, BLD_ENERGY_WELL
from ..position  import Position
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

def test_attack_invalid_cell():
    game = Colorfight()
    uid = join(game, 'a', 'a')
    game.update(True)
    info = game.get_game_info()
    x, y = info['users'][uid]['cells'][0]
    game.users[uid].energy = 10000
    result = attack(game, uid, (x+15)%GAME_WIDTH, (y+15)%GAME_HEIGHT, 100)
    assert(result["success"])
    game.update(True)
    # home with level one provide 10 energy each round
    assert (game.errors[uid])

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

def test_kill():
    game = Colorfight()
    killer_uid = join(game, 'killer', 'pwd')
    dead_uid   = join(game, 'dead', 'pwd')

    game.update(True)
    info = game.get_game_info()

    x, y = info['users'][dead_uid]['cells'][0]
    home_pos = Position(x, y)
    surr_pos = home_pos.get_surrounding_cardinals()[0]
    game.game_map[surr_pos].owner = killer_uid
    game.users[killer_uid].energy = 10000
    result = attack(game, killer_uid, home_pos.x, home_pos.y, 5000)
    assert(result["success"])

    game.update(True)
    info = game.get_game_info()

    assert(info['users'][dead_uid]['dead'] == True)

def test_destroy_building():
    game = Colorfight()
    lost_uid   = join(game, 'loser', 'pwd')

    game.update(True)
    info = game.get_game_info()

    x, y = info['users'][lost_uid]['cells'][0]
    home_pos = Position(x, y)
    loser_cmd_list = CmdList(game, lost_uid)
    game.users[lost_uid].energy = 2000
    game.users[lost_uid].gold   = 10000
    surr_positions = Position(x, y).get_surrounding_cardinals()
    gold_pos   = surr_positions[0]
    energy_pos = surr_positions[1]
    loser_cmd_list.attack(gold_pos.x, gold_pos.y, 500)
    loser_cmd_list.attack(energy_pos.x, energy_pos.y, 500)
    result = loser_cmd_list.send_cmd()
    assert(result["success"]), result["err_msg"]

    game.update(True)
    info = game.get_game_info()
    assert(not info['error'][lost_uid])
    assert(info['users'][lost_uid]['energy'] < 1100)
    assert(len(info['error'][lost_uid]) == 0)
    assert((gold_pos.x, gold_pos.y) in info['users'][lost_uid]['cells'])
    assert((energy_pos.x, energy_pos.y) in info['users'][lost_uid]['cells'])
    assert(len(info['users'][lost_uid]['cells']) == 3)

    attack_uid = join(game, 'attacker', 'pwd')
    attacker_cmd_list = CmdList(game, attack_uid)

    game.update(True)
    info = game.get_game_info()

    game.users[attack_uid].energy = 100000
    game.users[attack_uid].gold   = 10000
    loser_cmd_list.build(gold_pos.x, gold_pos.y, BLD_GOLD_MINE)
    loser_cmd_list.build(energy_pos.x, energy_pos.y, BLD_ENERGY_WELL)
    result = loser_cmd_list.send_cmd()
    assert(result["success"])

    for pos in Position(gold_pos.x, gold_pos.y).get_surrounding_cardinals():
        if game.game_map[pos].owner != lost_uid:
            game.game_map[pos].owner = attack_uid

    for pos in Position(energy_pos.x, energy_pos.y).get_surrounding_cardinals():
        if game.game_map[pos].owner != lost_uid:
            game.game_map[pos].owner = attack_uid

    game.update(True)
    info = game.get_game_info()
    assert(not info['error'][lost_uid])

    attacker_gold = info['users'][attack_uid]['gold']
    attacker_cmd_list.attack(gold_pos.x, gold_pos.y, game.game_map[gold_pos].attack_cost)
    attacker_cmd_list.attack(energy_pos.x, energy_pos.y, game.game_map[energy_pos].attack_cost)
    result = attacker_cmd_list.send_cmd()
    assert(result["success"])

    game.update(True)
    info = game.get_game_info()
    assert(info['game_map'][gold_pos.y][gold_pos.x]['owner'] == attack_uid)
    assert(info['game_map'][energy_pos.y][energy_pos.x]['owner'] == attack_uid)
    assert(info['game_map'][energy_pos.y][energy_pos.x]['force_field'] >= 40)
    assert(info['users'][attack_uid]['gold'] >= 50 + attacker_gold + info['users'][attack_uid]['gold_source'])

    loser_cmd_list.attack(gold_pos.x, gold_pos.y, 1000)
    loser_cmd_list.send_cmd()

    game.update(True)

    loser_cmd_list.build(gold_pos.x, gold_pos.y, BLD_GOLD_MINE)
    loser_cmd_list.send_cmd()

    game.update(True)
    info = game.get_game_info()

    assert(info['game_map'][gold_pos.y][gold_pos.x]['building']['name'] == "gold_mine")
    attacker_gold = info['users'][attack_uid]['gold']
    loser_gold    = info['users'][lost_uid]['gold']   

    attacker_cmd_list.attack(home_pos.x, home_pos.y, 50000)
    attacker_cmd_list.send_cmd()

    game.update(True)
    info = game.get_game_info()

    # Destroyed home
    assert(info['users'][attack_uid]['gold'] - attacker_gold == int(loser_gold / 3) + info['users'][attack_uid]['gold_source'])
    assert(loser_gold - info['users'][lost_uid]['gold'] == int(loser_gold / 3) - info['users'][lost_uid]['gold_source'])
    assert(info['game_map'][gold_pos.y][gold_pos.x]['building']['name'] == "empty")
    assert(game.game_map[(gold_pos.x, gold_pos.y)].is_empty)


