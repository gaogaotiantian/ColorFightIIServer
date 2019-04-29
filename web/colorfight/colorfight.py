import json
import time
import sys
import gzip

from .game_map import GameMap
from .user import User
from .position import Position
from .building import get_building_class

from .constants import ROUND_TIME, GAME_WIDTH, GAME_HEIGHT, GAME_MAX_TURN
from .constants import CMD_ATTACK, CMD_BUILD, CMD_UPGRADE

class Colorfight:
    def __init__(self):
        self.turn = 0

        # Setups
        self.max_turn = GAME_MAX_TURN
        self.width = GAME_WIDTH
        self.height = GAME_HEIGHT
        self.round_time = ROUND_TIME
        self.first_round_time = ROUND_TIME
        self.start_count_down = self.first_round_time
        self.allow_join_after_start = True
        self.allow_manual_mode      = True
        self.replay_enable = "never"
        self.admin_password = ""
        self.join_key = ""
        self.finish_time = 0
        self.key_frame = 0
        self.last_update = time.time()
        self.users = {}
        self.errors = {}

        # Possible actions
        self.valid_actions = {
            # Action     # Required Args           # Optional Args # Return val
            "register": [("username", "password"), ("join_key",),  ("uid",)],
            "command":  [("cmd_list",),            (),             ()]
        }

        # Game info related
        self._game_info = None
        self._game_info_key_frame = 0

        # Initialization
        self.restart()

    def config(self, data):
        """
            /param data: dict for all possible parameters
        """
        try:
            for field in data:
                val = data[field]
                if field == "max_turn":
                    if 200 <= val <= 2000:
                        self.max_turn = val
                    else:
                        return False, "max_turn value invalid"
                elif field == "round_time":
                    if 0.2 <= val <= 20:
                        self.round_time = val
                    else:
                        return False, "rount_time value invalid"
                elif field == "first_round_time":
                    if 0 <= val <= 60:
                        self.first_round_time = val
                    else:
                        return False, "first_round_time value invalid"
                elif field == "finish_time":
                    if 0 <= val <= 60:
                        self.finish_time = val
                    else:
                        return False, "finish_time value invalid"
                elif field == "allow_join_after_start":
                    if val == True or val == False:
                        self.allow_join_after_start = val
                    else:
                        return False, "allow_join_after_start value invalid"
                elif field == "allow_manual_mode":
                    if val == True or val == False:
                        self.allow_manual_mode = val
                    else:
                        return False, "allow_manual_mode value invalid"
                elif field == "replay_enable":
                    if val in ["always", "never", "end"]:
                        self.replay_enable = val
                    else:
                        return False, "replay_enable value invalid"
                else:
                    return False, "Invalid field {}".format(field)
        except Exception as e:
            return False, "Invalid data, {}".format(e)

        return True, None

    def restart(self):
        self.turn = 0
        self.users = {}
        self.errors = {}
        self.key_frame = 0
        self.start_count_down = self.first_round_time
        self.game_map = GameMap(self.height, self.width) 
        self.last_update = time.time() 
        self.key_frame = 1
        self.clear_log()
        self.add_log()

    def update(self, force = False):
        do_update = False
        do_restart = False
        if self.turn == 0:
            count_down = self.first_round_time - (time.time() - self.last_update)
            if force or count_down < 0:
                do_update = True
                self.start_count_down = 0
            elif int(count_down) != self.start_count_down:
                self.start_count_down = int(count_down)
                self.key_frame += 1
                
        elif self.turn == self.max_turn:
            if self.finish_time != 0 and time.time() - self.last_update > self.finish_time:
                do_restart = True
        else:
            if force or (time.time() - self.last_update > self.round_time):
                do_update = True
        if do_restart:
            self.restart()
        elif do_update:
            self.turn += 1
            self.key_frame += 1
            self.errors = self.do_all_commands()
            # 1. Update all the cells based on attackers
            #    This will also update the cell dict in users
            #    and the energy/gold income for a user
            self.update_cells()
            # 2. Update all the users for gold and energy
            self.update_users()
            start = time.time()
            self.add_log()
            self.last_update = time.time() 

    def update_cells(self):
        self.game_map.update_cells(self.users)

    def update_users(self):
        for user in self.users.values():
            user.update()

    '''
    This is the game command part.
    We currently have:
        ATTACK
        BUILD
        UPGRADE
    '''
    def do_all_commands(self):
        errors = {}
        for user in self.users.values():
            errors[user.uid] = []
            for cmd in user.cmd_list:
                result = self.do_command(user.uid, cmd)
                if result != None:
                    errors[user.uid].append(result)
            user.cmd_list = []
        return errors
                    
    def do_command(self, uid, cmd):
        err_msg = ""

        try: 
            arg_list = cmd.split() 
        except:
            return "{} is not a command".format(cmd)

        if len(arg_list) == 0:
            return "{} is not a command".format(cmd)

        try:
            cmd_type = arg_list[0]
            if cmd_type == CMD_ATTACK:
                x = int(arg_list[1])
                y = int(arg_list[2])
                energy = int(arg_list[3])
                result, err_msg = self.cmd_attack(uid, x, y, energy)
            elif cmd_type == CMD_BUILD:
                x = int(arg_list[1])
                y = int(arg_list[2])
                building = arg_list[3]
                result, err_msg = self.cmd_build(uid, x, y, building)
            elif cmd_type == CMD_UPGRADE:
                x = int(arg_list[1])
                y = int(arg_list[2])
                result, err_msg = self.cmd_upgrade(uid, x, y)
            else:
                return "{} is a wrong command, cmd type {} is invalid".format(cmd, cmd_type)
        except Exception as e:
            return "{} is a wrong command, {}".format(cmd, e)

        if not result:
            return "{} failed, {}.".format(cmd, err_msg)
        return None

    def cmd_attack(self, uid, x, y, energy):
        atk_pos = Position(x, y)

        if atk_pos not in self.game_map:
            return False, "Attack position is not in the map"

        if energy > self.users[uid].energy:
            return False, "Do not have enough energy to attack"

        for pos in atk_pos.get_surrounding_cardinals():
            if self.game_map[pos].owner == uid:
                self.users[uid].energy -= energy 
                self.game_map[(x, y)].attack(uid, energy)
                return True, ""
        return False, "No valid surrounding cell to attack"

    def cmd_build(self, uid, x, y, building):
        build_pos = Position(x, y)

        if build_pos not in self.game_map:
            return False, "Build position is not in the map"

        if self.game_map[build_pos].owner != uid:
            return False, "You need to build on your own cell"

        if not self.game_map[build_pos].building.is_empty:
            return False, "There is a building on this cell already"

        BldClass = get_building_class(building)
        if BldClass is None:
            return False, "Not a correct building"

        if self.users[uid].gold < BldClass.cost:
            return False, "Not enough gold"

        self.game_map[build_pos].building = BldClass()
        self.users[uid].gold -= BldClass.cost

        return True, ""

    def cmd_upgrade(self, uid, x, y):
        upgrade_pos = Position(x, y)

        if upgrade_pos not in self.game_map:
            return False, "Upgrade position is not in the map"

        cell = self.game_map[upgrade_pos]
        if cell.owner != uid:
            return False, "You need to upgrade on your own cell"

        if cell.building.is_empty:
            return False, "You can not upgrade empty cell"

        if cell.building.level >= cell.building.max_level:
            return False, "Level is already at maximum"

        user = self.users[uid]

        if not cell.is_home and cell.building.level >= user.tech_level:
            return False, "You need to upgrade home first"

        if user.energy < cell.building.upgrade_energy_cost:
            return False, "Not enough energy"

        if user.gold < cell.building.upgrade_gold_cost:
            return False, "Not enough gold"

        user.energy -= cell.building.upgrade_energy_cost
        user.gold   -= cell.building.upgrade_gold_cost

        cell.upgrade()

        return True, ""


    '''
    Possible user actions, after parse_action()
        register
        command
    '''
    def register(self, uid, username, password, join_key = ""):
        if len(username) >= 15:
            return False, "Username can't exceed 15 characters."

        if len(username) == 0:
            return False, "Username has to be at least 1 characters"

        if join_key != self.join_key:
            return False, "You need the correct join key for the room"

        # Check whether user exists first
        for user in self.users.values():
            if user.username == username:
                if user.password == password:
                    return True, (user.uid,)
                else:
                    return False, "Username exists"

        if self.allow_join_after_start or self.turn == 0:
            for uid in range(1, len(self.users) + 2):
                if uid not in self.users:
                    user = User(uid, username, password)
                    if self.game_map.born(user):
                        self.key_frame += 1
                        self.users[uid] = user
                        return True, (uid,)
                    else:
                        return False, "Map is full"

            raise Exception("Should never be here")
        else:
            return False, "You are not allowed to join after the game starts"

    def command(self, uid, cmd_list):
        if type(cmd_list) != list:
            return False, "Wrong type"
        if uid not in self.users:
            return False, "Wrong uid"
        self.users[uid].cmd_list = cmd_list

        return True, ()

    '''
    All the action from users
    '''
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
            return {"success": False, "err_msg":"Not a valid action"}

        if action != 'register' and uid == None:
            return {"success": False, "err_msg":"You need to join the game first"}

        required_args = self.valid_actions[action][0]
        optional_args = self.valid_actions[action][1]
        expected_results = self.valid_actions[action][2]
        arg_list = {}
        for arg in required_args:
            if arg not in data:
                return {"success": False, "err_msg": "{} is missing".format(arg)}
            arg_list[arg] = data[arg]
        
        for arg in optional_args:
            if arg in data:
                arg_list[arg] = data[arg]

        # should be a tuple 
        success, result = getattr(self, action)(uid, **arg_list)
        if not success:
            return {"success": False, "err_msg": result}
        if len(result) != len(expected_results):
            return {"success": False, "err_msg": "Server fails on {}".format(action)}
        ret = {"success": True}
        for i in range(len(result)):
            ret[expected_results[i]] = result[i]

        return ret

    '''
    Read API
    '''
    def info(self):
        return {"max_turn": self.max_turn, \
                "width": GAME_WIDTH, \
                "height": GAME_HEIGHT, \
                "round_time": self.round_time, \
                "start_count_down": self.start_count_down, \
                "allow_manual_mode": self.allow_manual_mode, \
        }

    def compress_game_info(self, info):
        def name_to_letter(name):
            if name == "empty":
                return " "
            return name[0]
        game_map = {"data":[[None for _ in range(self.width)] for _ in range(self.height)]}
        game_map['headers'] = [key for key in info['game_map'][0][0]]
        for x in range(self.game_map.width):
            for y in range(self.game_map.height):
                temp_info = info["game_map"][y][x]
                temp_info["building"] = [name_to_letter(temp_info["building"]["name"]), 
                        temp_info["building"]["level"]]
                game_map["data"][y][x] = [temp_info[key] for key in game_map['headers']]
        info['game_map'] = game_map

    def get_game_info(self):
        return {\
                "turn": self.turn, \
                "info": self.info(), \
                "error": self.errors, \
                "game_map":self.game_map.info(), \
                "users": {user.uid: user.info() for user in self.users.values()} \
        }

    def get_game_info_str(self):
        if self._game_info == None or self._game_info_key_frame != self.key_frame:
            self._game_info_key_frame = self.key_frame
            self._game_info = self.get_game_info()
            self.compress_game_info(self._game_info)
            self._game_info_str = json.dumps(self._game_info,separators=[',',':'])
        return self._game_info_str

    def add_log(self):
        if self.replay_enable:
            self.log.append(self.get_game_info_str())

    def clear_log(self):
        self.log_turn = 0
        self.log = []
        self.compressed_log = None

    def get_log(self):
        if self.log_turn != self.turn:
            self.log_turn = self.turn
            self.compressed_log = gzip.compress(json.dumps(self.log).encode('utf-8'), compresslevel = 5)
        return self.compressed_log
