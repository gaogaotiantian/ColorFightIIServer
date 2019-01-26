import json
import time

from .game_map import GameMap
from .user import User

from .constants import ROUND_TIME, GAME_WIDTH, GAME_HEIGHT

class Colorfight:
    def __init__(self):
        self.turn = 0
        self.last_update = time.time()
        self.users = {}
        self.game_map = GameMap(GAME_WIDTH, GAME_HEIGHT)
        self.valid_actions = {
            "register": [("username", "password"), ("uid")],
            "command": [("cmd_list"), ()]
        }

    def incr(self):
        self.turn += 1
    def get(self):
        return self.counter

    def update(self):
        if time.time() - self.last_update > ROUND_TIME:
            self.last_update = time.time()
            self.turn += 1

    def register(self, uid, username, password):
        # Check whether user exists first
        for user in self.users.values():
            if user.username == username and user.password == password:
                return True, (user.uid,)
        for uid in range(1, len(self.users) + 2):
            if uid not in self.users:
                user = User(uid, username, password)
                if self.game_map.born(user):
                    self.users[uid] = user
                    return True, (uid,)
                else:
                    return False, "Map is full"
        raise Exception("Should never be here")

    def command(self, uid, cmd_list):
        if type(cmd_list) != list:
            return False, "Wrong type"
        self.users[uid].cmd_list = cmd_list

        return True, ()


    def get_game_info(self):
        return {"turn": self.turn, "game_map":self.game_map.info()}

    def parse_action(self, uid, msg):
        '''
        uid is the unique id that the web server checks
        msg should be a string representing a json 
        msg is not checked for sanity at all, we need to check it
        
        return a json object
        
        '''
        try:
            data = json.loads(msg)
        except:
            return {"success": False, "err_msg":"This is not a valid json"}

        if 'action' not in data:
            return {"success": False, "err_msg":"You have to specify an action"}
        
        action = data['action']

        if action not in self.valid_actions:
            return {"success": False, "err_msg":"not a valid action"}

        required_args = self.valid_actions[action][0]
        expected_results = self.valid_actions[action][1]
        arg_list = []
        for arg in required_args:
            if arg not in data:
                return {"success": False, "err_msg": "{} is missing".format(arg)}
            arg_list.append(data[arg])
        
        # should be a tuple 
        success, result = getattr(self, action)(uid, *arg_list)
        if not success:
            return {"success": False, "err_msg": result}
        if len(result) != len(expected_results):
            return {"success": False, "err_msg": "Server fails on {}".format(action)}
        ret = {"success": True}
        for i in range(len(result)):
            ret[expected_results[i]] = result[i]

        return ret


