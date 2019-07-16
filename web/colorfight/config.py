_configs = {
    'default': {
    },
    'official': {
        'max_turn'              : 500,
        'round_time'            : 1,
        'first_round_time'      : 'never',
        'finish_time'           : 0,
        'allow_join_after_start': False,
        'allow_manual_mode'     : False,
        'replay_enable'         : 'end'
    },
    'duel': {
        'max_turn'              : 500,
        'round_time'            : 1,
        'first_round_time'      : 'full',
        'finish_time'           : 30,
        'max_player'            : 2,
        'allow_join_after_start': False,
        'allow_manual_mode'     : False,
        'replay_enable'         : 'end',
        'room_description'      : "This is the test duel room. Only two players are allowed in the room. The game will start as long as two players both join the game. The replay will be saved at the end of the game and the game will restart after it's saved. Manual mode is also disallowed in this room."
    },
    'test-run': {
        'max_turn'              : 500,
        'round_time'            : 1,
        'first_round_time'      : 'full',
        'finish_time'           : 20,
        'allow_join_after_start': False,
        'allow_manual_mode'     : False,
        'replay_enable'         : 'end'
    },
    'constant-run': {
        'max_turn'              : 500,
        'round_time'            : 1,
        'first_round_time'      : 20,
        'finish_time'           : 20,
        'allow_join_after_start': True,
        'allow_manual_mode'     : False,
        'replay_enable'         : 'always'
    }
}
def get_config(config):
    if config in _configs:
        return _configs[config]
    else:
        return _configs['default']


