from ..colorfight import Colorfight, Position
from ..constants import GAME_WIDTH, GAME_HEIGHT
from .util import *
import time
import pytest
import random

def test_get_game_info_speed():
    try:
        game = Colorfight()

        start_time = time.time()
        info = game.get_game_info()
        end_time = time.time()
        assert(end_time - start_time < 0.01)
    except Exception as e:
        print(e)
        assert(False)

def test_update():
    game = Colorfight()
    info = game.get_game_info()
    start_time = time.time()
    game.update(force = True)
    end_time = time.time()
    assert(end_time - start_time < 0.05)

def test_update_with_maximum_players():
    game = Colorfight()
    player_list = []
    for i in range (8):
        username = "exampleAI" + str(i)
        uid = join(game,username,'a')
        player_list.append(uid)
        game.update(True)
    start_time = time.time()
    game.update(force=True)
    end_time = time.time()
    assert(end_time - start_time < 0.05)

def test_update_with_half_map_full():
    game = Colorfight()
    uid = join(game, 'a', 'a')
    game.update(True)
    for x in range (30):
        for y in range (10):
            game.game_map[(x,y)].owner = uid
    game.update(True)

    for x in range (30):
        for y in range (10):
            attack_cost = game.game_map._cells[y][x].attack_cost
            result = attack(game, uid, x, y, attack_cost)
            assert (result["success"])

    start_time = time.time()
    game.update(force=True)
    end_time = time.time()
    assert (end_time - start_time < 0.05)
