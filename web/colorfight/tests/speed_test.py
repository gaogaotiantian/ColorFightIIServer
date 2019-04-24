from ..colorfight import Colorfight
from ..constants import GAME_WIDTH, GAME_HEIGHT
from .util import *
import time
import pytest

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
