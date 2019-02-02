import json
from ..constants import CMD_ATTACK, CMD_BUILD
from ..constants import BLD_GOLD_MINE, BLD_ENERGY_WELL

def msg_register(username, password):
    return json.dumps({"action":"register", "username": username, "password": password})

def msg_attack(x, y, energy):
    return json.dumps({"action": "command", "cmd_list": ["{} {} {} {}".format(CMD_ATTACK, x, y, energy)]})

def msg_build(x, y, building):
    return json.dumps({"action": "command", "cmd_list": ["{} {} {} {}".format(CMD_BUILD, x, y, building)]})

def join(game, username, password):
    result = game.parse_action(None, msg_register(username, password))
    return result['uid']

def attack(game, uid, x, y, energy):
    return game.parse_action(uid, msg_attack(x, y, energy))

def build(game, uid, x, y, building):
    return game.parse_action(uid, msg_build(x, y, building))
