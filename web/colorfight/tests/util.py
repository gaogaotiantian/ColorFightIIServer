import json
from ..constants import CMD_ATTACK, CMD_BUILD, CMD_UPGRADE
from ..constants import BLD_GOLD_MINE, BLD_ENERGY_WELL, BLD_FORTRESS

class CmdList:
    def __init__(self, game, uid):
        self.game = game
        self.uid = uid
        self.cmd_list = []

    def attack(self, x, y, energy):
        self.cmd_list.append("{} {} {} {}".format(CMD_ATTACK, x, y, energy))

    def build(self, x, y, building):
        self.cmd_list.append("{} {} {} {}".format(CMD_BUILD, x, y, building))

    def upgrade(self, x, y):
        self.cmd_list.append("{} {} {}".format(CMD_UPGRADE, x, y))

    def send_cmd(self):
        result = self.game.parse_action(self.uid, json.dumps({"action": "command", "cmd_list": self.cmd_list}))
        self.cmd_list = []
        return result

def msg_register(username, password):
    return json.dumps({"action":"register", "username": username, "password": password})

def msg_attack(x, y, energy):
    return json.dumps({"action": "command", "cmd_list": ["{} {} {} {}".format(CMD_ATTACK, x, y, energy)]})

def msg_build(x, y, building):
    return json.dumps({"action": "command", "cmd_list": ["{} {} {} {}".format(CMD_BUILD, x, y, building)]})

def msg_upgrade(x, y):
    return json.dumps({"action": "command", "cmd_list": ["{} {} {}".format(CMD_UPGRADE, x, y)]})

def join(game, username, password):
    result = game.parse_action(None, msg_register(username, password))
    if not result["success"]:
        return None
    user = result["user"]
    result = game.born(user, False)
    return result['uid']

def attack(game, uid, x, y, energy):
    return game.parse_action(uid, msg_attack(x, y, energy))

def build(game, uid, x, y, building):
    return game.parse_action(uid, msg_build(x, y, building))

def upgrade(game, uid, x, y):
    return game.parse_action(uid, msg_upgrade(x, y))
