from ..colorfight import Colorfight
from .util import *

import pytest

def test_invalid_uid():
    try:
        game = Colorfight()
        result = attack(game, 100, 0, 0, 100)
    except Exception as e:
        assert(False)
        
def test_invalid_position():
    try:
        game = Colorfight()
        uid = join(game, 'a', 'a')
        result = attack(game, uid, -1, -1, 100)
        game.update(True)
        info = game.get_game_info()
        assert(len(info['error'][uid]) != 0)
    except Exception as e:
        assert(False)
