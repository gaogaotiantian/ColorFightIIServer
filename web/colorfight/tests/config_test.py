from ..colorfight import Colorfight
import pytest

def test_basic_config():
    game = Colorfight()
    data = {
        "max_turn": 500, 
        "round_time": 1,
        "first_round_time": "never",
        "finish_time": 0,
        "allow_join_after_start": False,
        "allow_manual_mode": False,
        "replay_enable": "end"
    }
    fake_data = {
        "max_turn": 600, 
        "round_time": 1.2,
        "first_round_time": "full",
        "finish_time": 30,
        "allow_join_after_start": True,
        "allow_manual_mode": True,
        "replay_enable": "not_valid"
    }
    try:
        result, err_msg = game.config(data)
        assert(result == True), err_msg
        result, err_msg = game.config(fake_data)
        assert(result == False)
        for key in data:
            assert(getattr(game, key) == data[key])
    except Exception as e:
        assert(False) 
    
    try: 
        game = Colorfight(config = data)
    except:
        assert(False)

def test_invalid_config():
    game = Colorfight()
    invalid_data = {
        "max_turn": [-1, 0, 20, 100, 500.6, 3000, True, "abcd", [1,2,3]],
        "round_time": [-3, 0.01, 200, True, "test", [1,2,3]],
        "first_round_time": [-3, 300, True, "haha", [23,4]],
        "finish_time": [-2, 500, True, "test", [2,3,4]],
        "allow_join_after_start": [2, "test", [2,3]],
        "allow_manual_mode": [2, "true", [3,4]],
        "replay_enable": [False, "true", [2], 100],
        "fale_data": ["fake", True]
    }
    for key in invalid_data:
        for val in invalid_data[key]:
            try:
                result, err_code = game.config({key: val})
                assert result == False, "{}, {} does not fail".format(key, val)
            except Exception as e:
                assert False, e

    for data in ["123", 123, True]:
        result, err_msg = game.config(data)
        assert(result == False)